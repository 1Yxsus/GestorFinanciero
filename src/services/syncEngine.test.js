import { describe, it, expect } from 'vitest';
import { storageService } from './storageService';

describe('AURUM Conflict-Free Synchronization Engine (CRDT / LWW / Tombstones)', () => {
  const t0 = '2026-09-01T10:00:00.000Z';
  const t1 = '2026-09-01T11:00:00.000Z';
  const t2 = '2026-09-01T12:00:00.000Z';
  const t3 = '2026-09-01T13:00:00.000Z';

  // CU-1: Nuevos registros en Dispositivo A se transfieren a Dispositivo B sin duplicar
  it('CU-1: Transfiere nuevos registros de A hacia B sin duplicación por UUID', () => {
    const deviceA = {
      movements: [
        { id: 'm1', description: 'Gasto 1', amount: 20, date: t1, updatedAt: t1 },
        { id: 'm2', description: 'Gasto 2', amount: 50, date: t2, updatedAt: t2 },
      ],
    };

    const deviceB = {
      movements: [
        { id: 'm1', description: 'Gasto 1', amount: 20, date: t1, updatedAt: t1 },
      ],
    };

    const { mergedData, stats } = storageService.mergeAllData(deviceB, deviceA);

    expect(mergedData.movements).toHaveLength(2);
    expect(stats.movementsAdded).toBe(1);
    expect(mergedData.movements.map((m) => m.id)).toContain('m2');
  });

  // CU-2: Nuevos registros simultáneos en ambos dispositivos
  it('CU-2: Une de forma determinista registros creados simultáneamente en ambos dispositivos', () => {
    const deviceA = {
      movements: [{ id: 'm_a', description: 'Creado en A', amount: 10, date: t1, updatedAt: t1 }],
      reserves: [{ id: 'r_a', name: 'Reserva A', targetAmount: 100, currentAmount: 0, updatedAt: t1 }],
    };

    const deviceB = {
      movements: [{ id: 'm_b', description: 'Creado en B', amount: 30, date: t2, updatedAt: t2 }],
      reserves: [{ id: 'r_b', name: 'Reserva B', targetAmount: 200, currentAmount: 50, updatedAt: t2 }],
    };

    const { mergedData, stats } = storageService.mergeAllData(deviceA, deviceB);

    expect(mergedData.movements).toHaveLength(2);
    expect(mergedData.reserves).toHaveLength(2);
    expect(stats.movementsAdded).toBe(1);
    expect(stats.reservesAdded).toBe(1);
  });

  // CU-3: Edición en un dispositivo gana por Last-Write-Wins (LWW)
  it('CU-3: Prevalece la versión más reciente en caso de edición de un movimiento', () => {
    const deviceA = {
      movements: [
        { id: 'm1', description: 'Cena con amigos (editada en A)', amount: 80, date: t1, updatedAt: t2 },
      ],
    };

    const deviceB = {
      movements: [
        { id: 'm1', description: 'Cena', amount: 40, date: t1, updatedAt: t1 },
      ],
    };

    const { mergedData, stats } = storageService.mergeAllData(deviceB, deviceA);

    expect(mergedData.movements).toHaveLength(1);
    expect(mergedData.movements[0].description).toBe('Cena con amigos (editada en A)');
    expect(mergedData.movements[0].amount).toBe(80);
    expect(stats.movementsUpdated).toBe(1);
  });

  // CU-4: Edición concurrente con timestamps distintos
  it('CU-4: Resuelve conflicto de edición concurrente otorgando la victoria al timestamp más reciente', () => {
    const deviceA = {
      movements: [
        { id: 'm1', description: 'Editado a las 12:00', amount: 100, date: t0, updatedAt: t2 },
      ],
    };

    const deviceB = {
      movements: [
        { id: 'm1', description: 'Editado a las 13:00 (gana este)', amount: 150, date: t0, updatedAt: t3 },
      ],
    };

    const { mergedData } = storageService.mergeAllData(deviceA, deviceB);

    expect(mergedData.movements[0].description).toBe('Editado a las 13:00 (gana este)');
    expect(mergedData.movements[0].amount).toBe(150);
  });

  // CU-5: Eliminación en un dispositivo no resucita en el otro (Tombstones)
  it('CU-5: Propaga eliminaciones mediante Tombstones y evita la resurrección de datos', () => {
    // Ambos tenían m1 inicialmente. El dispositivo A lo elimina a las 12:00 (t2)
    const deviceA = {
      movements: [
        { id: 'm1', description: 'Gasto eliminado', amount: 20, date: t0, updatedAt: t2, deletedAt: t2 },
      ],
    };

    // El dispositivo B aún lo tiene vivo de las 10:00 (t0)
    const deviceB = {
      movements: [
        { id: 'm1', description: 'Gasto eliminado', amount: 20, date: t0, updatedAt: t0 },
      ],
    };

    const { mergedData, stats } = storageService.mergeAllData(deviceB, deviceA);

    // El registro reconciliado debe estar marcado con deletedAt
    expect(mergedData.movements[0].deletedAt).toBe(t2);
    expect(stats.movementsDeleted).toBe(1);

    // Los selectores de elementos activos lo excluyen correctamente
    const active = mergedData.movements.filter((m) => !m.deletedAt);
    expect(active).toHaveLength(0);
  });

  // CU-6: Edición posterior a una eliminación gana la resurrección intencional
  it('CU-6: Si un registro fue editado después de haber sido eliminado, la edición posterior prevalece', () => {
    // Dispositivo A lo eliminó a las 11:00 (t1)
    const deviceA = {
      movements: [
        { id: 'm1', description: 'Eliminado antes', amount: 20, date: t0, updatedAt: t1, deletedAt: t1 },
      ],
    };

    // Dispositivo B lo editó legítimamente después a las 12:00 (t2)
    const deviceB = {
      movements: [
        { id: 'm1', description: 'Editado después de la eliminación', amount: 25, date: t0, updatedAt: t2 },
      ],
    };

    const { mergedData } = storageService.mergeAllData(deviceA, deviceB);

    expect(mergedData.movements[0].deletedAt).toBeUndefined();
    expect(mergedData.movements[0].description).toBe('Editado después de la eliminación');
    expect(mergedData.movements[0].amount).toBe(25);
  });

  // CU-7: Sincronización completa de reservas y fondos apartados
  it('CU-7: Sincroniza reservas y asignaciones de fondos entre dispositivos', () => {
    const deviceA = {
      reserves: [
        { id: 'res_viaje', name: 'Viaje Cusco', targetAmount: 1000, currentAmount: 200, updatedAt: t1 },
      ],
      allocations: [
        { id: 'alloc_1', reserveId: 'res_viaje', amount: 200, date: t1, updatedAt: t1 },
      ],
    };

    const deviceB = {
      reserves: [],
      allocations: [],
    };

    const { mergedData, stats } = storageService.mergeAllData(deviceB, deviceA);

    expect(mergedData.reserves).toHaveLength(1);
    expect(mergedData.reserves[0].name).toBe('Viaje Cusco');
    expect(mergedData.allocations).toHaveLength(1);
    expect(stats.reservesAdded).toBe(1);
    expect(stats.allocationsAdded).toBe(1);
  });

  // CU-8: Sincronización de categorías e ingresos personalizados
  it('CU-8: Sincroniza categorías personalizadas sin sobreescribir las categorías base', () => {
    const deviceA = {
      categories: [
        { id: 'cat_alimentacion', name: 'Alimentación' },
        { id: 'cat_gym', name: 'Gimnasio 🏋️', updatedAt: t1 },
      ],
    };

    const deviceB = {
      categories: [
        { id: 'cat_alimentacion', name: 'Alimentación' },
        { id: 'cat_mascota', name: 'Mascotas 🐕', updatedAt: t2 },
      ],
    };

    const { mergedData } = storageService.mergeAllData(deviceA, deviceB);

    const names = mergedData.categories.map((c) => c.name);
    expect(names).toContain('Alimentación');
    expect(names).toContain('Gimnasio 🏋️');
    expect(names).toContain('Mascotas 🐕');
  });

  // CU-9: Conmutatividad y Simetría Bidireccional
  it('CU-9: mergeAllData(A, B) y mergeAllData(B, A) producen el mismo resultado determinista exacto', () => {
    const stateA = {
      movements: [
        { id: 'm1', amount: 10, updatedAt: t1 },
        { id: 'm2', amount: 20, updatedAt: t2 },
      ],
      reserves: [
        { id: 'r1', name: 'R1', updatedAt: t1 },
      ],
    };

    const stateB = {
      movements: [
        { id: 'm1', amount: 15, updatedAt: t2 }, // m1 más reciente en B
        { id: 'm3', amount: 30, updatedAt: t1 },
      ],
      reserves: [
        { id: 'r2', name: 'R2', updatedAt: t2 },
      ],
    };

    const resAB = storageService.mergeAllData(stateA, stateB);
    const resBA = storageService.mergeAllData(stateB, stateA);

    expect(resAB.mergedData.movements).toEqual(resBA.mergedData.movements);
    expect(resAB.mergedData.reserves).toEqual(resBA.mergedData.reserves);
  });
});
