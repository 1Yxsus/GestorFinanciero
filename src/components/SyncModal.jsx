import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Download,
  Upload,
  Camera,
  RefreshCw,
  Wifi,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { storageService } from '../services/storageService';

export function SyncModal({
  isOpen,
  onClose,
  p2p,
  currency,
}) {
  const [activeTab, setActiveTab] = useState('host'); // 'host' | 'connect' | 'backup'
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualJsonText, setManualJsonText] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    syncStatus,
    myCode,
    errorMessage,
    lastSyncStats,
    startHosting,
    connectWithCode,
    importManualData,
    cleanup,
  } = p2p;

  // Iniciar hosting al abrir la pestaña host
  useEffect(() => {
    if (isOpen && activeTab === 'host' && !myCode) {
      startHosting();
    }
  }, [isOpen, activeTab, myCode, startHosting]);

  // Detener cámara al cambiar de pestaña o cerrar
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, activeTab]);

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error deteniendo escáner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  const startCameraScanner = async () => {
    setCameraActive(true);
    // Esperar a que el elemento DOM del escáner exista
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader-container');
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Se leyó un QR
            stopCameraScanner();
            handleQrDecoded(decodedText);
          },
          () => {} // Ignorar frames sin QR
        );
      } catch (err) {
        console.error('Error iniciando cámara:', err);
        setCameraActive(false);
      }
    }, 200);
  };

  const handleQrDecoded = (text) => {
    // Si el QR contiene directamente el código de 6 caracteres o un enlace con prefijo
    let code = text.trim();
    if (code.includes('aurum:')) {
      code = code.replace('aurum:', '');
    } else if (code.startsWith('{')) {
      // Es un respaldo JSON completo escaneado
      importManualData(code);
      return;
    }
    setInputCode(code);
    connectWithCode(code);
  };

  const handleCopyCode = () => {
    if (myCode) {
      navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportJSON = () => {
    storageService.exportToJSON();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const res = importManualData(content);
      if (res.success) {
        const parts = [];
        if (res.stats.movementsAdded) parts.push(`+${res.stats.movementsAdded} movimientos`);
        if (res.stats.movementsUpdated) parts.push(`${res.stats.movementsUpdated} actualizados`);
        if (res.stats.movementsDeleted) parts.push(`${res.stats.movementsDeleted} eliminados`);
        if (res.stats.reservesAdded) parts.push(`+${res.stats.reservesAdded} reservas`);
        if (res.stats.categoriesAdded) parts.push(`+${res.stats.categoriesAdded} categorías`);
        setImportStatus(`¡Importado con éxito! ${parts.length > 0 ? parts.join(', ') : 'Datos al día.'}`);
      } else {
        setImportStatus(`Error: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            stopCameraScanner();
            onClose();
          }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl neo-card p-6 sm:p-8 border z-10 my-auto
            dark:bg-[#13131a] dark:border-white/15
            bg-white border-[#121217] shadow-[6px_6px_0px_#121217]"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl dark:bg-[#00f0ff]/15 bg-[#00f0ff]/10 text-[#00f0ff]">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display-title font-extrabold text-base sm:text-lg text-main leading-none">
                  Sincronización P2P Dual
                </h3>
                <p className="text-[11px] text-muted mt-1 font-medium">
                  Conexión directa navegador a navegador sin servidores
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                stopCameraScanner();
                onClose();
              }}
              className="btn-spring p-2 rounded-xl text-muted hover:text-main bg-black/5 dark:bg-white/10"
              aria-label="Cerrar modal de sincronización"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pestañas de modo */}
          <div className="grid grid-cols-3 gap-1.5 my-5 p-1 rounded-2xl bg-black/5 dark:bg-[#0b0b0e] border neo-border">
            <button
              onClick={() => {
                stopCameraScanner();
                setActiveTab('host');
              }}
              className={`btn-spring py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1
                ${activeTab === 'host'
                  ? 'bg-[#121217] text-white dark:bg-[#00ff87] dark:text-black shadow-[2px_2px_0px_#121217]'
                  : 'text-muted hover:text-main'}`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Emitir QR</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('connect');
              }}
              className={`btn-spring py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1
                ${activeTab === 'connect'
                  ? 'bg-[#121217] text-white dark:bg-[#00f0ff] dark:text-black shadow-[2px_2px_0px_#121217]'
                  : 'text-muted hover:text-main'}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Conectar</span>
            </button>

            <button
              onClick={() => {
                stopCameraScanner();
                setActiveTab('backup');
              }}
              className={`btn-spring py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1
                ${activeTab === 'backup'
                  ? 'bg-[#121217] text-white dark:bg-[#ffd000] dark:text-black shadow-[2px_2px_0px_#121217]'
                  : 'text-muted hover:text-main'}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Respaldo</span>
            </button>
          </div>

          {/* Notificaciones de Estado P2P */}
          {syncStatus === 'sync_completed' && (
            <div className="mb-4 p-3 rounded-2xl bg-[#00ff87]/15 border border-[#00ff87]/40 text-[#087f48] dark:text-[#00ff87] flex flex-col gap-1 text-xs font-bold">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>¡Sincronización bidireccional exitosa!</span>
              </div>
              {lastSyncStats && (
                <div className="text-[11px] font-semibold opacity-90 pl-6">
                  {lastSyncStats.movementsAdded > 0 && `+${lastSyncStats.movementsAdded} movimientos. `}
                  {lastSyncStats.movementsUpdated > 0 && `${lastSyncStats.movementsUpdated} actualizados. `}
                  {lastSyncStats.movementsDeleted > 0 && `${lastSyncStats.movementsDeleted} eliminaciones aplicadas. `}
                  {lastSyncStats.reservesAdded > 0 && `+${lastSyncStats.reservesAdded} reservas. `}
                  {lastSyncStats.categoriesAdded > 0 && `+${lastSyncStats.categoriesAdded} categorías. `}
                  {lastSyncStats.movementsAdded === 0 && lastSyncStats.movementsUpdated === 0 && lastSyncStats.reservesAdded === 0 && 'Ambos dispositivos ya estaban al día.'}
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-[#ff2e93]/15 border border-[#ff2e93]/40 text-[#d9183b] dark:text-[#ff4365] flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CONTENIDO PESTAÑA 1: HOST (Emitir Código / QR) */}
          {activeTab === 'host' && (
            <div className="flex flex-col items-center text-center">
              <p className="text-xs text-muted mb-4 max-w-xs">
                Escanea este código con tu teléfono o segundo dispositivo para sincronizar ambos navegadores.
              </p>

              {/* Render de Código QR */}
              <div className="p-4 rounded-3xl bg-white border-2 border-[#121217] shadow-[4px_4px_0px_#121217] mb-4">
                {myCode ? (
                  <QRCodeSVG
                    value={`aurum:${myCode}`}
                    size={170}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[170px] h-[170px] flex items-center justify-center text-xs text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#121217]" />
                  </div>
                )}
              </div>

              {/* Código de 6 caracteres con botón copiar */}
              <div className="w-full max-w-xs mb-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Código de emparejamiento manual:
                </span>
                <div className="flex items-center justify-between p-3 rounded-2xl border dark:bg-[#0b0b0e] dark:border-white/20 bg-[#f3ede2] border-[#121217]/30 shadow-sm">
                  <span className="font-num font-black text-2xl tracking-widest text-[#087f48] dark:text-[#00ff87]">
                    {myCode || '...'}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="btn-spring flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted font-medium">
                <span className={`w-2 h-2 rounded-full ${syncStatus === 'ready_to_pair' ? 'bg-[#00ff87] animate-ping' : 'bg-yellow-400'}`} />
                <span>
                  {syncStatus === 'ready_to_pair' ? 'Esperando conexión del segundo dispositivo...' : 'Iniciando canal WebRTC...'}
                </span>
              </div>
            </div>
          )}

          {/* CONTENIDO PESTAÑA 2: CONECTAR (Cámara o Código) */}
          {activeTab === 'connect' && (
            <div className="flex flex-col gap-4">
              {/* Botón para abrir escáner de cámara */}
              {!cameraActive ? (
                <button
                  onClick={startCameraScanner}
                  id="start-camera-scan-btn"
                  className="btn-spring w-full py-3.5 rounded-2xl font-display-title font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border
                    dark:bg-[#00f0ff]/15 dark:border-[#00f0ff]/40 dark:text-[#00f0ff] dark:hover:bg-[#00f0ff]/25
                    bg-[#121217] text-white shadow-[3px_3px_0px_#00f0ff]"
                >
                  <Camera className="w-4 h-4" />
                  <span>Escanear QR con Cámara</span>
                </button>
              ) : (
                <div className="flex flex-col items-center">
                  <div id="qr-reader-container" className="w-full max-w-[280px] overflow-hidden rounded-2xl border neo-border mb-2" />
                  <button
                    onClick={stopCameraScanner}
                    className="btn-spring px-4 py-1.5 rounded-xl text-xs font-bold text-[#ff2e93] border border-[#ff2e93]/30"
                  >
                    Detener Cámara
                  </button>
                </div>
              )}

              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-black/10 dark:border-white/10 w-full" />
                <span className="absolute bg-[#ffffff] dark:bg-[#13131a] px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                  O ingresa el código manual
                </span>
              </div>

              {/* Input manual de 6 caracteres */}
              <div>
                <label htmlFor="p2p-code-input" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Código de 6 caracteres del otro dispositivo:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="p2p-code-input"
                    maxLength={6}
                    placeholder="Ej. K7P9W2"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 rounded-2xl font-num font-extrabold text-xl text-center uppercase tracking-widest border neo-card
                      dark:bg-[#0b0b0e] dark:border-white/15 dark:focus:border-[#00f0ff]
                      bg-white border-[#121217] outline-none"
                  />
                  <button
                    onClick={() => connectWithCode(inputCode)}
                    disabled={inputCode.length < 4 || syncStatus === 'connecting'}
                    id="connect-peer-btn"
                    className="btn-spring px-5 py-3 rounded-2xl font-display-title font-bold text-xs uppercase tracking-wider cursor-pointer
                      dark:bg-[#00f0ff] dark:text-black dark:hover:bg-[#05ddff] disabled:opacity-50
                      bg-[#121217] text-white shadow-[2px_2px_0px_#121217] disabled:shadow-none"
                  >
                    {syncStatus === 'connecting' ? 'Conectando...' : 'Sincronizar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTENIDO PESTAÑA 3: RESPALDO MANUAL (JSON / Exportación) */}
          {activeTab === 'backup' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted">
                Exporta tu historial financiero en un archivo seguro JSON o importa uno generado en otro dispositivo o navegador.
              </p>

              {importStatus && (
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-semibold text-main">
                  {importStatus}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleExportJSON}
                  id="export-json-btn"
                  className="btn-spring flex items-center justify-center gap-2 p-3.5 rounded-2xl border neo-card cursor-pointer font-bold text-xs uppercase tracking-wider
                    dark:hover:border-[#00ff87]/50"
                >
                  <Download className="w-4 h-4 text-[#00ff87]" />
                  <span>Descargar JSON</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  id="import-json-btn"
                  className="btn-spring flex items-center justify-center gap-2 p-3.5 rounded-2xl border neo-card cursor-pointer font-bold text-xs uppercase tracking-wider
                    dark:hover:border-[#00f0ff]/50"
                >
                  <Upload className="w-4 h-4 text-[#00f0ff]" />
                  <span>Subir Archivo JSON</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
              </div>

              {/* Pegar texto de respaldo directo */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                  O pegar contenido JSON directamente:
                </label>
                <textarea
                  rows={2}
                  value={manualJsonText}
                  onChange={(e) => setManualJsonText(e.target.value)}
                  placeholder='{"version":"2.0","movements":[...]}'
                  className="w-full p-2.5 rounded-xl font-mono text-[11px] border dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white dark:placeholder:text-gray-500 bg-[#faf7f2] border-[#121217] text-[#121217] placeholder:text-gray-400 outline-none"
                />
                {manualJsonText && (
                  <button
                    onClick={() => {
                      const res = importManualData(manualJsonText);
                      if (res.success) {
                        setImportStatus(`¡Importado con éxito! +${res.stats.addedCount} nuevos.`);
                        setManualJsonText('');
                      } else {
                        setImportStatus(`Error: ${res.error}`);
                      }
                    }}
                    className="mt-2 btn-spring px-4 py-1.5 rounded-xl text-xs font-bold bg-[#00ff87] text-black"
                  >
                    Procesar JSON
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
