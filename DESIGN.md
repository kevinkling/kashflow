---
name: KashFlow
description: Libro nocturno — diario financiero oscuro de vidrio, con violeta de lámpara.
colors:
  tinta: "#09090b"
  tinta-media: "#0f0f13"
  pizarra: "#1c1c21"
  encabezado: "#131316"
  borde: "#27272a"
  papel: "#f8fafc"
  humo: "#a1a1aa"
  ceniza: "#71717a"
  tinta-violeta: "#8b5cf6"
  tinta-violeta-hover: "#7c3aed"
  haber: "#10b981"
  debe: "#ef4444"
  oro: "#f59e0b"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  body:
    fontFamily: "DM Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.5px"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.tinta-violeta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.lg}"
    padding: "0.6rem 1.2rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.tinta-violeta-hover}"
    textColor: "{colors.papel}"
    rounded: "{rounded.lg}"
    padding: "0.6rem 1.2rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.humo}"
    rounded: "{rounded.lg}"
    padding: "0.6rem 1.2rem"
  input:
    backgroundColor: "{colors.encabezado}"
    textColor: "{colors.papel}"
    rounded: "{rounded.lg}"
    padding: "0.6rem 1rem"
  card:
    backgroundColor: "{colors.pizarra}"
    textColor: "{colors.papel}"
    rounded: "{rounded.xl}"
    padding: "1.25rem 1.5rem"
  chip:
    backgroundColor: "{colors.tinta-violeta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.md}"
    padding: "0.5em 0.8em"
    typography: "{typography.label}"
---

# Design System: KashFlow

## Overview

**Creative North Star: "El libro nocturno"**

KashFlow se lee como un diario financiero a las 2 a.m.: zinc casi negro, paneles de vidrio, y una sola lámpara violeta sobre el escritorio. No es una landing fintech ni un spreadsheet de oficina. Es el libro de un operador, denso y tabular, donde el saldo tiene que ser creíble a primera vista.

La superficie es translúcida (`backdrop-filter: blur(10px)` sobre tinta `#09090b`). Las cifras viven en Space Grotesk; el resto del sistema, en DM Sans. Haber y Debe no son decoración: son semántica contable. El glow violeta aparece en el CTA y en el KPI de saldo, no como wallpaper.

**Key Characteristics:**

- Fondo tinta, cards de vidrio, borde de pelo blanco al 5%
- Space Grotesk para títulos y montos; DM Sans para UI
- Violeta de lámpara en un solo acento de acción
- Haber verde / Debe rojo / Oro para obligaciones
- Hover con lift de 1–4px y glow, no con sombras de producto SaaS
- Particles.js es ruido legado, no doctrina

## Colors

Paleta de libro: tinta, pizarra, una lámpara, y semántica de asiento.

### Primary

- **Tinta violeta** (`tinta-violeta`): la lámpara. CTA primario, focus ring, KPI de saldo (gradiente 135° hacia `#6d28d9`), glow `rgba(139, 92, 246, 0.3)`.
- **Tinta violeta hover** (`tinta-violeta-hover`): único oscurecimiento del CTA.

**The One Lamp Rule.** El violeta es la lámpara del escritorio. Va en el control que confirma y en el saldo total. No pinta fondos, tablas ni iconografía masiva.

### Secondary

- **Haber** (`haber`): ingresos, botones de éxito, montos positivos. Gradiente de KPI 135° `#10b981` → `#059669`.
- **Debe** (`debe`): egresos, peligro, montos negativos.
- **Oro** (`oro`): Obligaciones / vencimientos. No es marca; es aviso de cuenta a pagar.

**The Haber/Debe Rule.** Verde y rojo significan asiento, no “éxito de producto” ni alerta genérica. Una transferencia interna no se pinta como Debe.

### Neutral

- **Tinta** (`tinta`): canvas.
- **Tinta media** (`tinta-media`): capa bajo el vidrio.
- **Pizarra** (`pizarra`): card sólida / modal.
- **Encabezado** (`encabezado`): header de tabla e inputs.
- **Borde** (`borde`): líneas de 1px.
- **Papel** (`papel`): texto primario.
- **Humo** (`humo`): texto secundario, labels de tabla en mayúsculas.
- **Ceniza** (`ceniza`): placeholders y muted.

**The Hairline Rule.** Los bordes son `#27272a` o `rgba(255,255,255,0.05)`. Nunca un stroke Bootstrap default.

## Typography

**Display Font:** Space Grotesk (system-ui, sans-serif)
**Body Font:** DM Sans (system-ui, -apple-system, sans-serif)

**Character:** Grotesk geométrica para el dinero; Sans humanista para el resto. El contraste tipográfico es el lujo; no hay serif ni mono de marca.

### Hierarchy

- **Display** (700, 2rem / 1.5rem bajo 576px, tracking −0.5px): saldos de KPI.
- **Headline** (700, 1.25rem, tracking −0.5px): nombres de cuenta destacados.
- **Title** (700, ~1.5rem, tracking −0.5px): wordmark KashFlow en el header.
- **Body** (400, 1rem): tabla, formularios, copy de UI.
- **Label** (600, 0.85rem, tracking 0.5px, uppercase): encabezados de columna.

**The Tabular Money Rule.** Los montos usan `font-variant-numeric: tabular-nums` y Grotesk o weight 600. Nunca un body proporcional para una columna de dinero.

## Layout

Bootstrap `container-lg` sobre un header full-bleed de vidrio (`blur(12px)`, borde inferior 1px). Ritmo de cards en filas: filtros, tres KPIs, top cuentas, libro diario. Padding de card ~1.25–1.5rem; celdas de tabla 1rem.

Debajo de 768px: padding de contenedor 15px, botones y tabla a 0.9rem, título a 1.5rem. Debajo de 576px: KPIs a 1.5rem. La PWA se usa en teléfono tanto como en desktop; la densidad tabular se comprime, no se convierte en marketing.

**The Report Grid Rule.** El dashboard es informe + carga, no un hero. Prioridad: header de secciones, KPIs, tabla. El espacio vacío es tinta, no un empty-state ilustrado.

## Elevation & Depth

Vidrio sobre tinta, no Material elevation. En reposo: blur 10px, sombra `0 4px 20px rgba(0,0,0,0.5)`, borde de pelo. En hover: `translateY(-2px)` (cards) o `−4px` (account-card), sombra más larga, borde un poco más visible. Los KPIs suman un glow del color semántico. El modal sube a `0 20px 40px rgba(0,0,0,0.8)` con backdrop blur 4px al 70%.

### Shadow Vocabulary

- **Card rest** (`0 4px 20px rgba(0,0,0,0.5)`): paneles en reposo.
- **Card hover** (`0 8px 30px rgba(0,0,0,0.6)`): lift.
- **Lamp glow** (`0 0 15px rgba(139, 92, 246, 0.3)`): KPI de saldo y CTA hover (`0 4px 12px`).
- **Focus ring** (`0 0 0 3px rgba(139, 92, 246, 0.15)`): inputs.
- **Modal** (`0 20px 40px rgba(0,0,0,0.8)`): overlay.

**The Glass-at-Rest Rule.** En reposo el vidrio es plano-translúcido. La sombra y el lift son respuesta de estado, no decoración permanente de cada caja.

## Shapes

Radios suaves, no píldora ni square-fintech.

- Scrollbar 4px
- Badges / chips 6px
- Botones, inputs, tabla en móvil 8px
- Cards y modales 16px

Bordes de 1px zinc; el vidrio usa `1px solid rgba(255,255,255,0.05)`. Sin círculos de avatar ni blobs.

**The 16/8/6 Rule.** Superficie 16, control 8, chip 6. No mezclar un botón pill con una card 16.

## Components

### Buttons

- **Shape:** radio 8px, padding `0.6rem 1.2rem`, weight 500, DM Sans, ease `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Primary:** fondo tinta violeta. Hover: violeta hover, lift −1px, glow violeta.
- **Success:** Haber; hover `#059669` + glow esmeralda.
- **Outline light:** borde blanco 15%, texto humo. Hover: velo blanco 5%.
- **Outline warning / danger / info:** oro, debe, violeta al 30–50% de borde; hover rellena al 10%.

### Chips

- Badge de cuenta: padding `0.5em 0.8em`, radio 6px, weight 600. El relleno es el gradiente del banco (Ualá azul, MP cian, BBVA gris, etc.), no la lámpara.

### Cards / Containers

- Radio 16px, fondo pizarra al 70% + blur 10px, borde de pelo, sombra de reposo.
- Header de card transparente, borde inferior zinc, padding 1.25–1.5rem.
- KPI cards: mismo vidrio + raya inferior de 2px en el color semántico y glow.

### Inputs / Fields

- Fondo encabezado, borde zinc, radio 8px, padding `0.6rem 1rem`.
- Focus: fondo tinta-media, borde lámpara, ring violeta 15%.
- Placeholder ceniza.

### Navigation

Header vidrio (`rgba(9,9,11,0.8)` + blur 12px). Grupos de sección (Movimientos / Obligaciones / Simulador) como `btn-group`. El activo es sólido claro; el resto outline. Cuentas usa outline violeta. Refresh outline light.

## Do's and Don'ts

### Do:

- **Do** poner Space Grotesk en wordmark, títulos y montos; DM Sans en controles y tabla.
- **Do** usar vidrio 16px y lámpara violeta solo en confirmación y saldo.
- **Do** pintar Haber/Debe/Oro según semántica contable, no según “estado de UI” genérico.
- **Do** lift + glow en hover; focus ring violeta en campos.

### Don't:

- **Don't** tratar particles.js como parte del sistema; es ruido legado.
- **Don't** usar el verde `#4CAF50` del `manifest.theme-color` como marca; la lámpara es violeta.
- **Don't** introducir fondo claro, serif editorial, ni acento distinto al de la lámpara.
- **Don't** pintar una transferencia interna como Debe.
- **Don't** redondear botones a píldora ni cards a 4px.
