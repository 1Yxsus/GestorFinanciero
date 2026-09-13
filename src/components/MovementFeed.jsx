import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Plus, ChevronDown, ChevronUp, Filter, SlidersHorizontal, X } from 'lucide-react';
import { MovementCard } from './MovementCard';
import { INITIAL_CATEGORIES } from '../utils/budgetConstants';
import { formatCurrency } from '../utils/formatters';

export function MovementFeed({
  movements = [],
  reserves = [],
  categories = INITIAL_CATEGORIES,
  currency = 'PEN',
  searchQuery,
  filterCategory,
  filterReserve,
  filterType,
  onSearchChange,
  onFilterCategoryChange,
  onFilterReserveChange,
  onFilterTypeChange,
  onDeleteMovement,
  onEditClick,
  onOpenNewMovement,
  viewMode,
}) {
  const [showAll, setShowAll] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const INITIAL_LIMIT = 8;
  const isFilterActive =
    Boolean(searchQuery.trim()) ||
    filterCategory !== 'all' ||
    filterReserve !== 'all' ||
    filterType !== 'all';

  const displayedMovements = (showAll || isFilterActive)
    ? movements
    : movements.slice(0, INITIAL_LIMIT);

  const remainingCount = movements.length - INITIAL_LIMIT;

  // Estadísticas rápidas calculadas en vivo para el conjunto de movimientos mostrado
  const feedSummary = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    for (const m of movements) {
      const amt = Math.abs(Number(m.amount) || 0);
      if (m.type === 'ingreso' || m.type === 'income') {
        incomeSum += amt;
      } else {
        expenseSum += amt;
      }
    }
    return {
      incomeSum,
      expenseSum,
      balance: incomeSum - expenseSum,
    };
  }, [movements]);

  const handleResetFilters = () => {
    onSearchChange('');
    onFilterCategoryChange('all');
    onFilterReserveChange('all');
    onFilterTypeChange('all');
  };

  const TYPE_CHIPS = [
    { id: 'all', label: 'Todos' },
    { id: 'income', label: 'Ingresos', dot: 'bg-[#00ff87]' },
    { id: 'expense', label: 'Egresos', dot: 'bg-[#ff2e93]' },
    { id: 'restricted', label: 'Restringidos', dot: 'bg-[#00f0ff]' },
    { id: 'sale', label: 'Ventas', dot: 'bg-[#f97316]' },
  ];

  return (
    <div className="w-full space-y-2.5">
      {/* Barra de Búsqueda y Filtros Rápidos en Flujo Continuo */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Campo de Búsqueda Compacto */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por descripción, monto..."
              id="search-movements-input"
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border transition-all
                dark:bg-[#121218] dark:border-white/10 dark:focus:border-[#00ff87]
                bg-white border-black/15 focus:border-black outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-main"
              >
                ✕
              </button>
            )}
          </div>

          {/* Botón de Filtros Secundarios */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`btn-spring p-2 sm:px-3 sm:py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer flex-shrink-0
              ${
                showAdvancedFilters || filterCategory !== 'all' || filterReserve !== 'all'
                  ? 'dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-xs'
                  : 'dark:bg-[#121218] bg-white text-muted dark:border-white/10 border-black/15 hover:border-black'
              }`}
            title="Filtrar por categoría o reserva"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {(filterCategory !== 'all' || filterReserve !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff2e93]" />
            )}
          </button>
        </div>

        {/* Píldoras de Filtro Rápido por Tipo */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {TYPE_CHIPS.map((chip) => {
            const isSelected = filterType === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onFilterTypeChange(chip.id)}
                className={`btn-spring px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border
                  ${
                    isSelected
                      ? 'dark:bg-white dark:text-black bg-[#121217] text-white border-transparent shadow-xs'
                      : 'dark:bg-[#121218] bg-white text-muted dark:border-white/10 border-black/10 hover:border-black/30'
                  }`}
              >
                {chip.dot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
                )}
                <span>{chip.label}</span>
              </button>
            );
          })}

          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-[#ff2e93] hover:underline px-1.5 py-1 whitespace-nowrap cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Drawer desplegable de filtros secundarios (Categoría y Reserva) */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/[0.03] border-black/10 dark:border-white/10 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Filtrar por Categoría
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => onFilterCategoryChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border dark:bg-[#13131a] bg-white dark:border-white/15 border-black/15 outline-none font-medium"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Filtrar por Reserva
                </label>
                <select
                  value={filterReserve}
                  onChange={(e) => onFilterReserveChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border dark:bg-[#13131a] bg-white dark:border-white/15 border-black/15 outline-none font-medium"
                >
                  <option value="all">Todas las reservas</option>
                  {reserves.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.icon || '🎯'} {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de Totales y Conteo Minimalista */}
      {movements.length > 0 && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted px-1 pt-1 font-mono-num">
          <span>
            {movements.length} {movements.length === 1 ? 'transacción' : 'transacciones'}
            {isFilterActive && ' (filtradas)'}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[#087f48] dark:text-[#00ff87] font-bold">
              +{formatCurrency(feedSummary.incomeSum, currency)}
            </span>
            <span className="text-[#d9183b] dark:text-[#ff2e93] font-bold">
              -{formatCurrency(feedSummary.expenseSum, currency)}
            </span>
          </div>
        </div>
      )}

      {/* Lista de Transacciones Compacta */}
      {movements.length > 0 ? (
        <div className="space-y-2">
          <motion.div layout className="space-y-2">
            <AnimatePresence mode="popLayout">
              {displayedMovements.map((movement) => (
                <MovementCard
                  key={movement.id}
                  movement={movement}
                  currency={currency}
                  reserves={reserves}
                  categories={categories}
                  onDelete={onDeleteMovement}
                  onEditClick={onEditClick}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Botón Ver Más / Ver Menos */}
          {!isFilterActive && remainingCount > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setShowAll(!showAll)}
                id="toggle-show-more-btn"
                className="btn-spring inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border dark:bg-[#121218] bg-white dark:border-white/10 border-black/10 text-muted hover:text-main cursor-pointer"
              >
                {!showAll ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Ver {remainingCount} transacciones más</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Mostrar menos</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State Minimalista */
        <div className="w-full py-10 px-4 text-center rounded-2xl border dark:bg-[#121218] bg-white border-black/10 dark:border-white/10 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl dark:bg-white/5 bg-black/5 mb-2.5">
            <Sparkles className="w-5 h-5 text-[#ffd000]" />
          </div>
          <h3 className="font-bold text-sm text-main mb-1">
            {isFilterActive ? 'No hay resultados con los filtros actuales' : 'Sin movimientos en este periodo'}
          </h3>
          <p className="text-xs text-muted max-w-xs mb-3">
            {isFilterActive
              ? 'Intenta restablecer los filtros para ver todas tus transacciones.'
              : 'Registra un ingreso o gasto flash para comenzar a construir tu historial.'}
          </p>

          {isFilterActive ? (
            <button
              onClick={handleResetFilters}
              className="btn-spring px-3.5 py-1.5 rounded-lg font-bold text-xs border border-black/20 dark:border-white/20 text-main"
            >
              Restablecer Filtros
            </button>
          ) : (
            <button
              onClick={onOpenNewMovement}
              id="empty-state-add-btn"
              className="btn-spring inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar movimiento</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
