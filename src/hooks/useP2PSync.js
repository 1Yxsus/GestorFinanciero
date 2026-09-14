import { useState, useRef, useEffect, useCallback } from 'react';
import { PeerSyncManager, generateDeviceCode } from '../services/peerService';
import { storageService } from '../services/storageService';

const MY_DEVICE_CODE_KEY = 'aurum_my_device_code';
const PAIRED_DEVICE_CODE_KEY = 'aurum_paired_device_code';
const SESSION_DEVICE_CODE_KEY = 'aurum_session_device_code';

export function getOrCreateMyDeviceCode() {
  try {
    const sessionCode = sessionStorage.getItem(SESSION_DEVICE_CODE_KEY);
    if (sessionCode) return sessionCode.trim().toUpperCase();

    let code = localStorage.getItem(MY_DEVICE_CODE_KEY);
    if (!code) {
      code = generateDeviceCode();
      localStorage.setItem(MY_DEVICE_CODE_KEY, code);
    }
    sessionStorage.setItem(SESSION_DEVICE_CODE_KEY, code);
    return code.trim().toUpperCase();
  } catch {
    return generateDeviceCode();
  }
}

export function getStoredPairedDeviceCode(myCode) {
  try {
    const sessionPaired = sessionStorage.getItem(PAIRED_DEVICE_CODE_KEY);
    if (sessionPaired && !sessionPaired.startsWith('TEST-') && sessionPaired.length >= 4) {
      return sessionPaired.trim().toUpperCase();
    }

    if (myCode) {
      const perDevice = localStorage.getItem(`${PAIRED_DEVICE_CODE_KEY}_${myCode}`);
      if (perDevice && !perDevice.startsWith('TEST-') && perDevice.length >= 4) {
        return perDevice.trim().toUpperCase();
      }
    }

    const generic = localStorage.getItem(PAIRED_DEVICE_CODE_KEY) || '';
    if (generic && generic.startsWith('TEST-')) {
      try {
        localStorage.removeItem(PAIRED_DEVICE_CODE_KEY);
      } catch {}
      return '';
    }

    if (
      generic &&
      generic.length >= 4 &&
      myCode &&
      generic.trim().toUpperCase() !== myCode.trim().toUpperCase()
    ) {
      return generic.trim().toUpperCase();
    }
    return '';
  } catch {
    return '';
  }
}

export function saveStoredPairedDeviceCode(myCode, pairedCode) {
  try {
    if (!pairedCode) {
      sessionStorage.removeItem(PAIRED_DEVICE_CODE_KEY);
      localStorage.removeItem(PAIRED_DEVICE_CODE_KEY);
      if (myCode) {
        localStorage.removeItem(`${PAIRED_DEVICE_CODE_KEY}_${myCode}`);
      }
      return;
    }
    const clean = pairedCode.trim().toUpperCase();
    sessionStorage.setItem(PAIRED_DEVICE_CODE_KEY, clean);
    localStorage.setItem(PAIRED_DEVICE_CODE_KEY, clean);
    if (myCode) {
      localStorage.setItem(`${PAIRED_DEVICE_CODE_KEY}_${myCode}`, clean);
    }
  } catch {}
}

export function useP2PSync({ onSyncSuccess, onLiveUpdateReceived }) {
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'initializing' | 'ready' | 'connecting' | 'connected' | 'error' | 'disconnected'
  const [myCode, setMyCode] = useState(getOrCreateMyDeviceCode);
  const [pairedCode, setPairedCode] = useState(() => getStoredPairedDeviceCode(getOrCreateMyDeviceCode()));
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSyncStats, setLastSyncStats] = useState(null);

  const managerRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // Referencias estables de callbacks
  const onSyncSuccessRef = useRef(onSyncSuccess);
  const onLiveUpdateReceivedRef = useRef(onLiveUpdateReceived);
  useEffect(() => {
    onSyncSuccessRef.current = onSyncSuccess;
    onLiveUpdateReceivedRef.current = onLiveUpdateReceived;
  });

  const cleanup = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }
  }, []);

  // Inicializar el gestor P2P
  const initManager = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }

    managerRef.current = new PeerSyncManager({
      getLocalData: () => storageService.loadData(),
      onStatusChange: ({ status, myCode: currentCode, pairedCode: remoteCode }) => {
        setSyncStatus(status);
        if (status === 'ready' || status === 'connected') {
          setErrorMessage('');
        }
        if (currentCode) {
          setMyCode(currentCode);
          try {
            sessionStorage.setItem(SESSION_DEVICE_CODE_KEY, currentCode);
          } catch {}
        }
        // Preservar siempre la vinculación persistente
        if (remoteCode) {
          setPairedCode(remoteCode);
          saveStoredPairedDeviceCode(currentCode || getOrCreateMyDeviceCode(), remoteCode);
        } else {
          const stored = getStoredPairedDeviceCode(currentCode || getOrCreateMyDeviceCode());
          setPairedCode(stored);
        }
      },
      onPairedDeviceDiscovered: (discoveredRemoteCode) => {
        console.log('[P2P] Dispositivo remoto vinculado descubierto:', discoveredRemoteCode);
        const codeToSave = discoveredRemoteCode.trim().toUpperCase();
        const activeMyCode = getOrCreateMyDeviceCode();
        saveStoredPairedDeviceCode(activeMyCode, codeToSave);
        setPairedCode(codeToSave);
      },
      onDataReceived: (incomingPayload, sendReplyCallback, meta = {}) => {
        if (!incomingPayload || typeof incomingPayload !== 'object') {
          return;
        }

        const localData = storageService.loadData();
        const { mergedData, stats } = storageService.mergeAllData(localData, incomingPayload);

        // Guardar con marca isRemoteSync para no provocar eco
        storageService.saveData(mergedData, { isRemoteSync: true });
        setLastSyncStats(stats);

        if (meta.isLiveUpdate) {
          if (onLiveUpdateReceivedRef.current) {
            onLiveUpdateReceivedRef.current(stats);
          }
        } else if (onSyncSuccessRef.current) {
          onSyncSuccessRef.current(stats);
        }

        if (sendReplyCallback) {
          sendReplyCallback(mergedData);
        }
      },
      onError: (err) => {
        if (!err) {
          setErrorMessage('');
          return;
        }
        console.warn('[P2P Hook] Error:', err);
        const msg = typeof err === 'string' ? err : err.message || '';
        const errType = err.type || '';

        if (msg.includes('Lost connection to server') || errType === 'network') {
          console.log('[P2P Hook] Reconexión transitoria de señalización...');
          return;
        }

        if (errType === 'peer-unavailable') {
          return;
        }

        setSyncStatus('error');
        if (errType === 'browser-incompatible') {
          setErrorMessage('Tu navegador no soporta WebRTC para sincronización directa.');
        } else {
          setErrorMessage(
            msg || 'Error en canal P2P. Puedes usar el respaldo JSON mientras tanto.'
          );
        }
      },
    });

    return managerRef.current;
  }, []);

  // Vincular este dispositivo con el código del otro dispositivo
  const pairWithDevice = useCallback(
    (targetCode) => {
      if (!targetCode || targetCode.trim().length < 4) {
        setErrorMessage('Por favor ingresa un código válido de 6 caracteres.');
        return;
      }

      const cleanTarget = targetCode.trim().toUpperCase();
      let currentMyCode = getOrCreateMyDeviceCode();

      // Soporte para pruebas en la misma PC / mismo navegador:
      if (cleanTarget === currentMyCode) {
        const newTabCode = generateDeviceCode();
        try {
          sessionStorage.setItem(SESSION_DEVICE_CODE_KEY, newTabCode);
        } catch {}
        currentMyCode = newTabCode;
        setMyCode(newTabCode);
      }

      saveStoredPairedDeviceCode(currentMyCode, cleanTarget);
      setPairedCode(cleanTarget);
      setErrorMessage('');

      if (!managerRef.current) {
        const mgr = initManager();
        mgr.startDevice({
          myDeviceCode: currentMyCode,
          pairedDeviceCode: cleanTarget,
        });
      } else {
        managerRef.current.pairWith(cleanTarget);
      }
    },
    [initManager]
  );

  // Desvincular dispositivo
  const unpairDevice = useCallback(() => {
    console.log('[P2P Hook] Desvinculando dispositivo');
    const activeMyCode = getOrCreateMyDeviceCode();
    saveStoredPairedDeviceCode(activeMyCode, '');
    setPairedCode('');
    setErrorMessage('');
    if (managerRef.current) {
      managerRef.current.unpair();
    }
  }, []);

  // Generar un código nuevo para este dispositivo
  const regenerateMyCode = useCallback(() => {
    const newCode = generateDeviceCode();
    try {
      localStorage.setItem(MY_DEVICE_CODE_KEY, newCode);
      sessionStorage.setItem(SESSION_DEVICE_CODE_KEY, newCode);
      saveStoredPairedDeviceCode(newCode, '');
    } catch {}
    setMyCode(newCode);
    setPairedCode('');
    setErrorMessage('');

    const mgr = initManager();
    mgr.startDevice({
      myDeviceCode: newCode,
      pairedDeviceCode: null,
    });
  }, [initManager]);

  // Asegurar que la sesión P2P esté corriendo y conectada
  const startHosting = useCallback(() => {
    const currentMyCode = getOrCreateMyDeviceCode();
    const currentPaired = getStoredPairedDeviceCode(currentMyCode);

    if (!managerRef.current) {
      const mgr = initManager();
      mgr.startDevice({
        myDeviceCode: currentMyCode,
        pairedDeviceCode: currentPaired || null,
      });
    } else if (currentPaired && (!managerRef.current.connection || !managerRef.current.connection.open)) {
      managerRef.current.attemptConnection();
    }
  }, [initManager]);

  // 1. INICIALIZACIÓN INMEDIATA Y PERSISTENTE AL ARRANCAR LA APLICACIÓN
  useEffect(() => {
    const currentMyCode = getOrCreateMyDeviceCode();
    const currentPaired = getStoredPairedDeviceCode(currentMyCode);

    console.log(`[P2P Boot] Mi Código: ${currentMyCode} | Vinculado a: ${currentPaired || '(ninguno)'}`);

    const mgr = initManager();
    mgr.startDevice({
      myDeviceCode: currentMyCode,
      pairedDeviceCode: currentPaired || null,
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [initManager]);

  // 2. DETECCIÓN INSTANTÁNEA AL DESBLOQUEAR PANTALLA O VOLVER A LA PESTAÑA
  useEffect(() => {
    const handleInstantWakeup = () => {
      if (document.visibilityState === 'visible') {
        if (managerRef.current) {
          if (managerRef.current.peer && managerRef.current.peer.disconnected) {
            try {
              managerRef.current.peer.reconnect();
            } catch {}
          }
          if (!managerRef.current.connection || !managerRef.current.connection.open) {
            console.log('[P2P Wakeup] Pantalla activa/visible: reconectando instantáneamente...');
            managerRef.current.attemptConnection();
          }
        }
      }
    };

    window.addEventListener('focus', handleInstantWakeup);
    document.addEventListener('visibilitychange', handleInstantWakeup);
    return () => {
      window.removeEventListener('focus', handleInstantWakeup);
      document.removeEventListener('visibilitychange', handleInstantWakeup);
    };
  }, []);

  // 3. LIMPIEZA LIMPIA AL CERRAR PESTAÑA
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 4. RETRANSMISIÓN EN TIEMPO REAL CUANDO HAY MUTACIONES LOCALES
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

  // Respaldo manual: Importar texto/JSON
  const importManualData = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      const incomingData = Array.isArray(parsed) ? { movements: parsed } : parsed;
      if (!incomingData || typeof incomingData !== 'object') {
        throw new Error('Formato JSON no válido.');
      }

      const localData = storageService.loadData();
      const { mergedData, stats } = storageService.mergeAllData(localData, incomingData);

      storageService.saveData(mergedData, { isRemoteSync: true });
      setLastSyncStats(stats);
      if (onSyncSuccessRef.current) onSyncSuccessRef.current(stats);
      return { success: true, stats };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  return {
    syncStatus,
    isLiveConnected: syncStatus === 'connected',
    myCode,
    pairedCode,
    savedRoomCode: pairedCode, // alias para compatibilidad
    errorMessage,
    lastSyncStats,
    pairWithDevice,
    connectWithCode: pairWithDevice, // alias para compatibilidad
    startHosting,
    unpairDevice,
    disconnect: unpairDevice, // alias para compatibilidad
    regenerateMyCode,
    broadcastLocalChange,
    importManualData,
    cleanup,
  };
}
