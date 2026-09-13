import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Plus, Sparkles, Check, Bookmark, ShoppingBag, ShieldAlert, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { detectAutoIcon, POPULAR_ICONS } from '../utils/autoIcons';
import { getLocalDateTimeString, formatCurrency } from '../utils/formatters';
import { INCOME_SOURCES, INITIAL_CATEGORIES, PAYMENT_WALLETS } from '../utils/budgetConstants';
import { suggestIncomeDistribution, round2 } from '../utils/budgetCalculations';

export function MovementForm({
  isOpen,
  onClose,
  onSubmit,
  categories = INITIAL_CATEGORIES,
  reserves = [],
  incomeSources = INCOME_SOURCES,
  currency = 'PEN',
  initialLinkedReserveId = null,
}) {
  const [type, setType] = useState('egreso'); // 'ingreso' | 'egreso'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [detectedIcon, setDetectedIcon] = useState('💸');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState(() => getLocalDateTimeString());

  // Medio de pago / billetera
  const [wallet, setWallet] = useState('cash'); // 'cash' | 'yape_plin' | 'bank'
  const [categoryId, setCategoryId] = useState('cat_alimentacion');

  // Campos específicos de presupuesto
  const [source, setSource] = useState('other');
  const [isBusinessSale, setIsBusinessSale] = useState(false);
  const [saleCost, setSaleCost] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictedReserveId, setRestrictedReserveId] = useState('');
  const [linkedReserveId, setLinkedReserveId] = useState(null);

  // Distribución interactiva editable para ingresos (por defecto apagado para no confundir al usuario)
  const [applyDistribution, setApplyDistribution] = useState(false);
  const [customAllocations, setCustomAllocations] = useState([]);
  const [showDistributionDetails, setShowDistributionDetails] = useState(true);

  // Icono auto al cambiar descripción o tipo
  useEffect(() => {
    const icon = detectAutoIcon(description, type);
    setDetectedIcon(icon);
  }, [description, type]);

  // Si se selecciona origen 'transport_support', sugerir Pasajes como restringido automáticamente
  useEffect(() => {
    if (source === 'transport_support') {
      setIsRestricted(true);
      const pasajesRes = reserves.find((r) => r.categoryId === 'cat_pasajes' || /pasaje/i.test(r.name));
      if (pasajesRes) setRestrictedReserveId(pasajesRes.id);
    }
  }, [source, reserves]);

  // Restablecer formulario al abrir
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDescription('');
      setType('egreso');
      setShowCustomDate(false);
      setCustomDate(getLocalDateTimeString());
      setWallet('cash');
      setSource('other');
      setIsBusinessSale(false);
      setSaleCost('');
      setIsRestricted(false);
      setRestrictedReserveId(reserves[0]?.id || '');
      setApplyDistribution(false);
      setCustomAllocations([]);
      setShowDistributionDetails(true);

      if (initialLinkedReserveId) {
        setLinkedReserveId(initialLinkedReserveId);
        const rMatch = reserves.find((r) => r.id === initialLinkedReserveId);
        if (rMatch && rMatch.categoryId) {
          setCategoryId(rMatch.categoryId);
        } else {
          setCategoryId(categories[0]?.id || 'cat_alimentacion');
        }
      } else {
        setLinkedReserveId(null);
        setCategoryId(categories[0]?.id || 'cat_alimentacion');
      }
    }
  }, [isOpen, reserves, categories, initialLinkedReserveId]);

  // Cálculo de distribución sugerida en tiempo real cuando cambia el monto, origen, costo o reserva restringida
  const numericAmount = parseFloat(amount) || 0;
  const numericSaleCost = isBusinessSale ? (parseFloat(saleCost) || 0) : 0;
  const netProfit = source === 'sale' ? Math.max(0, round2(numericAmount - numericSaleCost)) : numericAmount;

  const distributionProposal = useMemo(() => {
    if (type !== 'ingreso' || numericAmount <= 0) return null;

    return suggestIncomeDistribution({
      amount: numericAmount,
      source,
      saleCost: numericSaleCost,
      isRestricted: source !== 'sale' && isRestricted,
      restrictedReserveId: isRestricted ? restrictedReserveId : null,
      reserves,
      categories,
    });
  }, [type, numericAmount, source, numericSaleCost, isRestricted, restrictedReserveId, reserves, categories]);

  // Sincronizar asignaciones personalizables cuando la propuesta cambie
  useEffect(() => {
    if (distributionProposal && distributionProposal.allocations) {
      setCustomAllocations(
        distributionProposal.allocations.map((a) => ({
          ...a,
          amount: a.amount,
        }))
      );
    } else {
      setCustomAllocations([]);
    }
  }, [distributionProposal]);

  const handleAllocationAmountChange = (index, val) => {
    const newAlloc = [...customAllocations];
    newAlloc[index].amount = parseFloat(val) || 0;
    setCustomAllocations(newAlloc);
  };

  // Cálculo real del dinero libre según si la distribución está activa o no
  const totalAssignedToReserves = applyDistribution
    ? customAllocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0)
    : 0;
  const actualFlexibleAmount = Math.max(0, round2(netProfit - totalAssignedToReserves));

  // Verificación de sobregasto en egreso vinculado a reserva
  const selectedLinkedReserve = reserves.find((r) => r.id === linkedReserveId);
  const overspentAmount =
    type === 'egreso' && selectedLinkedReserve && numericAmount > selectedLinkedReserve.currentAmount
      ? round2(numericAmount - selectedLinkedReserve.currentAmount)
      : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    // Micro-celebración visual con confeti
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.75 },
        colors: type === 'ingreso' ? ['#00ff87', '#00f0ff', '#ffd000'] : ['#ff2e93', '#ffbe1a', '#ffffff'],
        disableForReducedMotion: true,
      });
    } catch {}

    const payload = {
      type,
      amount: numericAmount,
      description: description.trim(),
      icon: detectedIcon,
      date: showCustomDate ? new Date(customDate).toISOString() : new Date().toISOString(),
      wallet,
      categoryId: type === 'egreso' ? (categoryId || categories[0]?.id || 'cat_alimentacion') : (categoryId || 'cat_otros_ingresos'),
      source,
      isRestricted,
      restrictedReserveId: isRestricted ? restrictedReserveId : null,
      saleCost: source === 'sale' ? numericSaleCost : null,
      linkedReserveId: type === 'egreso' ? linkedReserveId : null,
      allocationsToApply: type === 'ingreso' && applyDistribution ? customAllocations : null,
    };

    onSubmit(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
        {/* Fondo oscuro con desenfoque */}
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
          className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 neo-card border z-10
            dark:bg-[#13131a] dark:border-white/15
            bg-[#ffffff] border-[#121217] shadow-[6px_6px_0px_#121217]"
        >
          {/* Manija táctil en móvil */}
          <div className="sm:hidden flex justify-center -mt-2 mb-4">
            <div className="w-12 h-1.5 rounded-full bg-black/20 dark:bg-white/25" />
          </div>

          {/* Cabecera */}
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{detectedIcon}</span>
              <div>
                <h3 className="font-display-title font-black text-lg sm:text-xl text-main">
                  {type === 'ingreso' ? 'Registrar Ingreso Inteligente' : 'Registrar Egreso'}
                </h3>
                <span className="text-xs text-muted block font-semibold">
                  Organización flash sin duplicar dinero
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-spring p-2 rounded-xl text-muted hover:text-main bg-black/5 dark:bg-white/10 cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Selector Tipo: Ingreso / Egreso */}
            <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-black/5 dark:bg-[#0b0b0e] border neo-border">
              <button
                type="button"
                id="type-egreso-btn"
                onClick={() => setType('egreso')}
                className={`btn-spring py-3 rounded-xl font-display-title font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all
                  ${
                    type === 'egreso'
                      ? 'bg-[#ff2e93] text-white shadow-[0_0_20px_rgba(255,46,147,0.4)]'
                      : 'text-muted hover:text-main opacity-70'
                  }`}
              >
                <span>🔴</span>
                <span>Egreso</span>
              </button>

              <button
                type="button"
                id="type-ingreso-btn"
                onClick={() => setType('ingreso')}
                className={`btn-spring py-3 rounded-xl font-display-title font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all
                  ${
                    type === 'ingreso'
                      ? 'bg-[#00ff87] text-black shadow-[0_0_20px_rgba(0,255,135,0.4)]'
                      : 'text-muted hover:text-main opacity-70'
                  }`}
              >
                <span>🟢</span>
                <span>Ingreso</span>
              </button>
            </div>

            {/* Monto con inputMode decimal */}
            <div>
              <label htmlFor="amount-input" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Monto ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display-title font-bold text-xl text-muted">
                  S/
                </span>
                <input
                  type="number"
                  step="any"
                  id="amount-input"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl font-num font-bold text-2xl border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:focus:border-[#00ff87] dark:text-white
                    bg-white border-[#121217] outline-none"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="desc-input" className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Descripción
                </label>
                <span className="text-xs text-muted font-semibold">
                  Icono: <span className="text-base">{detectedIcon}</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  id="desc-input"
                  placeholder="Ej. Venta de postres, Apoyo pasajes, Almuerzo..."
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 rounded-2xl text-sm font-semibold border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                    bg-white border-[#121217] outline-none"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-2xl pointer-events-none">
                  {detectedIcon}
                </div>
              </div>

              {/* Atajos de emojis */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
                {POPULAR_ICONS.slice(0, 8).map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setDetectedIcon(emoji)}
                    className="flex-shrink-0 w-8 h-8 rounded-xl text-base flex items-center justify-center btn-spring border dark:border-white/10 border-black/10 hover:border-black"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Medio de Pago / Billetera */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Medio de Pago / Billetera
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_WALLETS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWallet(w.id)}
                    className={`btn-spring py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer
                      ${
                        wallet === w.id
                          ? 'dark:bg-white/15 bg-black/10 border-black dark:border-white text-main shadow-sm'
                          : 'border-black/10 dark:border-white/10 text-muted hover:text-main'
                      }`}
                  >
                    <span>{w.icon}</span>
                    <span className="truncate">{w.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Categoría para Egreso */}
            {type === 'egreso' && categories.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border neo-card dark:bg-[#13131a] bg-white dark:border-white/15 border-[#121217] outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* --- SECCIÓN ESPECÍFICA PARA INGRESO --- */}
            {type === 'ingreso' && (
              <div className="space-y-3.5 p-3.5 rounded-2xl border dark:bg-[#0b0b0e]/90 bg-black/5 dark:border-white/10">
                {/* Origen del ingreso */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Origen del Ingreso
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border neo-card dark:bg-[#13131a] bg-white dark:border-white/15 border-[#121217] outline-none"
                  >
                    {(incomeSources || INCOME_SOURCES).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Si es venta: Opción discreta de costo de reposición para negocios */}
                {source === 'sale' && (
                  <div className="p-3 rounded-2xl border dark:border-white/10 border-black/10 dark:bg-[#13131a] bg-black/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-main flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#f97316]" />
                        Venta de artículo
                      </span>
                      {numericAmount > 0 && (
                        <span className="text-xs font-bold text-[#087f48] dark:text-[#00ff87]">
                          Ganancia neta: {formatCurrency(netProfit, currency)}
                        </span>
                      )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={isBusinessSale}
                        onChange={(e) => {
                          setIsBusinessSale(e.target.checked);
                          if (!e.target.checked) setSaleCost('');
                        }}
                        className="w-4 h-4 rounded text-[#f97316]"
                      />
                      <span className="text-xs font-semibold text-muted">
                        ¿Es venta de negocio con mercadería que debes reponer?
                      </span>
                    </label>

                    {isBusinessSale && (
                      <div className="pt-1.5 space-y-1">
                        <label className="block text-[11px] font-bold text-muted uppercase">
                          Costo de reposición (cuánto cuesta comprar nueva mercadería):
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={saleCost}
                          onChange={(e) => setSaleCost(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-bold border dark:bg-[#0b0b0e] bg-white dark:border-white/15 border-black/20 outline-none"
                        />
                        <p className="text-[10px] text-muted leading-tight">
                          El costo se apartará a inventario y solo la ganancia neta se podrá gastar o distribuir.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Checkbox: Ingreso restringido (solo visible si no es una venta) */}
                {source !== 'sale' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRestricted}
                        onChange={(e) => setIsRestricted(e.target.checked)}
                        className="w-4 h-4 rounded text-[#00ff87]"
                      />
                      <span className="text-xs font-bold text-main">
                        ¿Es dinero recibido para un destino específico? (ej. pasajes)
                      </span>
                    </label>

                    {isRestricted && (
                      <div className="pl-6">
                        <label className="block text-[11px] font-semibold text-muted mb-1">
                          Asignar por defecto a la reserva:
                        </label>
                        <select
                          value={restrictedReserveId}
                          onChange={(e) => setRestrictedReserveId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-bold border dark:bg-[#13131a] bg-white dark:border-white/15 border-black/20 outline-none"
                        >
                          {reserves.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.icon || '🎯'} {r.name} (Meta: {formatCurrency(r.targetAmount, currency)} - Actual: {formatCurrency(r.currentAmount, currency)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Propuesta de Distribución Inteligente (opcional y clara) */}
                {reserves.length > 0 && distributionProposal && (
                  <div className="pt-2.5 border-t border-black/10 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#ffd000]" />
                        <span className="text-xs font-black uppercase tracking-wider text-main">
                          ¿Apartar a tus reservas pendientes?
                        </span>
                      </div>

                      {/* Botón Switch SÍ / NO */}
                      <button
                        type="button"
                        onClick={() => setApplyDistribution(!applyDistribution)}
                        className={`btn-spring px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border
                          ${
                            applyDistribution
                              ? 'dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white border-[#121217] shadow-sm'
                              : 'dark:bg-[#181822] bg-white text-muted border-black/15'
                          }`}
                      >
                        {applyDistribution ? '✓ SÍ, apartar' : 'NO, dejar libre'}
                      </button>
                    </div>

                    {applyDistribution ? (
                      <div className="p-3 rounded-2xl border dark:bg-[#13131a] bg-white border-black/10 dark:border-white/10 space-y-2.5">
                        <p className="text-[11px] text-muted italic leading-tight">
                          {distributionProposal.message}
                        </p>

                        <div className="space-y-1.5">
                          {customAllocations.map((alloc, idx) => (
                            <div
                              key={alloc.reserveId || idx}
                              className="flex items-center justify-between gap-2 p-2 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-main block truncate">
                                  {alloc.reserveName}
                                </span>
                                <span className="text-[10px] text-muted block truncate">
                                  {alloc.reason}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-muted">S/</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={alloc.amount}
                                  onChange={(e) => handleAllocationAmountChange(idx, e.target.value)}
                                  className="w-16 px-2 py-1 text-right font-num font-bold rounded-lg border dark:bg-[#13131a] bg-white dark:border-white/20 border-black/20 outline-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-bold">
                          <span className="text-muted">Dinero que te queda libre hoy:</span>
                          <span className="font-num text-[#087f48] dark:text-[#00ff87] text-sm">
                            {formatCurrency(actualFlexibleAmount, currency)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl border border-[#00ff87]/30 dark:bg-[#00ff87]/10 bg-[#087f48]/10 flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#087f48] dark:text-[#00ff87] flex-shrink-0" />
                        <span className="text-xs font-bold text-[#087f48] dark:text-[#00ff87]">
                          Los {formatCurrency(netProfit, currency)} quedarán 100% libres hoy para gastar en lo que quieras.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* --- SECCIÓN ESPECÍFICA PARA EGRESO (Vincular a Reserva) --- */}
            {type === 'egreso' && (
              <div className="space-y-2.5 p-3.5 rounded-2xl border dark:bg-[#0b0b0e]/90 bg-black/5 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                    <Bookmark className="w-3.5 h-3.5 text-[#00f0ff]" />
                    ¿Corresponde a una reserva existente?
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLinkedReserveId(null)}
                    className={`btn-spring p-2 rounded-xl border text-left text-xs font-semibold
                      ${
                        linkedReserveId === null
                          ? 'border-[#00ff87] dark:bg-[#00ff87]/15 bg-[#087f48]/10 text-main'
                          : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#13131a] text-muted'
                      }`}
                  >
                    <span className="block font-bold">Sin reserva</span>
                    <span className="text-[10px] opacity-80">Gasto libre general</span>
                  </button>

                  {reserves.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setLinkedReserveId(res.id)}
                      className={`btn-spring p-2 rounded-xl border text-left text-xs font-semibold
                        ${
                          linkedReserveId === res.id
                            ? 'border-[#00ff87] dark:bg-[#00ff87]/15 bg-[#087f48]/10 text-main'
                            : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#13131a] text-muted'
                        }`}
                    >
                      <span className="block font-bold truncate">
                        {res.icon || '🎯'} {res.name}
                      </span>
                      <span className="text-[10px] opacity-80 block">
                        {res.reserveType === 'spending' || ['cat_pasajes', 'cat_plan_movil', 'cat_alimentacion', 'cat_cuidado_personal', 'cat_estudios', 'cat_gustos_ocio'].includes(res.categoryId)
                          ? `Te queda: ${formatCurrency(res.currentAmount, currency)}`
                          : `Apartado: ${formatCurrency(res.currentAmount, currency)}`}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Alerta no bloqueante si el gasto excede la reserva */}
                {overspentAmount > 0 && (
                  <div className="p-2.5 rounded-xl border border-[#ffd000]/40 bg-[#ffd000]/15 flex items-start gap-2 text-xs">
                    <ShieldAlert className="w-4 h-4 text-[#ffd000] flex-shrink-0 mt-0.5" />
                    <span className="text-[#92400e] dark:text-[#ffd000] font-semibold">
                      Este gasto utilizó {formatCurrency(overspentAmount, currency)} que no estaba reservado.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Selector Opcional de Fecha */}
            <div>
              {!showCustomDate ? (
                <button
                  type="button"
                  onClick={() => setShowCustomDate(true)}
                  className="text-xs font-bold text-muted hover:text-main flex items-center gap-1.5 cursor-pointer py-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>¿Es de una fecha anterior? Cambiar fecha</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase text-muted">
                      Fecha del movimiento
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCustomDate(false)}
                      className="text-xs font-bold text-[#ff2e93]"
                    >
                      Usar fecha actual
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold border dark:bg-[#13131a] dark:border-white/20 bg-white border-[#121217]"
                  />
                </div>
              )}
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              id="submit-movement-btn"
              className={`btn-spring w-full py-4 rounded-2xl font-display-title font-extrabold text-base tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all
                ${
                  type === 'ingreso'
                    ? 'bg-[#00ff87] text-black shadow-[0_0_25px_rgba(0,255,135,0.4)] hover:bg-[#05f080]'
                    : 'bg-[#ff2e93] text-white shadow-[0_0_25px_rgba(255,46,147,0.4)] hover:bg-[#fa1d88]'
                }`}
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Guardar {type === 'ingreso' ? 'Ingreso' : 'Egreso'} Flash</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
