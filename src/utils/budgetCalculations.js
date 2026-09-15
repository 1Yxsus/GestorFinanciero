// Motor de cálculos y lógica financiera para presupuesto con ingresos variables

/**
 * Redondeo seguro a dos decimales con centavos enteros para evitar errores de coma flotante
 */
export function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

/**
 * Determina si una transacción es un ingreso
 */
export function isIncome(movement) {
  const t = movement.type;
  return t === 'ingreso' || t === 'income';
}

/**
 * Determina si una transacción es un egreso
 */
export function isExpense(movement) {
  const t = movement.type;
  return t === 'egreso' || t === 'expense';
}

/**
 * Calcula las métricas globales del presupuesto
 * 1. Saldo esperado (ingresos - egresos)
 * 2. Total reservado (suma de reservas activas con protectsBalance = true)
 * 3. Disponible para gastar hoy (max(0, saldoEsperado - totalReservado))
 */
export function calculateBudgetMetrics({ movements = [], reserves = [], initialBalance = 0 }) {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const mov of movements) {
    const amt = round2(mov.amount);
    if (isIncome(mov)) {
      totalIncome = round2(totalIncome + amt);
    } else if (isExpense(mov)) {
      totalExpense = round2(totalExpense + amt);
    }
  }

  const saldoEsperado = round2(initialBalance + totalIncome - totalExpense);

  let totalReservado = 0;
  for (const res of reserves) {
    if (res.active !== false && res.protectsBalance !== false) {
      totalReservado = round2(totalReservado + (Number(res.currentAmount) || 0));
    }
  }

  const disponibleParaGastar = Math.max(0, round2(saldoEsperado - totalReservado));

  return {
    saldoEsperado,
    totalReservado,
    disponibleParaGastar,
    totalIncome,
    totalExpense,
  };
}

/**
 * Calcula métricas individuales para una reserva, identificando fondos de gasto periódico
 * para que cuando el usuario gaste poco a poco se exprese como dinero restante y consumido.
 */
export function calculateReserveMetrics(reserve, now = new Date(), options = {}) {
  const target = round2(reserve.targetAmount || 0);
  const current = round2(reserve.currentAmount || 0);
  const faltante = Math.max(0, round2(target - current));
  const progreso = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;

  const { movements = [], allocations = [] } = options;
  let spentAmount = 0;

  if (Array.isArray(allocations) && allocations.length > 0) {
    spentAmount = allocations
      .filter((a) => a.reserveId === reserve.id && a.type === 'consume')
      .reduce((sum, a) => sum + (round2(a.amount) || 0), 0);
  }
  if (spentAmount === 0 && Array.isArray(movements) && movements.length > 0) {
    spentAmount = movements
      .filter((m) => m.linkedReserveId === reserve.id && (m.type === 'egreso' || m.type === 'expense'))
      .reduce((sum, m) => sum + (round2(m.amount) || 0), 0);
  }
  spentAmount = round2(spentAmount);

  // Determinar si es un sobre de gasto corriente (consumo progresivo) vs meta de ahorro
  const isSpendingFund =
    reserve.reserveType === 'spending' ||
    spentAmount > 0 ||
    (reserve.reserveType !== 'savings' &&
      ['cat_pasajes', 'cat_plan_movil', 'cat_alimentacion', 'cat_cuidado_personal', 'cat_estudios', 'cat_gustos_ocio'].includes(reserve.categoryId));

  // Si es fondo de gasto y no hay registros explícitos de consumos pero current < target,
  // el monto consumido es la diferencia entre el presupuesto asignado y lo que queda disponible
  if (isSpendingFund && spentAmount === 0 && current < target) {
    spentAmount = Math.max(0, round2(target - current));
  }

  const spentPercentage = target > 0 ? Math.min(100, Math.round((spentAmount / target) * 100)) : 0;

  let reservaRecomendadaHoy = null;
  if (reserve.intervalDays && reserve.intervalDays > 0 && reserve.nextDueDate) {
    const dueDate = new Date(reserve.nextDueDate);
    const msDiff = dueDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(0, reserve.intervalDays - daysRemaining);

    reservaRecomendadaHoy = round2(
      Math.min(target, (target / reserve.intervalDays) * daysElapsed)
    );
  }

  return {
    target,
    current,
    faltante,
    progreso,
    spent: spentAmount,
    spentPercentage,
    isSpendingFund,
    reservaRecomendadaHoy,
  };
}

/**
 * Encuentra el próximo pago programado entre las reservas activas
 */
export function getUpcomingPayment(reserves = [], now = new Date()) {
  const activeWithDue = reserves
    .filter((r) => r.active !== false && r.nextDueDate)
    .map((r) => {
      const metrics = calculateReserveMetrics(r, now);
      return {
        ...r,
        faltante: metrics.faltante,
        dueDateObj: new Date(r.nextDueDate),
      };
    })
    .sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime());

  if (activeWithDue.length === 0) return null;

  // Priorizar reservas que tengan saldo faltante
  const pendingPayment = activeWithDue.find((r) => r.faltante > 0) || activeWithDue[0];

  const daysDiff = Math.ceil((pendingPayment.dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: pendingPayment.id,
    name: pendingPayment.name,
    date: pendingPayment.nextDueDate,
    targetAmount: pendingPayment.targetAmount,
    currentAmount: pendingPayment.currentAmount,
    missingAmount: pendingPayment.faltante,
    daysDiff,
    priority: pendingPayment.priority,
  };
}

/**
 * Calcula la fecha del siguiente ciclo para una reserva recurrente
 */
export function computeNextDueDate(currentDueDateStr, frequency, intervalDays = 30) {
  const baseDate = currentDueDateStr ? new Date(currentDueDateStr) : new Date();
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'custom_days':
      nextDate.setDate(nextDate.getDate() + (intervalDays || 30));
      break;
    case 'one_time':
    default:
      return null;
  }

  return nextDate.toISOString().slice(0, 10);
}

/**
 * Lógica para sugerir distribución de un ingreso entrante
 * Cumple con los requisitos de implementation.md:
 * - Ingresos restringidos
 * - Tratamiento de ventas (reposición + ganancia)
 * - Distribución de ganancia o dinero libre por prioridades y meta de emergencia (70/20/10 o 50/30/20)
 */
export function suggestIncomeDistribution({
  amount = 0,
  source = 'other',
  saleCost = 0,
  isRestricted = false,
  restrictedReserveId = null,
  reserves = [],
  categories = [],
}) {
  const safeAmount = round2(amount);
  if (safeAmount <= 0) {
    return {
      allocations: [],
      netProfit: 0,
      saleCostAllocated: 0,
      flexibleAmount: 0,
      message: '',
    };
  }

  const proposedAllocations = [];

  // 1. Caso: Ingreso restringido
  if (isRestricted && restrictedReserveId) {
    const targetReserve = reserves.find((r) => r.id === restrictedReserveId);
    if (targetReserve) {
      const faltante = Math.max(0, round2(targetReserve.targetAmount - targetReserve.currentAmount));
      // Asignar preferentemente hasta completar objetivo si faltante > 0, o el total del monto si se desea todo
      const amountToAssign = faltante > 0 ? Math.min(safeAmount, faltante) : safeAmount;
      const surplus = round2(safeAmount - amountToAssign);

      proposedAllocations.push({
        reserveId: targetReserve.id,
        reserveName: targetReserve.name,
        amount: amountToAssign,
        reason: `Destino restringido (${targetReserve.name})`,
      });

      return {
        allocations: proposedAllocations,
        netProfit: safeAmount,
        saleCostAllocated: 0,
        flexibleAmount: surplus,
        isRestricted: true,
        message: surplus > 0
          ? `Se completó la meta de ${targetReserve.name}. Quedan S/ ${surplus.toFixed(2)} como dinero libre.`
          : `Asignado por completo a ${targetReserve.name}.`,
      };
    }
  }

  // 2. Caso: Venta con costo de reposición
  let safeSaleCost = 0;
  let gananciaNeta = safeAmount;

  if (source === 'sale' && Number(saleCost) > 0) {
    safeSaleCost = Math.min(safeAmount, round2(saleCost));
    gananciaNeta = Math.max(0, round2(safeAmount - safeSaleCost));

    // Buscar o identificar reserva de reposición de inventario
    const inventoryReserve = reserves.find(
      (r) => r.categoryId === 'cat_reposicion_inventario' || /inventario|reposici[oó]n/i.test(r.name)
    );

    if (inventoryReserve) {
      proposedAllocations.push({
        reserveId: inventoryReserve.id,
        reserveName: inventoryReserve.name,
        amount: safeSaleCost,
        reason: 'Costo de reposición de inventario',
      });
    } else {
      proposedAllocations.push({
        reserveId: 'temp_inventario',
        reserveName: 'Reposición de inventario',
        amount: safeSaleCost,
        reason: 'Costo de reposición de inventario',
      });
    }
  }

  // 3. Distribuir ingreso libre o ganancia neta
  let remainingToDistribute = gananciaNeta;

  if (remainingToDistribute <= 0) {
    return {
      allocations: proposedAllocations,
      netProfit: gananciaNeta,
      saleCostAllocated: safeSaleCost,
      flexibleAmount: 0,
      message: 'Todo el ingreso corresponde al costo de reposición.',
    };
  }

  // Identificar fondo de emergencia y su progreso
  const emergencyReserve = reserves.find(
    (r) => r.categoryId === 'cat_fondo_emergencia' || /emergencia/i.test(r.name)
  );
  const isEmergencyFundCompleted = emergencyReserve
    ? round2(emergencyReserve.currentAmount) >= round2(emergencyReserve.targetAmount) && emergencyReserve.targetAmount > 0
    : false;

  // Porcentajes de reparto de ganancia libre:
  // Si no ha completado emergencia: 70% necesidades/próximas, 20% ahorro/emergencia, 10% flexible
  // Si ya completó emergencia: 50% necesidades/próximas, 30% ahorro/metas, 20% flexible
  const pctNeeds = isEmergencyFundCompleted ? 0.50 : 0.70;
  const pctSavings = isEmergencyFundCompleted ? 0.30 : 0.20;
  const pctFlexible = isEmergencyFundCompleted ? 0.20 : 0.10;

  // Ordenar reservas pendientes por prioridad y vencimiento
  const priorityWeight = { high: 1, medium: 2, low: 3 };
  const pendingReserves = reserves
    .filter((r) => r.active !== false && r.categoryId !== 'cat_reposicion_inventario')
    .map((r) => {
      const faltante = Math.max(0, round2(r.targetAmount - r.currentAmount));
      return { ...r, faltante };
    })
    .filter((r) => r.faltante > 0)
    .sort((a, b) => {
      const pDiff = (priorityWeight[a.priority] || 2) - (priorityWeight[b.priority] || 2);
      if (pDiff !== 0) return pDiff;
      if (a.nextDueDate && b.nextDueDate) {
        return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
      }
      return a.nextDueDate ? -1 : 1;
    });

  // Heurística para montos pequeños (< S/ 50): cubrir directamente las reservas prioritarias más urgentes
  if (remainingToDistribute <= 50) {
    for (const res of pendingReserves) {
      if (remainingToDistribute <= 0) break;
      const assignAmt = Math.min(remainingToDistribute, res.faltante);
      if (assignAmt > 0) {
        proposedAllocations.push({
          reserveId: res.id,
          reserveName: res.name,
          amount: round2(assignAmt),
          reason: `Prioridad ${res.priority} (faltan S/ ${res.faltante.toFixed(2)})`,
        });
        remainingToDistribute = round2(remainingToDistribute - assignAmt);
      }
    }
  } else {
    // Reparto por proporciones
    let targetNeedsAmount = round2(gananciaNeta * pctNeeds);
    let targetSavingsAmount = round2(gananciaNeta * pctSavings);

    // Separar reservas por tipo
    const needsReserves = pendingReserves.filter(
      (r) => r.priority === 'high' || r.categoryId === 'cat_pasajes' || r.categoryId === 'cat_plan_movil' || r.categoryId === 'cat_salud'
    );
    const savingsReserves = pendingReserves.filter(
      (r) => r.categoryId === 'cat_fondo_emergencia' || r.categoryId === 'cat_ahorro_meta' || r.priority === 'medium'
    );

    // Asignar cuota de necesidades
    for (const res of needsReserves) {
      if (targetNeedsAmount <= 0) break;
      const assignAmt = Math.min(targetNeedsAmount, res.faltante);
      if (assignAmt > 0) {
        proposedAllocations.push({
          reserveId: res.id,
          reserveName: res.name,
          amount: round2(assignAmt),
          reason: `Necesidades y próximos pagos (${Math.round(pctNeeds * 100)}%)`,
        });
        targetNeedsAmount = round2(targetNeedsAmount - assignAmt);
        remainingToDistribute = round2(remainingToDistribute - assignAmt);
      }
    }

    // Asignar cuota de ahorro / metas
    for (const res of savingsReserves) {
      if (targetSavingsAmount <= 0) break;
      const assignAmt = Math.min(targetSavingsAmount, res.faltante);
      if (assignAmt > 0) {
        proposedAllocations.push({
          reserveId: res.id,
          reserveName: res.name,
          amount: round2(assignAmt),
          reason: `Ahorro y metas (${Math.round(pctSavings * 100)}%)`,
        });
        targetSavingsAmount = round2(targetSavingsAmount - assignAmt);
        remainingToDistribute = round2(remainingToDistribute - assignAmt);
      }
    }
  }

  const flexibleAmount = Math.max(0, remainingToDistribute);

  return {
    allocations: proposedAllocations,
    netProfit: gananciaNeta,
    saleCostAllocated: safeSaleCost,
    flexibleAmount,
    message: isEmergencyFundCompleted
      ? `Fondo de emergencia al 100%. Reparto equilibrado sugerido: 50% necesidades / 30% ahorro / 20% flexible.`
      : `Fortaleciendo reservas indispensables y fondo de emergencia (70/20/10).`,
  };
}

/**
 * Lógica al consumir un egreso desde una reserva
 */
export function consumeExpenseFromReserve({
  expenseAmount = 0,
  reserve,
}) {
  const safeExpense = round2(expenseAmount);
  const current = round2(reserve.currentAmount || 0);

  const consumedAmount = Math.min(safeExpense, current);
  const unreservedDifference = Math.max(0, round2(safeExpense - current));
  const newCurrentAmount = Math.max(0, round2(current - consumedAmount));

  // Si se consumió toda la reserva o se cubrió su cuota y es recurrente, calcular siguiente fecha
  let updatedNextDueDate = reserve.nextDueDate;
  if (reserve.frequency && reserve.frequency !== 'one_time') {
    // Si el gasto consumió todo o alcanzó el targetAmount, avanzar ciclo
    if (newCurrentAmount === 0 || safeExpense >= reserve.targetAmount) {
      updatedNextDueDate = computeNextDueDate(reserve.nextDueDate, reserve.frequency, reserve.intervalDays);
    }
  }

  return {
    consumedAmount,
    unreservedDifference,
    newCurrentAmount,
    updatedNextDueDate,
    hasOverspentWarning: unreservedDifference > 0,
    warningMessage: unreservedDifference > 0
      ? `Este gasto utilizó S/ ${unreservedDifference.toFixed(2)} que no estaba reservado.`
      : null,
  };
}

/**
 * Genera alertas útiles y prioritarias para el usuario
 */
export function generateBudgetAlerts({
  saldoEsperado = 0,
  totalReservado = 0,
  disponibleParaGastar = 0,
  reserves = [],
  movements = [],
  now = new Date(),
}) {
  const alerts = [];

  // 1. Alerta de saldo disponible bajo en relación a reservas
  if (totalReservado > 0 && disponibleParaGastar <= 15) {
    alerts.push({
      id: 'alert_low_available',
      type: 'warning',
      title: 'Disponible muy ajustado',
      message: `Tu disponible es S/ ${disponibleParaGastar.toFixed(2)}; gastar más afectaría dinero reservado.`,
      icon: '⚠️',
    });
  }

  // 2. Alerta de vencimientos en 3 días o menos con saldo faltante
  for (const res of reserves) {
    if (res.active !== false && res.nextDueDate) {
      const dueDate = new Date(res.nextDueDate);
      const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const faltante = Math.max(0, round2(res.targetAmount - res.currentAmount));

      if (daysDiff >= 0 && daysDiff <= 3 && faltante > 0) {
        alerts.push({
          id: `alert_due_${res.id}`,
          type: 'danger',
          title: 'Próximo vencimiento',
          message: `${res.name} vence en ${daysDiff === 0 ? 'hoy' : `${daysDiff} días`} y faltan S/ ${faltante.toFixed(2)} por reservar.`,
          icon: '⏰',
          reserveId: res.id,
        });
      }
    }
  }

  // 3. Alerta de reserva de Pasajes baja
  const pasajesReserve = reserves.find(
    (r) => r.categoryId === 'cat_pasajes' || /pasaje/i.test(r.name)
  );
  if (pasajesReserve && pasajesReserve.active !== false) {
    const faltante = Math.max(0, round2(pasajesReserve.targetAmount - pasajesReserve.currentAmount));
    if (pasajesReserve.currentAmount <= 5 && faltante > 0) {
      alerts.push({
        id: 'alert_low_transport',
        type: 'info',
        title: 'Pasajes',
        message: 'Pasajes tiene saldo bajo para los próximos días.',
        icon: '🚌',
        reserveId: pasajesReserve.id,
      });
    }
  }

  // 4. Alerta de venta sin costo de reposición
  const recentSaleWithoutCost = movements.find(
    (m) => isIncome(m) && m.source === 'sale' && (m.saleCost === undefined || m.saleCost === null)
  );
  if (recentSaleWithoutCost) {
    alerts.push({
      id: 'alert_sale_missing_cost',
      type: 'warning',
      title: 'Venta registrada',
      message: 'Registraste una venta: falta indicar el costo de reposición.',
      icon: '📦',
      movementId: recentSaleWithoutCost.id,
    });
  }

  // 5. Alerta de fondo de emergencia al 100%
  const emergencyReserve = reserves.find(
    (r) => r.categoryId === 'cat_fondo_emergencia' || /emergencia/i.test(r.name)
  );
  if (
    emergencyReserve &&
    emergencyReserve.targetAmount > 0 &&
    round2(emergencyReserve.currentAmount) >= round2(emergencyReserve.targetAmount)
  ) {
    alerts.push({
      id: 'alert_emergency_complete',
      type: 'success',
      title: 'Meta de seguridad cumplida',
      message: 'Tu fondo de emergencia llegó al 100% de su primera meta.',
      icon: '🎉',
      reserveId: emergencyReserve.id,
    });
  }

  return alerts;
}

/**
 * Obtiene los totales de dinero apartado por billetera para una reserva específica.
 * Garantiza consistencia estricta por orden cronológico, consumo cruzado si una billetera
 * queda sin fondos, y reconciliación sin repartos espurios entre billeteras no seleccionadas.
 */
export function getReserveWalletTotals(reserve, allocations = []) {
  if (!reserve) return { cash: 0, yape_plin: 0, bank: 0 };
  const totals = { cash: 0, yape_plin: 0, bank: 0 };

  // 1. Ordenar cronológicamente ascendente (del más antiguo al más reciente)
  const reserveAllocs = (allocations || [])
    .filter((a) => a && a.reserveId === reserve.id && !a.deletedAt)
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeA - timeB;
    });

  // 2. Procesar asignaciones, consumos y liberaciones
  for (const a of reserveAllocs) {
    const amt = round2(a.amount);
    if (amt <= 0) continue;
    const w = a.wallet && totals[a.wallet] !== undefined ? a.wallet : 'cash';

    if (a.type === 'assign') {
      totals[w] = round2(totals[w] + amt);
    } else if (a.type === 'consume' || a.type === 'release') {
      let toDeduct = amt;
      // Primero descontar de la billetera indicada si tiene saldo
      if (totals[w] > 0) {
        const deduct = Math.min(totals[w], toDeduct);
        totals[w] = round2(totals[w] - deduct);
        toDeduct = round2(toDeduct - deduct);
      }
      // Si la billetera indicada no tenía suficiente saldo acumulado (ej. egreso registrado
      // con otro medio de pago o desfase en versiones previas), descontar del saldo real
      // disponible en las demás billeteras de esta reserva
      if (toDeduct > 0) {
        for (const otherW of ['cash', 'yape_plin', 'bank']) {
          if (toDeduct <= 0) break;
          if (totals[otherW] > 0) {
            const deduct = Math.min(totals[otherW], toDeduct);
            totals[otherW] = round2(totals[otherW] - deduct);
            toDeduct = round2(toDeduct - deduct);
          }
        }
      }
    }
  }

  const current = Math.max(0, round2(reserve.currentAmount || 0));
  if (current <= 0) {
    return { cash: 0, yape_plin: 0, bank: 0 };
  }

  const sum = round2(totals.cash + totals.yape_plin + totals.bank);
  if (sum === 0) {
    const fallback = reserve.wallet && totals[reserve.wallet] !== undefined ? reserve.wallet : 'cash';
    totals[fallback] = current;
    return totals;
  }

  // 3. Reconciliación con currentAmount si hubo desajuste externo sin asignaciones
  if (current > sum) {
    const diff = round2(current - sum);
    // Si la reserva tiene una billetera fijada explícita o solo una billetera activa,
    // asignarle el remanente a esa billetera sin contaminar las otras
    const activeWallets = ['cash', 'yape_plin', 'bank'].filter((k) => totals[k] > 0);
    const targetW =
      reserve.wallet && totals[reserve.wallet] !== undefined
        ? reserve.wallet
        : activeWallets.length === 1
        ? activeWallets[0]
        : 'cash';
    totals[targetW] = round2(totals[targetW] + diff);
  } else if (current < sum) {
    // Si el monto actual disminuyó y solo 1 billetera tenía fondos, se ajusta directamente esa
    const activeWallets = ['cash', 'yape_plin', 'bank'].filter((k) => totals[k] > 0);
    if (activeWallets.length === 1) {
      totals[activeWallets[0]] = current;
    } else {
      const scale = current / sum;
      totals.cash = round2(totals.cash * scale);
      totals.yape_plin = round2(totals.yape_plin * scale);
      totals.bank = Math.max(0, round2(current - totals.cash - totals.yape_plin));
    }
  }

  return totals;
}

/**
 * Calcula el desglose de dinero por billetera / medio de pago:
 * Efectivo ('cash'), Yape / Plin ('yape_plin'), Cuenta Bancaria ('bank').
 * Asigna con precisión las reservas a la billetera de origen (efectivo, yape o banco)
 * para que no afecte a las otras billeteras en la disponibilidad libre.
 */
export function calculateWalletBreakdown({
  movements = [],
  allocations = [],
  reserves = [],
  totalReservado = 0,
  initialBalance = 0,
}) {
  const wallets = {
    cash: { id: 'cash', label: 'Efectivo', icon: '💵', income: 0, expense: 0, balance: 0, reserved: 0, available: 0, percentage: 0 },
    yape_plin: { id: 'yape_plin', label: 'Yape / Plin', icon: '📱', income: 0, expense: 0, balance: 0, reserved: 0, available: 0, percentage: 0 },
    bank: { id: 'bank', label: 'Cuenta Bancaria', icon: '💳', income: 0, expense: 0, balance: 0, reserved: 0, available: 0, percentage: 0 },
  };

  const movMap = new Map();
  for (const mov of movements) {
    if (mov.id) movMap.set(mov.id, mov);
    const rawWallet = mov.wallet || 'cash';
    const walletKey = wallets[rawWallet] ? rawWallet : 'cash';
    const amt = round2(mov.amount);

    if (isIncome(mov)) {
      wallets[walletKey].income = round2(wallets[walletKey].income + amt);
    } else if (isExpense(mov)) {
      wallets[walletKey].expense = round2(wallets[walletKey].expense + amt);
    }
  }

  if (initialBalance > 0) {
    wallets.cash.income = round2(wallets.cash.income + initialBalance);
  }

  let totalBalance = 0;
  for (const key of Object.keys(wallets)) {
    const w = wallets[key];
    w.balance = round2(w.income - w.expense);
    totalBalance = round2(totalBalance + w.balance);
  }

  const positiveTotal = Object.values(wallets).reduce((acc, w) => acc + Math.max(0, w.balance), 0);
  for (const key of Object.keys(wallets)) {
    const w = wallets[key];
    w.percentage = positiveTotal > 0 ? Math.round((Math.max(0, w.balance) / positiveTotal) * 100) : 0;
  }

  const safeReservado = Math.max(0, round2(totalReservado));
  const totalDisponible = Math.max(0, round2(totalBalance - safeReservado));

  // 1. Rastrear reservas asignadas por cada billetera de manera aislada y consistente
  const activeReserves = (reserves || []).filter((r) => r && r.active !== false && !r.deletedAt);

  if (activeReserves.length > 0) {
    for (const res of activeReserves) {
      const resCurrent = Math.max(0, round2(res.currentAmount || 0));
      if (resCurrent <= 0) continue;

      const resTotals = getReserveWalletTotals(res, allocations);
      wallets.cash.reserved = round2(wallets.cash.reserved + resTotals.cash);
      wallets.yape_plin.reserved = round2(wallets.yape_plin.reserved + resTotals.yape_plin);
      wallets.bank.reserved = round2(wallets.bank.reserved + resTotals.bank);
    }
  } else {
    // Modo compatibilidad sin lista de reservas
    const processedTransactionIds = new Set();
    if (Array.isArray(allocations) && allocations.length > 0) {
      for (const alloc of allocations) {
        const amt = round2(alloc.amount);
        if (amt <= 0) continue;

        let wKey = alloc.wallet;
        if (!wKey && alloc.transactionId) {
          const linked = movMap.get(alloc.transactionId);
          if (linked) wKey = linked.wallet;
        }
        if (!wallets[wKey]) wKey = 'cash';

        if (alloc.transactionId) processedTransactionIds.add(alloc.transactionId);

        if (alloc.type === 'assign') {
          wallets[wKey].reserved = round2(wallets[wKey].reserved + amt);
        } else if (alloc.type === 'consume' || alloc.type === 'release') {
          wallets[wKey].reserved = Math.max(0, round2(wallets[wKey].reserved - amt));
        }
      }
    }

    for (const mov of movements) {
      if (processedTransactionIds.has(mov.id)) continue;
      const wKey = wallets[mov.wallet] ? mov.wallet : 'cash';
      const amt = round2(mov.amount);

      if (isIncome(mov)) {
        if (Array.isArray(mov.allocationsToApply) && mov.allocationsToApply.length > 0) {
          const assignedTotal = mov.allocationsToApply.reduce((s, a) => s + (round2(a.amount) || 0), 0);
          wallets[wKey].reserved = round2(wallets[wKey].reserved + assignedTotal);
        } else if (mov.isRestricted && mov.restrictedReserveId) {
          wallets[wKey].reserved = round2(wallets[wKey].reserved + amt);
        }
      } else if (isExpense(mov) && mov.linkedReserveId) {
        wallets[wKey].reserved = Math.max(0, round2(wallets[wKey].reserved - amt));
      }
    }

    let trackedReservedTotal = Object.values(wallets).reduce((s, w) => s + w.reserved, 0);
    trackedReservedTotal = round2(trackedReservedTotal);

    if (trackedReservedTotal > safeReservado && trackedReservedTotal > 0) {
      const ratio = safeReservado / trackedReservedTotal;
      for (const key of Object.keys(wallets)) {
        wallets[key].reserved = round2(wallets[key].reserved * ratio);
      }
    } else if (safeReservado > trackedReservedTotal) {
      let unassigned = round2(safeReservado - trackedReservedTotal);
      wallets.cash.reserved = round2(wallets.cash.reserved + unassigned);
    }
  }

  // 4. Calcular el disponible exacto por cada billetera
  for (const key of Object.keys(wallets)) {
    const w = wallets[key];
    w.available = Math.max(0, round2(w.balance - w.reserved));
  }

  // 5. Ajustar centavos para que coincida exactamente con totalDisponible
  let sumAvailable = Object.values(wallets).reduce((s, w) => s + w.available, 0);
  sumAvailable = round2(sumAvailable);
  const diff = round2(totalDisponible - sumAvailable);
  if (diff !== 0) {
    const bestKey = Object.keys(wallets).sort((a, b) => wallets[b].available - wallets[a].available)[0];
    wallets[bestKey].available = Math.max(0, round2(wallets[bestKey].available + diff));
  }

  return {
    wallets,
    totalBalance,
    totalReservado: safeReservado,
    totalDisponible,
  };
}

