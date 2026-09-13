# Módulo de presupuesto para ingresos variables

## Objetivo

Implementar en la aplicación un sistema de organización de dinero pensado para estudiantes o personas con ingresos irregulares. El usuario registra ingresos y egresos como hasta ahora, pero la aplicación también separa virtualmente parte de su saldo para gastos futuros, ahorro y metas. No se crean cuentas bancarias reales ni se duplica dinero: son asignaciones internas sobre el mismo saldo.

El resultado debe responder con claridad tres preguntas:

1. ¿Cuánto dinero debería tener según mis movimientos?
2. ¿Cuánto de ese dinero ya tiene un propósito y no debería gastarlo?
3. ¿Cuánto puedo gastar hoy sin afectar mis próximos pagos o mi ahorro?

## Principios de negocio

- No asumir que el usuario recibe un salario mensual.
- La planificación se ejecuta cada vez que entra dinero, no solo al iniciar el mes.
- El dinero recibido para un destino concreto (por ejemplo, pasajes) debe registrarse como **restringido** y asignarse por defecto a ese destino.
- Los montos separados para reservas o ahorro continúan dentro del saldo total; solo disminuyen cuando existe un egreso real.
- Un ingreso de venta debe diferenciar entre importe recibido, costo de reposición y ganancia. Solo la ganancia se puede repartir como dinero libre.
- La aplicación debe mostrar sugerencias, pero el usuario siempre puede aceptar, editar u omitir la distribución sugerida.

## Conceptos y definiciones

| Concepto | Definición |
| --- | --- |
| Movimiento | Ingreso o egreso real que modifica el saldo total. |
| Reserva | Dinero apartado virtualmente para un gasto futuro conocido. Ej.: plan móvil, pasajes, corte de cabello. |
| Fondo | Reserva con un objetivo general, como emergencia o materiales de estudio. |
| Disponible | Dinero que queda después de descontar las reservas activas y el ahorro protegido. |
| Gasto recurrente | Gasto repetible con periodicidad definida: mensual, cada 45 días, semanal, etc. |
| Gasto restringido | Dinero recibido únicamente para una finalidad concreta. Ej.: apoyo para pasajes. |

## Categorías iniciales

Crear estas categorías predefinidas, editables por el usuario:

- Pasajes
- Plan móvil / recarga
- Alimentación universitaria
- Estudios: impresiones, copias, materiales, software
- Cuidado personal: corte de cabello, higiene
- Salud / emergencia
- Reposición de inventario (ventas)
- Gustos / ocio
- Ahorro para meta
- Fondo de emergencia

Las categorías deben poder clasificarse como `necesidad`, `planificado`, `ahorro`, `gusto` o `negocio`.

## Modelo de datos sugerido

Adaptar los nombres a la tecnología existente, manteniendo las relaciones y reglas indicadas.

### Transaction

```ts
type Transaction = {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;                  // Siempre positivo y con dos decimales.
  categoryId: string;
  source?: 'tip' | 'sale' | 'family_support' | 'transport_support' | 'other';
  isRestricted: boolean;
  restrictedReserveId?: string;    // Obligatorio si isRestricted es true.
  saleCost?: number;               // Solo para source = 'sale'.
  note?: string;
};
```

### Reserve

```ts
type Reserve = {
  id: string;
  name: string;
  categoryId: string;
  targetAmount: number;
  currentAmount: number;           // Total asignado y aún no gastado.
  frequency: 'one_time' | 'weekly' | 'monthly' | 'custom_days';
  intervalDays?: number;           // Ej.: 45 para corte de cabello.
  nextDueDate?: string;
  priority: 'high' | 'medium' | 'low';
  active: boolean;
  protectsBalance: boolean;        // true para que reste del disponible.
};
```

### Allocation

Una asignación no modifica el saldo. Solo indica qué parte del dinero existente quedó destinada a una reserva.

```ts
type Allocation = {
  id: string;
  reserveId: string;
  transactionId?: string;          // Ingreso que motivó la sugerencia; opcional.
  amount: number;
  date: string;
  type: 'assign' | 'release' | 'consume';
  note?: string;
};
```

Regla: al crear una asignación `assign`, aumentar `Reserve.currentAmount`. Al registrar un egreso vinculado a la reserva, crear `consume` y disminuir `Reserve.currentAmount`. Nunca crear un egreso automático únicamente por reservar dinero.

## Cálculos obligatorios

Trabajar con decimales seguros para moneda (centavos/enteros o una librería decimal); evitar errores de punto flotante.

```text
saldoEsperado = saldoInicial + suma(ingresos) - suma(egresos)

totalReservado = suma(currentAmount de reservas activas con protectsBalance = true)

disponibleParaGastar = max(0, saldoEsperado - totalReservado)
```

Además, para cada reserva:

```text
faltante = max(0, targetAmount - currentAmount)
progreso = min(100, currentAmount / targetAmount * 100)
```

Si se necesita prever cuánto debería estar separado según el tiempo transcurrido:

```text
reservaRecomendadaHoy = min(
  targetAmount,
  targetAmount / duracionDelCicloEnDias * diasDesdeElInicioDelCiclo
)
```

Ejemplos:

- Plan móvil de S/ 29 cada 30 días: `29 / 30 = S/ 0.97` por día.
- Corte de cabello de S/ 25 cada 45 días: `25 / 45 = S/ 0.56` por día.

La aplicación no debe exigir ahorro diario. La fórmula solo comunica el avance recomendado; el usuario asignará dinero cuando reciba ingresos.

## Flujo al registrar un ingreso

### 1. Capturar información

Solicitar monto, fecha, categoría/origen y si el dinero tiene un propósito específico.

### 2. Tratar ingresos restringidos

Si el usuario marca el ingreso como «dinero para pasajes» o selecciona otro propósito:

1. Crear el movimiento de ingreso.
2. Crear automáticamente una asignación a la reserva seleccionada por el mismo monto, hasta completar su objetivo.
3. Si sobra dinero, preguntar si se desea dejarlo libre o distribuirlo con la regla normal.

### 3. Tratar ventas

Si el origen es venta, solicitar opcionalmente el costo de reposición.

```text
gananciaNeta = max(0, montoDeVenta - costoDeReposicion)
```

Asignar el costo de reposición a la reserva «Reposición de inventario». Aplicar la distribución normal solo a `gananciaNeta`.

### 4. Distribuir ingreso libre

Usar primero las reservas pendientes en orden de prioridad y cercanía de fecha:

1. Alta: pagos próximos e indispensables (plan móvil, pasajes, salud).
2. Media: gastos periódicos planificados (corte de cabello, materiales).
3. Fondo de emergencia y metas de ahorro.
4. Dinero flexible para gustos.

Mientras el fondo de emergencia no alcance la meta configurada por el usuario, sugerir esta distribución del dinero libre restante:

```text
70% necesidades y reservas próximas
20% ahorro / emergencia
10% gasto flexible
```

Cuando el fondo ya alcance su meta inicial, sugerir:

```text
50% necesidades y reservas próximas
30% ahorro / metas
20% gasto flexible
```

Los porcentajes son valores iniciales configurables. Para importes pequeños, priorizar completar reservas con fecha próxima antes de calcular porcentajes.

## Flujo al registrar un egreso

1. Registrar el egreso real y reducir `saldoEsperado`.
2. Preguntar si corresponde a una reserva existente.
3. Si corresponde, crear una asignación `consume` por el mínimo entre el egreso y `currentAmount` de la reserva.
4. Si el egreso supera la reserva, mostrar una alerta no bloqueante: «Este gasto utilizó S/ X que no estaba reservado».
5. Cuando se pague una reserva recurrente completa, calcular su siguiente fecha de vencimiento según su frecuencia y reiniciar su ciclo de ahorro, no su historial.

Ejemplo: pagar el plan móvil de S/ 29 reduce el saldo en S/ 29 y consume los S/ 29 ya reservados. El dinero no se descuenta dos veces.

## Pantallas y componentes

### Dashboard

Mostrar primero cuatro tarjetas claras:

1. **Saldo esperado:** todo el dinero registrado que debería quedar.
2. **Reservado:** monto con destino asignado.
3. **Disponible hoy:** saldo que puede gastarse sin comprometer reservas.
4. **Próximo pago:** nombre, fecha, importe y cuánto falta reservar.

Debajo mostrar:

- Lista de reservas activas con barra de progreso.
- Movimientos recientes.
- Avisos prioritarios.
- Resumen del periodo: ingresos, egresos, ahorro asignado y gasto flexible.

### Crear reserva

Campos: nombre, monto objetivo, periodicidad, fecha de próximo pago, prioridad, categoría y si debe proteger el saldo disponible. Incluir plantillas rápidas: «Plan móvil mensual», «Pasajes», «Corte de cabello cada 45 días», «Fondo de emergencia».

### Registrar movimiento

Para ingreso, presentar una vista previa de distribución sugerida antes de guardar. Para egreso, mostrar reservas compatibles para vincularlo con un toque.

### Historial

Mantener el historial existente, agregando etiquetas visibles: `restringido`, `venta`, `asignado a reserva`, `egreso de reserva`. Permitir filtros por categoría, reserva, fecha y tipo.

## Alertas útiles

- «El plan móvil vence en 3 días y faltan S/ 11 por reservar.»
- «Tu disponible es S/ 8; gastar más afectaría dinero reservado.»
- «Pasajes tiene saldo bajo para los próximos días.»
- «Registraste una venta: falta indicar el costo de reposición.»
- «Tu fondo de emergencia llegó al 100% de su primera meta.»

Las alertas deben ser informativas; no impedir que el usuario registre un gasto real.

## Texto de explicación dentro de la aplicación

Crear una sección accesible desde el dashboard mediante un botón o enlace: **¿Cómo funciona mi dinero?**. Debe usar lenguaje sencillo y el siguiente contenido, adaptando montos reales cuando estén disponibles:

> Tu saldo esperado muestra el dinero que deberías tener según todos tus ingresos y egresos registrados.
>
> Parte de ese saldo está reservado para pagos futuros, como pasajes, tu plan móvil o un corte de cabello. Ese dinero sigue siendo tuyo, pero no se considera disponible porque ya tiene un propósito.
>
> El disponible es lo que puedes usar hoy sin afectar tus reservas ni tu ahorro. Cuando recibes un ingreso, la aplicación te sugiere separar primero lo necesario para tus próximos pagos y metas. Tú siempre puedes modificar esa sugerencia.
>
> Reservar dinero no es un gasto. El saldo total solo baja cuando realmente pagas o compras algo.

Incluir un ejemplo visual con datos ficticios:

```text
Saldo esperado: S/ 100
- Plan móvil reservado: S/ 29
- Corte de cabello reservado: S/ 15
- Fondo de emergencia: S/ 20
= Disponible hoy: S/ 36
```

## Casos de aceptación

1. Al registrar S/ 40 como ingreso libre, el usuario ve y puede editar una propuesta de asignación antes de confirmarla.
2. Al registrar S/ 20 como apoyo para pasajes, el sistema lo asigna a la reserva Pasajes y no lo presenta como disponible.
3. Una reserva mensual de S/ 29 con S/ 18 asignados muestra «Faltan S/ 11».
4. Pagar S/ 29 del plan reduce el saldo esperado una sola vez y deja la reserva en S/ 0.
5. El disponible nunca es mayor que el saldo esperado.
6. Registrar una venta de S/ 50 con reposición de S/ 30 reserva S/ 30 para inventario y usa S/ 20 como ingreso libre distribuible.
7. Si no existen reservas, el disponible es igual al saldo esperado.
8. Todo historial previo continúa visible y sus totales siguen siendo correctos.

## Migración y compatibilidad

- No modificar ni eliminar los movimientos existentes.
- Inicializar `saldoEsperado` desde el cálculo actual del historial.
- Crear reservas vacías solo cuando el usuario las configure o acepte una plantilla.
- Si las categorías actuales no tienen tipo, asignar `necesidad` como valor seguro y permitir corrección posterior.
- Agregar pruebas unitarias para cálculos, asignaciones, consumo de reservas y ventas; agregar pruebas de interfaz para el flujo de registro de ingreso y egreso.

## Criterios de calidad

- Todos los importes se muestran en soles (`S/`) con dos decimales.
- Las fechas y formatos se muestran en español para Perú.
- Usar etiquetas claras: no llamar «saldo disponible» al saldo total.
- Mantener accesibilidad: contraste adecuado, iconos con texto y formularios navegables por teclado.
- No convertir una sugerencia de presupuesto en una regla obligatoria.
