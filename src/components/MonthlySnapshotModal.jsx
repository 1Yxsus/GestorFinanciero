import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Camera,
  Download,
  Link2,
  Sparkles,
  Check,
  TrendingUp,
  TrendingDown,
  Globe,
} from 'lucide-react';
import { formatCurrency, formatMonthName, formatMovementDate } from '../utils/formatters';

const DEFAULT_CTA_URL = 'https://aurum-finanzas.app';
const URL_STORAGE_KEY = 'aurum_custom_cta_url';

export function MonthlySnapshotModal({
  isOpen,
  onClose,
  metrics,
  currency,
  selectedMonthKey,
  movements,
  onToast,
}) {
  const [ctaUrl, setCtaUrl] = useState(() => {
    try {
      return localStorage.getItem(URL_STORAGE_KEY) || DEFAULT_CTA_URL;
    } catch {
      return DEFAULT_CTA_URL;
    }
  });
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(ctaUrl);
  const [isGenerating, setIsGenerating] = useState(false);

  // Ref del elemento que se renderiza fuera de pantalla (MODO OFF)
  const offscreenCardRef = useRef(null);

  useEffect(() => {
    setTempUrl(ctaUrl);
  }, [ctaUrl]);

  const handleSaveUrl = () => {
    let cleanUrl = tempUrl.trim();
    if (!cleanUrl) cleanUrl = DEFAULT_CTA_URL;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    setCtaUrl(cleanUrl);
    try {
      localStorage.setItem(URL_STORAGE_KEY, cleanUrl);
    } catch { }
    setIsEditingUrl(false);
  };

  const monthMovements = movements.slice(0, 5);
  const { totalBalance, monthIncome, monthExpense, monthBalance } = metrics;
  const monthTitle = formatMonthName(selectedMonthKey);

  // Generación y descarga directa en MODO OFF (sin parpadeos en pantalla)
  const handleTakeSnapshot = async () => {
    if (!offscreenCardRef.current || isGenerating) return;

    setIsGenerating(true);

    try {
      // Pequeño retardo para asegurar que cualquier recurso tipográfico esté listo
      await new Promise((r) => setTimeout(r, 150));

      const dataUrl = await toPng(offscreenCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#0b0b0e',
      });

      // Disparar descarga en el dispositivo
      const link = document.createElement('a');
      const filename = `aurum_gastos_${selectedMonthKey || 'mes'}.png`;
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();

      if (onToast) {
        onToast(`📸 ¡Foto de gastos guardada como "${filename}"!`);
      }
      onClose();
    } catch (err) {
      console.error('Error generando foto de gastos:', err);
      if (onToast) {
        onToast('Error al capturar la imagen. Intenta de nuevo.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* CONTENEDOR EN MODO OFF: Renderizado fuera de pantalla (invisibilidad total) */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '640px',
          pointerEvents: 'none',
          zIndex: -100,
        }}
        aria-hidden="true"
      >
        <div
          ref={offscreenCardRef}
          style={{
            width: '640px',
            backgroundColor: '#0b0b0e',
            color: '#f5f5f7',
            fontFamily: "'Playfair Display', Georgia, serif",
            padding: '40px',
            boxSizing: 'border-box',
            borderRadius: '24px',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Luces de neón de fondo */}
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              right: '-80px',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 255, 135, 0.3) 0%, transparent 70%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-80px',
              left: '-80px',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 46, 147, 0.25) 0%, transparent 70%)',
            }}
          />

          {/* Cabecera de la tarjeta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #00ff87 0%, #00f0ff 100%)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: '900',
                }}
              >
                ⚡
              </div>
              <div>
                <span style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.5px', fontFamily: "'Syne', sans-serif", color: '#ffffff', display: 'block' }}>
                  AURUM
                </span>
                <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '2px', color: '#9595a8', textTransform: 'uppercase' }}>
                  Resumen de Finanzas Personales
                </span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '0.5px',
                color: '#00ff87',
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: 'uppercase',
              }}
            >
              {monthTitle}
            </div>
          </div>

          {/* Balance Principal */}
          <div style={{ marginBottom: '28px', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', color: '#9595a8' }}>
              Balance del Mes
            </span>
            <div
              style={{
                fontSize: '52px',
                fontWeight: '900',
                fontFamily: "'Syne', sans-serif",
                letterSpacing: '-1px',
                marginTop: '4px',
                color: monthBalance >= 0 ? '#00ff87' : '#ff4365',
              }}
            >
              {monthBalance >= 0 ? '+' : ''}{formatCurrency(monthBalance, currency)}
            </div>
          </div>

          {/* Tarjetas Ingresos vs Egresos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            {/* Ingresos */}
            <div
              style={{
                backgroundColor: 'rgba(22, 22, 34, 0.9)',
                border: '1px solid rgba(0, 255, 135, 0.3)',
                borderRadius: '18px',
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#9595a8', letterSpacing: '1px', marginBottom: '6px' }}>
                🟢 Total Ingresos
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#00ff87', fontFamily: "'Space Grotesk', sans-serif" }}>
                +{formatCurrency(monthIncome, currency)}
              </div>
            </div>

            {/* Egresos */}
            <div
              style={{
                backgroundColor: 'rgba(22, 22, 34, 0.9)',
                border: '1px solid rgba(255, 46, 147, 0.3)',
                borderRadius: '18px',
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#9595a8', letterSpacing: '1px', marginBottom: '6px' }}>
                🔴 Total Egresos
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#ff2e93', fontFamily: "'Space Grotesk', sans-serif" }}>
                -{formatCurrency(monthExpense, currency)}
              </div>
            </div>
          </div>

          {/* Últimos Movimientos Destacados */}
          {monthMovements.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#9595a8', letterSpacing: '1.5px', display: 'block', marginBottom: '12px' }}>
                Desglose de Movimientos Recientes
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {monthMovements.map((mov) => {
                  const isIng = mov.type === 'ingreso';
                  return (
                    <div
                      key={mov.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        backgroundColor: 'rgba(18, 18, 23, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>{mov.icon || (isIng ? '💵' : '💸')}</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>{mov.description}</div>
                          <div style={{ fontSize: '11px', color: '#9595a8' }}>{formatMovementDate(mov.date)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif", color: isIng ? '#00ff87' : '#ff4365' }}>
                        {isIng ? '+' : '-'}{formatCurrency(mov.amount, currency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LLAMADO A LA ACCIÓN (CALL TO ACTION) CON URL PERSONALIZABLE Y QR */}
          <div
            style={{
              marginTop: '20px',
              padding: '20px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 240, 255, 0.06)',
              border: '1.5px dashed rgba(0, 240, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px' }}>🚀</span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  ¿Quieres controlar tus finanzas sin esfuerzo?
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#9595a8', margin: '4px 0 10px 0', lineHeight: 1.4 }}>
                Administra tus ingresos y gastos en tiempo real con estética maximalista y cero servidores:
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#121217',
                  border: '1px solid #00f0ff',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  color: '#00f0ff',
                  fontSize: '13px',
                  fontWeight: '800',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <span>🌐</span>
                <span>{ctaUrl}</span>
              </div>
            </div>

            {/* Código QR apuntando a la URL personalizada */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '8px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              }}
            >
              <QRCodeSVG
                value={ctaUrl}
                size={80}
                level="M"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE USUARIO: Configuración de URL y Disparo de Captura en Modo OFF     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl neo-card p-6 sm:p-7 border z-10 my-auto
                dark:bg-[#13131a] dark:border-white/15
                bg-white border-[#121217] shadow-[6px_6px_0px_#121217]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-2xl dark:bg-[#ffd000]/15 bg-[#ffd000]/10 text-[#ffd000]">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display-title font-extrabold text-base sm:text-lg text-main leading-none">
                      Foto de Gastos del Mes
                    </h3>
                    <p className="text-[11px] text-muted mt-1 font-medium">
                      Captura en modo off para guardar en tu dispositivo
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="btn-spring p-2 rounded-xl text-muted hover:text-main bg-black/5 dark:bg-white/10"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-xs text-muted leading-relaxed">
                  Esta opción generará una tarjeta visual de alta resolución con tus estadísticas de <strong>{monthTitle}</strong> y la guardará automáticamente en tus fotos o descargas, sin parpadeos ni capturas visibles en tu pantalla.
                </p>

                {/* URL del Llamado a la Acción (Personalizable) */}
                <div className="p-3.5 rounded-2xl border neo-card dark:bg-[#0b0b0e] bg-[#f8f6f0]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#00f0ff]" />
                      <span>URL del llamado a la acción</span>
                    </span>
                    {!isEditingUrl ? (
                      <button
                        onClick={() => setIsEditingUrl(true)}
                        className="text-[11px] font-bold text-[#00f0ff] hover:underline"
                      >
                        Personalizar
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveUrl}
                        className="text-[11px] font-bold text-[#00ff87] flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Guardar
                      </button>
                    )}
                  </div>

                  {!isEditingUrl ? (
                    <div className="text-xs font-num font-semibold text-main truncate">
                      {ctaUrl}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="url"
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        placeholder="https://tu-sitio-web.com"
                        className="w-full px-3 py-1.5 rounded-lg text-xs border dark:bg-[#181822] dark:border-white/20 bg-white border-[#121217]"
                        autoFocus
                      />
                    </div>
                  )}
                  <span className="block text-[10px] text-muted mt-1 opacity-75">
                    Esta dirección web y un código QR se incluirán en la foto para que otras personas puedan ingresar a tu sitio.
                  </span>
                </div>

                {/* Resumen previo de datos */}
                <div className="grid grid-cols-2 gap-2 text-center p-3 rounded-2xl bg-black/5 dark:bg-[#181822]">
                  <div>
                    <span className="text-[10px] uppercase text-muted font-bold block">Balance</span>
                    <span className={`text-sm font-bold font-num ${monthBalance >= 0 ? 'text-[#00ff87] dark:text-[#00ff87] text-[#087f48]' : 'text-[#ff2e93]'}`}>
                      {formatCurrency(monthBalance, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted font-bold block">Movimientos</span>
                    <span className="text-sm font-bold font-num text-main">
                      {movements.length} registrados
                    </span>
                  </div>
                </div>

                {/* Botón de Captura y Descarga */}
                <button
                  onClick={handleTakeSnapshot}
                  disabled={isGenerating}
                  id="take-snapshot-btn"
                  className="btn-spring w-full py-3.5 rounded-2xl font-display-title font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer
                    dark:bg-gradient-to-r dark:from-[#ffd000] dark:to-[#00ff87] dark:text-black dark:shadow-[0_0_20px_rgba(255,208,0,0.4)]
                    bg-[#121217] text-[#ffd000] shadow-[3px_3px_0px_#ffd000] disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGenerating ? 'Generando Foto...' : 'Tomar Foto y Guardar'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
