// Servicio de almacenamiento local seguro con deduplicación, migración v2 y motor de reconciliación libre de conflictos
import { INITIAL_CATEGORIES, INCOME_SOURCES } from '../utils/budgetConstants';

const STORAGE_KEY = 'aurum_financial_data_v1';
const TOMBSTONE_RETENTION_DAYS = 60; // Días para retener marcas de eliminación antes de purgar

/**
 * Obtiene la marca de tiempo efectiva más reciente para un registro (edición o eliminación)
 */
function getEffectiveTimestamp(item) {
  if (!item) return 0;
  const updateTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
  const deleteTime = item.deletedAt ? new Date(item.deletedAt).getTime() : 0;
  const dateTime = item.date ? new Date(item.date).getTime() : 0;
  return Math.max(updateTime, deleteTime, dateTime);
}

/**
 * Motor genérico de reconciliación determinista Last-Write-Wins (LWW) con soporte de Tombstones
 */
function mergeEntitiesWithTombstones(localList = [], incomingList = []) {
  const map = new Map();
  let addedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;

  // Cargar locales
  for (const item of localList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // Reconciliar con entrantes
  for (const incoming of incomingList) {
    if (!incoming || !incoming.id) continue;

    if (!map.has(incoming.id)) {
      // Elemento nuevo proveniente del otro dispositivo
      map.set(incoming.id, incoming);
      if (incoming.deletedAt) {
        deletedCount++;
      } else {
        addedCount++;
      }
    } else {
      // Elemento ya existente en ambos dispositivos: resolver conflicto por marca de tiempo
      const existing = map.get(incoming.id);
      const existingTime = getEffectiveTimestamp(existing);
      const incomingTime = getEffectiveTimestamp(incoming);

      let incomingWins = false;

      if (incomingTime > existingTime) {
        incomingWins = true;
      } else if (incomingTime === existingTime) {
        // Desempate determinista: la eliminación tiene prioridad sobre la edición simultánea
        if (incoming.deletedAt && !existing.deletedAt) {
          incomingWins = true;
        } else if (!incoming.deletedAt && existing.deletedAt) {
          incomingWins = false;
        } else {
          // Desempate por orden alfabético de JSON para consistencia estricta en ambos nodos
          const incomingStr = JSON.stringify(incoming);
          const existingStr = JSON.stringify(existing);
          if (incomingStr > existingStr) {
            incomingWins = true;
          }
        }
      }

      if (incomingWins) {
        map.set(incoming.id, incoming);
        if (incoming.deletedAt && !existing.deletedAt) {
          deletedCount++;
        } else {
          updatedCount++;
        }
      }
    }
  }

  // Purgar tombstones antiguos que ya hayan cumplido el periodo de retención
  const now = Date.now();
  const maxRetentionMs = TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const finalList = [];

  for (const item of map.values()) {
    if (item.deletedAt) {
      const deleteAge = now - new Date(item.deletedAt).getTime();
      if (deleteAge > maxRetentionMs) {
        // Purgado permanentemente por antigüedad
        continue;
      }
    }
    finalList.push(item);
  }

  // Ordenamiento determinista para garantizar conmutatividad estricta (A + B === B + A)
  finalList.sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  return {
    mergedList: finalList,
    stats: { addedCount, updatedCount, deletedCount, total: finalList.length },
  };
}

export const storageService = {
  /**
   * Carga el estado desde localStorage garantizando migración segura a v2
   */
  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Primera instalación: iniciar con moneda PEN (Soles) y categorías iniciales
        const initialData = {
          version: '2.0',
          currency: 'PEN',
          theme: 'system',
          lastSync: null,
          categories: INITIAL_CATEGORIES,
          incomeSources: INCOME_SOURCES,
          reserves: [],
          allocations: [],
          movements: [],
        };
        this.saveData(initialData);
        return initialData;
      }

      const parsed = JSON.parse(raw);

      // Migración y saneamiento sin alterar movimientos existentes
      let needsSave = false;

      if (!parsed.version || parsed.version === '1.0') {
        parsed.version = '2.0';
        needsSave = true;
      }

      if (!parsed.currency) {
        parsed.currency = 'PEN';
        needsSave = true;
      }

      if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
        parsed.categories = INITIAL_CATEGORIES;
        needsSave = true;
      }

      if (!parsed.incomeSources || !Array.isArray(parsed.incomeSources) || parsed.incomeSources.length === 0) {
        parsed.incomeSources = INCOME_SOURCES;
        needsSave = true;
      }

      if (!parsed.reserves || !Array.isArray(parsed.reserves)) {
        parsed.reserves = [];
        needsSave = true;
      }

      if (!parsed.allocations || !Array.isArray(parsed.allocations)) {
        parsed.allocations = [];
        needsSave = true;
      }

      if (!parsed.movements || !Array.isArray(parsed.movements)) {
        parsed.movements = [];
        needsSave = true;
      } else {
        // Asegurar que movimientos previos tengan categoría por defecto si no la tienen
        parsed.movements = parsed.movements.map((mov) => {
          if (!mov.categoryId) {
            return {
              ...mov,
              categoryId: mov.type === 'ingreso' ? 'cat_otros_ingresos' : 'cat_alimentacion',
            };
          }
          return mov;
        });
      }

      if (needsSave) {
        this.saveData(parsed);
      }

      return parsed;
    } catch (e) {
      console.error('Error cargando datos de localStorage:', e);
      return {
        version: '2.0',
        currency: 'PEN',
        theme: 'system',
        lastSync: null,
        categories: INITIAL_CATEGORIES,
        incomeSources: INCOME_SOURCES,
        reserves: [],
        allocations: [],
        movements: [],
      };
    }
  },

  /**
   * Guarda el estado completo en localStorage
   */
  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Disparar evento para sincronización entre pestañas locales
      window.dispatchEvent(new Event('aurum_storage_updated'));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  },

  /**
   * Reconciliación maestra integral de TODAS las entidades entre dos dispositivos (P2P o JSON)
   * Sin conflictos, sin duplicación y con propagación de eliminaciones (Tombstones).
   */
  mergeAllData(localData = {}, incomingData = {}) {
    const local = localData || {};
    const incoming = incomingData || {};

    // 1. Reconciliar Movimientos
    const localMovs = Array.isArray(local.movements) ? local.movements : [];
    const incomingMovs = Array.isArray(incoming.movements) ? incoming.movements : [];
    const movResult = mergeEntitiesWithTombstones(localMovs, incomingMovs);
    // Ordenar cronológicamente descendente
    movResult.mergedList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    // 2. Reconciliar Reservas
    const localRes = Array.isArray(local.reserves) ? local.reserves : [];
    const incomingRes = Array.isArray(incoming.reserves) ? incoming.reserves : [];
    const resResult = mergeEntitiesWithTombstones(localRes, incomingRes);

    // 3. Reconciliar Asignaciones de Reservas (allocations)
    const localAlloc = Array.isArray(local.allocations) ? local.allocations : [];
    const incomingAlloc = Array.isArray(incoming.allocations) ? incoming.allocations : [];
    const allocResult = mergeEntitiesWithTombstones(localAlloc, incomingAlloc);
    allocResult.mergedList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    // 4. Reconciliar Categorías Personalizadas
    const localCats = Array.isArray(local.categories) ? local.categories : INITIAL_CATEGORIES;
    const incomingCats = Array.isArray(incoming.categories) ? incoming.categories : [];
    const catResult = mergeEntitiesWithTombstones(localCats, incomingCats);

    // 5. Reconciliar Orígenes de Ingresos
    const localSources = Array.isArray(local.incomeSources) ? local.incomeSources : INCOME_SOURCES;
    const incomingSources = Array.isArray(incoming.incomeSources) ? incoming.incomeSources : [];
    const sourceResult = mergeEntitiesWithTombstones(localSources, incomingSources);

    // 6. Moneda: mantener la local a menos que incoming tenga marca de tiempo más reciente explícita
    const currency = incoming.currencyUpdatedAt && local.currencyUpdatedAt
      ? (new Date(incoming.currencyUpdatedAt) > new Date(local.currencyUpdatedAt) ? incoming.currency : local.currency)
      : (local.currency || incoming.currency || 'PEN');

    const mergedData = {
      version: '2.0',
      currency,
      theme: local.theme || incoming.theme || 'system',
      lastSync: new Date().toISOString(),
      categories: catResult.mergedList,
      incomeSources: sourceResult.mergedList,
      reserves: resResult.mergedList,
      allocations: allocResult.mergedList,
      movements: movResult.mergedList,
    };

    const stats = {
      movementsAdded: movResult.stats.addedCount,
      movementsUpdated: movResult.stats.updatedCount,
      movementsDeleted: movResult.stats.deletedCount,
      reservesAdded: resResult.stats.addedCount,
      reservesUpdated: resResult.stats.updatedCount,
      reservesDeleted: resResult.stats.deletedCount,
      allocationsAdded: allocResult.stats.addedCount,
      categoriesAdded: catResult.stats.addedCount,
      totalMovements: movResult.mergedList.filter((m) => !m.deletedAt).length,
      totalReserves: resResult.mergedList.filter((r) => !r.deletedAt).length,
    };

    return { mergedData, stats };
  },

  /**
   * Fusiona un conjunto de movimientos (retrocompatibilidad)
   */
  mergeMovements(localMovements = [], incomingMovements = []) {
    const res = mergeEntitiesWithTombstones(localMovements, incomingMovements);
    res.mergedList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return {
      mergedList: res.mergedList,
      stats: {
        addedCount: res.stats.addedCount,
        updatedCount: res.stats.updatedCount,
        deletedCount: res.stats.deletedCount,
        total: res.mergedList.length,
      },
    };
  },

  /**
   * Fusiona reservas externas con locales (retrocompatibilidad)
   */
  mergeReserves(localReserves = [], incomingReserves = []) {
    const res = mergeEntitiesWithTombstones(localReserves, incomingReserves);
    return res.mergedList;
  },

  /**
   * Exporta los datos a formato JSON descargable con todos los módulos
   */
  exportToJSON() {
    const data = this.loadData();
    const cleanData = {
      ...data,
      exportTimestamp: new Date().toISOString(),
      // Exportar solo registros no eliminados para archivos limpios de respaldo
      movements: (data.movements || []).filter((m) => !m.deletedAt),
      reserves: (data.reserves || []).filter((r) => !r.deletedAt),
      allocations: (data.allocations || []).filter((a) => !a.deletedAt),
      categories: (data.categories || []).filter((c) => !c.deletedAt),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('download', `aurum_presupuesto_respaldo_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  /**
   * Genera un payload JSON completo para P2P, QR o portapapeles
   */
  getExportPayload() {
    const data = this.loadData();
    return JSON.stringify({
      version: data.version || '2.0',
      currency: data.currency || 'PEN',
      currencyUpdatedAt: data.currencyUpdatedAt || null,
      timestamp: new Date().toISOString(),
      movements: data.movements || [],
      reserves: data.reserves || [],
      allocations: data.allocations || [],
      categories: data.categories || [],
      incomeSources: data.incomeSources || [],
    });
  },
};
