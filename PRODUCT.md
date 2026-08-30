# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Kevin, único operador. Usa KashFlow para llevar su propio libro de cuentas argentinas (bancos, billeteras, tarjetas) y para anticipar el mes. No hay otros operadores ni un libro familiar compartido hoy.

## Product Purpose

KashFlow es el sistema personal para **registrar lo que pasó** y **anticipar lo que hay que pagar**, al mismo nivel.

Éxito: poder cargar un movimiento en el momento (Atajo en el iPhone o dashboard web), ver saldos y el libro diario con confianza, y saber qué obligaciones vencen y qué escenario de pago es viable, también desde el teléfono.

## Positioning

Un libro diario self-hosted, con captura en lenguaje natural / Atajo autenticado **y** planificación de obligaciones/simulaciones en la misma app. Un tracker genérico no tiene el parser rioplatense ni el modelo de compromisos/instancias; una planilla de deudas no es el libro contable (debe/haber, transferencias internas neutras, alias de cuenta).

## Operating Context

- Captura en la calle o en casa: Atajo de iOS autenticado (`ATAJO_API_TOKEN`) y, de forma equivalente, el dashboard web.
- Consulta y gestión en navegador / PWA (`public/manifest.json`, display standalone), en teléfono tanto como en desktop.
- Superficies web de primera clase: Movimientos, Obligaciones, Simulador, Cuentas.
- Persistencia local SQLite (`data/kashflow.db`), timezone `America/Argentina/Buenos_Aires`, montos `es-AR` / ARS por defecto.
- Telegram existió como canal de carga; el servidor debe arrancar sin `BOT_TOKEN` / `WEBHOOK_URL`. No es la interfaz de captura vigente.
- Calidad, tests y stack no negociables: `kashflow/.specify/memory/constitution.md`.

## Capabilities and Constraints

**Confirmado**

- Movimientos: ingreso, egreso, transferencia interna (neutra, no infla gasto), pago a tercero (egreso). Alias de cuenta case-insensitive.
- Dashboard web **sí carga y edita** movimientos y cuentas; no es solo informe.
- Obligaciones y Simulador son capacidades de primera clase (compromisos, instancias, tarjetas, cuotas, escenarios).
- Stack actual: Node.js + Express, SQLite (better-sqlite3), HTML/CSS/JS vanilla servido por Express, pnpm, Docker. Sin framework de frontend salvo enmendar la constitución.
- Escritura vía Atajo autenticada. Sin multi-tenant / Open Banking / app nativa.
- Idioma de interfaz: español rioplatense.

**Abierto (no inventar)**

- Enmienda formal de la constitución III («el dashboard MUST permanecer como informe»): el producto ya contradice esa cláusula; el archivo de constitución no se cambió en este init.
- Multi-usuario / libro del hogar: explícitamente fuera de alcance ahora.
- Accesibilidad normativa (WCAG u otra): no establecida.

## Brand Commitments

- Nombre: **KashFlow**.
- Voz: español rioplatense; etiquetas financieras fijas: Ingreso, Egreso, Transferencia interna, Pago a otra persona.
- Personalidad: herramienta de un solo mantenedor; claridad y confianza en el saldo por encima de marketing.
- Assets: `public/icons/favicon.ico`; no hay logo de marca aparte ni guía visual vinculante en este archivo.

## Evidence on Hand

- Código y datos reales del operador (cuentas, movimientos, import de obligaciones desde xlsx).
- Documentación: `README.md`, `project_brief.md`, constitución Speckit.
- PWA: `public/manifest.json`, `public/sw.js`.
- No fabricar testimonios, clientes, benchmarks, precios ni claims de usuarios ajenos a Kevin.

## Product Principles

1. El saldo tiene que ser creíble: misma operación, mismo resultado, en Atajo y en la web.
2. Cargar no puede ser un trámite: captura rápida donde está el usuario (teléfono o escritorio).
3. El pasado (libro) y el próximo vencimiento (obligaciones/simulación) son el mismo producto.
4. Alcance de un hogar de un operador: la solución más chica que cumple; sin fintech.
5. Datos bajo control del operador: SQLite local, secretos fuera del repo, backups copiando el archivo.
