# Contexto del Proyecto: Gestor Financiero Personal (Maximalista)

## 1. Visión General del Proyecto
Este proyecto consiste en una aplicación web moderna orientada a la **administración ágil e intuitiva de ingresos y egresos personales**, combinando una estética visual **Maximalista** (rica en personalidad, tipografía expresiva, paletas audaces y detalles gráficos con carácter) con una **experiencia de usuario (UX) minimalista en fricción**: sin formularios tediosos ni pantallas saturadas de números difíciles de interpretar.

---

## 2. Objetivos Principales
1. **Registro Flash (Cero Fricción)**: Agregar movimientos en menos de 5 segundos pidiendo únicamente lo esencial.
2. **Control Temporal Claro**: Visualizar el historial general acumulado y navegar fácilmente mes a mes.
3. **Estilo Maximalista Intuitivo**: Diseño impactante, audaz y vibrante ("Maximalist Design") pero estructurado de forma que la información clave sea legible al instante y no fatigue la vista.
4. **Sincronización Dual (P2P / LocalStorage)**: Capacidad de mantener sincronizados 2 dispositivos (ej. PC y Teléfono) usando el almacenamiento local del navegador (`localStorage`) sin necesidad de bases de datos complejas o registros de usuario obligatorios.

---

## 3. Requerimientos Funcionales

### 3.1. Entrada de Movimientos (Formulario Esencial)
Para evitar el abandono por pereza o fatiga de datos, el formulario solicita estrictamente los datos indispensables:
- **Tipo de Movimiento**: Selector desplegable con opciones claras:
  - 🟢 **Ingreso**
  - 🔴 **Egreso**
- **Monto**: Campo numérico formateado automáticamente con moneda.
- **Descripción**: Breve texto explicativo (ej. *"Cafetería"*, *"Sueldo quincena"*, *"Supermercado"*).

#### Adición inteligente y no invasiva (Recomendación):
- **Fecha**: Por defecto toma automáticamente la **fecha actual** (evita clics extra). Se ofrece un selector discreto únicamente si el usuario desea registrar un movimiento de un día anterior.
- **Detección rápida de categoría por icono**: Asignación automática de un emoji o icono temático basado en palabras clave de la descripción (ej. *"pizza"* -> 🍕, *"uber"* -> 🚗, *"sueldo"* -> 💼) sin obligar al usuario a elegir categorías manualmente.

---

### 3.2. Visualización e Historial
- **Métricas Clave (Hero Dashboard)**:
  - Balance Total disponible.
  - Total Ingresos del mes seleccionado.
  - Total Egresos del mes seleccionado.
- **Navegación Temporal**:
  - Selector de mes actual y controles para avanzar/retroceder mes a mes (*"Enero 2026"*, *"Febrero 2026"*, etc.).
  - Pestaña para alternar entre:
    - **Vista del Mes Actual**: Muestra el balance y la lista exclusiva del mes seleccionado.
    - **Historial Global**: Registro cronológico completo de todos los meses.
- **Listado de Transacciones**:
  - Tarjetas limpias y visuales para cada movimiento: indicador de color (verde/rojo), icono contextuado, descripción, fecha y monto destacado.
  - Acción rápida de eliminación y edición sencilla.

---

### 3.3. Sincronización entre 2 Dispositivos (LocalStorage)
Al guardarse todos los datos en `localStorage`, se implementa un mecanismo de sincronización sin servidores tradicionales ni logins pesados:

1. **Sincronización Directa P2P (WebRTC / PeerJS)**:
   - En el dispositivo principal (ej. PC) se abre la opción *"Sincronizar Dispositivo"*, generando un **Código de Enlace de 6 caracteres** o un **Código QR**.
   - En el segundo dispositivo (ej. Smartphone), se escanea el QR o se ingresa el código.
   - Ambos dispositivos establecen una conexión P2P encriptada de navegador a navegador y sincronizan/fusionan sus historiales en `localStorage`.
2. **Respaldo Rápido (Fallback QR / Exportación)**:
   - Botón para generar un QR de respaldo con los datos comprimidos para escaneo rápido.
   - Opción de exportar/importar archivo JSON o copia rápida al portapapeles.
3. **Estrategia contra duplicados**:
   - Cada movimiento cuenta con un identificador único universal (`UUID`) y una marca de tiempo (`timestamp`), permitiendo fusionar registros de ambos dispositivos sin duplicar transacciones.

---

## 4. Filosofía de Diseño: "Maximalismo Funcional"

El **Maximalismo** celebra la riqueza visual, las texturas, los contrastes y las composiciones atrevidas. Para no saturar al usuario ni dificultar la lectura de sus finanzas, se aplica una regla de oro: **estética exuberante en los contenedores y tipografía, pero simplicidad quirúrgica en los datos**.

### Lineamientos Estéticos:
- **Tipografía Expresiva**: Uso de fuentes de alto impacto (ej. *Syne*, *Clash Display* o *Space Grotesk* para encabezados numéricos grandes, combinadas con una sans-serif limpia como *Inter* o *Plus Jakarta Sans* para lectura ágil).
- **Enfoque Dual: Dark Mode y Light Mode Maximalista**:
  - 🌙 **Dark Mode (Obsidiana Eléctrica)**:
    - Fondos profundos ultra oscuros (`#0b0b0e`, `#13131a`) con sutiles gradientes radiales de luz ambiental.
    - Acentos de neón saturados (verde esmeralda fosforescente para ingresos, fucsia/coral eléctrico para egresos, cian y oro resplandeciente para balances).
    - Sombras con resplandores de luz tenue (*glow effects*) y bordes finos semi-translúcidos.
  - ☀️ **Light Mode (Editorial Neobrutalista de Lujo)**:
    - Fondos cálidos tipo papel de imprenta / marfil de alta gama (`#faf7f2`, `#f3eee4`), alejándose deliberadamente del blanco clínico aburrido.
    - Tipografía en negro carbón profundo con alto contraste, bordes gruesos y definidos con sombras sólidas desplazadas (*hard offset shadows*).
    - Acentos intensos y saturados (verde bosque vibrante, rojo carmesí brillante, azul real).
  - 🔄 **Conmutador y Persistencia**:
    - Botón de alternancia rápida (Sol/Luna) animado en la cabecera.
    - Detección automática de la preferencia del sistema (`prefers-color-scheme`) y persistencia en `localStorage`.
- **Componentes y Tarjetas**:
  - Bordes definidos, sombras dinámicas con profundidad o micro-bordes con carácter.
  - Animaciones sutiles al registrar un nuevo ingreso/egreso (micro-celebración háptica visual).
- **Animaciones y Microinteracciones Estilo iOS (Spring Physics & Haptic Feel)**:
  - 🍏 **Respuesta táctil con compresión elástica**: Al presionar botones, tarjetas o selectores, se produce un micro-escalado con amortiguación de retorno (`active:scale-95` con física de resorte), emulando la sensación táctil de los controles de iOS.
  - 🍏 **Hojas Modales Inferiores (Bottom Sheets) nativas**: El formulario de registro en móvil sube desde la base con desenfoque de fondo translúcido (`backdrop-blur-xl`), curva de desaceleración elástica (*spring damping*) y soporte para deslizar hacia abajo para cerrar.
  - 🍏 **Transiciones de lista fluidas (Layout Animations)**: Al agregar, editar o eliminar un movimiento, los elementos adyacentes se desplazan suavemente a su nueva posición sin saltos abruptos ni parpadeos.
  - 🍏 **Transición numérica suave**: Los totales y balances se actualizan mediante una animación fluida de conteo progresivo al registrar transacciones o cambiar de mes.
  - 🍏 **Navegación horizontal fluida**: Al alternar entre meses, el feed realiza un deslizamiento suave (*slide & fade*) con inercia elástica.
- **Jerarquía Visual**:
  - El balance y los botones de acción rápida dominan visualmente.
  - Los detalles secundarios se agrupan en paneles colapsables o pestañas fluidas para no saturar la pantalla.

---

## 5. Experiencia y Adaptabilidad Mobile View (Mobile-First)

Dado que los registros de gastos e ingresos suelen realizarse de forma inmediata en el día a día, la experiencia móvil es crítica:

1. **Ergonomía de una sola mano (*Thumb Zone*)**:
   - Botón de Registro Rápido accesible en la zona inferior de la pantalla (FAB o barra fija), desplegando el formulario en un **Bottom Sheet / Modal inferior** suave y natural para uso con el pulgar.
   - En Desktop, el formulario se integra elegantemente en el flujo de la página en una columna o panel lateral.
2. **Optimización de Teclados e Inputs**:
   - El campo de monto utiliza `inputMode="decimal"` para activar de inmediato el teclado numérico en dispositivos Android / iOS, evitando que el usuario tenga que cambiar de teclado.
3. **Sincronización P2P por Cámara Móvil**:
   - En Mobile, la sincronización permite utilizar la cámara del teléfono (vía API web nativa o `html5-qrcode`) para escanear instantáneamente el código QR generado por la PC, completando el emparejamiento y traspaso de datos en 2 segundos.
4. **Tipografía Fluida y Cero Scroll Horizontal**:
   - Ajuste dinámico de los números grandes de balance con clases responsivas de Tailwind (`text-3xl sm:text-5xl lg:text-6xl`) para garantizar legibilidad y evitar saltos o desbordes en pantallas desde 360px de ancho.
5. **Navegación Táctil**:
   - Áreas de toque confortables (mínimo 44x44px) en todos los botones, selectores de mes y acciones rápidas.

---

## 6. Stack Tecnológico

- **Core & Entorno**: **React 18/19** inicializado con **Vite** (rápido, modular y optimizado).
- **Estilizado**: **Tailwind CSS v4 (v4.0)** mediante el plugin oficial `@tailwindcss/vite`. Enfoque *CSS-first* donde toda la personalización estética maximalista (variables de color neón/oscuro, bordes pronunciados, sombras dimensionales, fuentes como *Syne* / *Space Grotesk* y animaciones) se define directamente mediante bloques `@theme` en `src/index.css`, prescindiendo de archivos de configuración JS obsoletos.
- **Animaciones & Física de Resorte (Estilo iOS)**: **Framer Motion** (o Motion for React) para orquestar la física de resortes elásticos (*spring physics*), transiciones de layout automáticas y gestos táctiles tipo iOS.
- **Soporte de Temas**: Modo Oscuro y Claro nativo mediante clase `.dark` / selector de tema y variables CSS dinámicas para transiciones fluidas.
- **Iconografía**: **Lucide React** y emojis contextuales para un look visual expresivo y táctil.
- **Sincronización P2P**: **PeerJS** (WebRTC de navegador a navegador) + librería de generación de QR (como `qrcode.react`).
- **Almacenamiento Local**: `localStorage` nativo con sincronización reactiva mediante Custom Hooks (`useMovements`).

---

## 7. Modelo de Datos (`localStorage`)

### Estructura del Objeto Principal:
```json
{
  "version": "1.0",
  "theme": "system",
  "lastSync": "2026-09-10T18:00:00.000Z",
  "currency": "USD",
  "movements": [
    {
      "id": "c7a84e20-53cb-4f3b-8517-8a6c8e31291b",
      "type": "egreso",
      "amount": 45.50,
      "description": "Cena con amigos",
      "icon": "🍔",
      "date": "2026-09-10T20:30:00.000Z",
      "updatedAt": "2026-09-10T20:30:00.000Z"
    },
    {
      "id": "e1f29b40-12ab-4c3d-9876-5b4a3c21098f",
      "type": "ingreso",
      "amount": 1200.00,
      "description": "Pago de cliente diseño web",
      "icon": "💼",
      "date": "2026-09-05T14:15:00.000Z",
      "updatedAt": "2026-09-05T14:15:00.000Z"
    }
  ]
}
```

---

## 8. Estructura del Código Propuesta (Vite + React + Tailwind CSS v4)

```text
GestorFinanciero/
│
├── Context.md                  # Especificación de producto y arquitectura
├── package.json
├── vite.config.js              # Integración de Vite con @tailwindcss/vite
├── index.html                  # HTML base con tipografías Google Fonts (Syne / Outfit)
└── src/
    ├── main.jsx                # Punto de entrada React
    ├── App.jsx                 # Layout principal y orquestación
    ├── index.css               # @import "tailwindcss"; y directivas @theme maximalistas
    │
    ├── components/
    │   ├── BalanceHero.jsx     # Tarjeta maximalista con balance, ingresos y egresos
    │   ├── MovementForm.jsx    # Formulario flash (Tipo, Monto, Descripción corta)
    │   ├── MonthNavigator.jsx  # Selector mensual interactivo y toggle a vista global
    │   ├── MovementFeed.jsx    # Listado de tarjetas de movimientos con animaciones
    │   ├── MovementCard.jsx    # Item individual estilizado con iconos y acciones
    │   ├── ThemeToggle.jsx     # Botón animado para alternar entre Dark y Light Mode
    │   └── SyncModal.jsx       # Modal para sincronización P2P por código o escaneo QR
    │
    ├── hooks/
    │   ├── useMovements.js     # Hook para operaciones CRUD y cálculo de métricas
    │   ├── useTheme.js         # Hook para conmutar temas (dark/light/system) y persistencia
    │   └── useP2PSync.js       # Hook para conexión WebRTC con el segundo dispositivo
    │
    ├── services/
    │   ├── storageService.js   # Lectura, escritura y migración en localStorage
    │   └── peerService.js      # Conexión P2P PeerJS y resolución de conflictos
    │
    └── utils/
        ├── formatters.js       # Formato de divisas (USD/EUR/etc.) y fechas
        └── autoIcons.js        # Detección automática de icono/emoji por palabra clave
```

---

## 9. Criterios de Aceptación
1. ✅ **Formulario mínimo**: Solo requiere seleccionar tipo (Ingreso/Egreso), escribir monto y pequeña descripción.
2. ✅ **Historial con selector mensual**: Permite ver el desglose del mes activo y alternar entre meses anteriores y vista global.
3. ✅ **Diseño Maximalista con Tailwind CSS v4**: Estética visual potente, expresiva y moderna que mantiene la legibilidad y no abruma al usuario.
4. ✅ **Soporte Dual Dark y Light Mode**: Experiencia visual adaptada tanto en modo oscuro (obsidiana y neón) como claro (marfil editorial y sombras sólidas), con conmutación fluida y detección automática del sistema.
5. ✅ **Experiencia 100% Mobile-First y Responsiva**: Diseño ergonómico adaptado a una sola mano (Thumb Zone), teclado numérico automático (`inputMode="decimal"`), escaneo de QR mediante cámara y cero desbordes horizontales en cualquier resolución (360px a 4K).
6. ✅ **Sincronización funcional**: Emparejamiento entre 2 dispositivos vía WebRTC/QR sincronizando el `localStorage`.
7. ✅ **Persistencia reactiva**: Modificaciones reflejadas al instante y guardadas en el navegador.
8. ✅ **Fluidez y Animaciones Estilo iOS**: Microinteracciones táctiles con física de resorte (*spring physics*), respuesta de compresión en botones (`active:scale-95`), transición de Bottom Sheet con inercia elástica y reordenamiento fluido de listas.
