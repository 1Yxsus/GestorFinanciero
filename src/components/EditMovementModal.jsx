import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Calendar, Edit3, Trash2 } from 'lucide-react';
import { detectAutoIcon, POPULAR_ICONS } from '../utils/autoIcons';
import { getLocalDateTimeString } from '../utils/formatters';
import { PAYMENT_WALLETS } from '../utils/budgetConstants';

export function EditMovementModal({
  isOpen,
  movement,
  currency,
  categories = [],
  reserves = [],
  onClose,
  onSave,
  onDelete,
}) {
  const [type, setType] = useState('egreso');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💸');
  const [date, setDate] = useState('');
  const [wallet, setWallet] = useState('cash');
  const [categoryId, setCategoryId] = useState('');
  const [linkedReserveId, setLinkedReserveId] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (movement) {
      setType(movement.type || 'egreso');
      setAmount(String(movement.amount || ''));
      setDescription(movement.description || '');
      setIcon(movement.icon || (movement.type === 'ingreso' ? '💵' : '💸'));
      setDate(movement.date ? getLocalDateTimeString(new Date(movement.date)) : getLocalDateTimeString());
      setWallet(movement.wallet || 'cash');
      setCategoryId(movement.categoryId || (categories[0]?.id || ''));
      setLinkedReserveId(movement.linkedReserveId || movement.restrictedReserveId || '');
      setShowConfirmDelete(false);
    }
  }, [movement, isOpen, categories]);

  const handleDescriptionChange = (newDesc) => {
    setDescription(newDesc);
    const autoIcon = detectAutoIcon(newDesc, type);
    setIcon(autoIcon);
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    const autoIcon = detectAutoIcon(description, newType);
    setIcon(autoIcon);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSave(movement.id, {
      type,
      amount: parsedAmount,
      description: description.trim(),
      icon,
      date: new Date(date).toISOString(),
      wallet,
      categoryId: categoryId || null,
      linkedReserveId: linkedReserveId || null,
    });

    onClose();
  };

  if (!isOpen || !movement) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ y: '100%', opacity: 0.7 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 neo-card border z-10
            dark:bg-[#13131a] dark:border-white/15
            bg-white border-[#121217] shadow-[6px_6px_0px_#121217]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl dark:bg-[#00f0ff]/15 bg-[#00f0ff]/10 text-[#00f0ff]">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display-title font-extrabold text-base sm:text-lg text-main leading-none">
                  Editar Transacción
                </h3>
                <p className="text-xs text-muted mt-1 font-medium">
                  Modifica los datos del registro financiero
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-spring p-2 rounded-xl text-muted hover:text-main bg-black/5 dark:bg-white/10"
              aria-label="Cerrar modal de edición"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Tipo: Ingreso / Egreso */}
            <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-black/5 dark:bg-[#0b0b0e] border neo-border">
              <button
                type="button"
                onClick={() => handleTypeChange('egreso')}
                className={`btn-spring py-3 rounded-xl font-display-title font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all
                  ${
                    type === 'egreso'
                      ? 'bg-[#ff2e93] text-white shadow-[0_0_15px_rgba(255,46,147,0.4)]'
                      : 'text-muted hover:text-main opacity-70'
                  }`}
              >
                <span>🔴</span>
                <span>Egreso</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('ingreso')}
                className={`btn-spring py-3 rounded-xl font-display-title font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all
                  ${
                    type === 'ingreso'
                      ? 'bg-[#00ff87] text-black shadow-[0_0_15px_rgba(0,255,135,0.4)]'
                      : 'text-muted hover:text-main opacity-70'
                  }`}
              >
                <span>🟢</span>
                <span>Ingreso</span>
              </button>
            </div>

            {/* Monto */}
            <div>
              <label htmlFor="edit-amount-input" className="block text-sm font-bold uppercase tracking-wider text-muted mb-1.5">
                Monto ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display-title font-bold text-2xl text-muted">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  id="edit-amount-input"
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl font-num font-bold text-xl sm:text-2xl border neo-card transition-all
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:focus:border-[#00ff87] dark:text-white
                    bg-white border-[#121217] outline-none"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="edit-desc-input" className="block text-sm font-bold uppercase tracking-wider text-muted">
                  Descripción
                </label>
                <span className="text-xs text-muted flex items-center gap-1 font-semibold">
                  Emoji: <span className="text-base">{icon}</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  id="edit-desc-input"
                  required
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 rounded-2xl text-base font-semibold border neo-card transition-all
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:focus:border-[#00f0ff] dark:text-white
                    bg-white border-[#121217] outline-none"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-2xl pointer-events-none">
                  {icon}
                </div>
              </div>

              {/* Selector rápido de iconos */}
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
                {POPULAR_ICONS.slice(0, 8).map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`flex-shrink-0 w-8 h-8 rounded-xl text-base flex items-center justify-center btn-spring border
                      ${
                        icon === emoji
                          ? 'dark:border-[#00ff87] border-[#121217] bg-black/10 dark:bg-white/15'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
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

            {/* Categoría */}
            {categories.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-xs font-semibold border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white bg-white border-[#121217] outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reserva vinculada */}
            {reserves.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Reserva vinculada (opcional)
                </label>
                <select
                  value={linkedReserveId}
                  onChange={(e) => setLinkedReserveId(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-xs font-semibold border neo-card
                    dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white bg-white border-[#121217] outline-none"
                >
                  <option value="">Ninguna (Gasto/Ingreso libre)</option>
                  {reserves.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.icon || '🎯'} {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fecha y Hora */}
            <div>
              <label htmlFor="edit-date-input" className="block text-sm font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Fecha y Hora</span>
              </label>
              <input
                type="datetime-local"
                id="edit-date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl text-sm font-semibold border neo-card
                  dark:bg-[#0b0b0e] dark:border-white/15 dark:text-white
                  bg-white border-[#121217] outline-none"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                id="save-edit-btn"
                className={`btn-spring flex-1 py-4 rounded-2xl font-display-title font-extrabold text-base tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all
                  ${
                    type === 'ingreso'
                      ? 'bg-[#00ff87] text-black shadow-[0_0_20px_rgba(0,255,135,0.4)] hover:bg-[#05f080]'
                      : 'bg-[#ff2e93] text-white shadow-[0_0_20px_rgba(255,46,147,0.4)] hover:bg-[#fa1d88]'
                  }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Guardar Cambios</span>
              </button>

              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  id="delete-movement-modal-btn"
                  className="btn-spring px-4 py-3.5 rounded-2xl border text-[#d9183b] dark:text-[#ff2e93] border-[#d9183b]/30 hover:bg-[#d9183b]/10 cursor-pointer"
                  title="Eliminar este registro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#d9183b]/15 border border-[#d9183b]/40">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(movement.id);
                      onClose();
                    }}
                    className="btn-spring px-3 py-2 text-xs font-bold rounded-xl bg-[#d9183b] text-white"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="p-1 text-muted text-xs hover:text-main"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
