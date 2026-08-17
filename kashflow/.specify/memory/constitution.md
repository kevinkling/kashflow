<!--
Sync Impact Report
- Version change: (unratified template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Calidad de código
  - [PRINCIPLE_2_NAME] → II. Estándares de testing
  - [PRINCIPLE_3_NAME] → III. Consistencia de experiencia de usuario
  - [PRINCIPLE_4_NAME] → IV. Requisitos de performance
  - [PRINCIPLE_5_NAME] → V. Simplicidad y alcance personal
- Added sections: Seguridad y datos; Flujo de desarrollo
- Removed sections: none (template placeholders replaced)
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ updated (Constitution Check con gates)
  - .specify/templates/spec-template.md ✅ updated (UX, testing, performance)
  - .specify/templates/tasks-template.md ✅ updated (tests obligatorios en API)
  - .specify/templates/commands/*.md ⚠ pending (no hay carpeta commands)
- Follow-up TODOs: none
-->

# Constitución de KashFlow

## Core Principles

### I. Calidad de código

El código MUST permanecer legible para un único mantenedor y para un agente de IA.

- MUST usar JavaScript (Node.js >= 18) en el backend y JavaScript vanilla en el dashboard. No se introduce un framework de frontend sin enmendar esta constitución.
- MUST mantener módulos con una responsabilidad clara: rutas en `api/routes/`, persistencia en `api/services/dbHelper.js`, parsers en servicios dedicados.
- MUST usar prepared statements (`?`) en toda consulta SQLite. Concatenar SQL con input del usuario está prohibido.
- MUST validar inputs en el borde (ruta o parser) antes de tocar la base. Un payload inválido MUST devolver 4xx con `{ ok: false, error }` en JSON estable.
- MUST preservar operaciones atómicas en transferencias internas: las dos transacciones y el registro de `transferencias` se crean juntas o no se crea ninguna.
- MUST evitar duplicar reglas de negocio. Ingreso, egreso, transferencia interna y pago a tercero MUST pasar por las mismas funciones de `dbHelper`, independientemente de la interfaz (Atajo, web, u otra).
- SHOULD extraer helpers cuando un bloque se copia en más de un archivo. MUST NOT agregar capas (repositorios, DI, ORMs) sin una violación documentada en Complexity Tracking.
- MUST NO commitear secretos. Tokens viven en `.env` (gitignored) y se documentan solo en `.env.example`.

**Rationale**: KashFlow es un libro diario personal. La deuda de arquitectura duele más que la falta de abstracción.

### II. Estándares de testing

Ningún endpoint de escritura y ningún parser de dinero se consideran terminados sin una prueba que falle primero y luego pase.

- MUST cubrir con tests automatizados: parseo de montos (formato `es-AR` y punto decimal), autenticación del Atajo (401 sin token), los cuatro tipos de movimiento, idempotencia por `client_uid`, y análisis de comprobante (texto vacío y texto típico).
- MUST ejecutar esos tests contra una base SQLite temporal. Está prohibido usar `data/kashflow.db` real en tests.
- MUST verificar que un reintento con el mismo `client_uid` no inserta una segunda fila.
- MUST incluir al menos un caso de cuenta inexistente, monto no positivo, y transferencia con origen = destino.
- SHOULD agregar un script `pnpm test` que falle el proceso (exit ≠ 0) si algún caso falla. El placeholder `echo "Error: no test specified"` NO cumple este principio.
- Tests de UI del dashboard SHOULD existir cuando se cambie renderizado de saldos o filtros; no son bloqueantes para cambios solo de API.
- Un cambio de contrato JSON del Atajo MUST actualizar tests de contrato en la misma entrega.

**Rationale**: Un movimiento duplicado o un monto mal parseado corrompe el libro. El test es más barato que corregir a mano.

### III. Consistencia de experiencia de usuario

Cada interfaz MUST hablar el mismo idioma financiero y devolver el mismo resultado para la misma operación.

- MUST usar español rioplatense en textos de usuario (Atajo, dashboard, mensajes de error). Etiquetas: Ingreso, Egreso, Transferencia interna, Pago a otra persona.
- MUST tratar una transferencia entre cuentas propias como neutra (no suma gasto). MUST tratar un pago o transferencia a un tercero como egreso.
- MUST pedir confirmación antes de persistir cuando los datos vienen de un comprobante. El OCR MAY sugerir campos; NEVER guarda sin confirmación del usuario.
- MUST devolver en respuestas del Atajo un JSON pequeño y estable: `ok`, `id`, `tipo`, `cuenta`, `monto`, `descripcion`, `mensaje`, y `duplicado` cuando aplique. El campo `mensaje` MUST ser una frase lista para notificación.
- MUST formatear montos al usuario con `es-AR` (miles con punto, decimales con coma) y moneda ARS por defecto.
- El dashboard MUST permanecer como informe. Esta constitución NO autoriza convertir la web en formulario de carga salvo enmienda.
- MUST NO cambiar el significado de alias de cuenta entre interfaces: el alias es case-insensitive y MUST coincidir con `cuentas.alias`.
- Errores MUST ser accionables ("La cuenta bbva no existe o está inactiva"), nunca un stack trace.

**Rationale**: Si el Atajo y el informe discrepan, el usuario deja de confiar en el saldo.

### IV. Requisitos de performance

KashFlow es de un usuario. La latencia percibida en el iPhone y el arranque del servidor mandan, no el throughput masivo.

- MUST responder `POST /api/atajo/movimiento` y `GET /api/atajo/cuentas` en menos de 500 ms en red local (p95), excluyendo el tiempo de red del túnel.
- MUST arrancar el proceso Node y abrir SQLite en menos de 5 segundos en el hardware de deploy habitual.
- MUST usar índices en `fecha_hora`, `cuenta_id` y `client_uid` (único parcial cuando no es NULL). Una feature nueva que filtre por columna sin índice MUST agregar el índice en la misma migración.
- MUST NOT guardar imagen ni PDF de comprobantes en el MVP. El servidor MUST aceptar texto extraído; el archivo se descarta en el dispositivo.
- MUST evitar N+1: listar movimientos MUST usar vistas o un JOIN, no un query por fila.
- SHOULD mantener el dashboard como HTML/CSS/JS estático servido por Express, sin bundler, salvo enmienda.
- MUST NOT introducir un servicio extra (Redis, colas, Postgres) para carga personal. SQLite en archivo local es el almacén.
- Una migración MUST ser aditiva cuando sea posible. Recrear tablas grandes MUST documentarse y MUST preservar filas existentes.

**Rationale**: El Atajo se usa en la calle, en un toque. Si tarda o pesa, no se usa.

### V. Simplicidad y alcance personal

KashFlow MUST resolver el libro de un hogar, no una fintech.

- MUST preferir la solución más chica que cumpla la spec. YAGNI aplica: sin multi-tenant, sin Open Banking, sin app nativa, hasta enmendar.
- MUST versionar el esquema con archivos `data/updates/NNN_descripcion.sql` y NEVER borrar datos de producción desde `schema.sql` en runtime.
- Una interfaz descontinuada (Telegram) MUST NO bloquear el arranque. El servidor MUST levantar aunque falten `BOT_TOKEN` o `WEBHOOK_URL`.
- Complejidad extra MUST registrarse en la tabla Complexity Tracking del plan, con alternativa más simple rechazada.

**Rationale**: El alcance personal es una restricción de diseño, no una deuda a "completar después".

## Seguridad y datos

- Escritura vía Atajo MUST autenticarse con `ATAJO_API_TOKEN` (`Authorization: Bearer` o `X-Api-Key`). Un endpoint de escritura anónimo está prohibido.
- Columnas históricas (`telegram_user_id`, `telegram_message_id`) MUST conservarse. Borrarlas exige migración justificada; no forman parte del runtime del Atajo.
- Backups del archivo SQLite SHOULD hacerse copiando `kashflow.db`. El deploy MUST montar `data/` en un volumen persistente.
- Logs MUST NO imprimir el token del Atajo ni el contenido completo de comprobantes en producción.

## Flujo de desarrollo

1. Spec (`/speckit-specify`) → plan (`/speckit-plan`) → tasks (`/speckit-tasks`) → implementación.
2. El Constitution Check del plan MUST pasar antes de Phase 0. Si un gate falla, o se rediseña o se justifica en Complexity Tracking.
3. Cada feature de API MUST incluir la migración SQL (si cambia esquema), tests, y actualización de README del contrato JSON.
4. `pnpm test` MUST pasar antes de considerar la feature lista.
5. El dashboard no se modifica en features de carga móvil salvo que la spec lo pida de forma explícita.

## Governance

Esta constitución prevalece sobre README, project_brief y preferencias ad hoc del agente.

- Enmiendas MUST actualizar `.specify/memory/constitution.md`, bump de versión semántica, `LAST_AMENDED_DATE`, y el Sync Impact Report.
- MAJOR: se elimina o se redefine un principio de forma incompatible (por ejemplo, permitir escritura anónima, o volver a Telegram como interfaz de carga).
- MINOR: se agrega un principio o una sección de compliance.
- PATCH: aclaraciones, typos, umbrales numéricos más precisos sin cambiar la regla.
- Reviews y PRs MUST verificar: tests de movimientos, ausencia de secretos, y que transferencias internas no inflen gastos.
- Runtime guidance: `README.md` para el contrato del Atajo; este archivo para reglas no negociables.

**Version**: 1.0.0 | **Ratified**: 2026-08-17 | **Last Amended**: 2026-08-17
