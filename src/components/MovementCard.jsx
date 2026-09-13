import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit3, Bookmark, ShoppingBag, ChevronDown, Calendar, CreditCard, Tag } from 'lucide-react';
import { formatCurrency, formatMovementDate } from '../utils/formatters';
import { PAYMENT_WALLETS } from '../utils/budgetConstants';

export function MovementCard({
  movement,
  currency = 'PEN',
  reserves = [],
  categories = [],
  onDelete,
  onEditClick,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isIngreso = movement.type === 'ingreso' || movement.type === 'income';

  // Buscar metadatos
  const linkedReserve = reserves.find((r) => r.id === movement.linkedReserveId || r.id === movement.restrictedReserveId);
  const walletObj = PAYMENT_WALLETS.find((w) => w.id === movement.wallet) || (movement.wallet ? { label: movement.wallet, icon: '💵' } : null);
  const categoryObj = categories.find((c) => c.id === movement.categoryId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-3.5 transition-all border cursor-pointer select-none
        dark:bg-[#121218] dark:hover:bg-[#161622]
        bg-white hover:bg-[#faf8f4]
        ${
          isExpanded
            ? 'dark:bg-[#161624] bg-[#f7f5ef] shadow-[2px_2px_0px_#121217] dark:shadow-[0_0_15px_rgba(255,255,255,0.06)]'
            : ''
        }
        ${
          isIngreso
            ? 'border-l-[4px] border-l-[#087f48] dark:border-l-[#00ff87] border-[#121217]/10 dark:border-white/10'
            : 'border-l-[4px] border-l-[#d9183b] dark:border-l-[#ff2e93] border-[#121217]/10 dark:border-white/10'
        }
        hover:shadow-[2px_2px_0px_#121217] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]`}
    >
      {/* Vista Resumida Principal: Icono, Descripción, Monto, Editar y Borrar */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Lado Izquierdo: Icono + Descripción */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {/* Icono en badge minimalista */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 transition-transform group-hover:scale-105
              ${
                isIngreso
                  ? 'dark:bg-[#00ff87]/15 bg-[#087f48]/10 text-[#087f48] dark:text-[#00ff87]'
                  : 'dark:bg-[#ff2e93]/15 bg-[#d9183b]/10 text-[#d9183b] dark:text-[#ff4365]'
              }`}
          >
            <span>{movement.icon || (isIngreso ? '💵' : '💸')}</span>
          </div>

          {/* Descripción simplificada */}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm text-main truncate leading-tight">
              {movement.description}
            </h4>
          </div>
        </div>

        {/* Lado Derecho: Monto Ingreso/Egreso + Botón de Editar y Borrar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="text-right">
            <span
              className={`font-num font-extrabold text-sm sm:text-base lg:text-lg tracking-tight block
                ${
                  isIngreso
                    ? 'text-[#087f48] dark:text-[#00ff87]'
                    : 'text-[#d9183b] dark:text-[#ff2e93]'
                }`}
            >
              {isIngreso ? '+' : '-'}{formatCurrency(movement.amount, currency)}
            </span>
          </div>

          {/* Acciones: Editar / Borrar */}
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            {!showConfirmDelete ? (
              <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick(movement);
                  }}
                  className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  title="Editar movimiento"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmDelete(true);
                  }}
                  className="p-1.5 rounded-lg text-muted hover:text-[#d9183b] dark:hover:text-[#ff2e93] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-[#d9183b]/10 dark:bg-[#ff2e93]/20 p-1 rounded-lg">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(movement.id);
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#d9183b] text-white cursor-pointer"
                >
                  Borrar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmDelete(false);
                  }}
                  className="p-1 text-muted text-xs hover:text-main cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Indicador de expansión tipo flecha */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted/60 pl-0.5 flex items-center justify-center pointer-events-none"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </div>

      {/* Vista Detallada Expandible: Más información al hacer click */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-black/5 dark:border-white/10 space-y-2.5">
              {/* Tarjetas de metadatos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                {/* Fecha y Hora */}
                <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fecha
                  </span>
                  <span className="font-semibold text-main mt-0.5 block truncate">
                    {formatMovementDate(movement.date)}
                  </span>
                </div>

                {/* Categoría */}
                <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Categoría
                  </span>
                  <span className="font-semibold text-main mt-0.5 flex items-center gap-1 truncate">
                    <span>{categoryObj?.icon || '🏷️'}</span>
                    <span className="truncate">{categoryObj?.name || 'General'}</span>
                  </span>
                </div>

                {/* Medio de Pago */}
                <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Medio de Pago
                  </span>
                  <span className="font-semibold text-[#0284c7] dark:text-[#00f0ff] mt-0.5 flex items-center gap-1 truncate">
                    <span>{walletObj?.icon || '💵'}</span>
                    <span className="truncate">{walletObj?.label || 'Efectivo'}</span>
                  </span>
                </div>

                {/* Tipo de Movimiento */}
                <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                    Tipo
                  </span>
                  <span
                    className={`font-bold mt-0.5 block ${
                      isIngreso ? 'text-[#087f48] dark:text-[#00ff87]' : 'text-[#d9183b] dark:text-[#ff2e93]'
                    }`}
                  >
                    {isIngreso ? 'Ingreso' : 'Egreso'}
                  </span>
                </div>
              </div>

              {/* Reserva o Fondos Vinculados (si aplica) */}
              {linkedReserve && (
                <div className="p-2.5 rounded-xl bg-[#ffd000]/10 border border-[#ffd000]/25 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{linkedReserve.icon || '🎯'}</span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-[#b45309] dark:text-[#ffd000] uppercase tracking-wider block">
                        Reserva Vinculada
                      </span>
                      <span className="text-xs font-bold text-main truncate block">
                        {linkedReserve.name}
                      </span>
                    </div>
                  </div>
                  {movement.isRestricted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] text-[#0369a1] dark:text-[#00f0ff] bg-[#00f0ff]/15 shrink-0">
                      <Bookmark className="w-3 h-3" /> Restringido
                    </span>
                  )}
                </div>
              )}

              {/* Tag Venta comercial (si aplica) */}
              {movement.source === 'sale' && (
                <div className="p-2.5 rounded-xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#ea580c] dark:text-[#f97316]" />
                    <div>
                      <span className="text-[10px] font-bold text-[#ea580c] dark:text-[#f97316] uppercase tracking-wider block">
                        Venta Comercial
                      </span>
                      {movement.saleCost && (
                        <span className="text-xs text-muted">
                          Costo mercadería: {formatCurrency(movement.saleCost, currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Nota o comentario adicional si existe */}
              {(movement.notes || movement.note) && (
                <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-start gap-2">
                  <span className="text-sm">📝</span>
                  <div className="text-xs">
                    <span className="font-bold text-main block">Nota:</span>
                    <p className="text-muted italic mt-0.5">{movement.notes || movement.note}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
