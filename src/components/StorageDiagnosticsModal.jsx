import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  HardDrive,
  Database,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  getLocalStorageDiagnostics,
  getBrowserStorageEstimate,
} from '../utils/storageDiagnostics';

export function StorageDiagnosticsModal({ isOpen, onClose }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [browserEstimate, setBrowserEstimate] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = () => {
    setIsRefreshing(true);
    const data = getLocalStorageDiagnostics();
    setDiagnostics(data);

    getBrowserStorageEstimate().then((estimate) => {
      setBrowserEstimate(estimate);
      setTimeout(() => setIsRefreshing(false), 300);
    });
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    if (!diagnostics) return;

    const report = [
      `=== DIAGNÓSTICO DE ALMACENAMIENTO AURUM ===`,
      `Fecha: ${new Date().toLocaleString()}`,
      `Cuota estimada de LocalStorage: ${diagnostics.totalQuotaFormatted}`,
      `Espacio Usado: ${diagnostics.usedFormatted} (${diagnostics.percentUsed}%)`,
      `Espacio Restante: ${diagnostics.remainingFormatted} (${diagnostics.percentRemaining}%)`,
      `Total de llaves almacenadas: ${diagnostics.keys.length}`,
      ``,
      `--- DESGLOSE POR LLAVE ---`,
      ...diagnostics.keys.map(
        (k) => `- ${k.key}: ${k.formattedSize} (${k.summary || 'Sin detalle'})`
      ),
      browserEstimate?.supported
        ? `\nCuota del Navegador (StorageManager): ${browserEstimate.usageFormatted} / ${browserEstimate.quotaFormatted}`
        : '',
    ].join('\n');

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const percentUsed = diagnostics?.percentUsed || 0;
  const isHealthy = percentUsed < 70;
  const isWarning = percentUsed >= 70 && percentUsed < 90;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Fondo oscurecido con blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-3xl p-5 sm:p-7 neo-card border z-10 my-auto
            dark:bg-[#13131a] dark:border-white/15
            bg-[#ffffff] border-[#121217] shadow-[6px_6px_0px_#121217]"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-3.5 border-b border-black/5 dark:border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl dark:bg-[#00ff87]/15 bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/30 shadow-[0_0_12px_rgba(0,255,135,0.2)]">
                <HardDrive className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display-title font-black text-base sm:text-lg text-main leading-tight">
                    Memoria LocalStorage
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/30">
                    Diagnóstico
                  </span>
                </div>
                <p className="text-[11px] text-muted font-bold tracking-wider uppercase mt-0.5">
                  Salud y capacidad de almacenamiento local
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-spring p-2 rounded-xl text-muted hover:text-main bg-black/5 dark:bg-white/10 cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contenido scrolleable */}
          <div className="overflow-y-auto flex-1 pr-1 -mr-1 mt-4 space-y-4">
            {diagnostics && (
              <>
                {/* Tarjeta Principal de Capacidad y Barra de Progreso */}
                <div className="p-5 rounded-2xl border dark:bg-[#181824] bg-[#faf7f2] border-black/10 dark:border-white/10 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#00f0ff]" /> Espacio Restante
                    </span>
                    <span className="text-xs font-black text-[#00ff87]">
                      {diagnostics.percentRemaining}% Disponible
                    </span>
                  </div>

                  {/* Valor Gigante del Espacio Restante */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-display-title font-black text-3xl sm:text-4xl text-main tracking-tight">
                      {diagnostics.remainingFormatted}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-muted">
                      libres de {diagnostics.totalQuotaFormatted}
                    </span>
                  </div>

                  {/* Barra de Progreso de Ocupación */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden p-0.5 border border-black/5 dark:border-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(percentUsed, 1.5)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-colors ${
                          isHealthy
                            ? 'bg-gradient-to-r from-[#00ff87] to-[#00f0ff] shadow-[0_0_10px_rgba(0,255,135,0.5)]'
                            : isWarning
                            ? 'bg-gradient-to-r from-[#ffd000] to-[#ff9900]'
                            : 'bg-gradient-to-r from-[#ff4365] to-[#ff2e93]'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-muted">
                      <span>Usado: {diagnostics.usedFormatted} ({percentUsed}%)</span>
                      <span>Límite estándar: ~5 MB</span>
                    </div>
                  </div>
                </div>

                {/* Grid de 3 Métricas Clave */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl border dark:bg-[#181824]/60 bg-black/5 border-black/5 dark:border-white/5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                      En Uso
                    </span>
                    <span className="font-display-title font-black text-sm sm:text-base text-[#ffd000] block mt-0.5">
                      {diagnostics.usedFormatted}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border dark:bg-[#181824]/60 bg-black/5 border-black/5 dark:border-white/5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                      Restante
                    </span>
                    <span className="font-display-title font-black text-sm sm:text-base text-[#00ff87] block mt-0.5">
                      {diagnostics.remainingFormatted}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border dark:bg-[#181824]/60 bg-black/5 border-black/5 dark:border-white/5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                      Elementos
                    </span>
                    <span className="font-display-title font-black text-sm sm:text-base text-[#00f0ff] block mt-0.5">
                      {diagnostics.keys.length} llaves
                    </span>
                  </div>
                </div>

                {/* Desglose por Llaves Guardadas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#ffd000]" /> Llaves Almacenadas
                    </h4>
                    <span className="text-[10px] font-bold text-muted">
                      Ordenado por peso
                    </span>
                  </div>

                  <div className="space-y-2">
                    {diagnostics.keys.map((k) => (
                      <div
                        key={k.key}
                        className="p-3 rounded-xl border dark:bg-[#181824]/70 bg-white border-black/10 dark:border-white/10 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-main font-mono text-[11px] truncate">
                              {k.key}
                            </span>
                            {k.isAurumKey && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/20">
                                AURUM
                              </span>
                            )}
                          </div>
                          {k.summary && (
                            <span className="text-[10px] text-muted block mt-0.5 truncate">
                              {k.summary}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-main block font-mono text-xs">
                            {k.formattedSize}
                          </span>
                          <span className="text-[10px] text-muted block">
                            {k.percentOfQuota}% cuota
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nota Didáctica */}
                <div className="p-3.5 rounded-2xl border dark:bg-[#00f0ff]/5 bg-[#00f0ff]/5 border-[#00f0ff]/20 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#00f0ff] shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-muted">
                    <strong className="text-main font-bold">¿Cuánto rinde este espacio?</strong>{' '}
                    El almacenamiento de 5 MB es de texto optimizado. Con tu uso actual, tienes capacidad para registrar miles de movimientos y años de historial sin preocuparte por el límite.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer de Acciones */}
          <div className="pt-4 mt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="btn-spring px-3.5 py-2 rounded-xl text-xs font-bold border border-black/10 dark:border-white/10 dark:bg-white/5 bg-black/5 text-main flex items-center gap-1.5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="btn-spring px-4 py-2 rounded-xl text-xs font-bold text-black border border-black flex items-center gap-1.5 bg-[#00ff87] hover:bg-[#00e676] shadow-[2px_2px_0px_#121217] cursor-pointer transition-transform"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Reporte</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export default StorageDiagnosticsModal;
