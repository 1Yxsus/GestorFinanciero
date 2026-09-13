// Servicio de sincronización P2P WebRTC directo entre navegadores vía PeerJS
import { Peer } from 'peerjs';

/**
 * Genera un código aleatorio de 6 caracteres alfanuméricos en mayúsculas
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para evitar confusiones
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const PEER_PREFIX = 'aurum-fin-';

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export class PeerSyncManager {
  constructor({ onStatusChange, onDataReceived, onError }) {
    this.peer = null;
    this.connection = null;
    this.myCode = null;
    this.onStatusChange = onStatusChange || (() => {});
    this.onDataReceived = onDataReceived || (() => {});
    this.onError = onError || (() => {});
    this.isInitiator = false;
    this.heartbeatTimer = null;
    this.reconnectTimeout = null;
  }

  /**
   * Inicia el nodo Peer como anfitrión con un código de 6 caracteres
   */
  startHost(customCode = null) {
    this.destroy();
    this.myCode = customCode || generateRoomCode();
    const fullPeerId = `${PEER_PREFIX}${this.myCode.toLowerCase()}`;

    this.onStatusChange({ status: 'initializing', code: this.myCode });

    try {
      this.peer = new Peer(fullPeerId, {
        debug: 1,
        config: {
          iceServers: ICE_SERVERS,
        },
      });

      this.peer.on('open', (id) => {
        this.onStatusChange({ status: 'ready_to_pair', code: this.myCode, peerId: id });
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn, false);
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS Host Error:', err.type, err);
        if (err.type === 'unavailable-id') {
          // El ID aún está retenido en el servidor de señalización por una recarga previa
          console.log('[PeerJS] ID retenido por recarga rápida. Reintentando con el mismo código en 1.5s...');
          this.reconnectTimeout = setTimeout(() => {
            if (!this.peer || this.peer.destroyed) {
              this.startHost(this.myCode);
            } else {
              try {
                this.peer.reconnect();
              } catch {
                this.startHost(this.myCode);
              }
            }
          }, 1500);
        } else {
          this.onError(err);
        }
      });
    } catch (e) {
      this.onError(e);
    }
  }

  /**
   * Conecta a un anfitrión existente mediante su código de 6 caracteres
   */
  connectToHost(targetCode, localDataPayload) {
    this.destroy();
    const cleanCode = targetCode.trim().toLowerCase();
    const targetPeerId = `${PEER_PREFIX}${cleanCode}`;

    this.onStatusChange({ status: 'connecting', targetCode: cleanCode.toUpperCase() });

    try {
      this.peer = new Peer(undefined, {
        debug: 1,
        config: {
          iceServers: ICE_SERVERS,
        },
      });

      this.peer.on('open', () => {
        const conn = this.peer.connect(targetPeerId, { reliable: true });
        this.setupConnection(conn, true, localDataPayload);
      });

      this.peer.on('error', (err) => {
        console.warn('Error conectando al peer:', err.type, err);
        this.onError(err);
      });
    } catch (e) {
      this.onError(e);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connection && this.connection.open) {
        try {
          this.connection.send({ type: 'PING', timestamp: Date.now() });
        } catch {
          this.stopHeartbeat();
        }
      }
    }, 8000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  setupConnection(conn, isClient, initialPayload = null) {
    this.connection = conn;

    const handleOpen = () => {
      this.onStatusChange({ status: 'connected', peer: conn.peer });
      this.startHeartbeat();

      // Si somos el cliente que se acaba de conectar, enviamos nuestros datos completos
      if (isClient && initialPayload) {
        try {
          conn.send({
            type: 'SYNC_OFFER',
            payload: initialPayload,
          });
        } catch (e) {
          console.error('Error enviando SYNC_OFFER:', e);
        }
      }
    };

    if (conn.open) {
      handleOpen();
    } else {
      conn.on('open', handleOpen);
    }

    conn.on('data', (data) => {
      if (!data || !data.type) return;

      // Mantener canal vivo
      if (data.type === 'PING') {
        try {
          conn.send({ type: 'PONG', timestamp: Date.now() });
        } catch {}
        return;
      }
      if (data.type === 'PONG') {
        return;
      }

      if (data.type === 'SYNC_OFFER') {
        // Recibimos datos del segundo dispositivo al iniciar
        this.onDataReceived(data.payload, (replyPayload) => {
          // Respondemos con nuestros datos actualizados y fusionados
          try {
            conn.send({
              type: 'SYNC_RESPONSE',
              payload: replyPayload,
            });
          } catch (e) {
            console.error('Error enviando SYNC_RESPONSE:', e);
          }
          this.onStatusChange({ status: 'connected', isLive: true });
        }, { isInitialSync: true });
      } else if (data.type === 'SYNC_RESPONSE') {
        // Recibimos la confirmación y datos fusionados del anfitrión
        this.onDataReceived(data.payload, null, { isInitialSync: true });
        this.onStatusChange({ status: 'connected', isLive: true });
      } else if (data.type === 'LIVE_UPDATE') {
        // Retransmisión en tiempo real al agregar/editar/borrar en el otro dispositivo
        this.onDataReceived(data.payload, null, { isLiveUpdate: true });
        this.onStatusChange({ status: 'connected', isLive: true });
      }
    });

    conn.on('close', () => {
      this.stopHeartbeat();
      this.onStatusChange({ status: 'disconnected' });
    });

    conn.on('error', (err) => {
      this.stopHeartbeat();
      this.onError(err);
    });
  }

  /**
   * Envía una actualización en tiempo real al peer conectado
   */
  broadcastLiveUpdate(payload) {
    if (this.connection && this.connection.open) {
      try {
        this.connection.send({
          type: 'LIVE_UPDATE',
          payload,
        });
        return true;
      } catch (e) {
        console.warn('Error en broadcastLiveUpdate:', e);
        return false;
      }
    }
    return false;
  }

  destroy() {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }
}
