import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Minus,
  Edit3,
  History,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { calculateReserveMetrics } from '../utils/budgetCalculations';
import { formatCurrency, formatMovementDate } from '../utils/formatters';
import { PAYMENT_WALLETS } from '../utils/budgetConstants';

export function ReserveDetailModal({
  isOpen,
  onClose,
  reserve,
  allocations = [],
  movements = [],
  currency = 'PEN',
  onAllocateFunds,
  onReleaseFunds,
  onEditReserve,
}) {
  const [actionType, setActionType] = useState(null); // 'deposit' | 'release' | null
  const [actionAmount, setActionAmount] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [actionWallet, setActionWallet] = useState('cash');

  if (!isOpen || !reserve) return null;

  const metrics = calculateReserveMetrics(reserve, new Date(), { movements, allocations });
  const isSpendingFund = metrics.isSpendingFund;
  const isCompleted = metrics.progreso >= 100 && !isSpendingFund;

  // Filtrar asignaciones correspondientes a esta reserva
  const reserveAllocations = (allocations || []).filter((a) => a.reserveId === reserve.id);

  // Cálculo de ritmo si tiene fecha de vencimiento
  let rhythmInfo = null;
  if (reserve.nextDueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(reserve.nextDueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && metrics.faltante > 0) {
      const dailyPace = metrics.faltante / diffDays;
      const weeklyPace = dailyPace * 7;
      rhythmInfo = {
        daysLeft: diffDays,
        daily: dailyPace,
        weekly: weeklyPace,
        isLate: false,
      };
    } else if (diffDays <= 0 && metrics.faltante > 0) {
      rhythmInfo = {
        daysLeft: diffDays,
        isLate: true,
      };
    }
  }

  const handleActionSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(actionAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (actionType === 'deposit') {
      onAllocateFunds(reserve.id, amt, actionNote.trim() || 'Aporte manual', actionWallet);
    } else {
      onReleaseFunds(reserve.id, amt, actionNote.trim() || 'Liberación a disponible', actionWallet);
    }

    setActionType(null);
    setActionAmount('');
    setActionNote('');
  };

  const priorityBadge = {
    high: { label: 'Prioridad Alta', color: 'dark:text-[#ff2e93] text-[#d9183b] dark:bg-[#ff2e93]/15 bg-[#d9183b]/10' },
    medium: { label: 'Prioridad Media', color: 'dark:text-[#ffd000] text-[#b45309] dark:bg-[#ffd000]/15 bg-[#ffd000]/15' },
    low: { label: 'Prioridad Baja', color: 'dark:text-[#00ff87] text-[#087f48] dark:bg-[#00ff87]/15 bg-[#087f48]/10' },
  }[reserve.priority || 'medium'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
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
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl p-6 sm:p-7 neo-card border z-10
            dark:bg-[#13131a] dark:border-white/15
            bg-[#ffffff] border-[#121217] shadow-[6px_6px_0px_#121217]"
        >
          {/* Manija táctil móvil */}
          <div className="sm:hidden flex justify-center -mt-2 mb-3">
            <div className="w-12 h-1.5 rounded-full bg-black/20 dark:bg-white/25" />
          </div>

          {/* Cabecera */}
          <div className="flex items-start justify-between pb-4 border-b border-black/5 dark:border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl dark:bg-white/10 bg-black/5 text-3xl">
                {reserve.icon || '🎯'}
              </span>
              <div>
                <h3 className="font-display-title font-black text-lg sm:text-xl text-main leading-tight">
                  {reserve.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${priorityBadge.color}`}>
                    {priorityBadge.label}
                  </span>
                  {reserve.nextDueDate && (
                    <span className="text-xs text-muted font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Vence: {reserve.nextDueDate}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onClose();
                  onEditReserve(reserve);
                }}
                className="p-2 rounded-xl text-muted hover:text-main bg-black/5 dark:bg-white/10 cursor-pointer"
                title="Editar meta o parámetros"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-muted hover:text-main bg-black/5 dark:bg-white/10 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tarjetas de Métricas de la Reserva */}
          <div className="grid grid-cols-3 gap-2.5 mb-4 font-mono-num">
            <div className="p-3 rounded-2xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase text-muted block">
                {isSpendingFund ? 'Te Queda' : 'Apartado'}
              </span>
              <span className="font-black text-sm sm:text-base text-[#087f48] dark:text-[#00ff87]">
                {formatCurrency(metrics.current, currency)}
              </span>
            </div>

            <div className="p-3 rounded-2xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase text-muted block">
                {isSpendingFund ? 'Presupuesto' : 'Meta'}
              </span>
              <span className="font-black text-sm sm:text-base text-main">
                {formatCurrency(metrics.target, currency)}
              </span>
            </div>

            <div className="p-3 rounded-2xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase text-muted block">
                {isSpendingFund ? 'Gastado' : 'Faltante'}
              </span>
              <span className={`font-black text-sm sm:text-base ${
                isSpendingFund ? 'text-main' : 'text-[#d9183b] dark:text-[#ff4365]'
              }`}>
                {formatCurrency(isSpendingFund ? metrics.spent : metrics.faltante, currency)}
              </span>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className="p-3.5 rounded-2xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 mb-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-muted">
                {isSpendingFund ? 'Saldo disponible del fondo' : 'Progreso de la meta'}
              </span>
              <span className="font-black text-main">
                {isSpendingFund ? `${metrics.progreso}% disponible` : `${metrics.progreso}%`}
              </span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.progreso}%` }}
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

          {/* RITMO SUGERIDO (Calculadora de aportes según fecha límite) */}
          {rhythmInfo && (
            <div className="p-3.5 rounded-2xl border dark:border-[#00f0ff]/30 border-[#00f0ff]/40 dark:bg-[#00f0ff]/10 bg-[#00f0ff]/5 mb-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-main">
                <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
                <span>Ritmo de Ahorro Recomendado</span>
              </div>
              {!rhythmInfo.isLate ? (
                <div className="text-xs text-muted leading-relaxed">
                  Te quedan <strong className="text-main">{rhythmInfo.daysLeft} días</strong> para la fecha límite.
                  <div className="mt-1 flex flex-wrap gap-2 text-xs font-mono-num font-bold text-main">
                    <span className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10">
                      📅 ~{formatCurrency(rhythmInfo.daily, currency)} / día
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10">
                      🗓️ ~{formatCurrency(rhythmInfo.weekly, currency)} / semana
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold text-[#d9183b] dark:text-[#ff4365] flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>La fecha límite ya venció. Considera actualizar la fecha de vencimiento.</span>
                </div>
              )}
            </div>
          )}

          {/* Botones de Acción Rápida: Depositar o Liberar */}
          {!actionType ? (
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setActionType('deposit')}
                className="btn-spring py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer
                  dark:bg-[#00ff87]/15 dark:border-[#00ff87]/40 dark:text-[#00ff87]
                  bg-[#087f48]/10 border-[#087f48]/30 text-[#087f48]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Apartar Dinero Aquí</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('release')}
                disabled={reserve.currentAmount <= 0}
                className="btn-spring py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer disabled:opacity-40
                  dark:bg-[#ffd000]/15 dark:border-[#ffd000]/40 dark:text-[#ffd000]
                  bg-[#ffd000]/20 border-[#ffd000]/40 text-[#b45309]"
              >
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Liberar a Disponible</span>
              </button>
            </div>
          ) : (
            /* Sub-formulario de acción */
            <form onSubmit={handleActionSubmit} className="p-3.5 rounded-2xl border dark:bg-[#0b0b0e] bg-black/5 dark:border-white/10 space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-main">
                  {actionType === 'deposit' ? '📥 Apartar fondos a esta reserva' : '📤 Liberar fondos a tu saldo disponible'}
                </span>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="text-xs text-muted hover:text-main"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Monto (S/)"
                  required
                  autoFocus
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border dark:bg-[#13131a] bg-white dark:border-white/15 border-black/20 outline-none font-num"
                />
                <input
                  type="text"
                  placeholder="Motivo / Nota (opcional)"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border dark:bg-[#13131a] bg-white dark:border-white/15 border-black/20 outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted uppercase">
                  {actionType === 'deposit' ? '¿De qué medio apartarás el dinero?' : '¿A qué medio liberarás el dinero?'}
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl border dark:bg-[#13131a] bg-white border-black/10 dark:border-white/15">
                  {PAYMENT_WALLETS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setActionWallet(w.id)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        actionWallet === w.id
                          ? 'dark:bg-white/20 bg-black/10 text-main shadow-sm'
                          : 'text-muted hover:text-main'
                      }`}
                    >
                      <span>{w.icon}</span>
                      <span className="truncate">{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-spring w-full py-2 rounded-xl text-xs font-bold dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white"
              >
                Confirmar {actionType === 'deposit' ? 'Apartado' : 'Liberación'}
              </button>
            </form>
          )}

          {/* HISTORIAL DE MOVIMIENTOS Y AUDITORÍA DE LA RESERVA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#ffd000]" />
                <span>Historial de Movimientos ({reserveAllocations.length})</span>
              </span>
            </div>

            {reserveAllocations.length === 0 ? (
              <p className="text-xs text-muted italic py-3 text-center border rounded-xl dark:border-white/5 border-black/5">
                Aún no hay aportes ni consumos registrados para esta reserva.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {reserveAllocations.map((item) => {
                  const isAssign = item.type === 'assign';
                  const isConsume = item.type === 'consume';
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border dark:bg-[#0b0b0e] bg-white border-black/10 dark:border-white/10 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-black uppercase rounded ${
                              isAssign
                                ? 'bg-[#00ff87]/20 text-[#087f48] dark:text-[#00ff87]'
                                : isConsume
                                ? 'bg-[#ff2e93]/20 text-[#d9183b] dark:text-[#ff4365]'
                                : 'bg-[#ffd000]/20 text-[#b45309] dark:text-[#ffd000]'
                            }`}
                          >
                            {isAssign ? 'Aporte' : isConsume ? 'Consumo' : 'Liberado'}
                          </span>
                          <span className="font-semibold text-main truncate">
                            {item.note || 'Movimiento de reserva'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted block mt-0.5">
                          {formatMovementDate(item.date)}
                        </span>
                      </div>

                      <span
                        className={`font-num font-black text-xs ${
                          isAssign
                            ? 'text-[#087f48] dark:text-[#00ff87]'
                            : 'text-[#d9183b] dark:text-[#ff2e93]'
                        }`}
                      >
                        {isAssign ? '+' : '-'}{formatCurrency(item.amount, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
