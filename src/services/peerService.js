// Servicio de sincronización P2P WebRTC directo entre dispositivos con identidades únicas vía PeerJS
import { Peer } from 'peerjs';

/**
 * Genera un código único aleatorio de 6 caracteres alfanuméricos en mayúsculas
 */
export function generateDeviceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para evitar confusiones
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const PEER_PREFIX = 'aurum-p2p-';

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export class PeerSyncManager {
  constructor({ onStatusChange, onDataReceived, onError, onPairedDeviceDiscovered, getLocalData }) {
    this.peer = null;
    this.connection = null;
    this.myDeviceCode = null;
    this.pairedDeviceCode = null;
    this.myPeerId = null;
    this.remotePeerId = null;

    this.onStatusChange = onStatusChange || (() => {});
    this.onDataReceived = onDataReceived || (() => {});
    this.onError = onError || (() => {});
    this.onPairedDeviceDiscovered = onPairedDeviceDiscovered || (() => {});
    this.getLocalData = getLocalData || (() => null);

    this.heartbeatTimer = null;
    this.watchdogTimer = null;
    this.reconnectTimeout = null;
    this.unavailableRetryCount = 0;
    this.isDestroyed = false;
    this.isConnecting = false;
    this.lastPongTime = Date.now();
  }

  /**
   * Inicializa la identidad permanente de este dispositivo y reanuda conexión con el último dispositivo vinculado
   */
  startDevice({ myDeviceCode, pairedDeviceCode = null }) {
    this.destroy();
    this.isDestroyed = false;
    this.myDeviceCode = myDeviceCode.trim().toUpperCase();
    this.myPeerId = `${PEER_PREFIX}${this.myDeviceCode.toLowerCase()}`;

    if (pairedDeviceCode && pairedDeviceCode.trim()) {
      this.pairedDeviceCode = pairedDeviceCode.trim().toUpperCase();
      this.remotePeerId = `${PEER_PREFIX}${this.pairedDeviceCode.toLowerCase()}`;
    } else {
      this.pairedDeviceCode = null;
      this.remotePeerId = null;
    }

    console.log(`[PeerJS] Dispositivo: ${this.myDeviceCode} | Par vinculado: ${this.pairedDeviceCode || '(ninguno)'}`);

    this.onStatusChange({
      status: 'initializing',
      myCode: this.myDeviceCode,
      pairedCode: this.pairedDeviceCode,
    });

    this.initPeer();
  }

  initPeer() {
    if (this.isDestroyed || !this.myPeerId) return;

    this.destroyPeerOnly();

    try {
      this.peer = new Peer(this.myPeerId, {
        debug: 1,
        pingInterval: 5000,
        config: {
          iceServers: ICE_SERVERS,
        },
      });

      this.peer.on('open', (id) => {
        if (this.isDestroyed) return;
        this.unavailableRetryCount = 0;
        this.onError(null);
        console.log(`[PeerJS] Identidad lista en servidor: ${this.myDeviceCode} (PeerID: ${id})`);

        this.onStatusChange({
          status: this.connection?.open ? 'connected' : 'ready',
          myCode: this.myDeviceCode,
          pairedCode: this.pairedDeviceCode,
          peerId: id,
        });

        // Procedimiento automático idéntico a la primera vinculación:
        // Si teníamos un dispositivo vinculado guardado de la última vez, conectar directamente de inmediato
        if (this.remotePeerId && (!this.connection || !this.connection.open)) {
          this.attemptConnection();
        }

        // Watchdog de reconexión continua para reanudar conexión en cuanto el otro dispositivo se abra
        this.startWatchdog();
      });

      this.peer.on('connection', (conn) => {
        if (this.isDestroyed) return;
        console.log('[PeerJS] Conexión entrante detectada desde:', conn.peer);
        this.setupConnection(conn);
      });

      this.peer.on('disconnected', () => {
        if (this.isDestroyed) return;
        console.log('[PeerJS] Conexión de señalización caída. Reconectando socket...');
        try {
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        } catch {}
      });

      this.peer.on('error', (err) => {
        if (this.isDestroyed) return;
        console.warn('[PeerJS] Error de nodo:', err.type, err.message);

        // Caso 1: ID retenido por recarga rápida o pestaña duplicada
        if (err.type === 'unavailable-id') {
          this.unavailableRetryCount++;
          // Si tras 2 reintentos sigue ocupado, otra pestaña en la misma PC lo tiene activo
          if (this.unavailableRetryCount >= 3) {
            console.log(`[PeerJS] ID "${this.myPeerId}" en uso activo por otra pestaña. Generando nuevo código...`);
            const newCode = generateDeviceCode();
            this.myDeviceCode = newCode;
            this.myPeerId = `${PEER_PREFIX}${newCode.toLowerCase()}`;
            this.unavailableRetryCount = 0;
            this.onStatusChange({
              status: 'initializing',
              myCode: this.myDeviceCode,
              pairedCode: this.pairedDeviceCode,
            });
            this.initPeer();
            return;
          }

          console.log(`[PeerJS] ID "${this.myPeerId}" retenido. Reintento #${this.unavailableRetryCount} en 1s...`);
          this.reconnectTimeout = setTimeout(() => {
            if (!this.isDestroyed) {
              this.initPeer();
            }
          }, 1000);
          return;
        }

        // Caso 2: El par vinculado aún no ha abierto su navegador
        if (err.type === 'peer-unavailable') {
          console.log(`[PeerJS] El par ${this.remotePeerId} aún no está en línea. Esperando...`);
          this.isConnecting = false;
          if (this.connection && !this.connection.open) {
            this.connection = null;
          }
          return;
        }

        // Caso 3: Desconexión del socket del servidor
        if (err.type === 'server-error' || (err.message && err.message.includes('Lost connection to server'))) {
          try {
            if (this.peer && !this.peer.destroyed) {
              this.peer.reconnect();
              return;
            }
          } catch {}
        }

        this.onError(err);
      });
    } catch (e) {
      if (!this.isDestroyed) {
        this.onError(e);
      }
    }
  }

  /**
   * Conecta al dispositivo remoto usando exactamente el mismo procedimiento que la vinculación manual
   */
  attemptConnection() {
    if (this.isDestroyed || !this.peer || this.peer.destroyed || !this.peer.open) return;
    if (!this.remotePeerId || !this.pairedDeviceCode) return;
    if (this.connection && this.connection.open) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    setTimeout(() => {
      this.isConnecting = false;
    }, 4000);

    try {
      console.log(`[PeerJS] Conectando directamente al dispositivo vinculado: ${this.remotePeerId}...`);
      const conn = this.peer.connect(this.remotePeerId, { reliable: true });
      this.setupConnection(conn);
    } catch (e) {
      console.warn('[PeerJS] Error al intentar conectar:', e);
      this.isConnecting = false;
    }
  }

  /**
   * Watchdog rápido: verifica cada 3 segundos si el par ya abrió su navegador y reconecta
   */
  startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (this.isDestroyed) return;

      if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
        try {
          this.peer.reconnect();
        } catch {}
      }

      if (this.remotePeerId && (!this.connection || !this.connection.open)) {
        this.attemptConnection();
      }
    }, 3000);
  }

  stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.lastPongTime = Date.now();
    this.heartbeatTimer = setInterval(() => {
      if (this.isDestroyed) return;
      if (this.connection && this.connection.open) {
        if (Date.now() - this.lastPongTime > 12000) {
          console.warn('[PeerJS] Heartbeat perdido: el par remoto no responde PING. Esperando reconexión...');
          this.connection = null;
          this.stopHeartbeat();
          if (!this.isDestroyed) {
            this.onStatusChange({
              status: 'disconnected',
              myCode: this.myDeviceCode,
              pairedCode: this.pairedDeviceCode,
            });
          }
          return;
        }

        try {
          this.connection.send({ type: 'PING', timestamp: Date.now() });
        } catch {
          this.stopHeartbeat();
        }
      } else {
        this.stopHeartbeat();
      }
    }, 4000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Vincula este dispositivo con el código de otro dispositivo
   */
  pairWith(targetCode) {
    if (!targetCode) return;
    const cleanTarget = targetCode.trim().toUpperCase();
    this.pairedDeviceCode = cleanTarget;
    this.remotePeerId = `${PEER_PREFIX}${cleanTarget.toLowerCase()}`;

    console.log(`[PeerJS] Vinculando con objetivo: ${this.pairedDeviceCode}`);

    this.onStatusChange({
      status: 'connecting',
      myCode: this.myDeviceCode,
      pairedCode: this.pairedDeviceCode,
    });

    // Conectar inmediatamente con el objetivo
    this.attemptConnection();
  }

  /**
   * Desvincula el dispositivo
   */
  unpair() {
    console.log('[PeerJS] Desvinculando dispositivo');
    this.pairedDeviceCode = null;
    this.remotePeerId = null;
    if (this.connection) {
      try {
        if (typeof this.connection.removeAllListeners === 'function') {
          this.connection.removeAllListeners();
        }
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    this.stopHeartbeat();
    this.onStatusChange({
      status: 'ready',
      myCode: this.myDeviceCode,
      pairedCode: null,
    });
  }

  setupConnection(conn) {
    if (!conn) return;

    const handleOpen = () => {
      if (this.isDestroyed) return;

      // Si ya tenemos esta conexión activa, no hacer nada más
      if (this.connection === conn && this.connection.open) return;

      // Si ya hay OTRA conexión abierta, simplemente la dejamos estar SIN llamar conn.close()
      // para no romper la sesión WebRTC compartida
      if (this.connection && this.connection !== conn && this.connection.open) {
        console.log('[PeerJS] Canal WebRTC secundario disponible sin conflicto.');
        return;
      }

      this.connection = conn;
      this.isConnecting = false;
      this.unavailableRetryCount = 0;
      this.lastPongTime = Date.now();
      this.onError(null);
      this.startHeartbeat();

      // Deducir código del par si vino por conexión entrante
      const peerId = conn.peer || '';
      if (peerId.startsWith(PEER_PREFIX)) {
        const remoteCode = peerId.replace(PEER_PREFIX, '').toUpperCase();
        if (remoteCode && this.pairedDeviceCode !== remoteCode) {
          this.pairedDeviceCode = remoteCode;
          this.remotePeerId = peerId;
          this.onPairedDeviceDiscovered(remoteCode);
        }
      }

      console.log(`[PeerJS] ✅ Conexión WebRTC ABIERTA con ${conn.peer} (Par: ${this.pairedDeviceCode})`);

      this.onStatusChange({
        status: 'connected',
        isLive: true,
        myCode: this.myDeviceCode,
        pairedCode: this.pairedDeviceCode,
        peer: conn.peer,
      });

      // Enviar oferta de enlace con nuestra identidad y datos locales
      const localData = this.getLocalData();
      try {
        conn.send({
          type: 'HANDSHAKE_OFFER',
          senderCode: this.myDeviceCode,
          payload: localData,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error('[PeerJS] Error enviando HANDSHAKE_OFFER:', e);
      }
    };

    if (conn.open) {
      handleOpen();
    } else {
      conn.on('open', handleOpen);
    }

    conn.on('data', (data) => {
      if (this.isDestroyed || !data || !data.type) return;

      if (data.type === 'PING') {
        try { conn.send({ type: 'PONG', timestamp: Date.now() }); } catch {}
        return;
      }
      if (data.type === 'PONG') {
        this.lastPongTime = Date.now();
        return;
      }

      // Caso A: El otro dispositivo nos envía su oferta de enlace inicial
      if (data.type === 'HANDSHAKE_OFFER') {
        const remoteCode = data.senderCode?.trim().toUpperCase();
        if (remoteCode) {
          if (this.pairedDeviceCode !== remoteCode) {
            this.pairedDeviceCode = remoteCode;
            this.remotePeerId = `${PEER_PREFIX}${remoteCode.toLowerCase()}`;
            this.onPairedDeviceDiscovered(remoteCode);
          }
        }

        this.onDataReceived(data.payload, (replyPayload) => {
          try {
            conn.send({
              type: 'HANDSHAKE_RESPONSE',
              senderCode: this.myDeviceCode,
              payload: replyPayload,
              timestamp: Date.now(),
            });
          } catch (e) {
            console.error('[PeerJS] Error enviando HANDSHAKE_RESPONSE:', e);
          }

          this.onStatusChange({
            status: 'connected',
            isLive: true,
            myCode: this.myDeviceCode,
            pairedCode: this.pairedDeviceCode,
            peer: conn.peer,
          });
        }, { isInitialSync: true });
      }

      // Caso B: El otro dispositivo confirmó el enlace devolviendo sus datos fusionados
      else if (data.type === 'HANDSHAKE_RESPONSE') {
        const remoteCode = data.senderCode?.trim().toUpperCase();
        if (remoteCode) {
          if (this.pairedDeviceCode !== remoteCode) {
            this.pairedDeviceCode = remoteCode;
            this.remotePeerId = `${PEER_PREFIX}${remoteCode.toLowerCase()}`;
            this.onPairedDeviceDiscovered(remoteCode);
          }
        }

        this.onDataReceived(data.payload, null, { isInitialSync: true });

        this.onStatusChange({
          status: 'connected',
          isLive: true,
          myCode: this.myDeviceCode,
          pairedCode: this.pairedDeviceCode,
          peer: conn.peer,
        });
      }

      // Caso C: Actualización en tiempo real (crear, editar, eliminar)
      else if (data.type === 'LIVE_UPDATE') {
        this.onDataReceived(data.payload, null, { isLiveUpdate: true });
        this.onStatusChange({
          status: 'connected',
          isLive: true,
          myCode: this.myDeviceCode,
          pairedCode: this.pairedDeviceCode,
          peer: conn.peer,
        });
      }
    });

    conn.on('close', () => {
      if (this.connection === conn) {
        this.stopHeartbeat();
        this.connection = null;
        this.isConnecting = false;
        console.log('[PeerJS] Conexión P2P cerrada con el par remoto.');
        if (!this.isDestroyed) {
          this.onStatusChange({
            status: 'disconnected',
            myCode: this.myDeviceCode,
            pairedCode: this.pairedDeviceCode,
          });
        }
      }
    });

    conn.on('error', (err) => {
      console.warn('[PeerJS] Error en canal de conexión:', err);
      if (this.connection === conn) {
        this.stopHeartbeat();
        this.connection = null;
        this.isConnecting = false;
        if (!this.isDestroyed) {
          this.onStatusChange({
            status: 'disconnected',
            myCode: this.myDeviceCode,
            pairedCode: this.pairedDeviceCode,
          });
        }
      }
    });
  }

  broadcastLiveUpdate(payload) {
    if (this.connection && this.connection.open) {
      try {
        this.connection.send({
          type: 'LIVE_UPDATE',
          senderCode: this.myDeviceCode,
          payload,
        });
        return true;
      } catch (e) {
        console.warn('[PeerJS] Error en broadcastLiveUpdate:', e);
        return false;
      }
    }
    return false;
  }

  destroyPeerOnly() {
    if (this.connection) {
      try {
        if (typeof this.connection.removeAllListeners === 'function') {
          this.connection.removeAllListeners();
        }
        this.connection.close();
      } catch {}
      this.connection = null;
    }

    if (this.peer) {
      try {
        if (typeof this.peer.removeAllListeners === 'function') {
          this.peer.removeAllListeners();
        }
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.stopHeartbeat();
    this.stopWatchdog();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.destroyPeerOnly();
  }
}
