# 🔄 Guía de Arquitectura: Sincronización P2P Offline-First Persistente

Esta guía documenta la arquitectura de sincronización **Peer-to-Peer (WebRTC) + LocalStorage** utilizada para sincronizar dos dispositivos en tiempo real **sin necesidad de una base de datos central**, manteniendo la sesión y reconexión automática incluso si se reinicia o recarga la página.

---

## 📑 Tabla de Contenidos
1. [Principios y Arquitectura](#1-principios-y-arquitectura)
2. [Instalación de Dependencias](#2-instalación-de-dependencias)
3. [Estructura de Archivos Recomendada](#3-estructura-de-archivos-recomendada)
4. [Paso 1: Definición de Tipos](#paso-1-definición-de-tipos)
5. [Paso 2: El Contexto de Sincronización (SyncContext)](#paso-2-el-contexto-de-sincronización-synccontext)
   - ID Persistente por Dispositivo
   - Memoria del Último Par y Reconexión Automática
   - Smart Merge (Last-Write-Wins + Tombstones)
   - Anti-Eco Loop
6. [Paso 3: Capa de Almacenamiento Local (Storage Service)](#paso-3-capa-de-almacenamiento-local-storage-service)
7. [Paso 4: Consumo Reactivo en Componentes o Hooks](#paso-4-consumo-reactivo-en-componentes-o-hooks)
8. [Paso 5: Componente UI de Conexión](#paso-5-componente-ui-de-conexión)
9. [Consideraciones para Producción](#consideraciones-para-producción)

---

## 1. Principios y Arquitectura

```text
  [Dispositivo A (Navegador)]                                [Dispositivo B (Navegador)]
 ┌───────────────────────────┐                              ┌───────────────────────────┐
 │   React UI & Hooks        │                              │   React UI & Hooks        │
 │           │               │                              │           ▲               │
 │           ▼               │                              │           │               │
 │  localStorage.service     │                              │  localStorage.service     │
 │           │ (guarda datos)│                              │           ▲ (aplica merge)│
 │           ▼               │                              │           │               │
 │  CustomEvent(local-write) │                              │  CustomEvent(storage-sync)│
 │           │               │                              │           ▲               │
 │           ▼               │     Canal WebRTC P2P Directo │           │               │
 │      SyncContext          │═════════════════════════════>│      SyncContext          │
 │ (PeerJS: ID Persistente)  │   (Sin servidor intermedio)  │ (PeerJS: ID Persistente)  │
 └───────────────────────────┘                              └───────────────────────────┘
```

### Los 4 Pilares del Sistema
1. **Peer ID Persistente**: Se genera un ID único por dispositivo una sola vez y se almacena en `localStorage`. Nunca cambia al recargar la página.
2. **Memoria de Conexión**: Se guarda el ID del dispositivo con el que se emparejó. Al reiniciar la app, se reconecta automáticamente sin intervención del usuario.
3. **Smart Merge (LWW + Tombstones)**: Fusión de datos usando marcas de tiempo (*Last-Write-Wins*) y lápidas de borrado (*Tombstones*) para evitar que datos eliminados vuelvan a revivir tras reconectar.
4. **Bus de Eventos Desacoplado**: Se utilizan `CustomEvent` de JavaScript en `window` para que la UI se entere de los cambios remotos sin forzar re-renders masivos ni acoplarse directamente a WebRTC.

---

## 2. Instalación de Dependencias

En tu proyecto cliente (React / Vite / Next.js):

```bash
npm install peerjs
```

*(Opcional: Si usas TypeScript y requieres los tipos, ya vienen incluidos en la librería `peerjs`).*

---

## 3. Estructura de Archivos Recomendada

```text
src/
├── types/
│   └── sync.ts               # Interfaces de mensajes y estados
├── contexts/
│   └── SyncContext.tsx       # Lógica P2P, reconexión y Smart Merge
├── services/
│   └── storage.service.ts    # Operaciones CRUD locales con notificación P2P
├── hooks/
│   └── useSyncData.ts        # Hook para escuchar cambios remotos en tiempo real
└── components/
    └── SyncManagerModal.tsx  # Modal o panel de conexión (mostrar ID, conectar, QR)
```

---

## Paso 1: Definición de Tipos

Crea el archivo `src/types/sync.ts`:

```typescript
export type SyncStatus = 'disconnected' | 'connecting' | 'connected';

export interface SyncMessage {
  type: 'INITIAL_SYNC' | 'SYNC_MERGED' | 'UPDATE_KEY' | 'PING';
  sourcePeerId: string;
  timestamp: number;
  payload?: {
    key?: string;
    value?: string | null;
    allData?: Record<string, string>;
  };
}

export interface SyncEntity {
  id: string;
  updatedAt?: number;
  createdAt?: number;
  [key: string]: any;
}
```

---

## Paso 2: El Contexto de Sincronización (`SyncContext.tsx`)

Crea `src/contexts/SyncContext.tsx`. Este es el corazón de la sincronización.

```tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import Peer, { type DataConnection } from 'peerjs';
import { SyncStatus, SyncMessage, SyncEntity } from '../types/sync';

// Constantes de configuración y claves en localStorage
const MY_PEER_ID_KEY = 'app_my_persistent_peer_id';
const LAST_PEER_KEY = 'app_last_connected_peer_id';
export const TOMBSTONES_KEY = 'app_tombstones_v1';

// Eventos personalizados de JavaScript
export const STORAGE_SYNC_EVENT = 'app-storage-sync';
export const LOCAL_WRITE_EVENT = 'app-local-write';

// Prefijo que usan las claves de tu app en localStorage
const DATA_PREFIX = 'app_data_';

interface SyncContextType {
  peerId: string | null;
  remotePeerId: string | null;
  status: SyncStatus;
  connectToPeer: (targetPeerId: string) => void;
  disconnect: () => void;
  broadcastUpdate: (key: string, value: any) => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

// ============================================================================
// 1. ID PERSISTENTE: Garantiza que el ID no cambie nunca al recargar la página
// ============================================================================
function getOrCreatePersistentPeerId(): string {
  let id = localStorage.getItem(MY_PEER_ID_KEY);
  if (!id) {
    id = `peer-${Math.random().toString(36).substring(2, 8)}-${Date.now().toString(36)}`;
    localStorage.setItem(MY_PEER_ID_KEY, id);
  }
  return id;
}

// ============================================================================
// 2. FUSIÓN INTELIGENTE (SMART MERGE CON TOMBSTONES)
// ============================================================================

// Fusión de lápidas (registro de IDs eliminados con fecha de eliminación)
function mergeTombstones(localStr: string | null, remoteStr: string | null): string {
  const localMap: Record<string, number> = localStr ? JSON.parse(localStr || '{}') : {};
  const remoteMap: Record<string, number> = remoteStr ? JSON.parse(remoteStr || '{}') : {};
  const merged: Record<string, number> = { ...localMap };

  for (const [id, remoteTs] of Object.entries(remoteMap)) {
    merged[id] = Math.max(merged[id] || 0, remoteTs);
  }

  // Auto-limpieza de lápidas antiguas (ej. más de 30 días)
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const [id, ts] of Object.entries(merged)) {
    if (ts < cutoff) delete merged[id];
  }

  return JSON.stringify(merged);
}

// Fusión de colecciones usando Last-Write-Wins y Tombstones
function mergeEntities(
  localStr: string | null,
  remoteStr: string | null,
  tombstones: Record<string, number>
): string {
  const localItems: SyncEntity[] = localStr ? JSON.parse(localStr || '[]') : [];
  const remoteItems: SyncEntity[] = remoteStr ? JSON.parse(remoteStr || '[]') : [];

  const map = new Map<string, SyncEntity>();

  const isDeleted = (id: string, time: number) => {
    const tombTime = tombstones[id];
    return tombTime !== undefined && tombTime >= time;
  };

  // Agregar locales válidos
  localItems.forEach((item) => {
    const time = item.updatedAt || item.createdAt || 0;
    if (!isDeleted(item.id, time)) {
      map.set(item.id, item);
    }
  });

  // Fusionar remotos (LWW: el timestamp mayor gana)
  remoteItems.forEach((remoteItem) => {
    const remoteTime = remoteItem.updatedAt || remoteItem.createdAt || 0;
    if (!isDeleted(remoteItem.id, remoteTime)) {
      const localItem = map.get(remoteItem.id);
      if (!localItem) {
        map.set(remoteItem.id, remoteItem);
      } else {
        const localTime = localItem.updatedAt || localItem.createdAt || 0;
        if (remoteTime >= localTime) {
          map.set(remoteItem.id, remoteItem);
        }
      }
    } else {
      map.delete(remoteItem.id);
    }
  });

  return JSON.stringify(Array.from(map.values()));
}

function mergeDataEntry(
  key: string,
  localVal: string | null,
  remoteVal: string,
  tombstones: Record<string, number>
): string {
  if (key === TOMBSTONES_KEY) {
    return mergeTombstones(localVal, remoteVal);
  }
  // Aplica merge inteligente a arrays de datos
  try {
    const parsed = JSON.parse(remoteVal);
    if (Array.isArray(parsed)) {
      return mergeEntities(localVal, remoteVal, tombstones);
    }
  } catch {
    // Si es un valor simple o no parseable, se conserva el remoto
  }
  return remoteVal;
}

// ============================================================================
// 3. PROVIDER DE REACT
// ============================================================================
export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('disconnected');

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const isApplyingRemoteUpdate = useRef(false); // Flag anti-eco

  // Obtener todos los datos locales para la sincronización inicial
  const getAllLocalData = useCallback((): Record<string, string> => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(DATA_PREFIX) || key === TOMBSTONES_KEY)) {
        const val = localStorage.getItem(key);
        if (val !== null) data[key] = val;
      }
    }
    return data;
  }, []);

  const sendMessage = useCallback((msg: SyncMessage) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send(msg);
    }
  }, []);

  // Manejar mensajes entrantes
  const handleIncomingData = useCallback(
    (data: unknown) => {
      const msg = data as SyncMessage;
      if (!msg || !msg.type || msg.sourcePeerId === peerRef.current?.id) return;

      isApplyingRemoteUpdate.current = true;
      try {
        if (msg.type === 'INITIAL_SYNC' || msg.type === 'SYNC_MERGED') {
          const remoteData = msg.payload?.allData || {};
          const mergedResult: Record<string, string> = {};
          let hasDifferences = false;

          // 1. Fusionar tombstones primero
          let tombstones: Record<string, number> = {};
          if (remoteData[TOMBSTONES_KEY]) {
            const localTomb = localStorage.getItem(TOMBSTONES_KEY);
            const mergedTomb = mergeTombstones(localTomb, remoteData[TOMBSTONES_KEY]);
            localStorage.setItem(TOMBSTONES_KEY, mergedTomb);
            tombstones = JSON.parse(mergedTomb);
            mergedResult[TOMBSTONES_KEY] = mergedTomb;
          } else {
            tombstones = JSON.parse(localStorage.getItem(TOMBSTONES_KEY) || '{}');
          }

          // 2. Fusionar claves recibidas
          Object.entries(remoteData).forEach(([key, remoteVal]) => {
            if (key === TOMBSTONES_KEY) return;
            const localVal = localStorage.getItem(key);
            const finalVal = mergeDataEntry(key, localVal, remoteVal, tombstones);
            mergedResult[key] = finalVal;
            localStorage.setItem(key, finalVal);
            if (finalVal !== remoteVal) hasDifferences = true;
          });

          // 3. Responder con datos consolidados si hubo diferencias
          if (msg.type === 'INITIAL_SYNC' && hasDifferences) {
            sendMessage({
              type: 'SYNC_MERGED',
              sourcePeerId: peerRef.current?.id || '',
              timestamp: Date.now(),
              payload: { allData: mergedResult },
            });
          }

          // Notificar a la UI
          window.dispatchEvent(
            new CustomEvent(STORAGE_SYNC_EVENT, { detail: { allData: mergedResult } })
          );
        } else if (msg.type === 'UPDATE_KEY' && msg.payload?.key) {
          const { key, value } = msg.payload;
          if (value === null) {
            localStorage.removeItem(key);
          } else {
            const localVal = localStorage.getItem(key);
            const tombstones = JSON.parse(localStorage.getItem(TOMBSTONES_KEY) || '{}');
            const merged = mergeDataEntry(key, localVal, value, tombstones);
            localStorage.setItem(key, merged);
          }
          window.dispatchEvent(
            new CustomEvent(STORAGE_SYNC_EVENT, { detail: { key, value } })
          );
        }
      } finally {
        setTimeout(() => {
          isApplyingRemoteUpdate.current = false;
        }, 80);
      }
    },
    [sendMessage]
  );

  // Configuración de listeners del DataConnection
  const setupConnection = useCallback(
    (conn: DataConnection) => {
      connRef.current = conn;
      setStatus('connecting');

      conn.on('open', () => {
        setStatus('connected');
        if (conn.peer) {
          setRemotePeerId(conn.peer);
          // Guardar para reconexión futura al recargar la página
          localStorage.setItem(LAST_PEER_KEY, conn.peer);
        }

        // Intercambio de datos inicial completo
        conn.send({
          type: 'INITIAL_SYNC',
          sourcePeerId: peerRef.current?.id || '',
          timestamp: Date.now(),
          payload: { allData: getAllLocalData() },
        } as SyncMessage);
      });

      conn.on('data', (data) => handleIncomingData(data));

      conn.on('close', () => {
        setStatus('disconnected');
        setRemotePeerId(null);
        connRef.current = null;
      });

      conn.on('error', (err) => {
        console.error('[P2P] Connection Error:', err);
        setStatus('disconnected');
      });
    },
    [getAllLocalData, handleIncomingData]
  );

  const connectToPeer = useCallback(
    (targetPeerId: string) => {
      if (!peerRef.current || !targetPeerId.trim()) return;
      if (targetPeerId === peerRef.current.id) return;

      setStatus('connecting');
      const conn = peerRef.current.connect(targetPeerId.trim(), { reliable: true });
      setupConnection(conn);
    },
    [setupConnection]
  );

  const disconnect = useCallback(() => {
    if (connRef.current) connRef.current.close();
    localStorage.removeItem(LAST_PEER_KEY);
    setRemotePeerId(null);
    setStatus('disconnected');
  }, []);

  // Transmitir cambios locales al peer remoto
  const broadcastUpdate = useCallback(
    (key: string, value: any) => {
      if (!isApplyingRemoteUpdate.current && connRef.current?.open) {
        const payloadStr = typeof value === 'string' ? value : JSON.stringify(value);
        sendMessage({
          type: 'UPDATE_KEY',
          sourcePeerId: peerRef.current?.id || '',
          timestamp: Date.now(),
          payload: { key, value: payloadStr },
        });
      }
    },
    [sendMessage]
  );

  // ============================================================================
  // 4. CICLO DE VIDA PEERJS Y WATCHDOG DE RECONEXIÓN
  // ============================================================================
  useEffect(() => {
    const persistentId = getOrCreatePersistentPeerId();

    const peer = new Peer(persistentId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);

      // Reconexión automática al cargar la página si existía un par previo
      const savedPeer = localStorage.getItem(LAST_PEER_KEY);
      if (savedPeer && savedPeer !== id) {
        const conn = peer.connect(savedPeer, { reliable: true });
        setupConnection(conn);
      }
    });

    peer.on('connection', (conn) => setupConnection(conn));
    peer.on('error', (err) => setStatus('disconnected'));

    // Watchdog: reintenta reconectar silenciosamente cada 10s si el otro par se cayó o cerró
    const reconnectInterval = setInterval(() => {
      const savedPeer = localStorage.getItem(LAST_PEER_KEY);
      if (
        savedPeer &&
        peerRef.current &&
        !peerRef.current.destroyed &&
        (!connRef.current || !connRef.current.open)
      ) {
        try {
          const conn = peerRef.current.connect(savedPeer, { reliable: true });
          setupConnection(conn);
        } catch {}
      }
    }, 10000);

    return () => {
      clearInterval(reconnectInterval);
      peer.destroy();
    };
  }, [setupConnection]);

  // Escuchar escrituras locales para enviarlas por WebRTC
  useEffect(() => {
    const handleLocal = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; value: any }>;
      if (customEvent.detail) {
        broadcastUpdate(customEvent.detail.key, customEvent.detail.value);
      }
    };
    window.addEventListener(LOCAL_WRITE_EVENT, handleLocal);
    return () => window.removeEventListener(LOCAL_WRITE_EVENT, handleLocal);
  }, [broadcastUpdate]);

  return (
    <SyncContext.Provider
      value={{
        peerId,
        remotePeerId,
        status,
        connectToPeer,
        disconnect,
        broadcastUpdate,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const usePeerSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('usePeerSync debe usarse dentro de un SyncProvider');
  return context;
};

// Helper global para que tus repositorios/servicios notifiquen cambios
export function notifyLocalWrite(key: string, value: any) {
  window.dispatchEvent(
    new CustomEvent(LOCAL_WRITE_EVENT, { detail: { key, value } })
  );
}
```

---

## Paso 3: Capa de Almacenamiento Local (`storage.service.ts`)

En tus funciones donde guardas o borras datos en `localStorage`, debes incluir:
1. `updatedAt: Date.now()` en cada entidad modificada o creada.
2. Si borras un ítem, **no solo lo quitas del array**: registras su ID en los `tombstones`.
3. Disparas `notifyLocalWrite(key, data)` para transmitir inmediatamente al peer.

Ejemplo en `src/services/storage.service.ts`:

```typescript
import { notifyLocalWrite, TOMBSTONES_KEY } from '../contexts/SyncContext';
import { SyncEntity } from '../types/sync';

const ITEMS_KEY = 'app_data_items';

// Registrar eliminación de un ítem para que no "resucite" en el otro dispositivo
function recordTombstone(id: string) {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    const tombstones: Record<string, number> = raw ? JSON.parse(raw) : {};
    tombstones[id] = Date.now();
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombstones));
    notifyLocalWrite(TOMBSTONES_KEY, JSON.stringify(tombstones));
  } catch (err) {
    console.error('Error registrando tombstone:', err);
  }
}

export const StorageService = {
  getItems(): SyncEntity[] {
    const raw = localStorage.getItem(ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  saveItem(item: Omit<SyncEntity, 'updatedAt'>): void {
    const items = this.getItems();
    const now = Date.now();
    const index = items.findIndex((i) => i.id === item.id);

    const fullItem: SyncEntity = {
      ...item,
      updatedAt: now,
      createdAt: item.createdAt || now,
    };

    if (index >= 0) {
      items[index] = fullItem;
    } else {
      items.push(fullItem);
    }

    const payload = JSON.stringify(items);
    localStorage.setItem(ITEMS_KEY, payload);
    notifyLocalWrite(ITEMS_KEY, payload); // Emite por WebRTC
  },

  deleteItem(id: string): void {
    const items = this.getItems().filter((i) => i.id !== id);
    const payload = JSON.stringify(items);
    localStorage.setItem(ITEMS_KEY, payload);

    recordTombstone(id);                 // Registra la lápida
    notifyLocalWrite(ITEMS_KEY, payload); // Notifica el array filtrado
  },
};
```

---

## Paso 4: Consumo Reactivo en Componentes o Hooks

Para que la pantalla del usuario se actualice en tiempo real sin recargar la página cuando el otro dispositivo realiza un cambio, escucha el evento `STORAGE_SYNC_EVENT`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage.service';
import { STORAGE_SYNC_EVENT } from '../contexts/SyncContext';
import { SyncEntity } from '../types/sync';

export function useItems() {
  const [items, setItems] = useState<SyncEntity[]>(() => StorageService.getItems());

  const refreshItems = useCallback(() => {
    setItems(StorageService.getItems());
  }, []);

  useEffect(() => {
    // Escuchar cambios entrantes del par remoto
    const handleRemoteSync = () => {
      refreshItems();
    };

    window.addEventListener(STORAGE_SYNC_EVENT, handleRemoteSync);
    return () => window.removeEventListener(STORAGE_SYNC_EVENT, handleRemoteSync);
  }, [refreshItems]);

  return {
    items,
    addItem: (item: any) => {
      StorageService.saveItem(item);
      refreshItems();
    },
    deleteItem: (id: string) => {
      StorageService.deleteItem(id);
      refreshItems();
    },
  };
}
```

---

## Paso 5: Componente UI de Conexión

Un componente simple para emparejar los dispositivos:

```tsx
import React, { useState } from 'react';
import { usePeerSync } from '../contexts/SyncContext';

export const SyncPanel: React.FC = () => {
  const { peerId, remotePeerId, status, connectToPeer, disconnect } = usePeerSync();
  const [targetId, setTargetId] = useState('');

  return (
    <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 8 }}>
      <h3>Sincronización P2P</h3>
      
      <p>
        <strong>Estado:</strong>{' '}
        <span style={{ color: status === 'connected' ? 'green' : 'orange' }}>
          {status.toUpperCase()}
        </span>
      </p>

      <p>
        <strong>Tu ID (Persistente):</strong> <code>{peerId || 'Generando...'}</code>
        <button onClick={() => navigator.clipboard.writeText(peerId || '')} style={{ marginLeft: 8 }}>
          Copiar
        </button>
      </p>

      {status === 'connected' ? (
        <div>
          <p>Conectado con: <code>{remotePeerId}</code></p>
          <button onClick={disconnect}>Desconectar</button>
        </div>
      ) : (
        <div>
          <input
            placeholder="Pegar ID del otro dispositivo..."
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            style={{ width: 260, marginRight: 8 }}
          />
          <button onClick={() => connectToPeer(targetId)} disabled={status === 'connecting'}>
            {status === 'connecting' ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## Consideraciones para Producción

1. **Servidor de Señalización Propio (Signaling Server)**:
   - Por defecto, `peerjs` usa el servidor público en la nube `0.peerjs.com`. Para proyectos comerciales o con alto tráfico, puedes desplegar tu propio servidor en Node.js de forma gratuita con 5 líneas de código:
     ```javascript
     const { PeerServer } = require('peer');
     const server = PeerServer({ port: 9000, path: '/peerjs' });
     ```
   - Luego en el cliente configuras:
     ```javascript
     new Peer(myId, { host: 'tu-servidor.com', port: 443, path: '/peerjs', secure: true });
     ```

2. **Servidores STUN / TURN**:
   - Para conexiones entre redes 4G/móviles o corporativas con firewalls estrictos (NAT simétrico), conviene agregar servidores TURN (como Twilio Network Traversal o servidores coturn abiertos).
