import { useState, useEffect, useMemo, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { INCOME_SOURCES, PAYMENT_WALLETS } from '../utils/budgetConstants';
import {
  generateUUID,
  getMonthKey as getIsoMonthKey,
  getShiftedMonthKey,
} from '../utils/formatters';
import { detectAutoIcon } from '../utils/autoIcons';
import {
  round2,
  isIncome,
  isExpense,
  calculateBudgetMetrics,
  calculateReserveMetrics,
  getUpcomingPayment,
  consumeExpenseFromReserve,
  generateBudgetAlerts,
  suggestIncomeDistribution,
} from '../utils/budgetCalculations';

export function useMovements() {
  const [data, setData] = useState(() => storageService.loadData());
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getIsoMonthKey(new Date()));
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'global'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterReserve, setFilterReserve] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'income' | 'expense' | 'restricted' | 'sale'

  // Sincronización reactiva entre pestañas y storage
  useEffect(() => {
    const handleStorageChange = () => {
      setData(storageService.loadData());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('aurum_storage_updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('aurum_storage_updated', handleStorageChange);
    };
  }, []);

  const persist = useCallback((newData) => {
    setData(newData);
    storageService.saveData(newData);
    window.dispatchEvent(
      new CustomEvent('aurum_local_mutation', { detail: { payload: newData } })
    );
  }, []);

  // --- CRUD MOVIMIENTOS CON REGLAS DE PRESUPUESTO ---
  const addMovement = useCallback(({
    type,
    amount,
    description,
    icon,
    date,
    categoryId,
    source,
    wallet = 'cash',
    isRestricted = false,
    restrictedReserveId = null,
    saleCost = null,
    linkedReserveId = null,
    allocationsToApply = null, // Propuesta confirmada por el usuario
  }) => {
    const nowIso = new Date().toISOString();
    const movementDate = date ? new Date(date).toISOString() : nowIso;
    const finalIcon = icon || detectAutoIcon(description, type);
    const parsedAmount = Math.abs(round2(amount) || 0);

    const movementId = generateUUID ? generateUUID() : `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newMovement = {
      id: movementId,
      type: type === 'ingreso' || type === 'income' ? 'ingreso' : 'egreso',
      amount: parsedAmount,
      description: description?.trim() || (type === 'ingreso' ? 'Ingreso vario' : 'Gasto vario'),
      icon: finalIcon,
      date: movementDate,
      categoryId: categoryId || (type === 'ingreso' ? 'cat_otros_ingresos' : 'cat_alimentacion'),
      source: source || 'other',
      wallet: wallet || 'cash',
      isRestricted: Boolean(isRestricted),
      restrictedReserveId: isRestricted ? restrictedReserveId : null,
      saleCost: source === 'sale' && saleCost !== undefined && saleCost !== null ? round2(saleCost) : null,
      linkedReserveId: linkedReserveId || null,
      updatedAt: nowIso,
    };

    let updatedReserves = [...(data.reserves || [])];
    let updatedAllocations = [...(data.allocations || [])];

    // Caso A: Egreso vinculado a una reserva
    if (newMovement.type === 'egreso' && linkedReserveId) {
      const reserveIndex = updatedReserves.findIndex((r) => r.id === linkedReserveId);
      if (reserveIndex !== -1) {
        const targetReserve = updatedReserves[reserveIndex];
        const consumption = consumeExpenseFromReserve({
          expenseAmount: parsedAmount,
          reserve: targetReserve,
        });

        // Registrar asignación de tipo 'consume'
        const allocationRecord = {
          id: generateUUID ? generateUUID() : `alloc_${Date.now()}`,
          reserveId: targetReserve.id,
          transactionId: movementId,
          wallet: newMovement.wallet || 'cash',
          amount: consumption.consumedAmount,
          date: movementDate,
          type: 'consume',
          note: `Consumo por egreso: ${newMovement.description}`,
        };
        updatedAllocations.push(allocationRecord);

        // Actualizar monto actual y fecha de siguiente ciclo si correspondiese
        updatedReserves[reserveIndex] = {
          ...targetReserve,
          currentAmount: consumption.newCurrentAmount,
          nextDueDate: consumption.updatedNextDueDate,
          updatedAt: nowIso,
        };
      }
    }

    // Caso B: Ingreso con asignaciones aceptadas o automáticas
    if (newMovement.type === 'ingreso') {
      let finalAllocations = allocationsToApply;

      // Si no vinieron asignaciones predefinidas pero fue restringido
      if (!finalAllocations && isRestricted && restrictedReserveId) {
        const targetReserve = updatedReserves.find((r) => r.id === restrictedReserveId);
        if (targetReserve) {
          const faltante = Math.max(0, round2(targetReserve.targetAmount - targetReserve.currentAmount));
          const amountToAssign = faltante > 0 ? Math.min(parsedAmount, faltante) : parsedAmount;
          finalAllocations = [
            {
              reserveId: targetReserve.id,
              reserveName: targetReserve.name,
              amount: amountToAssign,
              reason: 'Ingreso restringido',
            },
          ];
        }
      }

      // Aplicar las asignaciones a las reservas
      if (Array.isArray(finalAllocations) && finalAllocations.length > 0) {
        for (const alloc of finalAllocations) {
          const allocAmount = round2(alloc.amount);
          if (allocAmount <= 0) continue;

          let resIndex = updatedReserves.findIndex((r) => r.id === alloc.reserveId);

          // Si es temporal para reposición de inventario y no existía, crear la reserva
          if (resIndex === -1 && alloc.reserveId === 'temp_inventario') {
            const newInvRes = {
              id: generateUUID ? generateUUID() : `res_inv_${Date.now()}`,
              name: 'Reposición de inventario',
              categoryId: 'cat_reposicion_inventario',
              targetAmount: allocAmount * 2,
              currentAmount: allocAmount,
              frequency: 'one_time',
              priority: 'high',
              active: true,
              protectsBalance: true,
              icon: '📦',
              updatedAt: nowIso,
            };
            updatedReserves.push(newInvRes);

            updatedAllocations.push({
              id: generateUUID ? generateUUID() : `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              reserveId: newInvRes.id,
              transactionId: movementId,
              wallet: newMovement.wallet || 'cash',
              amount: allocAmount,
              date: movementDate,
              type: 'assign',
              note: alloc.reason || 'Reposición de inventario',
            });
            continue;
          }

          if (resIndex !== -1) {
            const targetRes = updatedReserves[resIndex];
            const newCurrent = round2(targetRes.currentAmount + allocAmount);
            updatedReserves[resIndex] = {
              ...targetRes,
              currentAmount: newCurrent,
              updatedAt: nowIso,
            };

            updatedAllocations.push({
              id: generateUUID ? generateUUID() : `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              reserveId: targetRes.id,
              transactionId: movementId,
              wallet: newMovement.wallet || 'cash',
              amount: allocAmount,
              date: movementDate,
              type: 'assign',
              note: alloc.reason || 'Asignación de ingreso',
            });
          }
        }
      }
    }

    const updatedMovements = [newMovement, ...(data.movements || [])].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const updatedData = {
      ...data,
      movements: updatedMovements,
      reserves: updatedReserves,
      allocations: updatedAllocations,
      lastSync: nowIso,
    };

    persist(updatedData);

    const movMonth = getIsoMonthKey(newMovement.date);
    if (viewMode === 'month' && movMonth !== selectedMonthKey) {
      setSelectedMonthKey(movMonth);
    }

    return newMovement;
  }, [data, persist, viewMode, selectedMonthKey]);

  // Actualizar movimiento
  const updateMovement = useCallback((id, updatedFields) => {
    const nowIso = new Date().toISOString();
    const updatedList = (data.movements || []).map((mov) => {
      if (mov.id === id) {
        return {
          ...mov,
          ...updatedFields,
          updatedAt: nowIso,
        };
      }
      return mov;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    persist({
      ...data,
      movements: updatedList,
      lastSync: nowIso,
    });
  }, [data, persist]);

  // Eliminar movimiento con tombstone para propagación libre de conflictos
  const deleteMovement = useCallback((id) => {
    const nowIso = new Date().toISOString();
    const updatedList = (data.movements || []).map((mov) => {
      if (mov.id === id) {
        return {
          ...mov,
          deletedAt: nowIso,
          updatedAt: nowIso,
        };
      }
      return mov;
    });

    // Marcar asignaciones asociadas a esta transacción con tombstone
    const updatedAllocations = (data.allocations || []).map((a) => {
      if (a.transactionId === id) {
        return {
          ...a,
          deletedAt: nowIso,
          updatedAt: nowIso,
        };
      }
      return a;
    });

    persist({
      ...data,
      movements: updatedList,
      allocations: updatedAllocations,
      lastSync: nowIso,
    });
  }, [data, persist]);

  // --- GESTIÓN CRUD DE RESERVAS ---
  const addReserve = useCallback((reserveData) => {
    const nowIso = new Date().toISOString();
    const newReserve = {
      id: generateUUID ? generateUUID() : `res_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      name: reserveData.name?.trim() || 'Nueva Reserva',
      categoryId: reserveData.categoryId || 'cat_pasajes',
      targetAmount: round2(reserveData.targetAmount) || 0,
      currentAmount: round2(reserveData.currentAmount) || 0,
      wallet: reserveData.wallet || 'cash',
      frequency: reserveData.frequency || 'monthly',
      intervalDays: reserveData.intervalDays ? Number(reserveData.intervalDays) : null,
      nextDueDate: reserveData.nextDueDate || null,
      priority: reserveData.priority || 'medium',
      active: reserveData.active !== false,
      protectsBalance: reserveData.protectsBalance !== false,
      icon: reserveData.icon || '🎯',
      updatedAt: nowIso,
    };

    let updatedAllocations = data.allocations || [];
    if (newReserve.currentAmount > 0) {
      const initialAlloc = {
        id: generateUUID ? generateUUID() : `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
        reserveId: newReserve.id,
        wallet: reserveData.wallet || 'cash',
        amount: newReserve.currentAmount,
        date: nowIso,
        type: 'assign',
        note: 'Monto inicial apartado',
      };
      updatedAllocations = [initialAlloc, ...updatedAllocations];
    }

    const updatedReserves = [newReserve, ...(data.reserves || [])];
    persist({
      ...data,
      reserves: updatedReserves,
      allocations: updatedAllocations,
      lastSync: nowIso,
    });

    return newReserve;
  }, [data, persist]);

  const updateReserve = useCallback((id, updatedFields) => {
    const nowIso = new Date().toISOString();
    const updatedReserves = (data.reserves || []).map((res) => {
      if (res.id === id) {
        return {
          ...res,
          ...updatedFields,
          updatedAt: nowIso,
        };
      }
      return res;
    });

    persist({
      ...data,
      reserves: updatedReserves,
      lastSync: nowIso,
    });
  }, [data, persist]);

  const deleteReserve = useCallback((id) => {
    const nowIso = new Date().toISOString();
    const updatedReserves = (data.reserves || []).map((res) => {
      if (res.id === id) {
        return {
          ...res,
          deletedAt: nowIso,
          updatedAt: nowIso,
          active: false,
        };
      }
      return res;
    });
    persist({
      ...data,
      reserves: updatedReserves,
      lastSync: nowIso,
    });
  }, [data, persist]);

  // Asignar fondos manualmente a una reserva
  const allocateToReserve = useCallback((reserveId, amount, note = 'Asignación manual', wallet = 'cash') => {
    const safeAmount = round2(amount);
    if (safeAmount <= 0) return;

    const nowIso = new Date().toISOString();
    const updatedReserves = (data.reserves || []).map((res) => {
      if (res.id === reserveId) {
        return {
          ...res,
          wallet: wallet || res.wallet || 'cash',
          currentAmount: round2(res.currentAmount + safeAmount),
          updatedAt: nowIso,
        };
      }
      return res;
    });

    const newAllocation = {
      id: generateUUID ? generateUUID() : `alloc_${Date.now()}`,
      reserveId,
      wallet: wallet || 'cash',
      amount: safeAmount,
      date: nowIso,
      type: 'assign',
      note,
    };

    persist({
      ...data,
      reserves: updatedReserves,
      allocations: [newAllocation, ...(data.allocations || [])],
      lastSync: nowIso,
    });
  }, [data, persist]);

  // Liberar fondos de una reserva hacia el saldo disponible
  const releaseFromReserve = useCallback((reserveId, amount, note = 'Liberación a disponible', wallet = 'cash') => {
    const safeAmount = round2(amount);
    if (safeAmount <= 0) return;

    const nowIso = new Date().toISOString();
    let actualReleased = 0;

    const updatedReserves = (data.reserves || []).map((res) => {
      if (res.id === reserveId) {
        actualReleased = Math.min(safeAmount, res.currentAmount);
        return {
          ...res,
          currentAmount: round2(res.currentAmount - actualReleased),
          updatedAt: nowIso,
        };
      }
      return res;
    });

    if (actualReleased <= 0) return;

    const newAllocation = {
      id: generateUUID ? generateUUID() : `alloc_${Date.now()}`,
      reserveId,
      wallet: wallet || 'cash',
      amount: actualReleased,
      date: nowIso,
      type: 'release',
      note,
    };

    persist({
      ...data,
      reserves: updatedReserves,
      allocations: [newAllocation, ...(data.allocations || [])],
      lastSync: nowIso,
    });
  }, [data, persist]);

  // Cambiar divisa con registro de timestamp
  const setCurrency = useCallback((currencyCode) => {
    const nowIso = new Date().toISOString();
    persist({
      ...data,
      currency: currencyCode,
      currencyUpdatedAt: nowIso,
      lastSync: nowIso,
    });
  }, [data, persist]);

  // --- GESTIÓN DE CATEGORÍAS PERSONALIZADAS ---
  const addCategory = useCallback(({ name, type, icon, color }) => {
    if (!name?.trim()) return;
    const nowIso = new Date().toISOString();
    const newId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newCat = {
      id: newId,
      name: name.trim(),
      type: type || 'necesidad',
      icon: icon || '🏷️',
      color: color || '#00f0ff',
      updatedAt: nowIso,
    };
    const updated = [...(data.categories || []), newCat];
    persist({
      ...data,
      categories: updated,
      lastSync: nowIso,
    });
    return newCat;
  }, [data, persist]);

  const updateCategory = useCallback((id, fields) => {
    const nowIso = new Date().toISOString();
    const updated = (data.categories || []).map((cat) => {
      if (cat.id === id) {
        return { ...cat, ...fields, updatedAt: nowIso };
      }
      return cat;
    });
    persist({
      ...data,
      categories: updated,
      lastSync: nowIso,
    });
  }, [data, persist]);

  const deleteCategory = useCallback((id) => {
    if ((data.categories || []).length <= 1) return;
    const nowIso = new Date().toISOString();
    const updated = (data.categories || []).map((c) => {
      if (c.id === id) {
        return { ...c, deletedAt: nowIso, updatedAt: nowIso };
      }
      return c;
    });
    persist({
      ...data,
      categories: updated,
      lastSync: nowIso,
    });
  }, [data, persist]);

  // --- GESTIÓN DE ORÍGENES DE INGRESO ---
  const addIncomeSource = useCallback(({ label, icon }) => {
    if (!label?.trim()) return;
    const nowIso = new Date().toISOString();
    const newId = `src_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newSource = {
      id: newId,
      label: label.trim(),
      icon: icon || '💵',
      updatedAt: nowIso,
    };
    const currentSources = data.incomeSources || INCOME_SOURCES;
    const updated = [...currentSources, newSource];
    persist({
      ...data,
      incomeSources: updated,
      lastSync: nowIso,
    });
    return newSource;
  }, [data, persist]);

  const deleteIncomeSource = useCallback((id) => {
    const currentSources = data.incomeSources || INCOME_SOURCES;
    if (currentSources.length <= 1) return;
    const nowIso = new Date().toISOString();
    const updated = currentSources.map((s) => {
      if (s.id === id) {
        return { ...s, deletedAt: nowIso, updatedAt: nowIso };
      }
      return s;
    });
    persist({
      ...data,
      incomeSources: updated,
      lastSync: nowIso,
    });
  }, [data, persist]);

  // Navegación de meses
  const previousMonth = useCallback(() => {
    setSelectedMonthKey((prev) => getShiftedMonthKey(prev, -1));
  }, []);

  const nextMonth = useCallback(() => {
    setSelectedMonthKey((prev) => getShiftedMonthKey(prev, 1));
  }, []);

  const resetToCurrentMonth = useCallback(() => {
    setSelectedMonthKey(getIsoMonthKey(new Date()));
  }, []);

  // --- FILTRADO DE ENTIDADES ACTIVAS (Excluyendo tombstones eliminados) ---
  const activeMovements = useMemo(
    () => (data.movements || []).filter((m) => !m.deletedAt),
    [data.movements]
  );
  const activeReserves = useMemo(
    () => (data.reserves || []).filter((r) => !r.deletedAt),
    [data.reserves]
  );
  const activeAllocations = useMemo(
    () => (data.allocations || []).filter((a) => !a.deletedAt),
    [data.allocations]
  );
  const activeCategories = useMemo(
    () => (data.categories || []).filter((c) => !c.deletedAt),
    [data.categories]
  );
  const activeIncomeSources = useMemo(
    () => (data.incomeSources || INCOME_SOURCES).filter((s) => !s.deletedAt),
    [data.incomeSources]
  );

  // --- CÁLCULOS Y MÉTRICAS REACTIVAS DE PRESUPUESTO ---
  const budgetMetrics = useMemo(() => {
    const globalBudget = calculateBudgetMetrics({
      movements: activeMovements,
      reserves: activeReserves,
    });

    // Métricas del mes seleccionado
    let monthIncome = 0;
    let monthExpense = 0;
    let monthLinkedExpense = 0;

    for (const mov of activeMovements) {
      if (getIsoMonthKey(mov.date) === selectedMonthKey) {
        const amt = round2(mov.amount);
        if (isIncome(mov)) {
          monthIncome = round2(monthIncome + amt);
        } else if (isExpense(mov)) {
          monthExpense = round2(monthExpense + amt);
          if (mov.linkedReserveId) {
            monthLinkedExpense = round2(monthLinkedExpense + amt);
          }
        }
      }
    }

    const monthBalance = round2(monthIncome - monthExpense);
    const monthFlexibleSpent = round2(monthExpense - monthLinkedExpense);

    return {
      ...globalBudget,
      monthIncome,
      monthExpense,
      monthBalance,
      monthLinkedExpense,
      monthFlexibleSpent,
    };
  }, [activeMovements, activeReserves, selectedMonthKey]);

  // Próximo pago
  const upcomingPayment = useMemo(() => {
    return getUpcomingPayment(activeReserves);
  }, [activeReserves]);

  // Alertas prioritarias
  const alerts = useMemo(() => {
    return generateBudgetAlerts({
      saldoEsperado: budgetMetrics.saldoEsperado,
      totalReservado: budgetMetrics.totalReservado,
      disponibleParaGastar: budgetMetrics.disponibleParaGastar,
      reserves: activeReserves,
      movements: activeMovements,
    });
  }, [budgetMetrics, activeReserves, activeMovements]);

  // Lista visible con búsqueda y filtros por categoría, reserva y tipo
  const visibleMovements = useMemo(() => {
    let list = activeMovements;

    if (viewMode === 'month') {
      list = list.filter((mov) => getIsoMonthKey(mov.date) === selectedMonthKey);
    }

    if (filterCategory !== 'all') {
      list = list.filter((mov) => mov.categoryId === filterCategory);
    }

    if (filterReserve !== 'all') {
      list = list.filter(
        (mov) => mov.linkedReserveId === filterReserve || mov.restrictedReserveId === filterReserve
      );
    }

    if (filterType !== 'all') {
      if (filterType === 'income') list = list.filter((m) => isIncome(m));
      else if (filterType === 'expense') list = list.filter((m) => isExpense(m));
      else if (filterType === 'restricted') list = list.filter((m) => m.isRestricted);
      else if (filterType === 'sale') list = list.filter((m) => m.source === 'sale');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((mov) => {
        const desc = (mov.description || '').toLowerCase();
        const icon = (mov.icon || '').toLowerCase();
        const amt = String(mov.amount);
        return desc.includes(q) || icon.includes(q) || amt.includes(q);
      });
    }

    return list;
  }, [activeMovements, viewMode, selectedMonthKey, filterCategory, filterReserve, filterType, searchQuery]);

  return {
    movements: activeMovements,
    reserves: activeReserves,
    allocations: activeAllocations,
    categories: activeCategories,
    incomeSources: activeIncomeSources,
    currency: data.currency || 'PEN',
    selectedMonthKey,
    viewMode,
    searchQuery,
    filterCategory,
    filterReserve,
    filterType,
    metrics: budgetMetrics,
    upcomingPayment,
    alerts,
    visibleMovements,
    addMovement,
    updateMovement,
    deleteMovement,
    addReserve,
    updateReserve,
    deleteReserve,
    allocateToReserve,
    releaseFromReserve,
    addCategory,
    updateCategory,
    deleteCategory,
    addIncomeSource,
    deleteIncomeSource,
    setCurrency,
    setSelectedMonthKey,
    setViewMode,
    setSearchQuery,
    setFilterCategory,
    setFilterReserve,
    setFilterType,
    previousMonth,
    nextMonth,
    resetToCurrentMonth,
    allStoredData: data,
  };
}
