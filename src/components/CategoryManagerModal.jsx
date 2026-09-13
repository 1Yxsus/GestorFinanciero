import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Tag, DollarSign, Check, Sliders } from 'lucide-react';
import { CATEGORY_TYPES } from '../utils/budgetConstants';

const PRESET_EMOJIS_CAT = ['🍔', '🚌', '📱', '📚', '✂️', '💊', '🎮', '🎯', '🛡️', '📦', '☕', '🐱', '🏋️', '⛽', '🎬', '👗', '💻', '💡'];
const PRESET_EMOJIS_SRC = ['💵', '🪙', '🛍️', '🤝', '🎓', '💻', '📈', '🎁', '🚀', '💼', '🏆', '💳'];
const PRESET_COLORS = ['#00f0ff', '#00ff87', '#ffd000', '#ff2e93', '#8b5cf6', '#f97316', '#ef4444', '#3b82f6'];

const TYPE_LABELS = {
  [CATEGORY_TYPES.NECESIDAD]: { label: 'Necesidad', color: 'text-[#00ff87] bg-[#00ff87]/15 border-[#00ff87]/30' },
  [CATEGORY_TYPES.PLANIFICADO]: { label: 'Planificado', color: 'text-[#8b5cf6] bg-[#8b5cf6]/15 border-[#8b5cf6]/30' },
  [CATEGORY_TYPES.AHORRO]: { label: 'Ahorro / Meta', color: 'text-[#3b82f6] bg-[#3b82f6]/15 border-[#3b82f6]/30' },
  [CATEGORY_TYPES.GUSTO]: { label: 'Gusto / Ocio', color: 'text-[#ff2e93] bg-[#ff2e93]/15 border-[#ff2e93]/30' },
  [CATEGORY_TYPES.NEGOCIO]: { label: 'Negocio', color: 'text-[#f97316] bg-[#f97316]/15 border-[#f97316]/30' },
};

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories = [],
  incomeSources = [],
  onAddCategory,
  onDeleteCategory,
  onAddIncomeSource,
  onDeleteIncomeSource,
}) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'sources'

  // Estado para nueva categoría
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('necesidad');
  const [catIcon, setCatIcon] = useState('🏷️');
  const [catColor, setCatColor] = useState('#00f0ff');

  // Estado para nuevo origen de ingreso
  const [srcLabel, setSrcLabel] = useState('');
  const [srcIcon, setSrcIcon] = useState('💵');

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    onAddCategory({
      name: catName.trim(),
      type: catType,
      icon: catIcon || '🏷️',
      color: catColor,
    });
    setCatName('');
    setCatIcon('🏷️');
  };

  const handleCreateSource = (e) => {
    e.preventDefault();
    if (!srcLabel.trim()) return;
    onAddIncomeSource({
      label: srcLabel.trim(),
      icon: srcIcon || '💵',
    });
    setSrcLabel('');
    setSrcIcon('💵');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
        {/* Backdrop */}
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
          className="relative w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl p-6 sm:p-7 neo-card border z-10
            dark:bg-[#13131a] dark:border-white/15
            bg-[#ffffff] border-[#121217] shadow-[6px_6px_0px_#121217]"
        >
          {/* Manija táctil móvil */}
          <div className="sm:hidden flex justify-center -mt-2 mb-3">
            <div className="w-12 h-1.5 rounded-full bg-black/20 dark:bg-white/25" />
          </div>

          {/* Cabecera */}
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-2xl dark:bg-[#ffd000]/15 bg-[#ffd000]/20 text-lg">
                ⚙️
              </span>
              <div>
                <h3 className="font-display-title font-black text-lg sm:text-xl text-main">
                  Personalizar Categorías y Fuentes
                </h3>
                <span className="text-xs text-muted block font-semibold">
                  Adapta la app a tus gastos y tipos de ingreso reales
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

          {/* Pestañas: Categorías / Orígenes de Ingreso */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/5 dark:bg-[#0b0b0e] border neo-border mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`btn-spring py-2.5 rounded-xl font-display-title font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all
                ${
                  activeTab === 'categories'
                    ? 'dark:bg-[#ffd000] dark:text-black bg-[#121217] text-white shadow-sm'
                    : 'text-muted hover:text-main'
                }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Categorías de Gastos ({categories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className={`btn-spring py-2.5 rounded-xl font-display-title font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all
                ${
                  activeTab === 'sources'
                    ? 'dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-sm'
                    : 'text-muted hover:text-main'
                }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Orígenes de Ingreso ({incomeSources.length})</span>
            </button>
          </div>

          {/* CONTENIDO PESTAÑA 1: CATEGORÍAS */}
          {activeTab === 'categories' && (
            <div className="space-y-5">
              {/* Formulario para Crear Categoría */}
              <form onSubmit={handleCreateCategory} className="p-4 rounded-2xl border dark:bg-[#0b0b0e]/80 bg-black/5 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                  <Plus className="w-3.5 h-3.5 text-[#00ff87]" />
                  <span>Añadir Nueva Categoría</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-muted mb-1">Nombre</label>
                    <input
                      type="text"
                      placeholder="Ej. Gimnasio, Gasolina, Libros..."
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold border neo-card dark:bg-[#13131a] bg-white dark:border-white/15 border-[#121217] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted mb-1">Tipo de Gasto</label>
                    <select
                      value={catType}
                      onChange={(e) => setCatType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold border neo-card dark:bg-[#13131a] bg-white dark:border-white/15 border-[#121217] outline-none"
                    >
                      <option value="necesidad">Necesidad básica</option>
                      <option value="planificado">Gasto planificado</option>
                      <option value="ahorro">Meta de Ahorro</option>
                      <option value="gusto">Gusto / Ocio</option>
                      <option value="negocio">Negocio / Reposición</option>
                    </select>
                  </div>
                </div>

                {/* Selector de Emoji */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-muted">Icono / Emoji:</label>
                    <span className="text-sm">{catIcon}</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {PRESET_EMOJIS_CAT.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatIcon(emoji)}
                        className={`w-7 h-7 flex-shrink-0 rounded-lg text-sm flex items-center justify-center border transition-transform
                          ${catIcon === emoji ? 'border-[#00ff87] scale-110 bg-[#00ff87]/20' : 'border-black/10 dark:border-white/10'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Preset */}
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Color representativo:</label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full border transition-transform ${catColor === c ? 'scale-125 border-white ring-2 ring-black/40' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-spring w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer
                    dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Guardar Categoría</span>
                </button>
              </form>

              {/* Listado de Categorías Existentes */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                  Categorías Actuales ({categories.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {categories.map((c) => {
                    const badge = TYPE_LABELS[c.type] || { label: c.type, color: 'text-muted bg-black/5' };
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border dark:bg-[#0b0b0e] bg-white border-black/10 dark:border-white/10"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg flex-shrink-0">{c.icon || '🏷️'}</span>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-main block truncate">
                              {c.name}
                            </span>
                            <span className={`inline-block text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteCategory(c.id)}
                            className="p-1.5 rounded-lg text-muted hover:text-[#d9183b] dark:hover:text-[#ff2e93] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0 ml-1"
                            title="Eliminar categoría"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CONTENIDO PESTAÑA 2: ORÍGENES DE INGRESO */}
          {activeTab === 'sources' && (
            <div className="space-y-5">
              {/* Formulario para Crear Origen */}
              <form onSubmit={handleCreateSource} className="p-4 rounded-2xl border dark:bg-[#0b0b0e]/80 bg-black/5 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                  <Plus className="w-3.5 h-3.5 text-[#00ff87]" />
                  <span>Añadir Nuevo Origen de Ingreso</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Nombre / Origen</label>
                  <input
                    type="text"
                    placeholder="Ej. Beca, Freelance, Horas extras, Bono, Clases particulares..."
                    required
                    value={srcLabel}
                    onChange={(e) => setSrcLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold border neo-card dark:bg-[#13131a] bg-white dark:border-white/15 border-[#121217] outline-none"
                  />
                </div>

                {/* Selector de Emoji */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-muted">Icono representativo:</label>
                    <span className="text-sm">{srcIcon}</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {PRESET_EMOJIS_SRC.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSrcIcon(emoji)}
                        className={`w-7 h-7 flex-shrink-0 rounded-lg text-sm flex items-center justify-center border transition-transform
                          ${srcIcon === emoji ? 'border-[#00ff87] scale-110 bg-[#00ff87]/20' : 'border-black/10 dark:border-white/10'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-spring w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer
                    dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Guardar Origen de Ingreso</span>
                </button>
              </form>

              {/* Listado de Fuentes Existentes */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                  Orígenes de Ingreso Actuales ({incomeSources.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {incomeSources.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border dark:bg-[#0b0b0e] bg-white border-black/10 dark:border-white/10"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg flex-shrink-0">{s.icon || '💵'}</span>
                        <span className="font-bold text-xs text-main truncate">
                          {s.label}
                        </span>
                      </div>

                      {incomeSources.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteIncomeSource(s.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-[#d9183b] dark:hover:text-[#ff2e93] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0 ml-1"
                          title="Eliminar origen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
