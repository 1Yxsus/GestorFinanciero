// Constantes de negocio para el módulo de presupuesto de ingresos variables

export const CATEGORY_TYPES = {
  NECESIDAD: 'necesidad',
  PLANIFICADO: 'planificado',
  AHORRO: 'ahorro',
  GUSTO: 'gusto',
  NEGOCIO: 'negocio',
};

export const INITIAL_CATEGORIES = [
  {
    id: 'cat_pasajes',
    name: 'Pasajes',
    type: 'necesidad',
    icon: '🚌',
    color: '#00f0ff',
  },
  {
    id: 'cat_plan_movil',
    name: 'Plan móvil / recarga',
    type: 'necesidad',
    icon: '📱',
    color: '#00ff87',
  },
  {
    id: 'cat_alimentacion',
    name: 'Alimentación universitaria',
    type: 'necesidad',
    icon: '🍔',
    color: '#ffd000',
  },
  {
    id: 'cat_estudios',
    name: 'Estudios: impresiones, copias, materiales, software',
    type: 'planificado',
    icon: '📚',
    color: '#8b5cf6',
  },
  {
    id: 'cat_cuidado_personal',
    name: 'Cuidado personal: corte de cabello, higiene',
    type: 'planificado',
    icon: '✂️',
    color: '#ec4899',
  },
  {
    id: 'cat_salud',
    name: 'Salud / emergencia',
    type: 'necesidad',
    icon: '💊',
    color: '#ef4444',
  },
  {
    id: 'cat_reposicion_inventario',
    name: 'Reposición de inventario (ventas)',
    type: 'negocio',
    icon: '📦',
    color: '#f97316',
  },
  {
    id: 'cat_gustos_ocio',
    name: 'Gustos / ocio',
    type: 'gusto',
    icon: '🎮',
    color: '#ff2e93',
  },
  {
    id: 'cat_ahorro_meta',
    name: 'Ahorro para meta',
    type: 'ahorro',
    icon: '🎯',
    color: '#3b82f6',
  },
  {
    id: 'cat_fondo_emergencia',
    name: 'Fondo de emergencia',
    type: 'ahorro',
    icon: '🛡️',
    color: '#10b981',
  },
];

export const INCOME_SOURCES = [
  { id: 'tip', label: 'Propina / Eventual', icon: '🪙' },
  { id: 'sale', label: 'Venta (comercio)', icon: '🛍️' },
  { id: 'family_support', label: 'Apoyo familiar', icon: '🤝' },
  { id: 'transport_support', label: 'Apoyo para pasajes', icon: '🚌' },
  { id: 'other', label: 'Otro ingreso libre', icon: '💵' },
];

export const PAYMENT_WALLETS = [
  { id: 'cash', label: 'Efectivo', icon: '💵' },
  { id: 'yape_plin', label: 'Yape / Plin', icon: '📱' },
  { id: 'bank', label: 'Cuenta Bancaria', icon: '💳' },
];

export const RESERVE_TEMPLATES = [
  {
    id: 'tmpl_plan_movil',
    name: 'Plan móvil mensual',
    categoryId: 'cat_plan_movil',
    targetAmount: 29.00,
    frequency: 'monthly',
    intervalDays: 30,
    priority: 'high',
    protectsBalance: true,
    icon: '📱',
    reserveType: 'spending',
  },
  {
    id: 'tmpl_pasajes',
    name: 'Pasajes',
    categoryId: 'cat_pasajes',
    targetAmount: 60.00,
    frequency: 'monthly',
    intervalDays: 30,
    priority: 'high',
    protectsBalance: true,
    icon: '🚌',
    reserveType: 'spending',
  },
  {
    id: 'tmpl_corte_cabello',
    name: 'Corte de cabello cada 45 días',
    categoryId: 'cat_cuidado_personal',
    targetAmount: 25.00,
    frequency: 'custom_days',
    intervalDays: 45,
    priority: 'medium',
    protectsBalance: true,
    icon: '✂️',
    reserveType: 'spending',
  },
  {
    id: 'tmpl_fondo_emergencia',
    name: 'Fondo de emergencia',
    categoryId: 'cat_fondo_emergencia',
    targetAmount: 200.00,
    frequency: 'one_time',
    intervalDays: null,
    priority: 'high',
    protectsBalance: true,
    icon: '🛡️',
    reserveType: 'savings',
  },
];
