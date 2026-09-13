import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Calendar, ArrowUpRight, ArrowDownLeft, Edit3, Trash2, ShieldCheck, AlertCircle, Eye } from 'lucide-react';
import { calculateReserveMetrics } from '../utils/budgetCalculations';
import { formatCurrency } from '../utils/formatters';

export function ReservesOverview({
  reserves = [],
  movements = [],
  allocations = [],
  currency = 'PEN',
  onOpenCreateReserve,
  onEditReserve,
  onDeleteReserve,
  onAllocateFunds,
  onReleaseFunds,
  onSelectReserveForDetail,
  onSpendFromReserve,
}) {
  const [activeActionReserve, setActiveActionReserve] = useState(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionType, setActionType] = useState('deposit'); // 'deposit' | 'release'

  const handleActionSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(actionAmount);
    if (isNaN(amt) || amt <= 0 || !activeActionReserve) return;

    if (actionType === 'deposit') {
      onAllocateFunds(activeActionReserve.id, amt, 'Asignación manual');
    } else {
      onReleaseFunds(activeActionReserve.id, amt, 'Liberación a disponible');
    }

    setActiveActionReserve(null);
    setActionAmount('');
  };

  return (
    <section className="mb-8">
      {/* Listado de Tarjetas de Reservas */}
      {reserves.length === 0 ? (
        <div className="p-6 rounded-3xl neo-card border text-center dark:bg-[#13131a] bg-white">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl dark:bg-[#181822] bg-black/5">
            📦
          </div>
          <h3 className="font-display-title font-bold text-sm text-main mb-1">
            No tienes reservas creadas aún
          </h3>
          <p className="text-xs text-muted max-w-xs mx-auto mb-4">
            Crea fondos para tus gastos recurrentes (como pasajes, plan móvil) o metas de ahorro.
          </p>
          <button
            onClick={onOpenCreateReserve}
            className="btn-spring inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider
              dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-[2px_2px_0px_#ffd000]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Crear primera reserva</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {reserves.map((reserve) => {
            const metrics = calculateReserveMetrics(reserve, new Date(), { movements, allocations });
            const isSpendingFund = metrics.isSpendingFund;
            const isCompleted = metrics.progreso >= 100 && !isSpendingFund;

            const priorityBadge = {
              high: { label: 'Alta', color: 'dark:text-[#ff2e93] text-[#d9183b] dark:bg-[#ff2e93]/15 bg-[#d9183b]/10' },
              medium: { label: 'Media', color: 'dark:text-[#ffd000] text-[#b45309] dark:bg-[#ffd000]/15 bg-[#ffd000]/15' },
              low: { label: 'Baja', color: 'dark:text-[#00ff87] text-[#087f48] dark:bg-[#00ff87]/15 bg-[#087f48]/10' },
            }[reserve.priority || 'medium'];

            return (
              <motion.div
                key={reserve.id}
                layout
                className="relative overflow-hidden rounded-2xl p-4 neo-card border transition-all flex flex-col justify-between
                  dark:bg-[#13131a] dark:border-white/10 dark:hover:border-white/20
                  bg-white border-[#121217]/15 shadow-[3px_3px_0px_#121217]"
              >
                <div>
                  {/* Fila 1: Icono, Nombre, Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        onClick={() => onSelectReserveForDetail && onSelectReserveForDetail(reserve)}
                        className="text-2xl flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      >
                        {reserve.icon || '🎯'}
                      </span>
                      <div className="min-w-0">
                        <h4
                          onClick={() => onSelectReserveForDetail && onSelectReserveForDetail(reserve)}
                          className="font-bold text-sm sm:text-base text-main truncate leading-tight cursor-pointer hover:text-[#00f0ff] transition-colors"
                          title="Ver detalle e historial"
                        >
                          {reserve.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${priorityBadge.color}`}>
                            {priorityBadge.label}
                          </span>
                          {reserve.nextDueDate && (
                            <span className="text-[11px] text-muted flex items-center gap-1 font-mono-num">
                              <Calendar className="w-3 h-3" />
                              <span>{reserve.nextDueDate.slice(5)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onSelectReserveForDetail && (
                        <button
                          onClick={() => onSelectReserveForDetail(reserve)}
                          className="p-1.5 rounded-lg text-muted hover:text-[#00f0ff] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                          title="Ver detalle y movimientos"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onEditReserve(reserve)}
                        className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        title="Editar reserva"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteReserve(reserve.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-[#d9183b] dark:hover:text-[#ff2e93] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        title="Eliminar reserva"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fila 2: Montos y Disponibilidad Intuitiva */}
                  <div className="flex items-baseline justify-between gap-2 mt-3 font-mono-num">
                    <div>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                        {isSpendingFund ? 'Te queda:' : 'Apartado:'}
                      </span>
                      <span className="text-base sm:text-lg font-black text-main">
                        {formatCurrency(metrics.current, currency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                        {isSpendingFund ? 'Presupuesto:' : 'Meta:'}
                      </span>
                      <span className="text-sm font-bold text-muted">
                        {formatCurrency(metrics.target, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso y Estado */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                      {isSpendingFund ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-main font-bold">
                            Gastado: {formatCurrency(metrics.spent, currency)}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-muted">
                            {metrics.spentPercentage}% usado
                          </span>
                        </div>
                      ) : (
                        <span className={isCompleted ? 'text-[#00ff87] font-bold' : 'text-muted'}>
                          {isCompleted ? '¡Meta alcanzada!' : `Faltan ${formatCurrency(metrics.faltante, currency)}`}
                        </span>
                      )}

                      <span className="font-bold text-main">
                        {isSpendingFund ? `${metrics.progreso}% disponible` : `${metrics.progreso}%`}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${metrics.progreso}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          isSpendingFund
                            ? metrics.progreso > 35
                              ? 'bg-[#00ff87]'
                              : metrics.progreso > 15
                              ? 'bg-gradient-to-r from-[#ffd000] to-[#00ff87]'
                              : 'bg-gradient-to-r from-[#ff2e93] to-[#ffd000]'
                            : isCompleted
                            ? 'bg-[#00ff87]'
                            : 'bg-gradient-to-r from-[#00f0ff] to-[#00ff87]'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones Rápidas: Apartar, Gastar y Liberar */}
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => {
                      setActiveActionReserve(reserve);
                      setActionType('deposit');
                      setActionAmount('');
                    }}
                    className="btn-spring flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border
                      dark:bg-[#1f1f2c] dark:border-white/10 dark:text-[#00ff87] dark:hover:border-[#00ff87]/40
                      bg-black/5 border-black/10 text-[#087f48]"
                    title="Añadir más dinero a este fondo"
                  >
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>Apartar +</span>
                  </button>

                  {onSpendFromReserve && (
                    <button
                      onClick={() => onSpendFromReserve(reserve)}
                      className="btn-spring flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border
                        dark:bg-[#1f1f2c] dark:border-white/10 dark:text-[#00f0ff] dark:hover:border-[#00f0ff]/40
                        bg-black/5 border-black/10 text-[#008ba3]"
                      title="Registrar un gasto pagado con este fondo"
                    >
                      <span className="text-xs">💸</span>
                      <span>Gastar</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveActionReserve(reserve);
                      setActionType('release');
                      setActionAmount('');
                    }}
                    className="btn-spring flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border
                      dark:bg-[#1f1f2c] dark:border-white/10 dark:text-[#ffd000] dark:hover:border-[#ffd000]/40
                      bg-black/5 border-black/10 text-main"
                    title="Liberar dinero de este fondo a tu disponible libre"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Liberar</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Rápido de Apartar o Liberar Fondos */}
      {activeActionReserve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl p-6 neo-card border dark:bg-[#13131a] bg-white border-[#121217]"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display-title font-extrabold text-base text-main">
                {actionType === 'deposit' ? 'Apartar fondos para' : 'Liberar dinero de'}{' '}
                {activeActionReserve.name}
              </h4>
              <button
                onClick={() => setActiveActionReserve(null)}
                className="p-1 rounded-lg text-muted hover:text-main"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">
                  Monto a {actionType === 'deposit' ? 'apartar' : 'liberar'} ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                  autoFocus
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl font-num font-bold text-xl border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white bg-white border-[#121217] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveActionReserve(null)}
                  className="btn-spring flex-1 py-3 rounded-xl text-xs font-bold text-muted border neo-border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`btn-spring flex-1 py-3 rounded-xl text-xs font-bold transition-all
                    ${
                      actionType === 'deposit'
                        ? 'bg-[#00ff87] text-black shadow-[0_0_15px_rgba(0,255,135,0.4)]'
                        : 'bg-[#ffd000] text-black shadow-[0_0_15px_rgba(255,208,0,0.4)]'
                    }`}
                >
                  {actionType === 'deposit' ? 'Confirmar Apartado' : 'Liberar a Disponible'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </section>
  );
}
