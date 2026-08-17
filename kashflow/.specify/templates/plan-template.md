# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

**Language/Version**: Node.js >= 18 (JavaScript)

**Primary Dependencies**: Express 5, better-sqlite3; dashboard HTML/CSS/JS vanilla

**Storage**: SQLite (`data/kashflow.db`), migraciones en `data/updates/`

**Testing**: tests automatizados contra SQLite temporal (nunca `data/kashflow.db` real)

**Target Platform**: API self-hosted + Atajo de iOS; dashboard web como informe

**Project Type**: api + static web + iOS Shortcut (no app nativa)

**Performance Goals**: p95 < 500 ms en `POST /api/atajo/movimiento` y `GET /api/atajo/cuentas` en red local; arranque < 5 s

**Constraints**: un usuario; sin escritura anónima; sin guardar comprobantes; SQLite only

**Scale/Scope**: libro diario personal / un hogar

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates (Constitución v1.0.0). Marcar PASS / FAIL. FAIL bloquea salvo fila en Complexity Tracking.

- **Calidad**: ¿La feature reutiliza `dbHelper` y prepared statements? ¿Validación en el borde con JSON `{ ok, error }`?
- **Testing**: ¿Hay tests que fallen primero para parsers de monto, auth del Atajo, tipos de movimiento, e idempotencia `client_uid`? ¿Usan DB temporal?
- **UX**: ¿Ingreso / Egreso / Transferencia interna (neutra) / Pago a tercero (gasto) conservan el mismo significado? ¿El Atajo devuelve `mensaje` listo para notificación? ¿El dashboard sigue siendo informe?
- **Performance**: ¿Respuesta de escritura < 500 ms local? ¿Sin N+1? ¿Sin archivos de comprobante en disco? ¿Índice si hay filtro nuevo?
- **Simplicidad**: ¿El servidor arranca sin Telegram? ¿No se agrega Redis/Postgres/framework frontend?
- **Seguridad**: ¿Toda escritura del Atajo exige `ATAJO_API_TOKEN`? ¿Sin secretos en git?

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (`/speckit-plan` output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (`/speckit-tasks` — NOT created by `/speckit-plan`)
```

### Source Code (repository root)

```text
api/
├── index.js
├── routes/
│   ├── atajo.js
│   ├── cuentas.js
│   └── web.js
├── services/
│   ├── atajoAuth.js
│   ├── comprobanteParser.js
│   ├── db.js
│   ├── dbHelper.js
│   └── utils.js
└── bots/                # descontinuado; MUST NOT bloquear el arranque
data/
├── schema.sql
└── updates/
public/                  # dashboard informe (vanilla JS)
```

**Structure Decision**: Monolito Express + SQLite + estáticos. El Atajo es cliente HTTP, no hay carpeta `ios/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., nuevo servicio] | [need] | [why SQLite/Express insufficient] |
