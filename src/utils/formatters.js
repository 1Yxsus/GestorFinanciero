// Formateadores de moneda, fecha y utilidades numéricas

export const CURRENCIES = [
  { code: 'PEN', symbol: 'S/', label: 'PEN (S/)', locale: 'es-PE' },
  { code: 'USD', symbol: '$', label: 'USD ($)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)', locale: 'es-ES' },
  { code: 'MXN', symbol: '$', label: 'MXN ($)', locale: 'es-MX' },
  { code: 'COP', symbol: '$', label: 'COP ($)', locale: 'es-CO' },
  { code: 'ARS', symbol: '$', label: 'ARS ($)', locale: 'es-AR' },
  { code: 'CLP', symbol: '$', label: 'CLP ($)', locale: 'es-CL' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)', locale: 'en-GB' },
];

/**
 * Formatea un número como moneda
 */
export function formatCurrency(amount, currencyCode = 'PEN') {
  const curr = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const isIntegerCurrency = ['COP', 'CLP', 'ARS'].includes(currencyCode) && amount > 1000;
  
  try {
    return new Intl.NumberFormat(curr.locale, {
      style: 'currency',
      currency: curr.code,
      minimumFractionDigits: isIntegerCurrency ? 0 : 2,
      maximumFractionDigits: isIntegerCurrency ? 0 : 2,
    }).format(amount || 0);
  } catch {
    const val = Number(amount || 0).toFixed(2);
    return `${curr.symbol}${val}`;
  }
}

/**
 * Genera un identificador único seguro (UUID v4)
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Obtiene la clave de mes (YYYY-MM) de una fecha ISO o Date
 */
export function getMonthKey(dateInput = new Date()) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formatea una clave de mes (ej. "2026-09") a texto legible (ej. "Septiembre 2026")
 */
export function formatMonthName(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
  // Capitalizar primera letra
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

/**
 * Navega meses relativos (ej. -1 para mes anterior, +1 para siguiente)
 */
export function getShiftedMonthKey(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1 + offset, 1);
  return getMonthKey(d);
}

/**
 * Formatea fecha de una transacción (ej. "Hoy, 14:30", "Ayer", o "10 sep")
 */
export function formatMovementDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return `Hoy · ${timeStr}`;
  }
  if (isYesterday) {
    return `Ayer · ${timeStr}`;
  }

  const day = date.getDate();
  const monthShort = date.toLocaleDateString('es-ES', { month: 'short' });
  return `${day} ${monthShort} · ${timeStr}`;
}

/**
 * Retorna fecha actual en formato local input datetime-local (YYYY-MM-DDTHH:mm)
 */
export function getLocalDateTimeString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  const localTime = new Date(date.getTime() - offset);
  return localTime.toISOString().slice(0, 16);
}
