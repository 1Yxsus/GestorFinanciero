import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Globe,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Edit3,
  Scale,
} from 'lucide-react';
import { formatCurrency, formatMovementDate, formatMonthName, getMonthKey as getIsoMonthKey } from '../utils/formatters';
import { round2, isIncome, isExpense } from '../utils/budgetCalculations';
import { PAYMENT_WALLETS, INCOME_SOURCES } from '../utils/budgetConstants';

export function CategoryExcelTable({
  movements = [],
  allMovements = [],
  categories = [],
  incomeSources = [],
  currency = 'PEN',
  selectedMonthKey,
  onEditMovement,
}) {
  // Alcance temporal: 'month' (mes seleccionado) | 'total' (acumulado histórico)
  const [timeScope, setTimeScope] = useState('month');

  // Pestaña activa de tablas: 'both' | 'expenses' | 'income'
  const [activeTab, setActiveTab] = useState('both');

  // Fila expandida en cada tabla para ver cómo suma
  const [expandedExpenseCatId, setExpandedExpenseCatId] = useState(null);
  const [expandedIncomeCatId, setExpandedIncomeCatId] = useState(null);

  // Movimientos según el alcance temporal seleccionado
  const relevantMovements = useMemo(() => {
    if (timeScope === 'total') {
      return (allMovements || []).filter((m) => !m.deletedAt);
    }
    return (allMovements || []).filter(
      (m) => !m.deletedAt && getIsoMonthKey(m.date) === selectedMonthKey
    );
  }, [allMovements, timeScope, selectedMonthKey]);

  // --- 1. DATOS TABLA DE GASTOS ---
  const expenseData = useMemo(() => {
    const expenseMovs = relevantMovements.filter((m) => isExpense(m));
    const activeCats = (categories || []).filter((c) => !c.deletedAt);

    // Inicializar mapa con todas las categorías de gasto
    const catMap = new Map();
    activeCats.forEach((cat) => {
      catMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '🏷️',
        color: cat.color || '#ff2e93',
        amount: 0,
        movements: [],
      });
    });

    // Asignar movimientos
    let unassignedAmount = 0;
    const unassignedMovements = [];

    expenseMovs.forEach((m) => {
      const amt = round2(m.amount) || 0;
      if (m.categoryId && catMap.has(m.categoryId)) {
        const item = catMap.get(m.categoryId);
        item.amount = round2(item.amount + amt);
        item.movements.push(m);
      } else {
        unassignedAmount = round2(unassignedAmount + amt);
        unassignedMovements.push(m);
      }
    });

    const rows = Array.from(catMap.values());

    // Si hay egresos sin categoría o huérfanos, agregar fila
    if (unassignedMovements.length > 0) {
      rows.push({
        id: 'cat_unassigned_expenses',
        name: 'Otras / Sin Categoría',
        icon: '💸',
        color: '#a1a1aa',
        amount: unassignedAmount,
        movements: unassignedMovements,
      });
    }

    // Ordenar: primero los que tienen mayor dinero, luego por nombre
    rows.sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.name.localeCompare(b.name);
    });

    const totalExpense = round2(expenseMovs.reduce((sum, m) => sum + (round2(m.amount) || 0), 0));

    return {
      rows,
      totalExpense,
      totalCount: expenseMovs.length,
    };
  }, [relevantMovements, categories]);

  // --- 2. DATOS TABLA DE INGRESOS ---
  const incomeData = useMemo(() => {
    const incomeMovs = relevantMovements.filter((m) => isIncome(m));
    const activeSources = (incomeSources && incomeSources.length > 0
      ? incomeSources
      : INCOME_SOURCES
    ).filter((s) => !s.deletedAt);

    // Inicializar mapa con todos los orígenes / categorías de ingreso
    const srcMap = new Map();
    activeSources.forEach((src) => {
      srcMap.set(src.id, {
        id: src.id,
        name: src.label || src.name || 'Ingreso',
        icon: src.icon || '💵',
        color: '#00ff87',
        amount: 0,
        movements: [],
      });
    });

    // Asignar movimientos de ingreso
    let unassignedAmount = 0;
    const unassignedMovements = [];

    incomeMovs.forEach((m) => {
      const amt = round2(m.amount) || 0;
      // Los ingresos pueden coincidir por m.source o por m.categoryId
      const matchedKey = srcMap.has(m.source)
        ? m.source
        : srcMap.has(m.categoryId)
        ? m.categoryId
        : null;

      if (matchedKey) {
        const item = srcMap.get(matchedKey);
        item.amount = round2(item.amount + amt);
        item.movements.push(m);
      } else {
        unassignedAmount = round2(unassignedAmount + amt);
        unassignedMovements.push(m);
      }
    });

    const rows = Array.from(srcMap.values());

    // Si hay ingresos sin origen clasificado, agregar fila
    if (unassignedMovements.length > 0) {
      rows.push({
        id: 'src_unassigned_income',
        name: 'Otros Ingresos Libres',
        icon: '🪙',
        color: '#ffd000',
        amount: unassignedAmount,
        movements: unassignedMovements,
      });
    }

    // Ordenar: primero los que tienen mayor dinero, luego por nombre
    rows.sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.name.localeCompare(b.name);
    });

    const totalIncome = round2(incomeMovs.reduce((sum, m) => sum + (round2(m.amount) || 0), 0));

    return {
      rows,
      totalIncome,
      totalCount: incomeMovs.length,
    };
  }, [relevantMovements, incomeSources]);

  // Balance neto del período
  const netBalance = round2(incomeData.totalIncome - expenseData.totalExpense);

  const toggleExpenseRow = (id) => {
    setExpandedExpenseCatId((prev) => (prev === id ? null : id));
  };

  const toggleIncomeRow = (id) => {
    setExpandedIncomeCatId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* BARRA SUPERIOR: SELECTOR TEMPORAL Y VISTA DE TABLAS */}
      <div className="p-3 sm:p-4 rounded-2xl border dark:bg-[#121218] bg-white border-black/10 dark:border-white/10 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Selector de Alcance Temporal (Mensual vs Total) */}
        <div className="inline-flex p-1 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => setTimeScope('month')}
            className={`btn-spring px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              timeScope === 'month'
                ? 'dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-xs'
                : 'text-muted hover:text-main'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Mes: {formatMonthName(selectedMonthKey)}</span>
          </button>

          <button
            type="button"
            onClick={() => setTimeScope('total')}
            className={`btn-spring px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              timeScope === 'total'
                ? 'dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-xs'
                : 'text-muted hover:text-main'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Total Histórico</span>
          </button>
        </div>

        {/* Selector de Pestaña de Tablas: Ambas | Gastos | Ingresos */}
        <div className="inline-flex p-1 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'both'
                ? 'dark:bg-white/20 bg-black/15 text-main font-black'
                : 'text-muted hover:text-main'
            }`}
          >
            Ver Ambas Tablas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'dark:bg-[#ff2e93]/20 bg-[#d9183b]/15 text-[#d9183b] dark:text-[#ff4365] font-black'
                : 'text-muted hover:text-main'
            }`}
          >
            <span>💸 Gastos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'income'
                ? 'dark:bg-[#00ff87]/20 bg-[#087f48]/15 text-[#087f48] dark:text-[#00ff87] font-black'
                : 'text-muted hover:text-main'
            }`}
          >
            <span>💵 Ingresos</span>
          </button>
        </div>
      </div>

      {/* TARJETA DE RESUMEN CONSOLIDADO */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 rounded-2xl border dark:bg-[#121218]/60 bg-white/70 border-black/10 dark:border-white/10">
        <div className="text-center p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#087f48] dark:text-[#00ff87] flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> Total Ingresos
          </span>
          <span className="font-num font-black text-xs sm:text-sm lg:text-base text-[#087f48] dark:text-[#00ff87] mt-0.5 block truncate">
            +{formatCurrency(incomeData.totalIncome, currency)}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#d9183b] dark:text-[#ff4365] flex items-center justify-center gap-1">
            <TrendingDown className="w-3 h-3" /> Total Gastos
          </span>
          <span className="font-num font-black text-xs sm:text-sm lg:text-base text-[#d9183b] dark:text-[#ff4365] mt-0.5 block truncate">
            -{formatCurrency(expenseData.totalExpense, currency)}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-center gap-1">
            <Scale className="w-3 h-3" /> Balance Neto
          </span>
          <span
            className={`font-num font-black text-xs sm:text-sm lg:text-base mt-0.5 block truncate ${
              netBalance >= 0 ? 'text-[#087f48] dark:text-[#00ff87]' : 'text-[#d9183b] dark:text-[#ff4365]'
            }`}
          >
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, currency)}
          </span>
        </div>
      </div>

      {/* CONTENEDOR DE LAS 2 TABLAS: GASTOS E INGRESOS */}
      <div
        className={`grid gap-5 ${
          activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {/* =========================================================
            TABLA 1: GASTOS POR CATEGORÍA
            ========================================================= */}
        {(activeTab === 'both' || activeTab === 'expenses') && (
          <div className="rounded-2xl border dark:bg-[#121218] bg-white border-black/10 dark:border-white/10 overflow-hidden shadow-xs flex flex-col w-full max-w-full">
            {/* Cabecera de la Tabla 1 */}
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between dark:bg-[#161622] bg-[#fbf9f5]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-[#d9183b]/10 dark:bg-[#ff2e93]/15 text-[#d9183b] dark:text-[#ff2e93] flex-shrink-0">
                  <TrendingDown className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-main truncate">Gastos por Categoría</h3>
                  <span className="text-[10px] text-muted block truncate">
                    {timeScope === 'month' ? `Mes de ${formatMonthName(selectedMonthKey)}` : 'Historial Acumulado'}
                  </span>
                </div>
              </div>
              <span className="font-num font-black text-xs text-[#d9183b] dark:text-[#ff4365] px-2 py-1 rounded-lg bg-[#d9183b]/10 dark:bg-[#ff2e93]/15 flex-shrink-0">
                -{formatCurrency(expenseData.totalExpense, currency)}
              </span>
            </div>

            {/* Estructura Exacta de la Tabla con Layout Fijo para Evitar Desbordes */}
            <div className="w-full overflow-hidden flex-1">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 text-[11px] font-bold text-muted uppercase tracking-wider dark:bg-[#0e0e14] bg-black/[0.02]">
                    <th className="w-[60%] sm:w-[65%] py-2.5 px-3 sm:px-4 font-bold">Categoría</th>
                    <th className="w-[40%] sm:w-[35%] py-2.5 px-3 sm:px-4 text-right font-bold">Dinero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 text-xs font-medium">
                  {expenseData.rows.map((row) => {
                    const isExpanded = expandedExpenseCatId === row.id;
                    const hasMovements = row.movements.length > 0;

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          onClick={() => toggleExpenseRow(row.id)}
                          className={`group cursor-pointer transition-colors select-none ${
                            isExpanded
                              ? 'dark:bg-[#181826] bg-[#f3efe6]'
                              : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                          }`}
                        >
                          {/* Columna 1: Categorías */}
                          <td className="w-[60%] sm:w-[65%] py-2.5 px-3 sm:px-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base flex-shrink-0">{row.icon}</span>
                              <span className="font-bold text-main truncate">
                                {row.name}
                              </span>
                              <span className="text-muted/50 group-hover:text-main transition-colors ml-auto flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </span>
                            </div>
                          </td>

                          {/* Columna 2: Dinero */}
                          <td className="w-[40%] sm:w-[35%] py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-num font-black text-xs sm:text-sm tracking-tight ${
                                row.amount > 0
                                  ? 'text-[#d9183b] dark:text-[#ff4365]'
                                  : 'text-muted/60 font-semibold'
                              }`}
                            >
                              {row.amount > 0 ? formatCurrency(row.amount, currency) : '0'}
                            </span>
                          </td>
                        </tr>

                        {/* Desglose Sumatorio al dar Clic (Drill-Down) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={2} className="w-full p-0 border-b border-black/10 dark:border-white/10 overflow-hidden">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="w-full overflow-hidden dark:bg-[#0c0c12] bg-[#f5f2eb] p-3 sm:p-4 space-y-2.5"
                                >
                                  {/* Resumen de la Suma */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-black/5 dark:border-white/5">
                                    <span className="text-[11px] font-bold text-muted flex items-center gap-1 truncate">
                                      <Sparkles className="w-3 h-3 text-[#ff2e93] flex-shrink-0" />
                                      <span className="truncate">
                                        {hasMovements
                                          ? `¿Cómo se suma el dinero de "${row.name}"?`
                                          : `Estado de "${row.name}"`}
                                      </span>
                                    </span>
                                    <span className="text-[11px] font-bold font-num text-main flex-shrink-0">
                                      {hasMovements
                                        ? `${row.movements.length} movs = ${formatCurrency(row.amount, currency)}`
                                        : '0 movimientos'}
                                    </span>
                                  </div>

                                  {/* Si tiene movimientos: fórmula visual y lista detallada */}
                                  {hasMovements ? (
                                    <>
                                      {/* Fórmula de sumatoria adaptable con salto de línea natural */}
                                      <div className="w-full p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-[11px] font-num">
                                        <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
                                          <span className="font-bold text-muted mr-1">Suma:</span>
                                          {row.movements.map((m, idx) => (
                                            <React.Fragment key={m.id}>
                                              <span className="font-semibold text-main">
                                                {formatCurrency(m.amount, currency)}
                                              </span>
                                              {idx < row.movements.length - 1 && (
                                                <span className="text-muted font-bold">+</span>
                                              )}
                                            </React.Fragment>
                                          ))}
                                          <span className="text-muted font-bold">=</span>
                                          <span className="font-black text-[#d9183b] dark:text-[#ff4365]">
                                            {formatCurrency(row.amount, currency)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Lista de movimientos individuales */}
                                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 w-full">
                                        {row.movements.map((m) => {
                                          const wObj = PAYMENT_WALLETS.find((w) => w.id === m.wallet);
                                          return (
                                            <div
                                              key={m.id}
                                              className="w-full min-w-0 p-2 rounded-xl border dark:bg-[#13131a] bg-white border-black/5 dark:border-white/10 flex items-center justify-between gap-2 text-xs"
                                            >
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <span className="text-sm flex-shrink-0">{m.icon || '💸'}</span>
                                                  <span className="font-bold text-main truncate block">
                                                    {m.description || 'Gasto'}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted truncate">
                                                  <span className="flex-shrink-0">{formatMovementDate(m.date)}</span>
                                                  <span>·</span>
                                                  <span className="flex items-center gap-0.5 truncate">
                                                    <span>{wObj?.icon || '💵'}</span>
                                                    <span className="truncate">{wObj?.label || 'Efectivo'}</span>
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="font-num font-bold text-[#d9183b] dark:text-[#ff4365] whitespace-nowrap">
                                                  -{formatCurrency(m.amount, currency)}
                                                </span>
                                                {onEditMovement && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onEditMovement(m);
                                                    }}
                                                    className="p-1 rounded text-muted hover:text-main hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                                    title="Editar este movimiento"
                                                  >
                                                    <Edit3 className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="py-3 text-center text-muted text-xs">
                                      <span>0 movimientos asociados en este período (0 o S/ 0.00)</span>
                                    </div>
                                  )}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* FILA DE TOTAL GASTOS */}
                <tfoot>
                  <tr className="border-t-2 border-black/15 dark:border-white/15 dark:bg-[#161622] bg-[#f8f5ee] font-black text-xs sm:text-sm">
                    <td className="w-[60%] sm:w-[65%] py-3 px-3 sm:px-4 text-main uppercase tracking-wider truncate">
                      TOTAL GASTOS
                    </td>
                    <td className="w-[40%] sm:w-[35%] py-3 px-3 sm:px-4 text-right font-num text-[#d9183b] dark:text-[#ff4365] whitespace-nowrap">
                      {formatCurrency(expenseData.totalExpense, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
            TABLA 2: INGRESOS POR CATEGORÍA / ORIGEN
            ========================================================= */}
        {(activeTab === 'both' || activeTab === 'income') && (
          <div className="rounded-2xl border dark:bg-[#121218] bg-white border-black/10 dark:border-white/10 overflow-hidden shadow-xs flex flex-col w-full max-w-full">
            {/* Cabecera de la Tabla 2 */}
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between dark:bg-[#161622] bg-[#fbf9f5]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-[#087f48]/10 dark:bg-[#00ff87]/15 text-[#087f48] dark:text-[#00ff87] flex-shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-main truncate">Ingresos por Categoría</h3>
                  <span className="text-[10px] text-muted block truncate">
                    {timeScope === 'month' ? `Mes de ${formatMonthName(selectedMonthKey)}` : 'Historial Acumulado'}
                  </span>
                </div>
              </div>
              <span className="font-num font-black text-xs text-[#087f48] dark:text-[#00ff87] px-2 py-1 rounded-lg bg-[#087f48]/10 dark:bg-[#00ff87]/15 flex-shrink-0">
                +{formatCurrency(incomeData.totalIncome, currency)}
              </span>
            </div>

            {/* Estructura Exacta de la Tabla con Layout Fijo para Evitar Desbordes */}
            <div className="w-full overflow-hidden flex-1">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 text-[11px] font-bold text-muted uppercase tracking-wider dark:bg-[#0e0e14] bg-black/[0.02]">
                    <th className="w-[60%] sm:w-[65%] py-2.5 px-3 sm:px-4 font-bold">Categoría</th>
                    <th className="w-[40%] sm:w-[35%] py-2.5 px-3 sm:px-4 text-right font-bold">Dinero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 text-xs font-medium">
                  {incomeData.rows.map((row) => {
                    const isExpanded = expandedIncomeCatId === row.id;
                    const hasMovements = row.movements.length > 0;

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          onClick={() => toggleIncomeRow(row.id)}
                          className={`group cursor-pointer transition-colors select-none ${
                            isExpanded
                              ? 'dark:bg-[#181826] bg-[#f3efe6]'
                              : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                          }`}
                        >
                          {/* Columna 1: Categorías */}
                          <td className="w-[60%] sm:w-[65%] py-2.5 px-3 sm:px-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base flex-shrink-0">{row.icon}</span>
                              <span className="font-bold text-main truncate">
                                {row.name}
                              </span>
                              <span className="text-muted/50 group-hover:text-main transition-colors ml-auto flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </span>
                            </div>
                          </td>

                          {/* Columna 2: Dinero */}
                          <td className="w-[40%] sm:w-[35%] py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-num font-black text-xs sm:text-sm tracking-tight ${
                                row.amount > 0
                                  ? 'text-[#087f48] dark:text-[#00ff87]'
                                  : 'text-muted/60 font-semibold'
                              }`}
                            >
                              {row.amount > 0 ? formatCurrency(row.amount, currency) : '0'}
                            </span>
                          </td>
                        </tr>

                        {/* Desglose Sumatorio al dar Clic (Drill-Down) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={2} className="w-full p-0 border-b border-black/10 dark:border-white/10 overflow-hidden">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="w-full overflow-hidden dark:bg-[#0c0c12] bg-[#f5f2eb] p-3 sm:p-4 space-y-2.5"
                                >
                                  {/* Resumen de la Suma */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-black/5 dark:border-white/5">
                                    <span className="text-[11px] font-bold text-muted flex items-center gap-1 truncate">
                                      <Sparkles className="w-3 h-3 text-[#00ff87] flex-shrink-0" />
                                      <span className="truncate">
                                        {hasMovements
                                          ? `¿Cómo se suma el dinero de "${row.name}"?`
                                          : `Estado de "${row.name}"`}
                                      </span>
                                    </span>
                                    <span className="text-[11px] font-bold font-num text-main flex-shrink-0">
                                      {hasMovements
                                        ? `${row.movements.length} movs = ${formatCurrency(row.amount, currency)}`
                                        : '0 movimientos'}
                                    </span>
                                  </div>

                                  {/* Si tiene movimientos: fórmula visual y lista detallada */}
                                  {hasMovements ? (
                                    <>
                                      {/* Fórmula de sumatoria adaptable con salto de línea natural */}
                                      <div className="w-full p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-[11px] font-num">
                                        <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
                                          <span className="font-bold text-muted mr-1">Suma:</span>
                                          {row.movements.map((m, idx) => (
                                            <React.Fragment key={m.id}>
                                              <span className="font-semibold text-main">
                                                {formatCurrency(m.amount, currency)}
                                              </span>
                                              {idx < row.movements.length - 1 && (
                                                <span className="text-muted font-bold">+</span>
                                              )}
                                            </React.Fragment>
                                          ))}
                                          <span className="text-muted font-bold">=</span>
                                          <span className="font-black text-[#087f48] dark:text-[#00ff87]">
                                            {formatCurrency(row.amount, currency)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Lista de movimientos individuales */}
                                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 w-full">
                                        {row.movements.map((m) => {
                                          const wObj = PAYMENT_WALLETS.find((w) => w.id === m.wallet);
                                          return (
                                            <div
                                              key={m.id}
                                              className="w-full min-w-0 p-2 rounded-xl border dark:bg-[#13131a] bg-white border-black/5 dark:border-white/10 flex items-center justify-between gap-2 text-xs"
                                            >
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <span className="text-sm flex-shrink-0">{m.icon || '💵'}</span>
                                                  <span className="font-bold text-main truncate block">
                                                    {m.description || 'Ingreso'}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted truncate">
                                                  <span className="flex-shrink-0">{formatMovementDate(m.date)}</span>
                                                  <span>·</span>
                                                  <span className="flex items-center gap-0.5 truncate">
                                                    <span>{wObj?.icon || '💵'}</span>
                                                    <span className="truncate">{wObj?.label || 'Efectivo'}</span>
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="font-num font-bold text-[#087f48] dark:text-[#00ff87] whitespace-nowrap">
                                                  +{formatCurrency(m.amount, currency)}
                                                </span>
                                                {onEditMovement && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onEditMovement(m);
                                                    }}
                                                    className="p-1 rounded text-muted hover:text-main hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                                    title="Editar este movimiento"
                                                  >
                                                    <Edit3 className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="py-3 text-center text-muted text-xs">
                                      <span>0 ingresos asociados en este período (0 o S/ 0.00)</span>
                                    </div>
                                  )}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* FILA DE TOTAL INGRESOS */}
                <tfoot>
                  <tr className="border-t-2 border-black/15 dark:border-white/15 dark:bg-[#161622] bg-[#f8f5ee] font-black text-xs sm:text-sm">
                    <td className="w-[60%] sm:w-[65%] py-3 px-3 sm:px-4 text-main uppercase tracking-wider truncate">
                      TOTAL INGRESOS
                    </td>
                    <td className="w-[40%] sm:w-[35%] py-3 px-3 sm:px-4 text-right font-num text-[#087f48] dark:text-[#00ff87] whitespace-nowrap">
                      {formatCurrency(incomeData.totalIncome, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
