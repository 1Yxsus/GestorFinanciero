import { useState, useRef, useEffect, useCallback } from 'react';
import { PeerSyncManager } from '../services/peerService';
import { storageService } from '../services/storageService';

const SAVED_ROOM_KEY = 'aurum_paired_room_code';
const SAVED_SYNC_ROLE = 'aurum_sync_role'; // 'host' | 'client'

export function useP2PSync({ onSyncSuccess, onLiveUpdateReceived }) {
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'initializing' | 'ready_to_pair' | 'connecting' | 'connected' | 'error' | 'disconnected'
  const [myCode, setMyCode] = useState(() => {
    try {
      const role = localStorage.getItem(SAVED_SYNC_ROLE);
      return role === 'host' ? localStorage.getItem(SAVED_ROOM_KEY) || '' : '';
    } catch {
      return '';
    }
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSyncStats, setLastSyncStats] = useState(null);
  const [savedRoomCode, setSavedRoomCode] = useState(() => {
    try {
      return localStorage.getItem(SAVED_ROOM_KEY) || '';
    } catch {
      return '';
    }
  });

  const managerRef = useRef(null);

  // Limpieza del gestor P2P
  const cleanup = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }
  }, []);

  // Desconexión manual intencional (olvida la vinculación para no reconectar solo)
  const disconnect = useCallback(() => {
    cleanup();
    try {
      localStorage.removeItem(SAVED_ROOM_KEY);
      localStorage.removeItem(SAVED_SYNC_ROLE);
      setSavedRoomCode('');
      setMyCode('');
      setSyncStatus('idle');
      setErrorMessage('');
    } catch {}
  }, [cleanup]);

  const initManager = useCallback(() => {
    cleanup();

    managerRef.current = new PeerSyncManager({
      onStatusChange: ({ status, code, targetCode }) => {
        setSyncStatus(status);
        if (code) {
          setMyCode(code);
          try {
            localStorage.setItem(SAVED_ROOM_KEY, code);
            localStorage.setItem(SAVED_SYNC_ROLE, 'host');
            setSavedRoomCode(code);
          } catch {}
        }
      },
      onDataReceived: (incomingPayload, sendReplyCallback, meta = {}) => {
        if (!incomingPayload || typeof incomingPayload !== 'object') {
          return;
        }

        const localData = storageService.loadData();
        const { mergedData, stats } = storageService.mergeAllData(localData, incomingPayload);

        // Guardar datos con marca isRemoteSync para no provocar eco
        storageService.saveData(mergedData, { isRemoteSync: true });
        setLastSyncStats(stats);

        if (meta.isLiveUpdate) {
          if (onLiveUpdateReceived) {
            onLiveUpdateReceived(stats);
          }
        } else if (onSyncSuccess) {
          onSyncSuccess(stats);
        }

        // Si somos el host y recibimos una oferta (SYNC_OFFER), respondemos con el estado unificado completo
        if (sendReplyCallback) {
          sendReplyCallback(mergedData);
        }
      },
      onError: (err) => {
        console.warn('Peer error in hook:', err);
        setSyncStatus('error');
        setErrorMessage(
          typeof err === 'string'
            ? err
            : err.message || 'Error de conexión P2P. Puedes usar el código QR de respaldo o importar JSON.'
        );
      },
    });

    return managerRef.current;
  }, [cleanup, onSyncSuccess, onLiveUpdateReceived]);

  // Modo Host: Crear sala para que el otro dispositivo se conecte
  const startHosting = useCallback((customCode = null) => {
    setErrorMessage('');
    const mgr = initManager();
    mgr.startHost(customCode);
  }, [initManager]);

  // Modo Cliente: Conectarse al código del Host enviando el estado local completo
  const connectWithCode = useCallback((targetCode) => {
    if (!targetCode || targetCode.trim().length < 4) {
      setErrorMessage('Por favor ingresa un código válido de 6 caracteres.');
      return;
    }

    const cleanCode = targetCode.trim().toUpperCase();
    try {
      localStorage.setItem(SAVED_ROOM_KEY, cleanCode);
      localStorage.setItem(SAVED_SYNC_ROLE, 'client');
      setSavedRoomCode(cleanCode);
    } catch {}

    setErrorMessage('');
    const mgr = initManager();
    const localData = storageService.loadData();

    mgr.connectToHost(cleanCode, localData);
  }, [initManager]);

  // 1. RECONEXIÓN AUTOMÁTICA AL CARGAR LA PÁGINA (F5 / Reinicio)
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem(SAVED_SYNC_ROLE);
      const savedCode = localStorage.getItem(SAVED_ROOM_KEY);

      if (savedCode && savedRole) {
        console.log(`[P2P] Restaurando sesión de sincronización previa: ${savedRole} -> ${savedCode}`);
        if (savedRole === 'host') {
          startHosting(savedCode);
        } else if (savedRole === 'client') {
          setTimeout(() => {
            connectWithCode(savedCode);
          }, 400);
        }
      }
    } catch (e) {
      console.warn('Error al leer sesión previa de P2P:', e);
    }
  }, [startHosting, connectWithCode]);

  // 2. WATCHDOG: Reintento silencioso si éramos cliente y la conexión se cayó o el host recargó
  useEffect(() => {
    if (syncStatus === 'disconnected' || syncStatus === 'error') {
      const savedRole = localStorage.getItem(SAVED_SYNC_ROLE);
      const savedCode = localStorage.getItem(SAVED_ROOM_KEY);

      if (savedRole === 'client' && savedCode) {
        const timer = setTimeout(() => {
          console.log('[P2P Watchdog] Reintentando conexión con anfitrión:', savedCode);
          connectWithCode(savedCode);
        }, 7000);
        return () => clearTimeout(timer);
      }
    }
  }, [syncStatus, connectWithCode]);

  // 3. LIMPIEZA LIMPIA AL CERRAR O RECARGAR PESTAÑA
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
  }, [cleanup]);

  // Retransmisión automática en tiempo real cuando hay mutaciones locales
  useEffect(() => {
    const handleLocalMutation = (e) => {
      if (e.detail?.isRemoteSync) return;
      if (managerRef.current && syncStatus === 'connected') {
        const payload = e.detail?.payload || storageService.getExportPayload();
        managerRef.current.broadcastLiveUpdate(payload);
      }
    };

    window.addEventListener('aurum_local_mutation', handleLocalMutation);
    return () => window.removeEventListener('aurum_local_mutation', handleLocalMutation);
  }, [syncStatus]);

  // Enviar cambio manual
  const broadcastLocalChange = useCallback((payload = null) => {
    if (!managerRef.current || syncStatus !== 'connected') return false;
    const dataToSend = payload || storageService.getExportPayload();
    return managerRef.current.broadcastLiveUpdate(dataToSend);
  }, [syncStatus]);

  // Respaldo manual: Importar texto/JSON con todas las entidades
  const importManualData = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      const incomingData = Array.isArray(parsed) ? { movements: parsed } : parsed;
      if (!incomingData || typeof incomingData !== 'object') {
        throw new Error('Formato JSON no válido: los datos están corruptos.');
      }

      const localData = storageService.loadData();
      const { mergedData, stats } = storageService.mergeAllData(localData, incomingData);

      storageService.saveData(mergedData, { isRemoteSync: true });
      setLastSyncStats(stats);
      if (onSyncSuccess) onSyncSuccess(stats);
      return { success: true, stats };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [onSyncSuccess]);

  return {
    syncStatus,
    isLiveConnected: syncStatus === 'connected',
    myCode,
    savedRoomCode,
    errorMessage,
    lastSyncStats,
    startHosting,
    connectWithCode,
    broadcastLocalChange,
    importManualData,
    disconnect,
    cleanup: disconnect,
  };
}
