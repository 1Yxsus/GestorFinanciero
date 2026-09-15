import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Calendar, ArrowUpRight, ArrowDownLeft, Edit3, Trash2, ShieldCheck, AlertCircle, Eye, Lock } from 'lucide-react';
import { calculateReserveMetrics, getReserveWalletTotals, round2 } from '../utils/budgetCalculations';
import { formatCurrency } from '../utils/formatters';
import { PAYMENT_WALLETS } from '../utils/budgetConstants';

export function ReservesOverview({
  reserves = [],
  movements = [],
  allocations = [],
  currency = 'PEN',
  walletBreakdown = null,
  onOpenCreateReserve,
  onEditReserve,
  onDeleteReserve,
  onAllocateFunds,
  onReleaseFunds,
  onSelectReserveForDetail,
  onSpendFromReserve,
}) {
  const [activeActionReserve, setActiveActionReserve] = useState(null);
  const [actionAmount, setActionAmount] = useState(0);
  const [actionType, setActionType] = useState('deposit'); // 'deposit' | 'spend' | 'release'
  const [actionWallet, setActionWallet] = useState('cash'); // 'cash' | 'yape_plin' | 'bank'
  const [spendDescription, setSpendDescription] = useState('');

  const handleOpenDeposit = (reserve) => {
    setActiveActionReserve(reserve);
    setActionType('deposit');
    const wTotals = getReserveWalletTotals(reserve, allocations);
    const validWallets = ['cash', 'yape_plin', 'bank'].filter((k) => (wTotals[k] || 0) > 0);
    const preferredWallet = validWallets[0] || reserve.wallet || 'cash';
    setActionWallet(preferredWallet);

    const targetDefined = Number(reserve.targetAmount) || 0;
    const currentInReserve = Number(reserve.currentAmount) || 0;
    const faltante = Math.max(0, round2(targetDefined - currentInReserve));
    const walletAvailable = Math.max(0, walletBreakdown?.wallets?.[preferredWallet]?.available || 0);
    const maxNeeded = targetDefined > 0 ? (faltante > 0 ? faltante : targetDefined) : walletAvailable;
    const initialMax = Math.min(walletAvailable, maxNeeded);

    // Sugerir por defecto lo que falta para completar la meta definida (hasta lo disponible)
    setActionAmount(initialMax > 0 ? initialMax : 0);
    setSpendDescription('');
  };

  const handleOpenSpend = (reserve) => {
    setActiveActionReserve(reserve);
    setActionType('spend');
    const wTotals = getReserveWalletTotals(reserve, allocations);
    const validWallets = ['cash', 'yape_plin', 'bank'].filter((k) => (wTotals[k] || 0) > 0);
    const lockedWallet = validWallets[0] || reserve.wallet || 'cash';
    setActionWallet(lockedWallet);
    const maxAmt = wTotals[lockedWallet] || reserve.currentAmount || 0;
    setActionAmount(maxAmt > 0 ? Math.min(10, maxAmt) : 0);
    setSpendDescription('');
  };

  const handleOpenRelease = (reserve) => {
    setActiveActionReserve(reserve);
    setActionType('release');
    const wTotals = getReserveWalletTotals(reserve, allocations);
    const validWallets = ['cash', 'yape_plin', 'bank'].filter((k) => (wTotals[k] || 0) > 0);
    const lockedWallet = validWallets[0] || reserve.wallet || 'cash';
    setActionWallet(lockedWallet);
    const maxAmt = wTotals[lockedWallet] || reserve.currentAmount || 0;
    setActionAmount(maxAmt > 0 ? Math.min(10, maxAmt) : 0);
    setSpendDescription('');
  };

  const handleActionSubmit = (e) => {
    e.preventDefault();
    const amt = round2(parseFloat(actionAmount));
    if (isNaN(amt) || amt <= 0 || !activeActionReserve) return;

    if (actionType === 'deposit') {
      onAllocateFunds(activeActionReserve.id, amt, 'Asignación manual', actionWallet);
    } else if (actionType === 'spend') {
      if (onSpendFromReserve) {
        onSpendFromReserve(activeActionReserve, amt, actionWallet, spendDescription);
      }
    } else if (actionType === 'release') {
      onReleaseFunds(activeActionReserve.id, amt, 'Liberación a disponible', actionWallet);
    }

    setActiveActionReserve(null);
    setActionAmount(0);
    setSpendDescription('');
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

            const walletTotals = getReserveWalletTotals(reserve, allocations);

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
                      <span className="flex items-center justify-center w-10 h-10 rounded-2xl dark:bg-white/10 bg-black/5 text-2xl shrink-0">
                        {reserve.icon || '🎯'}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-display-title font-extrabold text-sm text-main truncate leading-tight">
                          {reserve.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider ${priorityBadge.color}`}>
                            {priorityBadge.label}
                          </span>
                          {reserve.nextDueDate && (
                            <span className="text-[10px] text-muted font-semibold flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>{reserve.nextDueDate.slice(5, 10)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botones de gestión (Ver, Editar, Eliminar) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectReserveForDetail && (
                        <button
                          onClick={() => onSelectReserveForDetail(reserve)}
                          className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Ver auditoría y detalles"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onEditReserve(reserve)}
                        className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Editar reserva"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteReserve(reserve.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-[#d9183b] dark:hover:text-[#ff2e93] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Eliminar reserva"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fila 2: Métricas Financieras Principales */}
                  <div className="grid grid-cols-2 gap-2 my-2 font-mono-num">
                    <div>
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">
                        {isSpendingFund ? 'Te Queda:' : 'Apartado:'}
                      </span>
                      <span className="text-base font-extrabold text-main leading-tight block">
                        {formatCurrency(metrics.current, currency)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">
                        Presupuesto:
                      </span>
                      <span className="text-sm font-bold text-muted leading-tight block">
                        {formatCurrency(metrics.target, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Fila 3: Indicador de Consumo o Progreso */}
                  {isSpendingFund ? (
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="text-muted flex items-center gap-1 font-mono-num">
                          Gastado: <strong className="text-main">{formatCurrency(metrics.spent, currency)}</strong>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 font-mono-num">
                            {metrics.pctSpent}% usado
                          </span>
                        </span>
                        <span className={`font-mono-num ${metrics.isOverspent ? 'text-[#d9183b] dark:text-[#ff2e93]' : 'text-[#087f48] dark:text-[#00ff87]'}`}>
                          {metrics.pctRemaining}% disponible
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            metrics.isOverspent
                              ? 'bg-[#d9183b] dark:bg-[#ff2e93]'
                              : metrics.pctSpent >= 80
                              ? 'bg-[#b45309] dark:bg-[#ffd000]'
                              : 'bg-[#087f48] dark:bg-[#00ff87]'
                          }`}
                          style={{ width: `${Math.min(100, metrics.pctRemaining)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="text-muted">Progreso hacia la meta</span>
                        <span className="font-mono-num text-main">{metrics.progreso}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full transition-all duration-500 bg-[#00f0ff]"
                          style={{ width: `${Math.min(100, metrics.progreso)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Desglose por billetera si tiene dinero apartado */}
                  {metrics.current > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-muted font-mono-num">
                      <span className="text-[9px] uppercase tracking-wider text-muted/80">Apartado en:</span>
                      {walletTotals.cash > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-main flex items-center gap-1">
                          💵 {formatCurrency(walletTotals.cash, currency)}
                        </span>
                      )}
                      {walletTotals.yape_plin > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-main flex items-center gap-1">
                          📱 {formatCurrency(walletTotals.yape_plin, currency)}
                        </span>
                      )}
                      {walletTotals.bank > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-main flex items-center gap-1">
                          💳 {formatCurrency(walletTotals.bank, currency)}
                        </span>
                      )}
                      {walletTotals.cash === 0 && walletTotals.yape_plin === 0 && walletTotals.bank === 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-main flex items-center gap-1">
                          💵 {formatCurrency(metrics.current, currency)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones Rápidas: Apartar, Gastar y Liberar */}
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleOpenDeposit(reserve)}
                    className="btn-spring flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border
                      dark:bg-[#1f1f2c] dark:border-white/10 dark:text-[#00ff87] dark:hover:border-[#00ff87]/40
                      bg-black/5 border-black/10 text-[#087f48]"
                    title="Añadir más dinero a este fondo"
                  >
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>Apartar +</span>
                  </button>

                  <button
                    onClick={() => handleOpenSpend(reserve)}
                    className="btn-spring flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border
                      dark:bg-[#1f1f2c] dark:border-white/10 dark:text-[#00f0ff] dark:hover:border-[#00f0ff]/40
                      bg-black/5 border-black/10 text-[#008ba3]"
                    title="Registrar un gasto pagado con este fondo"
                  >
                    <span className="text-xs">💸</span>
                    <span>Gastar</span>
                  </button>

                  <button
                    onClick={() => handleOpenRelease(reserve)}
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

      {/* Modal Rápido de Apartar, Gastar o Liberar Fondos con Slider Range, Escritura Directa y Límite Definido */}
      {activeActionReserve && (() => {
        const activeTotals = getReserveWalletTotals(activeActionReserve, allocations);
        const walletsWithFunds = PAYMENT_WALLETS.filter((w) => (activeTotals[w.id] || 0) > 0);

        const targetDefined = Number(activeActionReserve.targetAmount) || 0;
        const currentInReserve = Number(activeActionReserve.currentAmount) || 0;
        const faltante = Math.max(0, round2(targetDefined - currentInReserve));
        const walletAvailable = Math.max(0, walletBreakdown?.wallets?.[actionWallet]?.available || 0);

        // Billetera activa y límite de monto según la acción
        let rangeMax = 0;
        if (actionType === 'deposit') {
          // No permitir apartar todo el dinero que se tiene en la billetera, sino solo lo que se definió para esta reserva
          const maxNeeded = targetDefined > 0 ? (faltante > 0 ? faltante : targetDefined) : walletAvailable;
          rangeMax = Math.min(walletAvailable, maxNeeded);
        } else {
          rangeMax = Math.max(0, activeTotals[actionWallet] || 0);
        }

        const selectedWalletObj = PAYMENT_WALLETS.find((w) => w.id === actionWallet) || PAYMENT_WALLETS[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-3xl p-6 neo-card border dark:bg-[#13131a] bg-white border-[#121217]"
            >
              {/* Cabecera del Modal */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{activeActionReserve.icon || '🎯'}</span>
                  <div>
                    <h4 className="font-display-title font-extrabold text-base text-main leading-tight">
                      {actionType === 'deposit'
                        ? 'Apartar dinero'
                        : actionType === 'spend'
                        ? 'Gastar de reserva'
                        : 'Liberar dinero'}
                    </h4>
                    <span className="text-xs text-muted font-bold block">
                      {activeActionReserve.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveActionReserve(null)}
                  className="p-1 rounded-lg text-muted hover:text-main cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleActionSubmit} className="space-y-4">
                {/* 1. SELECCIÓN O BLOQUEO DE BILLETERA */}
                {actionType === 'deposit' ? (
                  // Para Apartar: se puede seleccionar de qué dinero con saldo disponible se aparta
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                      ¿De qué dinero deseas apartar?
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/15">
                      {PAYMENT_WALLETS.map((w) => {
                        const avail = walletBreakdown?.wallets?.[w.id]?.available || 0;
                        const isSelected = actionWallet === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => {
                              setActionWallet(w.id);
                              const newAvail = walletBreakdown?.wallets?.[w.id]?.available || 0;
                              const newNeeded = targetDefined > 0 ? (faltante > 0 ? faltante : targetDefined) : newAvail;
                              const newMax = Math.min(newAvail, newNeeded);
                              setActionAmount((prev) => Math.min(prev, newMax));
                            }}
                            className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'dark:bg-[#00f0ff]/20 dark:border-[#00f0ff]/40 dark:text-[#00f0ff] bg-[#121217] text-white shadow-sm'
                                : 'text-muted hover:text-main'
                            }`}
                          >
                            <span className="text-base">{w.icon}</span>
                            <span className="truncate text-[10px]">{w.label}</span>
                            <span className="text-[9px] font-num font-semibold opacity-80">
                              {formatCurrency(avail, currency)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Para Gastar o Liberar: BILLETERA ESTRICTAMENTE BLOQUEADA a donde ya fue destinado el dinero
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-[#00f0ff]" />
                      {actionType === 'spend' ? 'Billetera destinada para este gasto' : 'Billetera de origen de este fondo'}
                    </span>

                    {walletsWithFunds.length <= 1 ? (
                      // Un único tipo de dinero: totalmente bloqueado, sin opción a cambiarlo
                      <div className="p-3 rounded-2xl border dark:border-white/15 border-black/15 dark:bg-[#0b0b0e] bg-black/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{selectedWalletObj.icon}</span>
                          <div>
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                              Dinero asignado
                            </span>
                            <span className="text-xs font-black text-main">
                              {selectedWalletObj.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-muted block">Apartado aquí</span>
                          <span className="font-num font-black text-xs text-[#00f0ff]">
                            {formatCurrency(rangeMax, currency)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      // Si excepcionalmente tiene fondos en más de 1 billetera, solo permite elegir entre esas
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/15">
                        {walletsWithFunds.map((w) => {
                          const wAmt = activeTotals[w.id] || 0;
                          const isSelected = actionWallet === w.id;
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                setActionWallet(w.id);
                                setActionAmount((prev) => Math.min(prev, wAmt));
                              }}
                              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-between gap-1 transition-all cursor-pointer ${
                                isSelected
                                  ? 'dark:bg-[#00f0ff]/20 dark:border-[#00f0ff]/40 dark:text-[#00f0ff] bg-[#121217] text-white shadow-sm'
                                  : 'text-muted hover:text-main'
                              }`}
                            >
                              <span className="flex items-center gap-1 text-[11px]">
                                <span>{w.icon}</span>
                                <span>{w.label}</span>
                              </span>
                              <span className="font-num font-bold text-[11px]">
                                {formatCurrency(wAmt, currency)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ESCRITURA DIRECTA DE MONTO + INPUT RANGE DESLIZADOR */}
                <div className="py-2 space-y-3">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted block mb-1">
                      {actionType === 'deposit'
                        ? 'Monto a apartar'
                        : actionType === 'spend'
                        ? 'Monto a gastar'
                        : 'Monto a liberar'}
                    </span>

                    {/* Campo de escritura editable directa */}
                    <div className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-2xl border border-black/10 dark:border-white/10 dark:bg-[#0b0b0e] bg-black/[0.03] focus-within:border-[#00ff87] dark:focus-within:border-[#00ff87] transition-all">
                      <span className="text-2xl sm:text-3xl font-black text-muted font-num select-none">
                        {currency === 'PEN' ? 'S/' : currency === 'USD' ? '$' : '€'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max={rangeMax}
                        value={actionAmount === 0 ? '' : actionAmount}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setActionAmount(0);
                          } else {
                            const num = parseFloat(val);
                            if (!isNaN(num)) {
                              setActionAmount(Math.min(rangeMax, Math.max(0, round2(num))));
                            }
                          }
                        }}
                        className="w-36 sm:w-44 text-center text-3xl sm:text-4xl font-black font-num text-main bg-transparent outline-none focus:outline-none"
                        title="Escribe directamente el monto que deseas apartar o usa el deslizador"
                      />
                    </div>

                    <div className="text-xs text-muted font-medium mt-1">
                      {actionType === 'deposit' && (
                        <span>
                          {targetDefined > 0 && (
                            <span className="block text-[11px] font-semibold text-main mb-0.5">
                              Meta definida: <strong className="text-main">{formatCurrency(targetDefined, currency)}</strong>
                              {faltante > 0 ? ` (Faltan ${formatCurrency(faltante, currency)})` : ' (Meta cubierta)'}
                            </span>
                          )}
                          <span>
                            Disponible en {selectedWalletObj.label}:{' '}
                            <strong className="text-main">{formatCurrency(walletAvailable, currency)}</strong>
                          </span>
                        </span>
                      )}
                      {actionType === 'spend' && (
                        <span>
                          Te quedará en este fondo:{' '}
                          <strong className="text-main">
                            {formatCurrency(Math.max(0, rangeMax - actionAmount), currency)}
                          </strong>
                        </span>
                      )}
                      {actionType === 'release' && (
                        <span>
                          Liberarás a saldo libre de {selectedWalletObj.label}:{' '}
                          <strong className="text-main">{formatCurrency(actionAmount, currency)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {rangeMax > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionAmount <= 0}
                          onClick={() => setActionAmount((prev) => Math.max(0, round2(prev - (rangeMax > 50 ? 5 : 1))))}
                          className="w-8 h-8 rounded-xl border border-black/10 dark:border-white/10 dark:bg-white/5 bg-black/5 font-bold text-xs flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 cursor-pointer shrink-0"
                          title="Disminuir"
                        >
                          {rangeMax > 50 ? '-5' : '-1'}
                        </button>

                        <input
                          type="range"
                          min="0"
                          max={rangeMax}
                          step={rangeMax > 30 ? 1 : 0.5}
                          value={actionAmount}
                          onChange={(e) => setActionAmount(parseFloat(e.target.value) || 0)}
                          className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-black/10 dark:bg-white/15"
                          style={{
                            accentColor:
                              actionType === 'deposit'
                                ? '#00ff87'
                                : actionType === 'spend'
                                ? '#00f0ff'
                                : '#ffd000',
                          }}
                        />

                        <button
                          type="button"
                          disabled={actionAmount >= rangeMax}
                          onClick={() => setActionAmount((prev) => Math.min(rangeMax, round2(prev + (rangeMax > 50 ? 5 : 1))))}
                          className="w-8 h-8 rounded-xl border border-black/10 dark:border-white/10 dark:bg-white/5 bg-black/5 font-bold text-xs flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 cursor-pointer shrink-0"
                          title="Aumentar"
                        >
                          {rangeMax > 50 ? '+5' : '+1'}
                        </button>
                      </div>

                      {/* Botones de porcentaje rápido respecto a lo definido */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0.25, 0.5, 0.75, 1].map((ratio) => {
                          const val = round2(rangeMax * ratio);
                          const isSel = Math.abs(actionAmount - val) < 0.01 && actionAmount > 0;
                          return (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setActionAmount(val)}
                              className={`py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-[#121217] text-white dark:bg-white/20 dark:text-white border-black/30 dark:border-white/30 font-black shadow-xs'
                                  : 'border-black/10 dark:border-white/10 text-muted hover:text-main'
                              }`}
                            >
                              {ratio === 1 ? 'Todo (100%)' : `${ratio * 100}%`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl border border-[#ffd000]/30 dark:bg-[#ffd000]/10 bg-[#ffd000]/10 text-xs font-semibold text-center text-[#b45309] dark:text-[#ffd000]">
                      {actionType === 'deposit'
                        ? (walletAvailable <= 0
                            ? 'No tienes saldo disponible en esta billetera para apartar.'
                            : 'Ya completaste el monto total definido para esta reserva.')
                        : 'Esta reserva no tiene fondos en esta billetera.'}
                    </div>
                  )}
                </div>

                {/* Concepto opcional solo para Gastar */}
                {actionType === 'spend' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                      Detalle del gasto (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder={`Ej. Pasajes ida y vuelta, pasaje bus...`}
                      value={spendDescription}
                      onChange={(e) => setSpendDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold border dark:bg-[#0b0b0e] dark:border-white/15 bg-white border-black/10 outline-none"
                    />
                  </div>
                )}

                {/* 3. BOTONES DE ACCIÓN */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveActionReserve(null)}
                    className="btn-spring flex-1 py-3 rounded-xl text-xs font-bold text-muted border neo-border cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionAmount <= 0 || rangeMax <= 0}
                    className={`btn-spring flex-1 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer
                      ${
                        actionType === 'deposit'
                          ? 'bg-[#00ff87] text-black shadow-[0_0_15px_rgba(0,255,135,0.4)]'
                          : actionType === 'spend'
                          ? 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                          : 'bg-[#ffd000] text-black shadow-[0_0_15px_rgba(255,208,0,0.4)]'
                      }`}
                  >
                    {actionType === 'deposit'
                      ? `Confirmar (+${formatCurrency(actionAmount, currency)})`
                      : actionType === 'spend'
                      ? `Confirmar (-${formatCurrency(actionAmount, currency)})`
                      : `Liberar (+${formatCurrency(actionAmount, currency)})`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        );
      })()}
    </section>
  );
}
