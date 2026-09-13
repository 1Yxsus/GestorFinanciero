import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Wallet,
  Bookmark,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Plus,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { calculateReserveMetrics } from '../utils/budgetCalculations';

export function BalanceBreakdownModal({
  isOpen,
  onClose,
  mode = 'total', // 'total' | 'reserves' | 'available'
  breakdown,
  reserves = [],
  movements = [],
  allocations = [],
  currency = 'PEN',
  onNavigateToReserves,
  onOpenCreateReserve,
  onSelectReserveDetail,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const {
    wallets = {},
    totalBalance = 0,
    totalReservado = 0,
    totalDisponible = 0,
  } = breakdown || {};

  const cash = wallets.cash || { balance: 0, available: 0, income: 0, expense: 0, percentage: 0 };
  const yape = wallets.yape_plin || { balance: 0, available: 0, income: 0, expense: 0, percentage: 0 };
  const bank = wallets.bank || { balance: 0, available: 0, income: 0, expense: 0, percentage: 0 };

  const activeReserves = reserves.filter((r) => r.active !== false);

  const getTitleAndIcon = () => {
    switch (mode) {
      case 'total':
        return {
          title: 'Desglose de Saldo Total',
          subtitle: 'Todo tu dinero físico y digital por cuenta o billetera',
          icon: <Wallet className="w-5 h-5 text-[#00f0ff]" />,
          color: '#00f0ff',
        };
      case 'reserves':
        return {
          title: 'Resumen de En Reserva',
          subtitle: 'Dinero protegido y separado para tus metas y compromisos',
          icon: <Bookmark className="w-5 h-5 text-[#ffd000]" />,
          color: '#ffd000',
        };
      case 'available':
      default:
        return {
          title: 'Desglose de Disponible Hoy',
          subtitle: 'Tu liquidez libre de reservas clasificada por billetera',
          icon: <CheckCircle2 className="w-5 h-5 text-[#00ff87]" />,
          color: '#00ff87',
        };
    }
  };

  const header = getTitleAndIcon();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
        {/* Fondo translúcido */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        />

        {/* Contenedor Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl border neo-card
            dark:bg-[#12121a] dark:border-white/15 dark:text-white
            bg-white border-[#121217] text-[#121217] shadow-[6px_6px_0px_#121217]
            max-h-[90vh] flex flex-col z-10"
        >
          {/* Barra Superior Decorativa */}
          <div
            className="h-2 w-full"
            style={{
              backgroundColor: header.color,
            }}
          />

          {/* Cabecera del Modal */}
          <div className="p-5 sm:p-6 pb-4 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm"
                style={{
                  backgroundColor: `${header.color}18`,
                  borderColor: `${header.color}40`,
                }}
              >
                {header.icon}
              </div>
              <div>
                <h3 className="font-display-title font-black text-lg sm:text-xl text-main leading-tight">
                  {header.title}
                </h3>
                <p className="text-xs text-muted font-medium mt-0.5">
                  {header.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              id="close-breakdown-modal-btn"
              className="p-2 rounded-xl text-muted hover:text-main hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo del Modal */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
            {/* ======================= MODO: SALDO TOTAL ======================= */}
            {mode === 'total' && (
              <>
                {/* Banner de Saldo Total General */}
                <div className="p-4 rounded-2xl border dark:bg-[#181824] bg-black/[0.02] border-black/10 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                      Saldo Total Registrado
                    </span>
                    <span className="font-display-title font-black text-2xl sm:text-3xl text-main font-num">
                      {formatCurrency(totalBalance, currency)}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full dark:bg-[#00f0ff]/15 bg-[#00f0ff]/20 text-[#008ba3] dark:text-[#00f0ff]">
                    100% Total
                  </span>
                </div>

                {/* Tarjetas de las 3 Billeteras */}
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-muted block">
                    Clasificación en cuentas y medios
                  </span>

                  {/* 1. Efectivo */}
                  <div className="p-4 rounded-2xl border dark:bg-[#161622] bg-[#fdfdfd] border-black/10 dark:border-white/10 flex items-center justify-between gap-3 hover:border-[#00ff87]/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-black/5 dark:bg-white/10 flex-shrink-0">
                        💵
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-main">Efectivo</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-muted">
                            Físico
                          </span>
                        </div>
                        <span className="text-[11px] text-muted block font-mono-num mt-0.5">
                          {cash.percentage}% del saldo total
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-display-title font-black text-lg text-main font-num">
                        {formatCurrency(cash.balance, currency)}
                      </div>
                    </div>
                  </div>

                  {/* 2. Yape / Plin */}
                  <div className="p-4 rounded-2xl border dark:bg-[#161622] bg-[#fdfdfd] border-black/10 dark:border-white/10 flex items-center justify-between gap-3 hover:border-[#a855f7]/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-purple-500/10 text-purple-400 flex-shrink-0">
                        📱
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-main">Yape / Plin</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300">
                            Digital
                          </span>
                        </div>
                        <span className="text-[11px] text-muted block font-mono-num mt-0.5">
                          {yape.percentage}% del saldo total
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-display-title font-black text-lg text-main font-num">
                        {formatCurrency(yape.balance, currency)}
                      </div>
                    </div>
                  </div>

                  {/* 3. Cuenta Bancaria */}
                  <div className="p-4 rounded-2xl border dark:bg-[#161622] bg-[#fdfdfd] border-black/10 dark:border-white/10 flex items-center justify-between gap-3 hover:border-[#00f0ff]/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-cyan-500/10 text-cyan-400 flex-shrink-0">
                        💳
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-main">Cuenta Bancaria</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                            Banco
                          </span>
                        </div>
                        <span className="text-[11px] text-muted block font-mono-num mt-0.5">
                          {bank.percentage}% del saldo total
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-display-title font-black text-lg text-main font-num">
                        {formatCurrency(bank.balance, currency)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 text-xs text-muted flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00ff87] flex-shrink-0" />
                  <span>
                    La suma de estos 3 medios coincide exactamente con tu saldo registrado en la app.
                  </span>
                </div>
              </>
            )}

            {/* ======================= MODO: EN RESERVA ======================= */}
            {mode === 'reserves' && (
              <>
                {/* Banner Total Reservado */}
                <div className="p-4 rounded-2xl border dark:bg-[#1c1a14] bg-[#fefce8] border-[#ffd000]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#b45309] dark:text-[#ffd000] block">
                      Total Protegido en Reservas
                    </span>
                    <span className="font-display-title font-black text-2xl sm:text-3xl text-[#b45309] dark:text-[#ffd000] font-num">
                      {formatCurrency(totalReservado, currency)}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full dark:bg-[#ffd000]/20 bg-[#ffd000]/30 text-[#b45309] dark:text-[#ffd000]">
                    {activeReserves.length} {activeReserves.length === 1 ? 'meta' : 'metas'}
                  </span>
                </div>

                {/* Lista Resumida de Reservas */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-muted">
                      Metas y Fondos Activos
                    </span>
                    {onNavigateToReserves && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToReserves();
                        }}
                        className="text-xs font-bold text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Ver detalle completo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {activeReserves.length === 0 ? (
                    <div className="p-6 text-center border border-dashed rounded-2xl dark:border-white/10 border-black/10">
                      <p className="text-xs text-muted mb-2">No tienes reservas activas por el momento.</p>
                      {onOpenCreateReserve && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenCreateReserve();
                          }}
                          className="btn-spring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border dark:bg-[#ffd000]/15 dark:border-[#ffd000]/30 dark:text-[#ffd000] bg-[#ffd000]/20 text-[#b45309] border-[#ffd000]/50 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear primera reserva</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    activeReserves.map((res) => {
                      const rMetrics = calculateReserveMetrics(res, new Date(), { movements, allocations });
                      const isSpendingFund = rMetrics.isSpendingFund;
                      const isComplete = rMetrics.progreso >= 100 && !isSpendingFund;
                      return (
                        <div
                          key={res.id}
                          onClick={() => {
                            if (onSelectReserveDetail) {
                              onClose();
                              onSelectReserveDetail(res);
                            }
                          }}
                          className="p-3 rounded-xl border dark:bg-[#161622] bg-white border-black/10 dark:border-white/10 hover:border-[#ffd000]/50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                          title="Toca para ver movimientos de esta reserva"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl flex-shrink-0">{res.icon || '🎯'}</span>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-main block truncate">
                                {res.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted font-mono-num">
                                  {isSpendingFund ? `Presupuesto: ${formatCurrency(res.targetAmount, currency)}` : `Meta: ${formatCurrency(res.targetAmount, currency)}`}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  isSpendingFund
                                    ? 'dark:bg-[#00ff87]/15 bg-[#087f48]/10 text-[#087f48] dark:text-[#00ff87]'
                                    : isComplete
                                    ? 'dark:bg-[#00ff87]/15 bg-[#087f48]/10 text-[#087f48] dark:text-[#00ff87]'
                                    : 'dark:bg-[#ffd000]/15 bg-[#ffd000]/20 text-[#b45309] dark:text-[#ffd000]'
                                }`}>
                                  {isSpendingFund ? `${rMetrics.progreso}% disponible` : `${rMetrics.progreso}%`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="font-display-title font-bold text-sm text-[#b45309] dark:text-[#ffd000] font-num block">
                              {formatCurrency(res.currentAmount, currency)}
                            </span>
                            <span className="text-[10px] text-muted block font-medium">
                              {isSpendingFund
                                ? `Gastado: ${formatCurrency(rMetrics.spent, currency)}`
                                : isComplete
                                ? 'Completado'
                                : `Faltan ${formatCurrency(rMetrics.faltante, currency)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* ======================= MODO: DISPONIBLE HOY ======================= */}
            {mode === 'available' && (
              <>
                {/* Banner de Disponible Hoy */}
                <div className="p-4 rounded-2xl border dark:bg-gradient-to-br dark:from-[#112318] dark:to-[#161622] dark:border-[#00ff87]/40 bg-[#f0faf4] border-[#087f48]/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#00ff87] animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#087f48] dark:text-[#00ff87] block">
                        Disponible Real para Gastar Hoy
                      </span>
                    </div>
                    <span className="font-display-title font-black text-2xl sm:text-3xl text-[#087f48] dark:text-[#00ff87] font-num">
                      {formatCurrency(totalDisponible, currency)}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[#00ff87]/20 text-[#087f48] dark:text-[#00ff87]">
                    Sin culpa
                  </span>
                </div>

                {/* Ecuación resumida */}
                <div className="px-3.5 py-2.5 rounded-xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted font-medium">
                    <Scale className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>Saldo: {formatCurrency(totalBalance, currency)}</span>
                    <span className="text-muted font-bold font-mono">-</span>
                    <span className="text-[#b45309] dark:text-[#ffd000]">Reserva: {formatCurrency(totalReservado, currency)}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#087f48] dark:text-[#00ff87]">
                    = {formatCurrency(totalDisponible, currency)}
                  </span>
                </div>

                {/* Desglose de Disponible por Billetera */}
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-muted block">
                    Cuánto puedes gastar hoy por medio
                  </span>

                  {/* 1. Efectivo Disponible */}
                  <div className="p-4 rounded-2xl border dark:bg-[#161622] bg-[#fdfdfd] border-black/10 dark:border-white/10 flex items-center justify-between gap-3 hover:border-[#00ff87]/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[#00ff87]/10 text-[#00ff87] flex-shrink-0">
                        💵
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-main">Efectivo Disponible</span>
                        </div>
                        <span className="text-[11px] text-muted block font-mono-num mt-0.5">
                          Saldo: {formatCurrency(cash.balance, currency)}
                          {cash.reserved > 0 && (
                            <span className="text-[#b45309] dark:text-[#ffd000] ml-1.5 font-bold">
                              · En reserva: {formatCurrency(cash.reserved, currency)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-display-title font-black text-lg text-[#087f48] dark:text-[#00ff87] font-num">
                        {formatCurrency(cash.available, currency)}
                      </div>
                    </div>
                  </div>

                  {/* 2. Yape / Plin Disponible */}
                  <div className="p-4 rounded-2xl border dark:bg-[#161622] bg-[#fdfdfd] border-black/10 dark:border-white/10 flex items-center justify-between gap-3 hover:border-[#a855f7]/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-purple-500/10 text-purple-400 flex-shrink-0">
                        📱
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-main">Yape / Plin Disponible</span>
                        </div>
                        <span className="text-[11px] text-muted block font-mono-num mt-0.5">
                          Saldo: {formatCurrency(yape.balance, currency)}
                          {yape.reserved > 0 && (
                            <span className="text-[#b45309] dark:text-[#ffd000] ml-1.5 font-bold">
                              · En reserva: {formatCurrency(yape.reserved, currency)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-display-title font-black text-lg text-purple-600 dark:text-purple-300 font-num">
                        {formatCurrency(yape.available, currency)}
                      </div>
                    </div>
                  </div>

                  {/* 3. Cuenta Bancaria Disponible */}
                  <div className="p-4 rounded-2xl border dark:bg-[#161622] bg-[#fdfdfd] border-black/10 dark:border-white/10 flex items-center justify-between gap-3 hover:border-[#00f0ff]/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-cyan-500/10 text-cyan-400 flex-shrink-0">
                        💳
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-main">Cuenta Bancaria Disponible</span>
                        </div>
                        <span className="text-[11px] text-muted block font-mono-num mt-0.5">
                          Saldo: {formatCurrency(bank.balance, currency)}
                          {bank.reserved > 0 && (
                            <span className="text-[#b45309] dark:text-[#ffd000] ml-1.5 font-bold">
                              · En reserva: {formatCurrency(bank.reserved, currency)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-display-title font-black text-lg text-cyan-600 dark:text-cyan-300 font-num">
                        {formatCurrency(bank.available, currency)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 text-xs text-muted flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00ff87] flex-shrink-0" />
                  <span>
                    Puedes gastar este dinero con total tranquilidad sabiendo que tus reservas están intactas.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Pie del Modal */}
          <div className="p-4 border-t border-black/10 dark:border-white/10 flex justify-end gap-2 bg-black/[0.01] dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={onClose}
              className="btn-spring px-4 py-2 rounded-xl text-xs font-bold border dark:bg-[#181822] bg-white text-main border-black/15 dark:border-white/15 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
