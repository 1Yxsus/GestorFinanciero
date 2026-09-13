import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Target, Calendar, Sparkles, Shield, Bookmark } from 'lucide-react';
import { RESERVE_TEMPLATES, INITIAL_CATEGORIES } from '../utils/budgetConstants';
import { round2 } from '../utils/budgetCalculations';
import { formatCurrency } from '../utils/formatters';

export function ReserveModal({
  isOpen,
  onClose,
  onSave,
  reserveToEdit = null,
  categories = INITIAL_CATEGORIES,
  currency = 'PEN',
}) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [categoryId, setCategoryId] = useState('cat_plan_movil');
  const [frequency, setFrequency] = useState('monthly'); // 'one_time' | 'weekly' | 'monthly' | 'custom_days'
  const [intervalDays, setIntervalDays] = useState('30');
  const [nextDueDate, setNextDueDate] = useState('');
  const [priority, setPriority] = useState('high'); // 'high' | 'medium' | 'low'
  const [protectsBalance, setProtectsBalance] = useState(true);
  const [icon, setIcon] = useState('📱');
  const [reserveType, setReserveType] = useState('spending'); // 'spending' | 'savings'

  useEffect(() => {
    if (reserveToEdit) {
      setName(reserveToEdit.name || '');
      setTargetAmount(String(reserveToEdit.targetAmount || ''));
      setCurrentAmount(String(reserveToEdit.currentAmount || '0'));
      setCategoryId(reserveToEdit.categoryId || 'cat_pasajes');
      setFrequency(reserveToEdit.frequency || 'monthly');
      setIntervalDays(String(reserveToEdit.intervalDays || '30'));
      setNextDueDate(reserveToEdit.nextDueDate ? reserveToEdit.nextDueDate.slice(0, 10) : '');
      setPriority(reserveToEdit.priority || 'medium');
      setProtectsBalance(reserveToEdit.protectsBalance !== false);
      setIcon(reserveToEdit.icon || '🎯');
      setReserveType(
        reserveToEdit.reserveType ||
        (['cat_ahorro_meta', 'cat_fondo_emergencia'].includes(reserveToEdit.categoryId) ? 'savings' : 'spending')
      );
    } else {
      // Valores por defecto
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setCategoryId('cat_plan_movil');
      setFrequency('monthly');
      setIntervalDays('30');
      // Fecha por defecto en 30 días
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setNextDueDate(defaultDate.toISOString().slice(0, 10));
      setPriority('high');
      setProtectsBalance(true);
      setIcon('📱');
      setReserveType('spending');
    }
  }, [reserveToEdit, isOpen]);

  const handleApplyTemplate = (tmpl) => {
    setName(tmpl.name);
    setTargetAmount(String(tmpl.targetAmount));
    setCategoryId(tmpl.categoryId);
    setFrequency(tmpl.frequency);
    if (tmpl.intervalDays) setIntervalDays(String(tmpl.intervalDays));
    setPriority(tmpl.priority);
    setProtectsBalance(tmpl.protectsBalance);
    setIcon(tmpl.icon);
    if (tmpl.reserveType) setReserveType(tmpl.reserveType);

    const targetDate = new Date();
    if (tmpl.frequency === 'monthly') targetDate.setDate(targetDate.getDate() + 30);
    else if (tmpl.intervalDays) targetDate.setDate(targetDate.getDate() + tmpl.intervalDays);
    else targetDate.setDate(targetDate.getDate() + 60);

    setNextDueDate(targetDate.toISOString().slice(0, 10));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedTarget = round2(targetAmount);
    if (parsedTarget <= 0 || !name.trim()) return;

    onSave({
      name: name.trim(),
      categoryId,
      targetAmount: parsedTarget,
      currentAmount: round2(currentAmount) || 0,
      frequency,
      intervalDays: frequency === 'custom_days' ? parseInt(intervalDays, 10) || 30 : null,
      nextDueDate: nextDueDate || null,
      priority,
      protectsBalance,
      icon,
      reserveType,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 neo-card border z-10
            dark:bg-[#13131a] dark:border-white/15
            bg-[#ffffff] border-[#121217] shadow-[6px_6px_0px_#121217]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl dark:bg-[#00ff87]/15 bg-[#087f48]/10 text-[#087f48] dark:text-[#00ff87]">
                <Target className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-display-title font-extrabold text-lg sm:text-xl text-main leading-tight">
                  {reserveToEdit ? 'Editar Reserva / Fondo' : 'Nueva Reserva o Fondo'}
                </h3>
                <p className="text-xs text-muted font-semibold mt-0.5">
                  Aparta dinero virtualmente sobre tu mismo saldo
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-spring p-2 rounded-xl text-muted hover:text-main bg-black/5 dark:bg-white/10"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Plantillas rápidas si estamos creando */}
          {!reserveToEdit && (
            <div className="mb-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ffd000]" />
                <span>Plantillas rápidas recomendadas:</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {RESERVE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="btn-spring p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer
                      dark:bg-[#181822] dark:border-white/15 dark:hover:border-[#00ff87]/50 dark:text-white
                      bg-[#f8f5ee] border-[#121217]/20 hover:border-[#121217] text-[#121217] shadow-sm"
                  >
                    <span className="text-lg flex-shrink-0">{tmpl.icon}</span>
                    <div className="min-w-0">
                      <span className="block font-bold truncate text-main">{tmpl.name}</span>
                      <span className="text-muted text-[11px] block">{formatCurrency(tmpl.targetAmount, currency)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Selector de Tipo de Fondo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                ¿Cómo funcionará este fondo?
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setReserveType('spending')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    reserveType === 'spending'
                      ? 'bg-[#00ff87] text-black shadow-[2px_2px_0px_#121217]'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  <span className="text-sm">💸</span>
                  <span className="truncate">Sobre de Gasto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReserveType('savings')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    reserveType === 'savings'
                      ? 'bg-[#00f0ff] text-black shadow-[2px_2px_0px_#121217]'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  <span className="text-sm">🎯</span>
                  <span className="truncate">Meta de Ahorro</span>
                </button>
              </div>
              <p className="text-[11px] text-muted font-medium mt-1 px-1 leading-snug">
                {reserveType === 'spending'
                  ? '💡 Presupuesto que vas consumiendo poco a poco durante el período (ej. Pasajes, Alimentación, Plan móvil).'
                  : '💡 Dinero que vas acumulando poco a poco hasta llegar a un objetivo (ej. Laptop, Vacaciones, Emergencias).'}
              </p>
            </div>

            {/* Nombre e Icono */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Nombre de la Reserva
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={reserveType === 'spending' ? 'Ej. Pasajes, Comida semanal...' : 'Ej. Laptop nueva, Fondo emergencia...'}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-semibold border neo-card transition-all
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                    bg-white border-[#121217] outline-none"
                />
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={2}
                  className="w-12 py-3 text-center rounded-2xl text-lg font-bold border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 bg-white border-[#121217] outline-none"
                  title="Emoji identificador"
                />
              </div>
            </div>

            {/* Monto Objetivo y Monto Actual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  {reserveType === 'spending' ? 'Presupuesto Periódico' : 'Meta a Alcanzar'} ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  required
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl font-num font-bold text-lg border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                    bg-white border-[#121217] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  {reserveType === 'spending' ? 'Saldo Ya Apartado / Disponible' : 'Monto Ya Apartado'} ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  inputMode="decimal"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl font-num font-bold text-lg border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                    bg-white border-[#121217] outline-none"
                />
              </div>
            </div>

            {/* Categoría y Prioridad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl text-xs font-semibold border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                    bg-white border-[#121217] outline-none cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Prioridad
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl text-xs font-semibold border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                    bg-white border-[#121217] outline-none cursor-pointer"
                >
                  <option value="high">🔴 Alta (Indispensable / Próxima)</option>
                  <option value="medium">🟡 Media (Periódico planificado)</option>
                  <option value="low">🟢 Baja (Flexible / Largo plazo)</option>
                </select>
              </div>
            </div>

            {/* Periodicidad y Próximo Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Periodicidad
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl text-xs font-semibold border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                    bg-white border-[#121217] outline-none cursor-pointer"
                >
                  <option value="monthly">Mensual</option>
                  <option value="weekly">Semanal</option>
                  <option value="custom_days">Días personalizados</option>
                  <option value="one_time">Única vez / Meta general</option>
                </select>
              </div>

              {frequency === 'custom_days' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Intervalo en días
                  </label>
                  <input
                    type="number"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    placeholder="Ej. 45"
                    className="w-full px-4 py-3 rounded-2xl text-xs font-bold border neo-card
                      dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                      bg-white border-[#121217] outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Fecha Próximo Pago
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-xs font-semibold border neo-card
                      dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                      bg-white border-[#121217] outline-none"
                  />
                </div>
              )}
            </div>

            {/* Toggle: Protege saldo disponible */}
            <div className="p-3.5 rounded-2xl border dark:bg-[#0b0b0e] bg-black/5 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-main">
                  Restar del disponible para gastar
                </span>
                <span className="text-[11px] text-muted block mt-0.5">
                  Si está activo, este monto apartado no se contará como dinero libre
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProtectsBalance(!protectsBalance)}
                className={`btn-spring w-11 h-6 rounded-full transition-colors relative cursor-pointer
                  ${protectsBalance ? 'bg-[#00ff87]' : 'bg-gray-400 dark:bg-gray-700'}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                    ${protectsBalance ? 'left-6 bg-black' : 'left-1'}`}
                />
              </button>
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              className="btn-spring w-full mt-2 py-4 rounded-2xl font-display-title font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all
                dark:bg-[#00ff87] dark:text-black dark:shadow-[0_0_20px_rgba(0,255,135,0.4)]
                bg-[#121217] text-white shadow-[3px_3px_0px_#ffd000]"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{reserveToEdit ? 'Guardar Cambios' : 'Crear Reserva Activa'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
