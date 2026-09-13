import { useState, useRef, useEffect, useCallback } from 'react';
import { PeerSyncManager } from '../services/peerService';
import { storageService } from '../services/storageService';

export function useP2PSync({ onSyncSuccess }) {
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'initializing' | 'ready_to_pair' | 'connecting' | 'connected' | 'sync_completed' | 'error'
  const [myCode, setMyCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSyncStats, setLastSyncStats] = useState(null);

  const managerRef = useRef(null);

  // Inicializar o limpiar el gestor P2P
  const cleanup = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const initManager = useCallback(() => {
    cleanup();

    managerRef.current = new PeerSyncManager({
      onStatusChange: ({ status, code, targetCode }) => {
        setSyncStatus(status);
        if (code) setMyCode(code);
      },
      onDataReceived: (incomingPayload, sendReplyCallback) => {
        if (!incomingPayload || typeof incomingPayload !== 'object') {
          return;
        }

        const localData = storageService.loadData();
        const { mergedData, stats } = storageService.mergeAllData(localData, incomingPayload);

        storageService.saveData(mergedData);
        setLastSyncStats(stats);

        if (onSyncSuccess) {
          onSyncSuccess(stats);
        }

        // Si somos el host y recibimos una oferta (SYNC_OFFER), respondemos con el estado unificado completo
        if (sendReplyCallback) {
          sendReplyCallback(mergedData);
        }
      },
      onError: (err) => {
        console.error('Peer error in hook:', err);
        setSyncStatus('error');
        setErrorMessage(
          typeof err === 'string'
            ? err
            : err.message || 'Error de conexión P2P. Puedes usar el código QR de respaldo o importar JSON.'
        );
      },
    });

    return managerRef.current;
  }, [cleanup, onSyncSuccess]);

  // Modo Host: Crear sala para que el otro dispositivo se conecte
  const startHosting = useCallback(() => {
    setErrorMessage('');
    const mgr = initManager();
    mgr.startHost();
  }, [initManager]);

  // Modo Cliente: Conectarse al código del Host enviando el estado local completo
  const connectWithCode = useCallback((targetCode) => {
    if (!targetCode || targetCode.trim().length < 4) {
      setErrorMessage('Por favor ingresa un código válido de 6 caracteres.');
      return;
    }

    setErrorMessage('');
    const mgr = initManager();
    const localData = storageService.loadData();

    mgr.connectToHost(targetCode.trim().toUpperCase(), localData);
  }, [initManager]);

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

      storageService.saveData(mergedData);
      setLastSyncStats(stats);
      if (onSyncSuccess) onSyncSuccess(stats);
      return { success: true, stats };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [onSyncSuccess]);

  return {
    syncStatus,
    myCode,
    errorMessage,
    lastSyncStats,
    startHosting,
    connectWithCode,
    importManualData,
    cleanup,
  };
}
