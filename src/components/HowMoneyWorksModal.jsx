import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, ShieldCheck, Sparkles, Wallet, Bookmark, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export function HowMoneyWorksModal({
  isOpen,
  onClose,
  metrics,
  reserves = [],
  currency = 'PEN',
}) {
  if (!isOpen) return null;

  const { saldoEsperado = 0, totalReservado = 0, disponibleParaGastar = 0 } = metrics || {};

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Fondo oscurecido con desenfoque */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window con flex-col y max-h estricto para evitar desbordes en desktop y móvil */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[88vh] flex flex-col overflow-hidden rounded-3xl p-5 sm:p-7 neo-card border z-10 my-auto
            dark:bg-[#13131a] dark:border-white/15
            bg-[#ffffff] border-[#121217] shadow-[6px_6px_0px_#121217]"
        >
          {/* Header fijo superior */}
          <div className="flex items-center justify-between pb-3.5 border-b border-black/5 dark:border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl dark:bg-[#00f0ff]/15 bg-[#00f0ff]/10 text-[#00f0ff]">
                <HelpCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-display-title font-black text-base sm:text-lg text-main leading-tight">
                  ¿Cómo funciona mi dinero?
                </h3>
                <p className="text-[11px] text-muted font-bold tracking-wider uppercase mt-0.5">
                  Guía de presupuesto para ingresos variables
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

          {/* Contenido scrolleable con espacio y padding optimizado */}
          <div className="flex-1 overflow-y-auto py-3.5 pr-1 space-y-3 text-xs sm:text-sm leading-relaxed text-muted">
            {/* Texto explicativo según specification */}
            <div className="p-3.5 sm:p-4 rounded-2xl dark:bg-[#0b0b0e] bg-black/5 border dark:border-white/10 border-black/10">
              <p className="font-medium text-main mb-2.5">
                <span className="font-bold text-[#087f48] dark:text-[#00ff87]">Tu saldo esperado</span> muestra el dinero que deberías tener según todos tus ingresos y egresos registrados.
              </p>
              <p className="mb-2.5">
                Parte de ese saldo está <strong className="text-main font-bold">reservado</strong> para pagos futuros, como pasajes, tu plan móvil o un corte de cabello. Ese dinero sigue siendo tuyo, pero <span className="underline decoration-[#ffd000]">no se considera disponible</span> porque ya tiene un propósito.
              </p>
              <p className="mb-2.5">
                El <strong className="text-main font-bold">disponible</strong> es lo que puedes usar hoy sin afectar tus reservas ni tu ahorro. Cuando recibes un ingreso, la aplicación te sugiere separar primero lo necesario para tus próximos pagos y metas. Tú siempre puedes modificar esa sugerencia.
              </p>
              <div className="flex items-start gap-2 pt-2 text-[11px] sm:text-xs font-semibold text-main dark:text-[#00f0ff] text-[#1d4ed8]">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Reservar dinero no es un gasto. El saldo total solo baja cuando realmente pagas o compras algo.</span>
              </div>
            </div>

            {/* Desglose visual en tiempo real con datos del usuario */}
            <div>
              <h4 className="font-display-title font-extrabold text-[11px] uppercase tracking-widest text-muted mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ffd000]" />
                <span>Tu balance en vivo explicado:</span>
              </h4>

              <div className="p-3.5 rounded-2xl dark:bg-[#181822] bg-[#f8f5ee] border border-black/10 dark:border-white/10 font-mono-num text-xs sm:text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-[#087f48] dark:text-[#00ff87]" /> Saldo esperado:
                  </span>
                  <span className="font-bold text-main">
                    {formatCurrency(saldoEsperado, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#d9183b] dark:text-[#ff4365]">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4" /> - Total reservado con propósito:
                  </span>
                  <span className="font-bold">
                    -{formatCurrency(totalReservado, currency)}
                  </span>
                </div>

                <div className="border-t border-black/10 dark:border-white/10 pt-2 flex items-center justify-between text-sm sm:text-base font-extrabold text-[#087f48] dark:text-[#00ff87]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> = Disponible hoy para gastar:
                  </span>
                  <span>
                    {formatCurrency(disponibleParaGastar, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ejemplo ilustrativo didáctico */}
            <div className="text-[11px] text-muted pt-0.5">
              <p className="font-semibold mb-1 text-muted">Ejemplo ilustrativo de referencia:</p>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[11px] p-2.5 sm:p-3 rounded-xl dark:bg-[#0b0b0e] bg-white border border-black/10 dark:border-white/10 text-main">
                <div>• Saldo total: S/ 100</div>
                <div>• Plan móvil: S/ 29</div>
                <div>• Corte cabello: S/ 15</div>
                <div>• Fondo emergencia: S/ 20</div>
                <div className="col-span-2 font-bold text-main pt-1 border-t border-black/10 dark:border-white/10 text-[#087f48] dark:text-[#00ff87]">
                  = Disponible para gastar libre: S/ 36
                </div>
              </div>
            </div>
          </div>

          {/* Footer fijo inferior con botón de acción accesible siempre */}
          <div className="pt-3 border-t border-black/5 dark:border-white/10 flex-shrink-0">
            <button
              onClick={onClose}
              className="btn-spring w-full py-2.5 sm:py-3 rounded-2xl font-display-title font-bold text-xs sm:text-sm text-center cursor-pointer transition-all
                dark:bg-[#00ff87] dark:text-black dark:shadow-[0_0_20px_rgba(0,255,135,0.3)]
                bg-[#121217] text-white shadow-[3px_3px_0px_#ffd000]"
            >
              ¡Entendido, gracias!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
