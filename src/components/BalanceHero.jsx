import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Bookmark,
  CheckCircle2,
  Camera,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

// Hook para animación de conteo numérico suave
function useAnimatedCounter(targetValue, duration = 600) {
  const [displayValue, setDisplayValue] = useState(targetValue);

  useEffect(() => {
    let startTimestamp = null;
    const startValue = displayValue;
    const difference = targetValue - startValue;

    if (difference === 0) return;

    let frameId;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + difference * ease;

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [targetValue, duration]);

  return displayValue;
}

export function BalanceHero({
  metrics,
  currency = 'PEN',
  onOpenNewMovement,
  onOpenSync,
  onOpenSnapshot,
  onOpenHowItWorks,
  onOpenCategories,
  onOpenTotalBreakdown,
  onOpenReservesBreakdown,
  onOpenAvailableBreakdown,
}) {
  const {
    saldoEsperado = 0,
    totalReservado = 0,
    disponibleParaGastar = 0,
  } = metrics || {};

  const animatedSaldoEsperado = useAnimatedCounter(saldoEsperado);
  const animatedTotalReservado = useAnimatedCounter(totalReservado);
  const animatedDisponible = useAnimatedCounter(disponibleParaGastar);

  return (
    <section className="relative w-full overflow-hidden rounded-3xl neo-card p-5 sm:p-7 md:p-8 mb-6 transition-all">
      {/* Luz ambiental en Dark Mode */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none bg-gradient-to-br from-[#00ff87] to-[#00f0ff] dark:opacity-25" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none bg-gradient-to-tr from-[#ff2e93] to-[#ffd000] dark:opacity-20" />

      <div className="relative z-10">
        {/* Cabecera superior del Hero: Minimalista y funcional */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-black/5 dark:bg-white/10 text-sm font-black">
                ⚡
              </span>
              <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase text-main font-mono-num">
                Tu Disponibilidad Real Hoy
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-[#00ff87]/15 bg-[#087f48]/10 text-[#087f48] dark:text-[#00ff87]">
                Saldo Acumulado
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botón: Categorías y Fuentes */}
            {onOpenCategories && (
              <button
                onClick={onOpenCategories}
                id="hero-categories-btn"
                className="btn-spring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border
                  dark:bg-[#1f1f2c] dark:border-white/15 dark:text-[#ffd000] dark:hover:border-[#ffd000]/50
                  bg-white border-[#121217] text-[#121217] shadow-[2px_2px_0px_#121217]"
                title="Personalizar categorías y orígenes de ingreso"
              >
                <Sliders className="w-3.5 h-3.5 text-[#ffd000]" />
                <span>Mis Categorías</span>
              </button>
            )}

            {/* Botón: ¿Cómo funciona mi dinero? */}
            <button
              onClick={onOpenHowItWorks}
              id="how-money-works-btn"
              className="btn-spring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border
                dark:bg-[#1f1f2c] dark:border-white/15 dark:text-[#00f0ff] dark:hover:border-[#00f0ff]/50
                bg-white border-[#121217] text-[#121217] shadow-[2px_2px_0px_#121217]"
              title="Aprende cómo la aplicación separa tu dinero"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>¿Cómo funciona?</span>
            </button>

            <button
              onClick={onOpenSnapshot}
              id="monthly-snapshot-btn"
              className="btn-spring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border
                dark:bg-[#1f1f2c] dark:border-white/15 dark:text-[#ffd000] dark:hover:border-[#ffd000]/50
                bg-white border-[#121217] text-[#121217] shadow-[2px_2px_0px_#121217]"
              title="Foto del mes"
            >
              <Camera className="w-3.5 h-3.5 text-[#ffd000]" />
              <span className="hidden sm:inline">Foto</span>
            </button>

            <button
              onClick={onOpenSync}
              id="sync-p2p-btn"
              className="btn-spring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border
                dark:bg-[#1f1f2c] dark:border-white/15 dark:text-[#00ff87] dark:hover:border-[#00ff87]/50
                bg-white border-[#121217] text-[#121217] shadow-[2px_2px_0px_#121217]"
              title="Sincronizar dispositivos"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00ff87]" />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>

        {/* Las 3 Tarjetas Clave: Saldo Total, En Reserva y Disponible hoy */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 pb-2">
          {/* 1. Saldo Total */}
          <div
            id="hero-card-saldo-total"
            onClick={onOpenTotalBreakdown}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenTotalBreakdown?.(); }}
            className="group rounded-2xl p-5 border neo-card transition-all flex flex-col justify-between cursor-pointer
              dark:bg-[#161622]/90 dark:border-white/10 dark:hover:border-[#00f0ff]/50
              bg-[#f8f6f0] border-[#121217]/20 shadow-[3px_3px_0px_#121217] hover:shadow-[4px_4px_0px_#00f0ff]"
            title="Toca para ver el desglose en Efectivo, Yape/Plin y Banco"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#00f0ff]" />
                  Saldo Total
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md dark:bg-white/10 bg-black/5 text-muted">
                  En mano/bancos
                </span>
              </div>
              <div className="font-display-title font-black text-2xl sm:text-3xl text-main tracking-tight font-num">
                {formatCurrency(animatedSaldoEsperado, currency)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold text-[#00f0ff] group-hover:translate-x-0.5 transition-transform">
              <span>Ver desglose por cuentas</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* 2. En Reserva */}
          <div
            id="hero-card-en-reserva"
            onClick={onOpenReservesBreakdown}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenReservesBreakdown?.(); }}
            className="group rounded-2xl p-5 border neo-card transition-all flex flex-col justify-between cursor-pointer
              dark:bg-[#161622]/90 dark:border-[#ffd000]/20 dark:hover:border-[#ffd000]/60
              bg-[#fdfaf2] border-[#ffd000]/40 shadow-[3px_3px_0px_#ffd000] hover:shadow-[4px_4px_0px_#ffd000]"
            title="Toca para ver el resumen de tus reservas"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#b45309] dark:text-[#ffd000] flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-[#ffd000]" />
                  En Reserva
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-[#ffd000]/15 bg-[#ffd000]/20 text-[#b45309] dark:text-[#ffd000]">
                  Apartado
                </span>
              </div>
              <div className="font-display-title font-black text-2xl sm:text-3xl text-[#b45309] dark:text-[#ffd000] tracking-tight font-num">
                {formatCurrency(animatedTotalReservado, currency)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold text-[#b45309] dark:text-[#ffd000] group-hover:translate-x-0.5 transition-transform">
              <span>Ver fondos y reservas</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* 3. Disponible Hoy (Protagonista visual) */}
          <div
            id="hero-card-disponible-hoy"
            onClick={onOpenAvailableBreakdown}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenAvailableBreakdown?.(); }}
            className="group relative overflow-hidden rounded-2xl p-5 border neo-card transition-all flex flex-col justify-between cursor-pointer
              dark:bg-gradient-to-br dark:from-[#13281c] dark:to-[#161622] dark:border-[#00ff87]/50 dark:hover:border-[#00ff87]
              bg-[#f0faf4] border-[#087f48] shadow-[4px_4px_0px_#087f48] hover:shadow-[5px_5px_0px_#087f48]"
            title="Toca para ver la disponibilidad por Efectivo, Yape/Plin y Banco"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#087f48] dark:text-[#00ff87] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Disponible Hoy
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#00ff87] animate-pulse" />
              </div>
              <div className="font-display-title font-black text-2xl sm:text-3xl text-[#087f48] dark:text-[#00ff87] tracking-tight font-num">
                {formatCurrency(animatedDisponible, currency)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold text-[#087f48] dark:text-[#00ff87] group-hover:translate-x-0.5 transition-transform">
              <span>Ver disponible por medio</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Botón de Acción Principal */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onOpenNewMovement}
            id="hero-add-movement-btn"
            className="btn-spring inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-display-title font-bold text-sm tracking-wide cursor-pointer transition-all
              dark:bg-gradient-to-r dark:from-[#00ff87] dark:to-[#00f0ff] dark:text-black dark:shadow-[0_0_25px_rgba(0,255,135,0.3)]
              bg-[#121217] text-white shadow-[4px_4px_0px_#ffd000]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Movimiento Flash</span>
          </button>
        </div>
      </div>
    </section>
  );
}
