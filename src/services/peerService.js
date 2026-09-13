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

export class PeerSyncManager {
  constructor({ onStatusChange, onDataReceived, onError }) {
    this.peer = null;
    this.connection = null;
    this.myCode = null;
    this.onStatusChange = onStatusChange || (() => {});
    this.onDataReceived = onDataReceived || (() => {});
    this.onError = onError || (() => {});
    this.isInitiator = false;
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
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        this.onStatusChange({ status: 'ready_to_pair', code: this.myCode, peerId: id });
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn, false);
      });

      this.peer.on('error', (err) => {
        console.warn('Error en PeerJS:', err);
        // Si el ID ya existe, reintentar con otro código
        if (err.type === 'unavailable-id') {
          this.startHost();
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

    this.onStatusChange({ status: 'connecting', targetCode });

    try {
      this.peer = new Peer(undefined, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', () => {
        const conn = this.peer.connect(targetPeerId, { reliable: true });
        this.setupConnection(conn, true, localDataPayload);
      });

      this.peer.on('error', (err) => {
        console.error('Error conectando al peer:', err);
        this.onError(err);
      });
    } catch (e) {
      this.onError(e);
    }
  }

  setupConnection(conn, isClient, initialPayload = null) {
    this.connection = conn;

    conn.on('open', () => {
      this.onStatusChange({ status: 'connected', peer: conn.peer });

      // Si somos el cliente que se acaba de conectar, enviamos nuestros datos
      if (isClient && initialPayload) {
        conn.send({
          type: 'SYNC_OFFER',
          payload: initialPayload,
        });
      }
    });

    conn.on('data', (data) => {
      if (!data || !data.type) return;

      if (data.type === 'SYNC_OFFER') {
        // Recibimos datos del segundo dispositivo
        this.onDataReceived(data.payload, (replyPayload) => {
          // Respondemos con nuestros datos actualizados/fusionados
          conn.send({
            type: 'SYNC_RESPONSE',
            payload: replyPayload,
          });
          this.onStatusChange({ status: 'sync_completed' });
        });
      } else if (data.type === 'SYNC_RESPONSE') {
        // Recibimos la confirmación y datos fusionados del anfitrión
        this.onDataReceived(data.payload);
        this.onStatusChange({ status: 'sync_completed' });
      }
    });

    conn.on('close', () => {
      this.onStatusChange({ status: 'disconnected' });
    });

    conn.on('error', (err) => {
      this.onError(err);
    });
  }

  sendData(payload) {
    if (this.connection && this.connection.open) {
      this.connection.send({
        type: 'SYNC_OFFER',
        payload
      });
    }
  }

  destroy() {
    if (this.connection) {
      try { this.connection.close(); } catch {}
      this.connection = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }
  }
}
