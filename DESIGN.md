---
name: KashFlow v2
description: Fintech minimalista plana, dark mode por defecto, un solo acento violeta y semántica contable verde/rojo/azul.
colors:
  fondo: "#09090b"
  superficie: "#18181b"
  superficie-muted: "#131316"
  borde: "#27272a"
  texto: "#f8fafc"
  texto-muted: "#a1a1aa"
  texto-subtle: "#71717a"
  primario: "#8b5cf6"
  primario-hover: "#7c3aed"
  haber: "#10b981"
  debe: "#ef4444"
  info: "#3b82f6"
  info-hover: "#2563eb"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "DM Sans, system-ui, -apple-system, sans-serif"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "16px"
---

# Design System: KashFlow v2

## Overview

Migración de la v1 ("El libro nocturno", vidrio + partículas + Bootstrap) a un sistema **plano**,
construido con Vue 3 + Tailwind CSS + tokens en variables CSS (`src/assets/styles/main.css`
+ `tailwind.config.ts`). Se conserva el espíritu oscuro y denso del original —zinc casi negro, un solo
acento violeta, semántica contable estricta— pero **sin** `backdrop-filter`, sin `particles.js` y sin
Bootstrap.

**Key Characteristics:**

- Fondo tinta (`#09090b`), superficies **planas** (sin blur ni translucidez), borde de 1px zinc.
- Space Grotesk + `tabular-nums` para montos; DM Sans para el resto de la UI.
- Violeta (`primary`) como único acento de marca/CTA.
- Haber verde / Debe rojo / **Info azul** para Obligaciones (reemplaza el "oro" de la v1).
- Sin partículas, sin vidrio: la jerarquía se logra con contraste tipográfico y color semántico, no con
  efectos decorativos.

## Colors

Los tokens viven como canales RGB separados por espacio en `:root` (`main.css`), para soportar el patrón
`rgb(var(--token) / <alpha-value>)` de Tailwind y que las utilidades de opacidad (`bg-primary/10`, etc.)
funcionen sobre variables.

### Semánticos (no cambian entre tema claro/oscuro)

- **`primary`** (`#8b5cf6` / hover `#7c3aed`): único acento de marca. CTA primario, focus ring, enlaces
  activos de navegación. **The One Accent Rule**: no pinta fondos masivos ni iconografía decorativa.
- **`haber`** (`#10b981`): ingresos, montos positivos, confirmaciones (botón "Confirmar pago").
- **`debe`** (`#ef4444`): egresos, montos negativos, acciones destructivas (eliminar, desactivar).
- **`info`** (`#3b82f6` / hover `#2563eb`): Obligaciones / vencimientos / badges informativos. Reemplaza
  el "oro" de la v1.

**The Haber/Debe/Info Rule.** Estos tres colores son semántica contable, no "estado de UI" genérico. Una
transferencia interna nunca se pinta como Debe (es neutra).

### Superficies (dark, default — invertidas en `[data-theme='light']`)

- **`background`** (`#09090b`): canvas.
- **`surface`** (`#18181b`): cards, modales, tabla.
- **`surface-muted`** (`#131316`): encabezado de tabla, inputs, filas alternadas.
- **`border`** (`#27272a`): líneas de 1px. Nunca `backdrop-filter` ni sombra de vidrio.

### Texto

- **`foreground`** (`#f8fafc`): texto primario.
- **`muted`** (`#a1a1aa`): texto secundario, labels de tabla en mayúsculas.
- **`subtle`** (`#71717a`): placeholders, empty states, metadata.

## Typography

**Display Font:** Space Grotesk (`font-display` / clase utilitaria `font-money`)
**Body Font:** DM Sans (default en `body`)

**The Tabular Money Rule.** Los montos usan la clase `.font-money` (`Space Grotesk` + `font-variant-numeric:
tabular-nums` + weight 600). Nunca un body proporcional para una columna de dinero — se mantiene igual
que en la v1.

## Shapes

Radios suaves definidos en `tailwind.config.ts`: `sm` 4px, `md` 6px, `lg` 8px (inputs, botones, filas),
`xl` 16px (cards, modales). Sin píldora, sin square-fintech agresivo.

## Elevation

**Flat by default.** En reposo, las superficies son opacas y planas (`bg-surface`, borde de 1px), sin
blur ni translucidez. Las sombras (`shadow-card`, `shadow-card-hover`, `shadow-popover` en
`tailwind.config.ts`) se reservan para elementos flotantes de verdad: `Dialog`, `DropdownMenu`,
`Select` (todos construidos sobre Reka UI). Una card en reposo en la grilla del dashboard **no** lleva
sombra.

## Componentes

Primitivas en `src/components/ui/*` (Button, Input, Select, Dialog, Switch, DropdownMenu,
Badge, Table), construidas sobre Reka UI (headless) + `class-variance-authority` para variantes,
estilizadas con las utilidades de Tailwind que resuelven a los tokens de arriba. Nunca CSS a mano fuera
de `main.css` (tokens + `font-money`).

## Do's and Don'ts

### Do:

- **Do** usar `font-money` en toda cifra monetaria (tablas, KPIs, badges de saldo).
- **Do** reservar `primary` (violeta) para el CTA principal y el estado activo de navegación.
- **Do** pintar Haber/Debe/Info según semántica contable, nunca según "estado de UI" genérico.
- **Do** mantener las superficies planas; sombra solo en overlays (Dialog/Dropdown/Select).

### Don't:

- **Don't** reintroducir `backdrop-filter`, vidrio ni `particles.js`.
- **Don't** usar "oro"/ámbar para Obligaciones; el semántico vigente es `info` (azul).
- **Don't** pintar una transferencia interna como Debe (es neutra, no es un gasto).
- **Don't** redondear botones a píldora ni cards a un radio distinto de la escala `sm/md/lg/xl`.
