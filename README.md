# ⚡ AURUM // Gestor Financiero Maximalista

<div align="center">

![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.0-EA4C89?style=for-the-badge&logo=framer&logoColor=white)
![WebRTC P2P](https://img.shields.io/badge/WebRTC-PeerJS-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Pass_24/24-729B1B?style=for-the-badge&logo=vitest&logoColor=white)

**Gestión financiera personal ágil, inteligente y sin fricción.**  
Estética *Maximalista Funcional*, física háptica estilo iOS, arquitectura *Local-First* con sincronización P2P en tiempo real sin servidores intermediarios.

[Características](#-características-principales) • [Arquitectura de Sincronización](#-motor-de-sincronización-libre-de-conflictos-crdt--p2p) • [Instalación](#-instalación-y-uso-local) • [Atajos de Teclado](#-atajos-de-teclado) • [Privacidad](#-seguridad-y-privacidad-local-first)

</div>

---

## 💎 Filosofía: Maximalismo Funcional

AURUM rompe con los diseños aburridos y las interfaces saturadas de números grises. Combina una **estética visual audaz y con carácter** (inspirada en el editorial neobrutalista y el ciber-maximalismo) con una **fricción operativa cero**:

- ⚡ **Registro Flash (< 3 segundos)**: Registra ingresos y egresos al instante con auto-detección inteligente de iconos temáticos por palabras clave (`"pizza"` 🍕, `"uber"` 🚗, `"sueldo"` 💼, `"cine"` 🎬).
- 🎨 **Enfoque Dual Perfeccionado**:
  - 🌙 **Obsidiana Eléctrica (Dark Mode)**: Fondos profundos ultra oscuros (`#0b0b0e`, `#13131a`), neones esmeralda fosforescentes (`#00ff87`), cian eléctrico y resplandores sutiles.
  - ☀️ **Editorial Neobrutalista (Light Mode)**: Fondos cálidos color marfil/papel de imprenta (`#faf7f2`), bordes sólidos contrastados y sombras desplazadas con personalidad.
- 🍏 **Física Háptica Estilo iOS (Spring Physics)**:
  - Compresión elástica interactiva en botones y tarjetas (`active:scale-95`).
  - Hojas inferiores (*Bottom Sheets*) fluidas para móvil con desenfoque de fondo (`backdrop-blur-xl`).
  - Animaciones de lista no invasivas y conteo numérico progresivo.

---

## 🚀 Características Principales

### 1. 📊 Balance General y Métricas Inteligentes
- **Disponible Real para Gastar**: Cálculo dinámico que resta automáticamente tus fondos apartados del saldo contable. ¡Nunca gastarás accidentalmente lo que ya reservaste!
- **Alertas Prioritarias Contextuales**: Detecta si tu disponible es inferior a las reservas requeridas o si se avecinan fechas de pago importantes.
- **Desglose Multibilletera**: Distribución exacta de tu dinero entre Efectivo, Billeteras Digitales (Yape / Plin) y Cuentas Bancarias.
- **Selector de Moneda Global**: Soporte nativo para Soles Peruanos (`PEN - S/`), Dólares Americanos (`USD - $`), Euros (`EUR - €`), Pesos Mexicanos (`MXN - $`) y más.

### 2. 🎯 Fondos Apartados y Metas de Reserva
- **Objetivos de Ahorro y Gastos Fijos**: Separa dinero para alquiler, tarjetas de crédito, fondo de emergencia o vacaciones.
- **Barras Progresivas con Confeti**: Celebraciones visuales al alcanzar el 100% de una meta.
- **Distribución Inteligente de Ingresos**: Sugerencia matemática de porcentajes de ahorro recomendados cada vez que registras un nuevo ingreso.
- **Vigencia y Próximos Pagos**: Calendario visual para saber exactamente qué gasto prioritario vence próximamente.

### 3. 📜 Historial General Simplificado
- **Cards Optimizadas**: Vista limpia de transacciones con descripción, icono, categoría, billetera y monto.
- **Detalle Expandible**: Inspección en un clic para ver el cálculo del impacto, notas, fecha y hora exacta.
- **Filtros Avanzados y Navegación Temporal**: Filtra por tipo (Ingreso / Egreso / Apartado / Venta), categoría o reserva, y navega mes a mes de forma inmediata.

### 4. 💾 Diagnóstico de Salud de Memoria (LocalStorage)
- Monitor en tiempo real de consumo en KB, porcentaje de cuota restante del navegador y conteo detallado de registros.
- **Acceso Directo**: Botón en el menú lateral o atajo de teclado global (`Alt + S` / `Ctrl + Shift + S`) y Easter Egg de triple toque en el logotipo.

---

## 🔄 Motor de Sincronización Libre de Conflictos (CRDT / P2P)

AURUM incluye un motor de sincronización de última generación diseñado para conectar dispositivos (ej. PC y Smartphone) directamente por **WebRTC** vía **PeerJS** sin servidores centralizados.

```
┌─────────────────────────┐               WebRTC DataChannel              ┌─────────────────────────┐
│   Dispositivo A (PC)    │ ◄──────────────────────────────────────────► │ Dispositivo B (Móvil)   │
│                         │        • Conexión Directa Encriptada          │                         │
│  • LocalStorage (v2.0)  │        • Reconciliación LWW Determinista      │  • LocalStorage (v2.0)  │
│  • Tombstones (deleted) │        • Retransmisión LIVE_UPDATE            │  • Tombstones (deleted) │
│  • Event Pipeline       │        • Heartbeat Keepalive (15s)            │  • Event Pipeline       │
└─────────────────────────┘                                               └─────────────────────────┘
```

### Principios de Reconciliación:
1. **Unión de Conjuntos Determinista**: Cada movimiento, reserva, apartado y categoría posee un identificador universal `UUID`. Al sincronizar dispositivos que trabajaron sin conexión, se conservan los datos de ambos sin duplicados.
2. **Last-Write-Wins (LWW) con Marcas de Tiempo ISO-8601 UTC**: Si un registro fue editado concurrentemente en ambos dispositivos, prevalece de forma estricta la versión más reciente (`updatedAt`).
3. **Lápidas de Eliminación (Tombstones)**: Cuando eliminas un registro, se genera una marca `deletedAt`. Esto **elimina el problema de resurrección de datos**, asegurando que el otro dispositivo no lo vuelva a inyectar como "nuevo".
4. **Retransmisión en Tiempo Real (`LIVE_UPDATE`)**: Una vez emparejados, cualquier movimiento registrado en el teléfono o PC se refleja en el otro dispositivo en milisegundos sin necesidad de refrescar la pantalla (0 ms de recarga).
5. **Reconexión Rápida en 1 Toque**: El navegador recuerda el último código de enlace para reconectarse con un solo botón.
6. **Purgado Automático de Memoria**: Las lápidas antiguas se eliminan automáticamente tras 60 días para mantener el almacenamiento liviano.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend Core** | [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) |
| **Estilos y Diseño** | [Tailwind CSS v4](https://tailwindcss.com/) + CSS Custom Tokens |
| **Animaciones y Física** | [Framer Motion 12](https://www.framer.com/motion/) + [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Red P2P & WebRTC** | [PeerJS](https://peerjs.com/) (DataChannel directo navegador a navegador) |
| **Códigos QR** | [QRCode.react](https://www.npmjs.com/package/qrcode.react) + [Html5-QRCode](https://github.com/mebjas/html5-qrcode) (Escaneo con cámara) |
| **Iconografía** | [Lucide React](https://lucide.dev/) |
| **Testing Automatizado** | [Vitest](https://vitest.dev/) (24 pruebas unitarias de cálculo y sincronización) |

---

## 📦 Instalación y Uso Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- Gestor de paquetes `npm`

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/1Yxsus/GestorFinanciero.git
   cd GestorFinanciero
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173/](http://localhost:5173/) en tu navegador.

4. **Ejecutar pruebas unitarias:**
   ```bash
   npm test
   ```

5. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| `1` | Ir a la vista de **Balance General** |
| `2` | Ir a la vista de **Fondos y Reservas** |
| `3` | Ir a la vista de **Historial General** |
| `N` / `n` | Abrir formulario de **Nuevo Movimiento Flash** |
| `Alt + S` ó `Ctrl + Shift + S` | Abrir modal de **Diagnóstico de Salud de Memoria** |
| `Triple clic en logo` | Abrir diagnóstico de memoria (Easter Egg táctil) |
| `Esc` | Cerrar cualquier modal activo |

---

## 🔒 Seguridad y Privacidad (Local-First)

- **100% Privado**: Tus transacciones, cuentas y balances se guardan exclusivamente en el `localStorage` de tu navegador.
- **Sin Servidores ni Base de Datos**: No hay APIs recolectando tus datos financieros.
- **Sin Cuentas Obligatorias**: Sin registros, correos electrónicos ni contraseñas.
- **Transferencia Directa Punto a Punto (P2P)**: Durante la sincronización, los datos viajan directamente entre tus dos dispositivos mediante canales encriptados WebRTC sin almacenarse en servidores de terceros.
- **Control Total**: Puedes exportar un respaldo completo en formato JSON o borrar la memoria local cuando lo desees con un solo clic.

---

<div align="center">

Diseñado y construido con obsesión por los detalles y la fluidez.  
**AURUM // 2026**

</div>
