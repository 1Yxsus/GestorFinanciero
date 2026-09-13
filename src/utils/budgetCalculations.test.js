import { describe, it, expect } from 'vitest';
import {
  round2,
  calculateBudgetMetrics,
  calculateReserveMetrics,
  suggestIncomeDistribution,
  consumeExpenseFromReserve,
  getUpcomingPayment,
  generateBudgetAlerts,
  calculateWalletBreakdown,
} from './budgetCalculations';

describe('Casos de aceptación de implementation.md y Motor Financiero', () => {
  // Caso 1: Al registrar S/ 40 como ingreso libre, se propone distribución editable
  it('Caso 1: Sugiere distribución estructurada al registrar S/ 40 de ingreso libre', () => {
    const reserves = [
      {
        id: 'res_plan',
        name: 'Plan móvil mensual',
        categoryId: 'cat_plan_movil',
        targetAmount: 29,
        currentAmount: 18,
        priority: 'high',
        active: true,
        protectsBalance: true,
        nextDueDate: '2026-09-15',
      },
      {
        id: 'res_pasajes',
        name: 'Pasajes',
        categoryId: 'cat_pasajes',
        targetAmount: 50,
        currentAmount: 20,
        priority: 'high',
        active: true,
        protectsBalance: true,
        nextDueDate: '2026-09-20',
      },
    ];

    const suggestion = suggestIncomeDistribution({
      amount: 40,
      source: 'other',
      reserves,
    });

    expect(suggestion.allocations.length).toBeGreaterThan(0);
    expect(suggestion.netProfit).toBe(40);
    // El primer pago prioritario (faltan 11) debe recibir cobertura
    const planAlloc = suggestion.allocations.find((a) => a.reserveId === 'res_plan');
    expect(planAlloc).toBeDefined();
    expect(planAlloc.amount).toBe(11); // Cubre los 11 faltantes de la reserva más prioritaria
  });

  // Caso 2: Al registrar S/ 20 como apoyo para pasajes, el sistema lo asigna a Pasajes y no lo presenta como disponible
  it('Caso 2: Ingreso restringido de S/ 20 para pasajes incrementa la reserva y no queda disponible', () => {
    const pasajesReserve = {
      id: 'res_pasajes',
      name: 'Pasajes',
      categoryId: 'cat_pasajes',
      targetAmount: 60,
      currentAmount: 10,
      active: true,
      protectsBalance: true,
    };

    const initialMovements = [
      { id: 'm1', type: 'ingreso', amount: 100 },
    ];

    // Saldo inicial con la reserva previa
    const initialMetrics = calculateBudgetMetrics({
      movements: initialMovements,
      reserves: [pasajesReserve],
    });
    expect(initialMetrics.saldoEsperado).toBe(100);
    expect(initialMetrics.totalReservado).toBe(10);
    expect(initialMetrics.disponibleParaGastar).toBe(90);

    // Registramos ingreso restringido de S/ 20
    const suggestion = suggestIncomeDistribution({
      amount: 20,
      isRestricted: true,
      restrictedReserveId: pasajesReserve.id,
      reserves: [pasajesReserve],
    });

    expect(suggestion.allocations).toHaveLength(1);
    expect(suggestion.allocations[0].amount).toBe(20);

    // Actualizamos la reserva sumando la asignación
    const updatedReserve = {
      ...pasajesReserve,
      currentAmount: pasajesReserve.currentAmount + suggestion.allocations[0].amount, // 10 + 20 = 30
    };

    const updatedMovements = [
      ...initialMovements,
      { id: 'm2', type: 'ingreso', amount: 20, isRestricted: true, restrictedReserveId: 'res_pasajes' },
    ];

    const updatedMetrics = calculateBudgetMetrics({
      movements: updatedMovements,
      reserves: [updatedReserve],
    });

    // Saldo total sube a 120, total reservado sube a 30, disponible se mantiene en 90
    expect(updatedMetrics.saldoEsperado).toBe(120);
    expect(updatedMetrics.totalReservado).toBe(30);
    expect(updatedMetrics.disponibleParaGastar).toBe(90); // Los 20 restringidos NO son disponible
  });

  // Caso 3: Una reserva mensual de S/ 29 con S/ 18 asignados muestra «Faltan S/ 11»
  it('Caso 3: Reserva mensual de S/ 29 con S/ 18 asignados calcula faltante de S/ 11', () => {
    const reserve = {
      id: 'res_plan',
      name: 'Plan móvil mensual',
      targetAmount: 29.00,
      currentAmount: 18.00,
    };

    const metrics = calculateReserveMetrics(reserve);
    expect(metrics.faltante).toBe(11.00);
    expect(metrics.progreso).toBe(62); // 18 / 29 * 100 = 62.06%
  });

  // Caso 4: Pagar S/ 29 del plan reduce el saldo esperado una sola vez y deja la reserva en S/ 0
  it('Caso 4: Pagar S/ 29 del plan reduce saldo esperado una sola vez y consume reserva a S/ 0', () => {
    const reserve = {
      id: 'res_plan',
      name: 'Plan móvil mensual',
      targetAmount: 29.00,
      currentAmount: 29.00,
      frequency: 'monthly',
      nextDueDate: '2026-09-15',
      active: true,
      protectsBalance: true,
    };

    const movements = [
      { id: 'inc1', type: 'ingreso', amount: 100 },
    ];

    // Antes de pagar: saldo = 100, reservado = 29, disponible = 71
    const beforeMetrics = calculateBudgetMetrics({ movements, reserves: [reserve] });
    expect(beforeMetrics.saldoEsperado).toBe(100);
    expect(beforeMetrics.totalReservado).toBe(29);
    expect(beforeMetrics.disponibleParaGastar).toBe(71);

    // Pagar S/ 29 vinculado a la reserva
    const consumption = consumeExpenseFromReserve({
      expenseAmount: 29,
      reserve,
    });

    expect(consumption.consumedAmount).toBe(29);
    expect(consumption.newCurrentAmount).toBe(0);
    expect(consumption.unreservedDifference).toBe(0);

    // Nuevo movimiento de egreso real
    const newMovements = [
      ...movements,
      { id: 'exp1', type: 'egreso', amount: 29, linkedReserveId: 'res_plan' },
    ];

    const updatedReserve = {
      ...reserve,
      currentAmount: consumption.newCurrentAmount,
      nextDueDate: consumption.updatedNextDueDate,
    };

    // Después de pagar: saldo esperado = 71 (baja solo una vez), reservado = 0, disponible = 71
    const afterMetrics = calculateBudgetMetrics({
      movements: newMovements,
      reserves: [updatedReserve],
    });

    expect(afterMetrics.saldoEsperado).toBe(71);
    expect(afterMetrics.totalReservado).toBe(0);
    expect(afterMetrics.disponibleParaGastar).toBe(71);
  });

  // Caso 5: El disponible nunca es mayor que el saldo esperado
  it('Caso 5: El disponible nunca supera el saldo esperado', () => {
    // Si el saldo es menor que el reservado (ej: gastos imprevistos no planificados)
    const reserve = {
      id: 'res_fondo',
      targetAmount: 200,
      currentAmount: 150,
      active: true,
      protectsBalance: true,
    };

    // Saldo real de 50
    const movements = [
      { id: 'm1', type: 'ingreso', amount: 50 },
    ];

    const metrics = calculateBudgetMetrics({ movements, reserves: [reserve] });
    expect(metrics.saldoEsperado).toBe(50);
    expect(metrics.totalReservado).toBe(150);
    expect(metrics.disponibleParaGastar).toBe(0); // max(0, 50 - 150) = 0 <= 50
    expect(metrics.disponibleParaGastar).toBeLessThanOrEqual(metrics.saldoEsperado);
  });

  // Caso 6: Registrar una venta de S/ 50 con reposición de S/ 30 reserva S/ 30 para inventario y usa S/ 20 como ingreso libre
  it('Caso 6: Venta de S/ 50 con reposición de S/ 30 reserva reposición y distribuye solo la ganancia neta S/ 20', () => {
    const inventoryReserve = {
      id: 'res_inventario',
      name: 'Reposición de inventario',
      categoryId: 'cat_reposicion_inventario',
      targetAmount: 200,
      currentAmount: 50,
      active: true,
      protectsBalance: true,
    };

    const suggestion = suggestIncomeDistribution({
      amount: 50,
      source: 'sale',
      saleCost: 30,
      reserves: [inventoryReserve],
    });

    expect(suggestion.netProfit).toBe(20);
    expect(suggestion.saleCostAllocated).toBe(30);

    // Debe contener asignación para inventario de 30
    const invAlloc = suggestion.allocations.find((a) => a.reserveId === 'res_inventario');
    expect(invAlloc).toBeDefined();
    expect(invAlloc.amount).toBe(30);
  });

  // Caso 7: Si no existen reservas, el disponible es igual al saldo esperado
  it('Caso 7: Sin reservas, el disponible es exactamente igual al saldo esperado', () => {
    const movements = [
      { id: 'm1', type: 'ingreso', amount: 150 },
      { id: 'm2', type: 'egreso', amount: 35.50 },
    ];

    const metrics = calculateBudgetMetrics({ movements, reserves: [] });
    expect(metrics.saldoEsperado).toBe(114.50);
    expect(metrics.totalReservado).toBe(0);
    expect(metrics.disponibleParaGastar).toBe(114.50);
  });

  // Caso 8: Todo historial previo continúa visible y sus totales siguen siendo correctos
  it('Caso 8: Compatibilidad con movimientos antiguos sin campos v2', () => {
    const legacyMovements = [
      { id: 'leg_1', type: 'ingreso', amount: 1000, description: 'Sueldo previo' },
      { id: 'leg_2', type: 'egreso', amount: 200, description: 'Comida previa' },
    ];

    const metrics = calculateBudgetMetrics({ movements: legacyMovements, reserves: [] });
    expect(metrics.saldoEsperado).toBe(800);
    expect(metrics.totalIncome).toBe(1000);
    expect(metrics.totalExpense).toBe(200);
  });

  it('Alertas útiles: genera advertencia cuando el disponible es muy bajo frente al reservado', () => {
    const alerts = generateBudgetAlerts({
      saldoEsperado: 38,
      totalReservado: 30,
      disponibleParaGastar: 8,
      reserves: [{ id: 'r1', targetAmount: 30, currentAmount: 30, active: true }],
      movements: [],
    });

    const lowAlert = alerts.find((a) => a.id === 'alert_low_available');
    expect(lowAlert).toBeDefined();
    expect(lowAlert.message).toContain('Tu disponible es S/ 8.00; gastar más afectaría dinero reservado.');
  });

  describe('Desglose por Billetera (Efectivo, Yape/Plin, Cuenta Bancaria)', () => {
    it('Calcula correctamente el desglose de saldo total y disponible por billetera', () => {
      const movements = [
        { id: '1', type: 'ingreso', amount: 150, wallet: 'cash' },
        { id: '2', type: 'egreso', amount: 50, wallet: 'cash' }, // Saldo cash: 100
        { id: '3', type: 'ingreso', amount: 200, wallet: 'yape_plin' }, // Saldo yape: 200
        { id: '4', type: 'ingreso', amount: 300, wallet: 'bank' },
        { id: '5', type: 'egreso', amount: 100, wallet: 'bank' }, // Saldo bank: 200
      ];

      // Total Balance: 100 (cash) + 200 (yape) + 200 (bank) = 500
      // Total Reservado: 100 -> Total Disponible: 400
      const breakdown = calculateWalletBreakdown({
        movements,
        totalReservado: 100,
      });

      expect(breakdown.totalBalance).toBe(500);
      expect(breakdown.totalReservado).toBe(100);
      expect(breakdown.totalDisponible).toBe(400);

      expect(breakdown.wallets.cash.balance).toBe(100);
      expect(breakdown.wallets.yape_plin.balance).toBe(200);
      expect(breakdown.wallets.bank.balance).toBe(200);

      // Sum of available equals 400
      const sumAvailable = round2(
        breakdown.wallets.cash.available +
        breakdown.wallets.yape_plin.available +
        breakdown.wallets.bank.available
      );
      expect(sumAvailable).toBe(400);
    });

    it('Maneja movimientos heredados sin campo wallet asignándolos a efectivo por defecto', () => {
      const movements = [
        { id: 'legacy_1', type: 'ingreso', amount: 80 }, // wallet undefined -> cash
      ];

      const breakdown = calculateWalletBreakdown({
        movements,
        totalReservado: 0,
      });

      expect(breakdown.wallets.cash.balance).toBe(80);
      expect(breakdown.wallets.cash.available).toBe(80);
      expect(breakdown.totalBalance).toBe(80);
      expect(breakdown.totalDisponible).toBe(80);
    });

    it('Caso crítico del usuario: al ingresar dinero en efectivo y destinarlo a reserva, solo se afecta el disponible de efectivo y Yape queda intacto', () => {
      // 1. Usuario tiene S/ 50 en Yape
      // 2. Usuario registra un ingreso de S/ 50 en Efectivo destinado a una reserva
      const movements = [
        { id: 'm_yape', type: 'ingreso', amount: 50, wallet: 'yape_plin' },
        {
          id: 'm_cash',
          type: 'ingreso',
          amount: 50,
          wallet: 'cash',
          isRestricted: true,
          restrictedReserveId: 'res_pasajes',
        },
      ];

      const allocations = [
        {
          id: 'alloc_1',
          reserveId: 'res_pasajes',
          transactionId: 'm_cash',
          wallet: 'cash',
          amount: 50,
          type: 'assign',
        },
      ];

      // Saldo total = 100 (50 en Yape, 50 en Efectivo).
      // Reservado = 50. Disponible total = 50.
      const breakdown = calculateWalletBreakdown({
        movements,
        allocations,
        totalReservado: 50,
      });

      // Efectivo tenía 50 y se reservaron 50 -> Disponible en Efectivo debe ser 0!
      expect(breakdown.wallets.cash.balance).toBe(50);
      expect(breakdown.wallets.cash.reserved).toBe(50);
      expect(breakdown.wallets.cash.available).toBe(0);

      // Yape tenía 50 y NADA se reservó de Yape -> Disponible en Yape debe ser 50 intactos!
      expect(breakdown.wallets.yape_plin.balance).toBe(50);
      expect(breakdown.wallets.yape_plin.reserved).toBe(0);
      expect(breakdown.wallets.yape_plin.available).toBe(50);

      expect(breakdown.totalBalance).toBe(100);
      expect(breakdown.totalReservado).toBe(50);
      expect(breakdown.totalDisponible).toBe(50);
    });
  });

  describe('Métricas intuitivas para fondos de gasto continuo (Pasajes, alimentación, plan)', () => {
    it('Caso usuario: Pasajes con meta 48 y asignado 46 expresa S/ 46 disponible, S/ 2 gastado y 96% disponible', () => {
      const pasajesReserve = {
        id: 'res_pasajes_user',
        name: 'Pasajes',
        categoryId: 'cat_pasajes',
        targetAmount: 48.00,
        currentAmount: 46.00,
        reserveType: 'spending',
      };

      const metrics = calculateReserveMetrics(pasajesReserve, new Date());

      expect(metrics.isSpendingFund).toBe(true);
      expect(metrics.current).toBe(46.00); // Te queda S/ 46.00
      expect(metrics.target).toBe(48.00);  // Presupuesto S/ 48.00
      expect(metrics.spent).toBe(2.00);    // Gastado S/ 2.00
      expect(metrics.spentPercentage).toBe(4); // 4% usado
      expect(metrics.progreso).toBe(96);   // 96% disponible
    });

    it('Calcula consumos desde allocations y movements vinculados', () => {
      const reserve = {
        id: 'res_movil',
        name: 'Plan móvil',
        categoryId: 'cat_plan_movil',
        targetAmount: 30.00,
        currentAmount: 20.00,
      };

      const allocations = [
        { reserveId: 'res_movil', amount: 10.00, type: 'consume' },
      ];

      const metrics = calculateReserveMetrics(reserve, new Date(), { allocations });

      expect(metrics.isSpendingFund).toBe(true);
      expect(metrics.spent).toBe(10.00);
      expect(metrics.current).toBe(20.00);
      expect(metrics.progreso).toBe(67);
    });

    it('Respeta meta de ahorro tradicional cuando se especifica reserveType: savings', () => {
      const laptopReserve = {
        id: 'res_laptop',
        name: 'Laptop nueva',
        categoryId: 'cat_ahorro_meta',
        targetAmount: 2000.00,
        currentAmount: 500.00,
        reserveType: 'savings',
      };

      const metrics = calculateReserveMetrics(laptopReserve, new Date());

      expect(metrics.isSpendingFund).toBe(false);
      expect(metrics.faltante).toBe(1500.00);
      expect(metrics.progreso).toBe(25);
    });
  });
});
