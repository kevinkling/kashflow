# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

Cada user story MUST incluir Independent Test. Features de API de movimientos MUST ser verificables sin el dashboard.

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Monto con formato `es-AR` (`1.500,50`) vs punto decimal (`1500.50`)
- Reintento con el mismo `client_uid` (no debe duplicar)
- Cuenta inexistente o inactiva
- Transferencia interna con origen = destino
- Comprobante ilegible o texto vacío (sugerir, no persistir)
- Token del Atajo ausente o inválido (401)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]

Requisitos transversales (Constitución v1.0.0) — copiar o marcar N/A con justificación:

- **FR-AUTH**: Escritura MUST exigir `ATAJO_API_TOKEN`.
- **FR-TYPES**: Si hay movimiento, MUST distinguir ingreso, egreso, transferencia interna (neutra) y pago a tercero (gasto).
- **FR-CONFIRM**: Datos extraídos de comprobante MUST confirmarse antes de guardar.
- **FR-IDEM**: Cargas MUST aceptar `client_uid` y no duplicar.

### UX Requirements

- Textos de usuario MUST estar en español rioplatense.
- Respuesta del Atajo MUST incluir `mensaje` listo para notificación.
- El dashboard MUST NO convertirse en formulario de carga salvo que esta spec lo pida explícitamente.

### Key Entities *(include if feature involves data)*

- **Cuenta**: alias único, activa/inactiva, moneda
- **Transacción**: debe/haber, signo, monto absoluto, origen, subtipo, destinatario, client_uid
- **Transferencia interna**: origen y destino propios, dos asientos vinculados

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Métrica de tarea del usuario, e.g. "cargar un egreso en el Atajo en menos de 30 s"]
- **SC-002**: `POST` de movimiento p95 < 500 ms en red local
- **SC-003**: 0 filas duplicadas ante reintento con el mismo `client_uid`
- **SC-004**: Transferencia interna no incrementa el total de gastos del período

## Assumptions

- Un solo usuario operador
- iPhone con app Atajos; servidor alcanzable por HTTPS
- SQLite local; no hay API bancaria
