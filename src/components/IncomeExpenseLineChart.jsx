import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  Percent,
  Sparkles,
  Maximize2,
  CalendarDays,
} from 'lucide-react';
import { formatCurrency, formatMonthName } from '../utils/formatters';

/**
 * Genera el path SVG suavizado con curvas de Bézier cúbicas
 */
function getSmoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  if (points.length === 2) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Genera el path cerrado para el relleno de gradiente
 */
function getAreaPath(points, baselineY) {
  if (!points || points.length === 0) return '';
  const linePath = getSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)},${baselineY.toFixed(1)} L ${first.x.toFixed(1)},${baselineY.toFixed(1)} Z`;
}

/**
 * Calcula un número redondeado estético para la escala del eje Y
 */
function getNiceMax(val) {
  if (val <= 20) return 20;
  if (val <= 50) return 50;
  if (val <= 100) return 100;
  if (val <= 200) return 200;
  if (val <= 500) return 500;
  if (val <= 1000) return 1000;
  if (val <= 2000) return 2000;
  if (val <= 5000) return 5000;
  if (val <= 10000) return 10000;
  const exp = Math.pow(10, Math.floor(Math.log10(val)));
  return Math.ceil(val / exp) * exp;
}

export function IncomeExpenseLineChart({
  movements = [],
  allMovements = [],
  selectedMonthKey = '',
  viewMode = 'month',
  currency = 'PEN',
}) {
  // Modos: 'balance' (Evolución de Saldo), 'cumulative' (Ingresos vs Egresos Acumulado), 'daily' (Picos Diarios)
  const [chartMode, setChartMode] = useState('balance');
  const [isExpanded, setIsExpanded] = useState(false);
  const [rangeScope, setRangeScope] = useState('to_date'); // 'to_date' | 'full_month'
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const svgRef = useRef(null);

  // Determinar si estamos en el mes actual en curso
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = viewMode === 'month' && selectedMonthKey === currentMonthKey;
  const todayDayNumber = now.getDate();

  // Procesamiento y estructuración cronológica gradual de los datos
  const chartData = useMemo(() => {
    const isMonthView = viewMode === 'month' && selectedMonthKey;

    let daysList = [];
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (isMonthView) {
      const parts = selectedMonthKey.split('-');
      year = parseInt(parts[0], 10) || year;
      month = parseInt(parts[1], 10) || month;
      const totalDaysInMonth = new Date(year, month, 0).getDate();

      // Si es el mes en curso y rangeScope es 'to_date', trazamos hasta hoy
      const maxDay = isCurrentMonth && rangeScope === 'to_date' ? todayDayNumber : totalDaysInMonth;

      for (let d = 1; d <= maxDay; d++) {
        const dayStr = String(d).padStart(2, '0');
        const dateKey = `${parts[0]}-${parts[1]}-${dayStr}`;
        daysList.push({
          day: d,
          dateKey,
          label: `${d}`,
          fullDate: new Date(year, month - 1, d),
          isToday: isCurrentMonth && d === todayDayNumber,
        });
      }
    } else {
      // Vista completa / acumulada: tomar los últimos 30 días
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        daysList.push({
          day: d.getDate(),
          dateKey: `${y}-${m}-${dayStr}`,
          label: `${dayStr}/${m}`,
          fullDate: d,
          isToday: i === 0,
        });
      }
    }

    // Mapeo de transacciones por día
    const movementsToUse = isMonthView ? movements : (allMovements.length ? allMovements : movements);
    const dayMap = {};

    for (const m of movementsToUse) {
      if (!m.date) continue;
      const dateKey = m.date.slice(0, 10);
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = { income: 0, expense: 0, count: 0, list: [] };
      }
      const amt = Math.abs(Number(m.amount) || 0);
      const isIngreso = m.type === 'ingreso' || m.type === 'income';
      if (isIngreso) {
        dayMap[dateKey].income += amt;
      } else {
        dayMap[dateKey].expense += amt;
      }
      dayMap[dateKey].count += 1;
      dayMap[dateKey].list.push(m);
    }

    // Acumulación gradual día a día
    let runningIncome = 0;
    let runningExpense = 0;
    let runningBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    let maxDaily = 0;
    let maxAccum = 0;
    let maxBalance = 0;
    let minBalance = 0;

    const points = daysList.map((item) => {
      const stats = dayMap[item.dateKey] || { income: 0, expense: 0, count: 0, list: [] };

      // Sumar al acumulado que avanza gradualmente y se sostiene si no hay transacciones
      runningIncome += stats.income;
      runningExpense += stats.expense;
      runningBalance += (stats.income - stats.expense);

      totalIncome += stats.income;
      totalExpense += stats.expense;

      if (stats.income > maxDaily) maxDaily = stats.income;
      if (stats.expense > maxDaily) maxDaily = stats.expense;
      if (runningIncome > maxAccum) maxAccum = runningIncome;
      if (runningExpense > maxAccum) maxAccum = runningExpense;

      if (runningBalance > maxBalance) maxBalance = runningBalance;
      if (runningBalance < minBalance) minBalance = runningBalance;

      return {
        ...item,
        dailyIncome: stats.income,
        dailyExpense: stats.expense,
        dailyDelta: stats.income - stats.expense,
        accumIncome: runningIncome,
        accumExpense: runningExpense,
        balance: runningBalance,
        count: stats.count,
        hasActivity: stats.count > 0,
      };
    });

    return {
      points,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      maxDaily,
      maxAccum,
      maxBalance,
      minBalance,
      hasActivity: totalIncome > 0 || totalExpense > 0,
    };
  }, [movements, allMovements, selectedMonthKey, viewMode, rangeScope, isCurrentMonth, todayDayNumber]);

  // Dimensiones del gráfico SVG
  const width = 680;
  const height = 240;
  const padding = { top: 25, right: 25, bottom: 35, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Cálculo de Escalas según el modo seleccionado
  const numPoints = chartData.points.length;

  const { yMin, yMax, yZero } = useMemo(() => {
    if (chartMode === 'balance') {
      // Modo Saldo: el dinero sube con ingresos y baja con egresos
      const maxVal = Math.max(0, chartData.maxBalance, chartData.totalIncome);
      const minVal = Math.min(0, chartData.minBalance);

      const niceMax = getNiceMax(maxVal > 0 ? maxVal * 1.15 : 50);
      const niceMin = minVal < 0 ? -getNiceMax(Math.abs(minVal) * 1.15) : 0;

      const span = niceMax - niceMin || 50;
      const zeroY = padding.top + graphHeight - ((0 - niceMin) / span) * graphHeight;

      return { yMin: niceMin, yMax: niceMax, yZero: zeroY };
    } else if (chartMode === 'cumulative') {
      // Modo Acumulado: progresión continua de ingresos y gastos
      const rawMax = Math.max(chartData.maxAccum, 10);
      const niceMax = getNiceMax(rawMax * 1.15);
      return { yMin: 0, yMax: niceMax, yZero: padding.top + graphHeight };
    } else {
      // Modo Diario: picos por día
      const rawMax = Math.max(chartData.maxDaily, 10);
      const niceMax = getNiceMax(rawMax * 1.15);
      return { yMin: 0, yMax: niceMax, yZero: padding.top + graphHeight };
    }
  }, [chartMode, chartData, graphHeight, padding.top]);

  // Proyección de Coordenadas
  const pointsWithCoords = useMemo(() => {
    if (numPoints === 0) return [];
    const span = yMax - yMin || 1;

    return chartData.points.map((p, idx) => {
      const x = padding.left + (idx / Math.max(1, numPoints - 1)) * graphWidth;

      // Y para Saldo / Balance
      const yBalance = padding.top + graphHeight - ((p.balance - yMin) / span) * graphHeight;

      // Y para Ingresos y Egresos (según el modo)
      const incVal = chartMode === 'cumulative' ? p.accumIncome : p.dailyIncome;
      const expVal = chartMode === 'cumulative' ? p.accumExpense : p.dailyExpense;

      const yIncome = padding.top + graphHeight - ((incVal - yMin) / span) * graphHeight;
      const yExpense = padding.top + graphHeight - ((expVal - yMin) / span) * graphHeight;

      return {
        ...p,
        x,
        yBalance,
        yIncome,
        yExpense,
        incVal,
        expVal,
      };
    });
  }, [chartData.points, numPoints, graphWidth, graphHeight, padding, chartMode, yMin, yMax]);

  // Curvas de Bézier SVG
  const balanceCoords = useMemo(() => pointsWithCoords.map((p) => ({ x: p.x, y: p.yBalance })), [pointsWithCoords]);
  const incomeCoords = useMemo(() => pointsWithCoords.map((p) => ({ x: p.x, y: p.yIncome })), [pointsWithCoords]);
  const expenseCoords = useMemo(() => pointsWithCoords.map((p) => ({ x: p.x, y: p.yExpense })), [pointsWithCoords]);

  const balancePath = useMemo(() => getSmoothPath(balanceCoords), [balanceCoords]);
  const incomePath = useMemo(() => getSmoothPath(incomeCoords), [incomeCoords]);
  const expensePath = useMemo(() => getSmoothPath(expenseCoords), [expenseCoords]);

  const baselineY = yZero;
  const balanceArea = useMemo(() => getAreaPath(balanceCoords, baselineY), [balanceCoords, baselineY]);
  const incomeArea = useMemo(() => getAreaPath(incomeCoords, padding.top + graphHeight), [incomeCoords, graphHeight, padding.top]);
  const expenseArea = useMemo(() => getAreaPath(expenseCoords, padding.top + graphHeight), [expenseCoords, graphHeight, padding.top]);

  // Ticks del Eje Y (Dinero)
  const yTicks = useMemo(() => {
    const span = yMax - yMin;
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const val = yMin + (span * (count - i)) / count;
      const y = padding.top + (graphHeight * i) / count;
      ticks.push({ val, y });
    }
    return ticks;
  }, [yMin, yMax, padding.top, graphHeight]);

  // Ticks del Eje X (Días)
  const xStep = Math.max(1, Math.round(numPoints / 6));
  const xTicks = pointsWithCoords.filter((_, i) => i === 0 || i === numPoints - 1 || i % xStep === 0);

  // Manejo de Interacción con el Cursor
  const handleMouseMove = (e) => {
    if (!svgRef.current || pointsWithCoords.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const relX = ((clientX - rect.left) / rect.width) * width;

    let closestIndex = 0;
    let minDiff = Infinity;
    pointsWithCoords.forEach((p, idx) => {
      const diff = Math.abs(p.x - relX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    setHoveredIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const activePoint = hoveredIndex !== null ? pointsWithCoords[hoveredIndex] : null;

  return (
    <div className="rounded-3xl p-4 sm:p-5 neo-card border transition-all dark:bg-[#121218] bg-white border-[#121217]/15 dark:border-white/10 shadow-[4px_4px_0px_#121217] dark:shadow-none mb-4">
      {/* Cabecera del Diagrama */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${isExpanded ? 'pb-3.5 border-b border-black/5 dark:border-white/10' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl dark:bg-[#00f0ff]/15 bg-[#00f0ff]/10 text-[#00f0ff]">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display-title font-extrabold text-base sm:text-lg text-main leading-tight">
                {chartMode === 'balance'
                  ? 'Evolución de Saldo (Aumentos y Disminuciones)'
                  : chartMode === 'cumulative'
                  ? 'Ingresos vs Egresos Acumulados'
                  : 'Picos Diarios de Ingresos y Egresos'}
              </h3>
              <span className="hidden xs:inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/5 dark:bg-white/10 text-muted">
                {viewMode === 'month' ? formatMonthName(selectedMonthKey) : 'Historial'}
              </span>
            </div>
            <p className="text-xs text-muted font-medium mt-0.5">
              {chartMode === 'balance'
                ? 'Curva continua: Sube con ingresos y baja con egresos a través de los días'
                : chartMode === 'cumulative'
                ? 'Progresión continua acumulada a través de los días'
                : 'Picos exactos de cada día en el período'}
            </p>
          </div>
        </div>

        {/* Controles de Modo y Rango */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          {/* Selector de Rango si es el mes en curso */}
          {isCurrentMonth && (
            <button
              type="button"
              onClick={() => setRangeScope(rangeScope === 'to_date' ? 'full_month' : 'to_date')}
              className="btn-spring px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/15 text-muted hover:text-main cursor-pointer"
              title={rangeScope === 'to_date' ? 'Ver todo el mes' : 'Ver solo hasta hoy'}
            >
              <CalendarDays className="w-3 h-3 text-[#00f0ff]" />
              <span>{rangeScope === 'to_date' ? `Hasta hoy (${todayDayNumber}d)` : 'Mes completo'}</span>
            </button>
          )}

          {/* Selector de Modos de Diagrama */}
          <div className="flex items-center p-1 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMode('balance')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === 'balance'
                  ? 'bg-[#121217] text-white dark:bg-[#00f0ff] dark:text-black shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
              title="Curva continua de saldo: sube con ingresos y baja con egresos"
            >
              Saldo
            </button>
            <button
              type="button"
              onClick={() => setChartMode('cumulative')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === 'cumulative'
                  ? 'bg-[#121217] text-white dark:bg-[#00ff87] dark:text-black shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
              title="Avance gradual acumulado de ingresos y gastos"
            >
              Acumulado
            </button>
            <button
              type="button"
              onClick={() => setChartMode('daily')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === 'daily'
                  ? 'bg-[#121217] text-white dark:bg-[#ffd000] dark:text-black shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
              title="Picos diarios individuales"
            >
              Picos
            </button>
          </div>

          {/* Botón Minimizar / Desplegar */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-spring p-1.5 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/15 text-muted hover:text-main cursor-pointer"
            aria-label={isExpanded ? 'Minimizar gráfico' : 'Expandir gráfico'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Métricas Resumen del Período */}
            <div className="grid grid-cols-3 gap-2.5 pt-3.5 pb-2 font-mono-num">
              {/* Total Ingresos */}
              <div className="p-2.5 sm:p-3 rounded-2xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted uppercase">
                  <span>Ingresos Totales</span>
                  <span className="w-2 h-2 rounded-full bg-[#00ff87] shadow-[0_0_8px_#00ff87]" />
                </div>
                <span className="font-extrabold text-xs sm:text-base text-[#087f48] dark:text-[#00ff87] mt-1 truncate">
                  +{formatCurrency(chartData.totalIncome, currency)}
                </span>
              </div>

              {/* Total Egresos */}
              <div className="p-2.5 sm:p-3 rounded-2xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted uppercase">
                  <span>Egresos Totales</span>
                  <span className="w-2 h-2 rounded-full bg-[#ff2e93] shadow-[0_0_8px_#ff2e93]" />
                </div>
                <span className="font-extrabold text-xs sm:text-base text-[#d9183b] dark:text-[#ff2e93] mt-1 truncate">
                  -{formatCurrency(chartData.totalExpense, currency)}
                </span>
              </div>

              {/* Balance / Saldo Neto */}
              <div className="p-2.5 sm:p-3 rounded-2xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted uppercase">
                  <span>Balance Neto</span>
                  <span className="text-[10px] text-muted font-bold">
                    {chartData.totalIncome > 0
                      ? `${Math.round((chartData.netBalance / chartData.totalIncome) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <span
                  className={`font-extrabold text-xs sm:text-base mt-1 truncate ${
                    chartData.netBalance >= 0
                      ? 'text-[#087f48] dark:text-[#00ff87]'
                      : 'text-[#d9183b] dark:text-[#ff4365]'
                  }`}
                >
                  {chartData.netBalance >= 0 ? '+' : ''}
                  {formatCurrency(chartData.netBalance, currency)}
                </span>
              </div>
            </div>

            {/* Lienzo SVG Interactivo */}
            <div className="relative w-full mt-2 select-none touch-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto overflow-visible cursor-crosshair"
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onTouchEnd={handleMouseLeave}
              >
                <defs>
                  {/* Gradiente Saldo (Cyan Neón) */}
                  <linearGradient id="chartBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradiente Ingreso (Verde Neón) */}
                  <linearGradient id="chartIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ff87" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#00ff87" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradiente Egreso (Cyber Pink) */}
                  <linearGradient id="chartExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff2e93" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#ff2e93" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Filtros Resplandor */}
                  <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00f0ff" floodOpacity="0.6" />
                  </filter>
                  <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#00ff87" floodOpacity="0.5" />
                  </filter>
                  <filter id="glowPink" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ff2e93" floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Líneas Guía Horizontales (Eje Y: Dinero) */}
                {yTicks.map((tick, i) => (
                  <g key={`ytick-${i}`}>
                    <line
                      x1={padding.left}
                      y1={tick.y}
                      x2={width - padding.right}
                      y2={tick.y}
                      stroke="currentColor"
                      className="text-black/10 dark:text-white/10"
                      strokeDasharray={Math.abs(tick.val) < 0.01 ? 'none' : '3 3'}
                      strokeWidth={Math.abs(tick.val) < 0.01 ? '1.5' : '1'}
                    />
                    <text
                      x={padding.left - 8}
                      y={tick.y + 3.5}
                      textAnchor="end"
                      fontSize="9.5"
                      fontWeight="bold"
                      className="fill-[#525266] dark:fill-[#9a9ab0] font-mono-num select-none"
                    >
                      {Math.abs(tick.val) >= 1000
                        ? `${(tick.val / 1000).toFixed(1)}k`
                        : Math.round(tick.val)}
                    </text>
                  </g>
                ))}

                {/* Línea Base de Saldo Cero si el rango contiene negativos */}
                {chartMode === 'balance' && yMin < 0 && (
                  <line
                    x1={padding.left}
                    y1={yZero}
                    x2={width - padding.right}
                    y2={yZero}
                    stroke="#ffffff"
                    strokeOpacity="0.25"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* ================= MODOS DE TRAZO ================= */}

                {/* MODO 1: EVOLUCIÓN DE SALDO (SUBE Y BAJA GRADUALMENTE) */}
                {chartMode === 'balance' && (
                  <>
                    {/* Área de relleno de saldo */}
                    {balanceArea && <path d={balanceArea} fill="url(#chartBalanceGrad)" />}

                    {/* Línea Principal de Saldo */}
                    {balancePath && (
                      <path
                        d={balancePath}
                        fill="none"
                        stroke="#00f0ff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glowCyan)"
                      />
                    )}

                    {/* Nodos de actividad donde ocurrió un aumento (+) o disminución (-) */}
                    {pointsWithCoords.map((p, i) => {
                      if (!p.hasActivity) return null;
                      const isPositiveChange = p.dailyDelta >= 0;

                      return (
                        <g key={`bnode-${i}`}>
                          <circle
                            cx={p.x}
                            cy={p.yBalance}
                            r={hoveredIndex === i ? 6 : 4}
                            fill={isPositiveChange ? '#00ff87' : '#ff2e93'}
                            stroke="#0b0b0e"
                            strokeWidth="2"
                            className="transition-all"
                          />
                        </g>
                      );
                    })}
                  </>
                )}

                {/* MODO 2 Y 3: ACUMULADO O PICOS DIARIOS */}
                {chartMode !== 'balance' && (
                  <>
                    {/* Áreas de relleno bajo las curvas */}
                    {incomeArea && <path d={incomeArea} fill="url(#chartIncomeGrad)" />}
                    {expenseArea && <path d={expenseArea} fill="url(#chartExpenseGrad)" />}

                    {/* Línea de Ingresos (Verde Neón) */}
                    {incomePath && (
                      <path
                        d={incomePath}
                        fill="none"
                        stroke="#00ff87"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glowGreen)"
                      />
                    )}

                    {/* Línea de Egresos (Rosa/Rojo Neón) */}
                    {expensePath && (
                      <path
                        d={expensePath}
                        fill="none"
                        stroke="#ff2e93"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glowPink)"
                      />
                    )}

                    {/* Nodos con actividad */}
                    {pointsWithCoords.map((p, i) => {
                      const hasInc = p.dailyIncome > 0;
                      const hasExp = p.dailyExpense > 0;
                      if (!hasInc && !hasExp && chartMode !== 'cumulative') return null;

                      return (
                        <g key={`node-${i}`}>
                          {hasInc && (
                            <circle
                              cx={p.x}
                              cy={p.yIncome}
                              r={hoveredIndex === i ? 5.5 : 3.5}
                              fill="#00ff87"
                              stroke="#0b0b0e"
                              strokeWidth="1.5"
                              className="transition-all"
                            />
                          )}
                          {hasExp && (
                            <circle
                              cx={p.x}
                              cy={p.yExpense}
                              r={hoveredIndex === i ? 5.5 : 3.5}
                              fill="#ff2e93"
                              stroke="#0b0b0e"
                              strokeWidth="1.5"
                              className="transition-all"
                            />
                          )}
                        </g>
                      );
                    })}
                  </>
                )}

                {/* Mira / Línea Vertical de Hover */}
                {activePoint && (
                  <g>
                    <line
                      x1={activePoint.x}
                      y1={padding.top}
                      x2={activePoint.x}
                      y2={padding.top + graphHeight}
                      stroke="currentColor"
                      className="text-black/30 dark:text-white/40"
                      strokeDasharray="2 2"
                      strokeWidth="1.5"
                    />

                    {chartMode === 'balance' ? (
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yBalance}
                        r="6.5"
                        fill="#00f0ff"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all"
                      />
                    ) : (
                      <>
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.yIncome}
                          r="5.5"
                          fill="#00ff87"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.yExpense}
                          r="5.5"
                          fill="#ff2e93"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </g>
                )}

                {/* Etiquetas del Eje X (Días) */}
                {xTicks.map((p, i) => (
                  <g key={`xtick-${i}`}>
                    <line
                      x1={p.x}
                      y1={padding.top + graphHeight}
                      x2={p.x}
                      y2={padding.top + graphHeight + 4}
                      stroke="currentColor"
                      className="text-black/30 dark:text-white/30"
                      strokeWidth="1"
                    />
                    <text
                      x={p.x}
                      y={padding.top + graphHeight + 16}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="bold"
                      className={`font-mono-num select-none ${
                        p.isToday
                          ? 'fill-[#00f0ff] font-extrabold'
                          : 'fill-[#525266] dark:fill-[#9a9ab0]'
                      }`}
                    >
                      {p.isToday ? 'Hoy' : `Día ${p.label}`}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Tooltip Flotante Interactivo */}
              {activePoint && (
                <div
                  className="absolute pointer-events-none z-20 transition-all duration-75"
                  style={{
                    left: `${(activePoint.x / width) * 100}%`,
                    top: '12px',
                    transform:
                      activePoint.x > width * 0.72
                        ? 'translateX(-105%)'
                        : activePoint.x < width * 0.28
                        ? 'translateX(5%)'
                        : 'translateX(-50%)',
                  }}
                >
                  <div className="px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-xl text-xs font-mono-num
                    dark:bg-[#181822]/95 dark:border-white/20 dark:text-white
                    bg-white/95 border-[#121217] text-[#121217] min-w-[170px]">
                    <div className="font-bold border-b border-black/10 dark:border-white/10 pb-1 mb-1.5 text-[11px] text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-[#00f0ff]" />
                        <span>
                          {activePoint.fullDate.toLocaleDateString('es-PE', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </span>
                      {activePoint.isToday && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-[#00f0ff]/20 text-[#00f0ff]">
                          Hoy
                        </span>
                      )}
                    </div>

                    {chartMode === 'balance' ? (
                      /* Tooltip para Modo Saldo */
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-main">
                          <span className="text-[10px] uppercase font-bold text-muted">
                            Saldo al día:
                          </span>
                          <span
                            className={`font-black text-sm ${
                              activePoint.balance >= 0
                                ? 'text-[#087f48] dark:text-[#00ff87]'
                                : 'text-[#d9183b] dark:text-[#ff4365]'
                            }`}
                          >
                            {activePoint.balance >= 0 ? '+' : ''}
                            {formatCurrency(activePoint.balance, currency)}
                          </span>
                        </div>

                        {activePoint.hasActivity ? (
                          <div className="pt-1 border-t border-black/5 dark:border-white/10 text-[11px] space-y-0.5">
                            {activePoint.dailyIncome > 0 && (
                              <div className="flex items-center justify-between text-[#087f48] dark:text-[#00ff87]">
                                <span>Aumento (+):</span>
                                <span className="font-bold">+{formatCurrency(activePoint.dailyIncome, currency)}</span>
                              </div>
                            )}
                            {activePoint.dailyExpense > 0 && (
                              <div className="flex items-center justify-between text-[#d9183b] dark:text-[#ff2e93]">
                                <span>Disminución (-):</span>
                                <span className="font-bold">-{formatCurrency(activePoint.dailyExpense, currency)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pt-1 border-t border-black/5 dark:border-white/10 text-[10px] text-muted italic">
                            Sin movimientos en este día (Saldo se mantiene)
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Tooltip para Modo Acumulado o Picos */
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-[#087f48] dark:text-[#00ff87]">
                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87]" />
                            {chartMode === 'cumulative' ? 'Ingreso Acum:' : 'Ingreso del día:'}
                          </span>
                          <span className="font-black">
                            +{formatCurrency(activePoint.incVal, currency)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-[#d9183b] dark:text-[#ff2e93]">
                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2e93]" />
                            {chartMode === 'cumulative' ? 'Egreso Acum:' : 'Egreso del día:'}
                          </span>
                          <span className="font-black">
                            -{formatCurrency(activePoint.expVal, currency)}
                          </span>
                        </div>

                        {chartMode === 'cumulative' && (
                          <div className="flex items-center justify-between gap-3 pt-1 mt-1 border-t border-black/5 dark:border-white/10 text-main text-[11px] font-extrabold">
                            <span className="text-[10px] text-muted uppercase">Superávit Acum:</span>
                            <span
                              className={
                                activePoint.accumIncome >= activePoint.accumExpense
                                  ? 'text-[#087f48] dark:text-[#00ff87]'
                                  : 'text-[#d9183b] dark:text-[#ff4365]'
                              }
                            >
                              {activePoint.accumIncome >= activePoint.accumExpense ? '+' : ''}
                              {formatCurrency(activePoint.accumIncome - activePoint.accumExpense, currency)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Leyenda y Consejos de Navegación */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-black/5 dark:border-white/10 text-xs">
              <div className="flex items-center gap-4 text-xs font-bold">
                {chartMode === 'balance' ? (
                  <>
                    <span className="flex items-center gap-1.5 text-[#00f0ff]">
                      <span className="w-3 h-1 rounded-full bg-[#00f0ff]" />
                      <span>Curva de Saldo (Dinero Neto)</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#087f48] dark:text-[#00ff87] text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-[#00ff87]" />
                      <span>Aumento</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#d9183b] dark:text-[#ff2e93] text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-[#ff2e93]" />
                      <span>Disminución</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 text-[#087f48] dark:text-[#00ff87]">
                      <span className="w-3 h-1 rounded-full bg-[#00ff87]" />
                      <span>Ingresos</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[#d9183b] dark:text-[#ff2e93]">
                      <span className="w-3 h-1 rounded-full bg-[#ff2e93]" />
                      <span>Egresos</span>
                    </span>
                  </>
                )}
              </div>

              <span className="text-[11px] text-muted font-medium italic">
                💡 Pasa el cursor o dedo para ver la variación día a día
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
