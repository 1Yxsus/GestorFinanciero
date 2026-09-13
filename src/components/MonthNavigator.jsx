import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Layers, Clock } from 'lucide-react';
import { formatMonthName, getMonthKey } from '../utils/formatters';

export function MonthNavigator({
  selectedMonthKey,
  viewMode,
  onPreviousMonth,
  onNextMonth,
  onResetCurrentMonth,
  onToggleViewMode,
}) {
  const isGlobal = viewMode === 'global';
  const isCurrentMonth = selectedMonthKey === getMonthKey();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
      {/* Selector de Mes Compacto y Unificado en Cápsula */}
      {!isGlobal ? (
        <div className="inline-flex items-center rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-0.5">
          <button
            onClick={onPreviousMonth}
            id="prev-month-btn"
            aria-label="Mes anterior"
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-main transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetCurrentMonth}
            id="current-month-btn"
            title={isCurrentMonth ? 'Mes en curso' : 'Volver al mes actual'}
            className="px-2 py-0.5 text-xs font-extrabold text-main font-mono-num flex items-center gap-1.5 cursor-pointer hover:text-[#00ff87] transition-colors"
          >
            <span>{formatMonthName(selectedMonthKey)}</span>
            {!isCurrentMonth && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#00ff87] text-black uppercase tracking-wider">
                Hoy
              </span>
            )}
          </button>

          <button
            onClick={onNextMonth}
            id="next-month-btn"
            aria-label="Mes siguiente"
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-main transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00f0ff] px-2.5 py-1 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/20">
          <Clock className="w-3.5 h-3.5" />
          <span>Todo el historial</span>
        </div>
      )}

      {/* Switch Rápido: Mes vs Todo */}
      <div className="inline-flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs">
        <button
          onClick={() => onToggleViewMode('month')}
          id="tab-month-view"
          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
            !isGlobal
              ? 'dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-xs'
              : 'text-muted hover:text-main'
          }`}
          title="Ver por mes"
        >
          <Calendar className="w-3 h-3" />
          <span>Mes</span>
        </button>

        <button
          onClick={() => onToggleViewMode('global')}
          id="tab-global-view"
          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
            isGlobal
              ? 'dark:bg-[#00f0ff] dark:text-black bg-[#121217] text-white shadow-xs'
              : 'text-muted hover:text-main'
          }`}
          title="Ver historial completo acumulado"
        >
          <Layers className="w-3 h-3" />
          <span>Todo</span>
        </button>
      </div>
    </div>
  );
}
