# 🔄 Guía Maestra: Sincronización P2P Offline-First Persistente (Edición Perfeccionada)

Esta guía documenta la arquitectura de sincronización **Peer-to-Peer (WebRTC) + LocalStorage** utilizada para sincronizar dos dispositivos (ej. PC y Móvil) en tiempo real **sin necesidad de una base de datos central en la nube**, manteniendo la conexión y reconexión automática incluso si se reinicia la página, se apaga la pantalla o se pierde la red.

Diseñada tanto para **JavaScript (.js / .jsx)** como para **TypeScript (.ts / .tsx)**, con manejo de fallos de red, soporte multi-pestaña y resolución robusta de conflictos financieros/datos.

---

## 📑 Tabla de Contenidos
1. [Arquitectura General y Flujo de Datos](#1-arquitectura-general-y-flujo-de-datos)
2. [Instalación de Dependencias](#2-instalación-de-dependencias)
3. [Estructura de Archivos Recomendada](#3-estructura-de-archivos-recomendada)
4. [Las 7 Mejoras Clave del Sistema Perfeccionado](#4-las-7-mejoras-clave-del-sistema-perfeccionado)
5. [Implementación: Contexto de Sincronización Completo](#5-implementación-contexto-de-sincronización-completo)
   - `SyncContext.jsx` (JavaScript / React)
   - Opcional: Tipos para TypeScript
6. [Implementación: Capa de Almacenamiento Seguro (Storage Service)](#6-implementación-capa-de-almacenamiento-seguro-storage-service)
7. [Implementación: Hooks Reactivos en Tiempo Real](#7-implementación-hooks-reactivos-en-tiempo-real)
8. [Implementación: Componente Modal de Conexión + Código QR](#8-implementación-componente-modal-de-conexión--código-qr)
9. [Sincronización Multi-Pestaña Nativa](#9-sincronización-multi-pestaña-nativa)
10. [Checklist para Producción y Redes 4G/Móviles](#10-checklist-para-producción-y-redes-4gmóviles)

---

## 1. Arquitectura General y Flujo de Datos

```text
  [Dispositivo A (ej. Laptop / PC)]                          [Dispositivo B (ej. Teléfono Móvil)]
 ┌──────────────────────────────────────┐                   ┌──────────────────────────────────────┐
 │          React UI & Hooks            │                   │          React UI & Hooks            │
 │                 │                    │                   │                 ▲                    │
 │                 ▼                    │                   │                 │                    │
 │         Storage Service              │                   │         Storage Service              │
 │      (LocalStorage seguro)           │                   │      (LocalStorage seguro)           │
 │                 │                    │                   │                 ▲                    │
 │                 ▼                    │                   │                 │                    │
 │     CustomEvent('app-local-write')   │                   │    CustomEvent('app-storage-sync')   │
 │                 │                    │                   │                 ▲                    │
 │                 ▼                    │                   │                 │                    │
 │            SyncContext               │  Canal WebRTC P2P │            SyncContext               │
 │  - ID Persistente en LocalStorage    │══════════════════>│  - ID Persistente en LocalStorage    │
 │  - Heartbeat Activo (Ping/Pong)      │  (Directo & E2E)  │  - Heartbeat Activo (Ping/Pong)      │
 │  - Smart Merge (LWW + Tombstones)    │                   │  - Smart Merge (LWW + Tombstones)    │
 └──────────────────────────────────────┘                   └──────────────────────────────────────┘
```

---

## 2. Instalación de Dependencias

En tu proyecto cliente (Vite / Create React App / Next.js):

```bash
npm install peerjs
```

*(Opcional recomendado: Para mostrar códigos QR y conectar el móvil al PC en 2 segundos):*
```bash
npm install qrcode.react
```

---

## 3. Estructura de Archivos Recomendada

```text
src/
├── contexts/
│   └── SyncContext.jsx        # Conexión WebRTC, reconexión, heartbeat y Smart Merge
├── services/
│   └── storage.service.js     # CRUD con control de timestamps, lápidas y eventos
├── hooks/
│   ├── useP2PSync.js          # Acceso al estado de sincronización (conectado, desconectado)
│   └── useSyncCollection.js   # Hook genérico para colecciones reactivas en tiempo real
└── components/
    └── SyncModal.jsx          # Modal con tu ID, input para conectar y código QR
```

---

## 4. Las 7 Mejoras Clave del Sistema Perfeccionado

1. **Safe JSON Parsing**: Evita que caracteres corruptos o estados residuales lancen excepciones no capturadas (`SyntaxError`) que congelen la app.
2. **Auto-depuración Inmediata (`cleanLocalDeletedRecords`)**: Al recibir lápidas (*tombstones*) del par remoto, el dispositivo local purga de inmediato sus datos eliminados de `localStorage` sin esperar a que ocurra una nueva escritura.
3. **Soporte Híbrido: Arrays y Objetos de Configuración**: Fusión elemento a elemento para listas (movimientos, tareas) y fusión a nivel de objeto para registros individuales (reservas, totales, ajustes).
4. **Heartbeat Activo (Ping/Pong)**: WebRTC puede tardar hasta 40 segundos en detectar que un móvil cerró el navegador. El ping/pong detecta la desconexión real en 8 segundos y reactiva el bucle de reconexión.
5. **Memoria de Conexión y Reconexión Automática**: Guarda `app_last_connected_peer_id`. Si recargas con `F5` o cierras la pestaña, al volver a abrirla se reconecta de inmediato sin pedir confirmación.
6. **Protección Anti-Eco (`isApplyingRemoteUpdate`)**: Bloquea el rebote cíclico de mensajes donde el Dispositivo A notifica al Dispositivo B y B le vuelve a notificar a A en bucle infinito.
7. **Sincronización Dual (P2P + Multi-Pestaña)**: Si abres 2 pestañas en la misma computadora, se sincronizan mediante el evento nativo `storage` del navegador, mientras que con el móvil se sincronizan por WebRTC.

---

## 5. Implementación: Contexto de Sincronización Completo

Crea el archivo `src/contexts/SyncContext.jsx` (compatible con JS y TS):

```jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import Peer from 'peerjs';

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================
const MY_PEER_ID_KEY = 'app_persistent_peer_id';
const LAST_PEER_KEY = 'app_last_connected_peer_id';
export const TOMBSTONES_KEY = 'app_tombstones_v1';

// Eventos del bus de datos
export const STORAGE_SYNC_EVENT = 'app-storage-sync';
export const LOCAL_WRITE_EVENT = 'app-local-write';

// Prefijo de las claves que deben sincronizarse
export const DATA_KEY_PREFIX = 'app_';

const SyncContext = createContext(null);

// Helper: JSON Parse seguro que nunca lanza excepción
function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (err) {
    console.warn('[Sync] Fallo al parsear JSON seguro:', err);
    return fallback;
  }
}

// ============================================================================
// 1. GENERACIÓN DE ID PERSISTENTE POR DISPOSITIVO
// ============================================================================
export function getOrCreatePersistentPeerId() {
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

// Fusión de lápidas (tombstones): conserva la fecha de eliminación más reciente
function mergeTombstones(localStr, remoteStr) {
  const localMap = safeJsonParse(localStr, {});
  const remoteMap = safeJsonParse(remoteStr, {});
  const merged = { ...localMap };

  for (const [id, remoteTs] of Object.entries(remoteMap)) {
    const localTs = merged[id] || 0;
    merged[id] = Math.max(localTs, Number(remoteTs));
  }

  // Depurar lápidas con más de 30 días para no saturar memoria
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const [id, ts] of Object.entries(merged)) {
    if (ts < cutoff) delete merged[id];
  }

  return JSON.stringify(merged);
}

// Depuración activa de registros locales eliminados según las lápidas recibidas
function cleanLocalDeletedRecords(tombstonesMap) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_KEY_PREFIX) && key !== TOMBSTONES_KEY) {
        const raw = localStorage.getItem(key);
        const data = safeJsonParse(raw, null);

        // Si es un array de elementos con ID
        if (Array.isArray(data)) {
          const filtered = data.filter((item) => {
            if (!item || !item.id) return true;
            const tombTime = tombstonesMap[item.id];
            if (tombTime === undefined) return true;
            const itemTime = item.updatedAt || item.createdAt || 0;
            return itemTime > tombTime; // Conservar solo si se modificó después del borrado
          });

          if (filtered.length !== data.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      }
    }
  } catch (err) {
    console.error('[Sync] Error al depurar registros locales eliminados:', err);
  }
}

// Fusión de colecciones (Arrays de entidades con ID)
function mergeEntityArrays(localStr, remoteStr, tombstonesMap) {
  const localList = safeJsonParse(localStr, []);
  const remoteList = safeJsonParse(remoteStr, []);

  const map = new Map();

  const isDeleted = (id, time) => {
    const tombTime = tombstonesMap?.[id];
    return tombTime !== undefined && tombTime >= time;
  };

  // 1. Cargar locales válidos
  localList.forEach((item) => {
    if (!item || !item.id) return;
    const time = item.updatedAt || item.createdAt || 0;
    if (!isDeleted(item.id, time)) {
      map.set(item.id, item);
    }
  });

  // 2. Fusión LWW con remotos
  remoteList.forEach((remoteItem) => {
    if (!remoteItem || !remoteItem.id) return;
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

// Fusión genérica según el tipo de datos (Array vs Objeto individual)
function mergeDataEntry(key, localVal, remoteVal, tombstonesMap) {
  if (key === TOMBSTONES_KEY) {
    return mergeTombstones(localVal, remoteVal);
  }

  const parsedRemote = safeJsonParse(remoteVal, null);
  const parsedLocal = safeJsonParse(localVal, null);

  // Caso 1: Array de entidades
  if (Array.isArray(parsedRemote)) {
    return mergeEntityArrays(localVal, remoteVal, tombstonesMap);
  }

  // Caso 2: Objeto individual con campo updatedAt (ej. reservas, ajustes)
  if (
    parsedRemote &&
    typeof parsedRemote === 'object' &&
    parsedLocal &&
    typeof parsedLocal === 'object'
  ) {
    const localTime = parsedLocal.updatedAt || 0;
    const remoteTime = parsedRemote.updatedAt || 0;
    return remoteTime >= localTime ? remoteVal : localVal;
  }

  // Caso 3: Valor primitivo o sin local previo
  return remoteVal;
}

// ============================================================================
// 3. PROVIDER DE REACT
// ============================================================================
export const SyncProvider = ({ children }) => {
  const [peerId, setPeerId] = useState(null);
  const [remotePeerId, setRemotePeerId] = useState(null);
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const isApplyingRemoteUpdate = useRef(false);
  const lastPingReceivedRef = useRef(Date.now());

  // Obtener todos los datos locales marcados para sincronización
  const getAllLocalData = useCallback(() => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(DATA_KEY_PREFIX) || key === TOMBSTONES_KEY) &&
        key !== LAST_PEER_KEY &&
        key !== MY_PEER_ID_KEY
      ) {
        const val = localStorage.getItem(key);
        if (val !== null) data[key] = val;
      }
    }
    return data;
  }, []);

  const sendMessage = useCallback((msg) => {
    if (connRef.current && connRef.current.open) {
      try {
        connRef.current.send(msg);
      } catch (err) {
        console.warn('[Sync] Fallo al enviar mensaje:', err);
      }
    }
  }, []);

  // Procesar mensajes WebRTC entrantes
  const handleIncomingData = useCallback(
    (data) => {
      const msg = data;
      if (!msg || !msg.type) return;

      // Anti-eco: Ignorar mensajes que nosotros mismos originamos
      if (msg.sourcePeerId === peerRef.current?.id) return;

      // Heartbeat: Responder o registrar latido
      if (msg.type === 'PING') {
        lastPingReceivedRef.current = Date.now();
        sendMessage({
          type: 'PONG',
          sourcePeerId: peerRef.current?.id || '',
          timestamp: Date.now(),
        });
        return;
      }
      if (msg.type === 'PONG') {
        lastPingReceivedRef.current = Date.now();
        return;
      }

      isApplyingRemoteUpdate.current = true;
      try {
        // A) Sincronización masiva de datos (al conectar por primera vez)
        if (
          (msg.type === 'INITIAL_SYNC' || msg.type === 'SYNC_MERGED') &&
          msg.payload?.allData
        ) {
          const remoteData = msg.payload.allData;
          const mergedResult = {};
          let hasDifferences = false;

          // 1. Fusionar tombstones primero
          let currentTombstones = {};
          if (remoteData[TOMBSTONES_KEY]) {
            const localTomb = localStorage.getItem(TOMBSTONES_KEY);
            const mergedTomb = mergeTombstones(localTomb, remoteData[TOMBSTONES_KEY]);
            localStorage.setItem(TOMBSTONES_KEY, mergedTomb);
            mergedResult[TOMBSTONES_KEY] = mergedTomb;
            currentTombstones = safeJsonParse(mergedTomb, {});
            cleanLocalDeletedRecords(currentTombstones);
          } else {
            currentTombstones = safeJsonParse(localStorage.getItem(TOMBSTONES_KEY), {});
          }

          // 2. Fusionar todas las claves recibidas del par
          Object.entries(remoteData).forEach(([key, remoteVal]) => {
            if (key === TOMBSTONES_KEY) return;
            const localVal = localStorage.getItem(key);
            const finalVal = mergeDataEntry(key, localVal, remoteVal, currentTombstones);
            mergedResult[key] = finalVal;
            localStorage.setItem(key, finalVal);
            if (finalVal !== remoteVal) {
              hasDifferences = true;
            }
          });

          // 3. Incluir claves locales que el par no tenía
          for (let i = 0; i < localStorage.length; i++) {
            const localKey = localStorage.key(i);
            if (
              localKey &&
              localKey.startsWith(DATA_KEY_PREFIX) &&
              localKey !== LAST_PEER_KEY &&
              localKey !== MY_PEER_ID_KEY
            ) {
              if (!(localKey in remoteData)) {
                const localVal = localStorage.getItem(localKey);
                if (localVal !== null) {
                  const cleanedVal = mergeDataEntry(localKey, localVal, localVal, currentTombstones);
                  mergedResult[localKey] = cleanedVal;
                  localStorage.setItem(localKey, cleanedVal);
                  hasDifferences = true;
                }
              }
            }
          }

          // Si consolidamos datos que el par no tenía, le enviamos la versión fusionada
          if (msg.type === 'INITIAL_SYNC' && hasDifferences) {
            sendMessage({
              type: 'SYNC_MERGED',
              sourcePeerId: peerRef.current?.id || '',
              timestamp: Date.now(),
              payload: { allData: mergedResult },
            });
          }

          // Notificar a toda la interfaz
          window.dispatchEvent(
            new CustomEvent(STORAGE_SYNC_EVENT, {
              detail: { type: 'INITIAL_SYNC', allData: mergedResult },
            })
          );
        }

        // B) Actualización de una sola clave en tiempo real
        else if (msg.type === 'UPDATE_KEY' && msg.payload?.key) {
          const { key, value } = msg.payload;
          if (value === null || value === undefined) {
            localStorage.removeItem(key);
          } else if (key === TOMBSTONES_KEY) {
            const currentLocal = localStorage.getItem(key);
            const merged = mergeTombstones(currentLocal, value);
            localStorage.setItem(key, merged);
            cleanLocalDeletedRecords(safeJsonParse(merged, {}));
          } else {
            const currentLocal = localStorage.getItem(key);
            const tombstones = safeJsonParse(localStorage.getItem(TOMBSTONES_KEY), {});
            const merged = mergeDataEntry(key, currentLocal, value, tombstones);
            localStorage.setItem(key, merged);
          }

          window.dispatchEvent(
            new CustomEvent(STORAGE_SYNC_EVENT, {
              detail: { type: 'UPDATE_KEY', key, value },
            })
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

  // Configuración del DataConnection WebRTC
  const setupConnection = useCallback(
    (connection) => {
      connRef.current = connection;
      setStatus('connecting');

      connection.on('open', () => {
        setStatus('connected');
        lastPingReceivedRef.current = Date.now();

        if (connection.peer) {
          setRemotePeerId(connection.peer);
          // Persistir para reconectar automáticamente tras F5 o reinicio
          localStorage.setItem(LAST_PEER_KEY, connection.peer);
        }

        // Enviar estado local consolidado
        const localData = getAllLocalData();
        connection.send({
          type: 'INITIAL_SYNC',
          sourcePeerId: peerRef.current?.id || '',
          timestamp: Date.now(),
          payload: { allData: localData },
        });
      });

      connection.on('data', (data) => {
        handleIncomingData(data);
      });

      connection.on('close', () => {
        setStatus('disconnected');
        setRemotePeerId(null);
        connRef.current = null;
      });

      connection.on('error', (err) => {
        console.warn('[Sync] Error de conexión P2P:', err);
        setStatus('disconnected');
      });
    },
    [getAllLocalData, handleIncomingData]
  );

  // Conectar a otro dispositivo por su ID
  const connectToPeer = useCallback(
    (targetPeerId) => {
      if (!peerRef.current || !targetPeerId || !targetPeerId.trim()) return;
      const cleanTarget = targetPeerId.trim();
      if (cleanTarget === peerRef.current.id) {
        alert('No puedes conectarte a tu propio ID.');
        return;
      }
      setStatus('connecting');
      const conn = peerRef.current.connect(cleanTarget, { reliable: true });
      setupConnection(conn);
    },
    [setupConnection]
  );

  // Desconectar y olvidar par
  const disconnect = useCallback(() => {
    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }
    localStorage.removeItem(LAST_PEER_KEY);
    setRemotePeerId(null);
    setStatus('disconnected');
  }, []);

  // Transmitir cambios locales al canal P2P
  const broadcastUpdate = useCallback(
    (key, value) => {
      if (!isApplyingRemoteUpdate.current && connRef.current?.open) {
        const stringValue =
          value === null || value === undefined
            ? null
            : typeof value === 'string'
            ? value
            : JSON.stringify(value);

        sendMessage({
          type: 'UPDATE_KEY',
          sourcePeerId: peerRef.current?.id || '',
          timestamp: Date.now(),
          payload: { key, value: stringValue },
        });
      }
    },
    [sendMessage]
  );

  // ============================================================================
  // 4. INICIALIZACIÓN, WATCHDOG Y HEARTBEAT
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
        setTimeout(() => {
          if (peerRef.current && !peerRef.current.destroyed && (!connRef.current || !connRef.current.open)) {
            const conn = peerRef.current.connect(savedPeer, { reliable: true });
            setupConnection(conn);
          }
        }, 300);
      }
    });

    peer.on('connection', (conn) => {
      // Guardar de inmediato para que el receptor también recuerde al emisor al recargar
      if (conn.peer) {
        localStorage.setItem(LAST_PEER_KEY, conn.peer);
        setRemotePeerId(conn.peer);
      }
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.warn('[Sync] Peer event error:', err.type, err);
      // Si el servidor retiene el ID de la sesión previa al recargar:
      if (err.type === 'unavailable-id') {
        console.warn('[Sync] ID retenido por recarga rápida. Reintentando reconexión en 1.5s...');
        setTimeout(() => {
          if (peerRef.current && !peerRef.current.destroyed) {
            peerRef.current.reconnect();
          }
        }, 1500);
      }
      setStatus('disconnected');
    });

    // Limpieza limpia al recargar o cerrar pestaña para liberar el ID en el servidor al instante
    const handleBeforeUnload = () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // A) Heartbeat Ping cada 6 segundos para detectar desconexión real de inmediato
    const heartbeatInterval = setInterval(() => {
      if (connRef.current && connRef.current.open) {
        // Enviar Ping
        sendMessage({
          type: 'PING',
          sourcePeerId: peerRef.current?.id || '',
          timestamp: Date.now(),
        });

        // Si en 18 segundos no respondió ningún Ping/Pong, considerar desconectado
        if (Date.now() - lastPingReceivedRef.current > 18000) {
          console.warn('[Sync] Heartbeat timeout: par remoto inalcanzable');
          connRef.current.close();
          setStatus('disconnected');
        }
      }
    }, 6000);

    // B) Watchdog: Reintenta reconectar silenciosamente si tenemos un par registrado y estamos desconectados
    const watchdogInterval = setInterval(() => {
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
        } catch {
          // Reintento silencioso
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeatInterval);
      clearInterval(watchdogInterval);
      peer.destroy();
    };
  }, [setupConnection, sendMessage]);

  // Escuchar eventos locales de guardado
  useEffect(() => {
    const handleLocal = (e) => {
      if (e.detail && e.detail.key) {
        broadcastUpdate(e.detail.key, e.detail.value);
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
  if (!context) {
    throw new Error('usePeerSync debe usarse dentro de un SyncProvider');
  }
  return context;
};

// Disparador global para que la capa de almacenamiento notifique cambios
export function notifyLocalWrite(key, value) {
  window.dispatchEvent(
    new CustomEvent(LOCAL_WRITE_EVENT, {
      detail: { key, value },
    })
  );
}
```

---

## 6. Implementación: Capa de Almacenamiento Seguro (`storage.service.js`)

Aquí se aplican las reglas de persistencia:
1. **Cada creación o edición actualiza `updatedAt: Date.now()`**.
2. **Cada eliminación registra un `tombstone`** para que el otro dispositivo no lo reviva al sincronizar.
3. Se invoca `notifyLocalWrite(key, value)` para transmitir de inmediato por WebRTC.

```javascript
import { notifyLocalWrite, TOMBSTONES_KEY, DATA_KEY_PREFIX } from '../contexts/SyncContext';

const MOVEMENTS_KEY = `${DATA_KEY_PREFIX}movements_v1`;
const RESERVES_KEY = `${DATA_KEY_PREFIX}reserves_v1`;

// Safe JSON Parse interno
function parse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// 1. REGISTRAR LÁPIDA DE BORRADO (Tombstone)
export function recordTombstone(id) {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    const tombstones = parse(raw, {});
    tombstones[id] = Date.now();
    const payload = JSON.stringify(tombstones);
    localStorage.setItem(TOMBSTONES_KEY, payload);
    notifyLocalWrite(TOMBSTONES_KEY, payload);
  } catch (err) {
    console.error('Error guardando lápida:', err);
  }
}

export const StorageService = {
  // ==========================================
  // MOVIMIENTOS (Colección / Array de entidades)
  // ==========================================
  getMovements() {
    return parse(localStorage.getItem(MOVEMENTS_KEY), []);
  },

  saveMovement(movement) {
    const list = this.getMovements();
    const now = Date.now();
    const index = list.findIndex((m) => m.id === movement.id);

    const record = {
      ...movement,
      updatedAt: now,
      createdAt: movement.createdAt || now,
    };

    if (index >= 0) {
      list[index] = record;
    } else {
      list.unshift(record);
    }

    const payload = JSON.stringify(list);
    localStorage.setItem(MOVEMENTS_KEY, payload);
    notifyLocalWrite(MOVEMENTS_KEY, payload);
    return record;
  },

  deleteMovement(id) {
    const list = this.getMovements().filter((m) => m.id !== id);
    const payload = JSON.stringify(list);
    localStorage.setItem(MOVEMENTS_KEY, payload);

    // Muy importante: primero la lápida, luego la lista actualizada
    recordTombstone(id);
    notifyLocalWrite(MOVEMENTS_KEY, payload);
  },

  // ==========================================
  // RESERVA (Objeto individual de configuración)
  // ==========================================
  getReserves() {
    return parse(localStorage.getItem(RESERVES_KEY), { amount: 0, updatedAt: 0 });
  },

  saveReserves(reservesData) {
    const payloadObj = {
      ...reservesData,
      updatedAt: Date.now(),
    };
    const payload = JSON.stringify(payloadObj);
    localStorage.setItem(RESERVES_KEY, payload);
    notifyLocalWrite(RESERVES_KEY, payload);
    return payloadObj;
  },
};
```

---

## 7. Implementación: Hooks Reactivos en Tiempo Real

Para que la pantalla reaccione al instante cuando el otro dispositivo añade un movimiento o modifica una reserva:

```javascript
// src/hooks/useMovements.js
import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage.service';
import { STORAGE_SYNC_EVENT } from '../contexts/SyncContext';

export function useMovements() {
  const [movements, setMovements] = useState(() => StorageService.getMovements());

  const refresh = useCallback(() => {
    setMovements(StorageService.getMovements());
  }, []);

  useEffect(() => {
    const handleSync = (e) => {
      // Si fue sincronización masiva o si se actualizó la clave de movimientos
      if (!e.detail?.key || e.detail.key.includes('movements')) {
        refresh();
      }
    };

    window.addEventListener(STORAGE_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(STORAGE_SYNC_EVENT, handleSync);
  }, [refresh]);

  return {
    movements,
    addMovement: (item) => {
      StorageService.saveMovement(item);
      refresh();
    },
    deleteMovement: (id) => {
      StorageService.deleteMovement(id);
      refresh();
    },
    refreshMovements: refresh,
  };
}
```

---

## 8. Implementación: Componente Modal de Conexión + Código QR

Un componente moderno para conectar tu móvil con tu PC escaneando el código QR o copiando el ID:

```jsx
// src/components/SyncModal.jsx
import React, { useState } from 'react';
import { usePeerSync } from '../contexts/SyncContext';
import { QRCodeSVG } from 'qrcode.react'; // npm install qrcode.react

export const SyncModal = ({ isOpen, onClose }) => {
  const { peerId, remotePeerId, status, connectToPeer, disconnect } = usePeerSync();
  const [targetId, setTargetId] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!peerId) return;
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (targetId.trim()) {
      connectToPeer(targetId.trim());
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>Sincronización P2P</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Indicador de Estado */}
        <div style={styles.statusBadge(status)}>
          ● {status === 'connected' ? 'Sincronizado en Tiempo Real' : status === 'connecting' ? 'Conectando...' : 'Sin Conexión P2P'}
        </div>

        {status === 'connected' ? (
          <div style={styles.connectedCard}>
            <p>Conectado activamente con:</p>
            <code style={styles.code}>{remotePeerId}</code>
            <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Tus datos se mantienen sincronizados automáticamente entre ambos dispositivos.
            </p>
            <button onClick={disconnect} style={styles.disconnectBtn}>
              Desconectar dispositivos
            </button>
          </div>
        ) : (
          <div>
            {/* Mi ID + QR */}
            <div style={styles.qrSection}>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#555' }}>
                Escanea con tu teléfono o copia este ID:
              </p>
              {peerId ? (
                <div style={{ background: '#fff', padding: 12, display: 'inline-block', borderRadius: 8 }}>
                  <QRCodeSVG value={peerId} size={150} />
                </div>
              ) : (
                <p>Generando ID seguro...</p>
              )}
              <div style={{ marginTop: 10 }}>
                <code style={styles.code}>{peerId || '...'}</code>
                <button onClick={handleCopy} style={styles.copyBtn}>
                  {copied ? '¡Copiado!' : 'Copiar ID'}
                </button>
              </div>
            </div>

            {/* Formulario de Conexión Manual */}
            <form onSubmit={handleConnect} style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 'bold' }}>Conectar a otro dispositivo:</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="Pega el ID del otro dispositivo..."
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  style={styles.input}
                />
                <button
                  type="submit"
                  disabled={status === 'connecting' || !targetId.trim()}
                  style={styles.connectBtn}
                >
                  {status === 'connecting' ? 'Conectando...' : 'Emparejar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', width: '90%', maxWidth: 440, borderRadius: 12,
    padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', color: '#1a1a1a',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeBtn: { border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' },
  statusBadge: (st) => ({
    padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, textAlign: 'center',
    marginBottom: 16,
    background: st === 'connected' ? '#e6f7ec' : st === 'connecting' ? '#fff7e6' : '#f0f0f0',
    color: st === 'connected' ? '#1b803a' : st === 'connecting' ? '#b25900' : '#666',
  }),
  qrSection: { textAlign: 'center', background: '#f9f9f9', padding: 16, borderRadius: 8 },
  code: { background: '#eee', padding: '4px 8px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all' },
  copyBtn: { marginLeft: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' },
  input: { flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 },
  connectBtn: { padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  connectedCard: { textAlign: 'center', padding: 20, background: '#f8fafc', borderRadius: 8 },
  disconnectBtn: { marginTop: 16, padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
};
```

---

## 9. Sincronización Multi-Pestaña Nativa

Si el usuario abre 2 pestañas del proyecto en la misma computadora, no hace falta que se conecten por WebRTC. Los navegadores ofrecen el evento nativo `window.addEventListener('storage', ...)`.

Para soportar ambas cosas de forma transparente, agrega este listener en tu `App.jsx` o en `useMovements.js`:

```javascript
useEffect(() => {
  const handleNativeStorage = (e) => {
    // Solo reacciona si el cambio vino de OTRA pestaña en el mismo origen
    if (e.key && e.key.startsWith(DATA_KEY_PREFIX)) {
      window.dispatchEvent(
        new CustomEvent(STORAGE_SYNC_EVENT, {
          detail: { key: e.key, value: e.newValue },
        })
      );
    }
  };

  window.addEventListener('storage', handleNativeStorage);
  return () => window.removeEventListener('storage', handleNativeStorage);
}, []);
```

Con esto, tus datos se sincronizan:
- Entre pestañas de la misma PC: mediante `storage` nativo.
- Entre dispositivos distintos (PC y Celular): mediante `WebRTC P2P`.

---

## 10. Checklist para Producción y Redes 4G/Móviles

1. **Protocolo HTTPS**:
   - WebRTC requiere HTTPS en producción (excepto en `localhost`). Asegúrate de desplegar en un host con SSL (Vercel, Netlify, Cloudflare Pages o Firebase Hosting).
2. **Servidores STUN / TURN para Datos Móviles (4G/5G)**:
   - Los servidores STUN de Google incluidos (`stun:stun.l.google.com:19302`) funcionan perfecto en WiFi y la mayoría de redes normales.
   - En operadores móviles con NAT simétrico estricto, algunos paquetes no pueden viajar directamente. Si necesitas 100% de garantía en cualquier red móvil del mundo, agrega un servidor TURN gratuito como **Metered.ca** o **Twilio TURN** a la lista de `iceServers`.
3. **Servidor de Señalización Privado (Opcional)**:
   - Para no depender de la nube pública de `peerjs.com`, puedes alojar tu propio servidor con Node.js en Render o Railway:
     ```javascript
     const { PeerServer } = require('peer');
     const server = PeerServer({ port: 9000, path: '/peerjs' });
     ```
   - Y en tu cliente:
     ```javascript
     new Peer(persistentId, {
       host: 'tu-servidor.onrender.com',
       port: 443,
       secure: true,
       path: '/peerjs',
     });
     ```
