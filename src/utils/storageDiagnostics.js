// Utilidad para diagnóstico y medición en tiempo real del espacio en LocalStorage
export const LOCALSTORAGE_QUOTA_BYTES = 5 * 1024 * 1024; // 5 MB estándar (5,242,880 bytes)

/**
 * Formatea bytes a una cadena legible (B, KB, MB, GB)
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calcula el espacio ocupado, libre y desglose por llaves en LocalStorage
 */
export function getLocalStorageDiagnostics() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      supported: false,
      totalQuotaBytes: LOCALSTORAGE_QUOTA_BYTES,
      totalQuotaFormatted: '5.00 MB',
      usedBytes: 0,
      usedFormatted: '0 B',
      remainingBytes: LOCALSTORAGE_QUOTA_BYTES,
      remainingFormatted: '5.00 MB',
      percentUsed: 0,
      percentRemaining: 100,
      keys: [],
    };
  }

  let usedChars = 0;
  const keys = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key) || '';
    // En cadenas JavaScript / DOMString, cada carácter cuenta como 2 bytes (UTF-16)
    const keyChars = key.length;
    const valueChars = value.length;
    const itemChars = keyChars + valueChars;
    const itemBytes = itemChars * 2;

    usedChars += itemChars;

    // Resumen de registros si contiene JSON de Aurum
    let summary = null;
    const isAurumKey = key.startsWith('aurum_');
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        summary = `${parsed.length} elementos`;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.movements)) {
          const movsCount = parsed.movements.length;
          const resCount = parsed.reserves?.length || 0;
          summary = `${movsCount} movs · ${resCount} reservas`;
        } else {
          summary = `${Object.keys(parsed).length} campos`;
        }
      }
    } catch {
      summary = `${value.length} carácteres`;
    }

    keys.push({
      key,
      bytes: itemBytes,
      formattedSize: formatBytes(itemBytes),
      isAurumKey,
      summary,
      percentOfQuota: Number(((itemBytes / LOCALSTORAGE_QUOTA_BYTES) * 100).toFixed(2)),
    });
  }

  // Ordenar llaves de mayor a menor uso
  keys.sort((a, b) => b.bytes - a.bytes);

  const usedBytes = usedChars * 2;
  const totalQuotaBytes = LOCALSTORAGE_QUOTA_BYTES;
  const remainingBytes = Math.max(0, totalQuotaBytes - usedBytes);
  const percentUsed = Number(((usedBytes / totalQuotaBytes) * 100).toFixed(2));
  const percentRemaining = Number(((remainingBytes / totalQuotaBytes) * 100).toFixed(2));

  return {
    supported: true,
    totalQuotaBytes,
    totalQuotaFormatted: formatBytes(totalQuotaBytes),
    usedBytes,
    usedFormatted: formatBytes(usedBytes),
    remainingBytes,
    remainingFormatted: formatBytes(remainingBytes),
    percentUsed,
    percentRemaining,
    keys,
  };
}

/**
 * Consulta la API moderna de cuota de almacenamiento del navegador (IndexedDB, Cache, etc.)
 */
export async function getBrowserStorageEstimate() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        supported: true,
        quota: estimate.quota || 0,
        quotaFormatted: formatBytes(estimate.quota || 0),
        usage: estimate.usage || 0,
        usageFormatted: formatBytes(estimate.usage || 0),
        percent: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0,
      };
    } catch (e) {
      console.warn('No se pudo estimar navigator.storage:', e);
    }
  }
  return { supported: false };
}
