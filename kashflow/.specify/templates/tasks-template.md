---
description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: OBLIGATORIOS para parsers de dinero, auth del Atajo, tipos de movimiento e idempotencia (`client_uid`). OPTIONAL para cambios solo de CSS del dashboard. Tests MUST usar SQLite temporal, nunca `data/kashflow.db`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- API: `api/routes/`, `api/services/`
- Schema: `data/updates/NNN_descripcion.sql`
- Tests: `temp/` o `tests/` con DB temporal
- Dashboard (informe): `public/`
- Paths below asumen el repo KashFlow (Express + SQLite)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 [P] Confirm `ATAJO_API_TOKEN` documented in `.env.example`
- [ ] T003 [P] Configure test runner so `pnpm test` exits non-zero on failure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add schema migration in `data/updates/` if the feature touches SQLite (additive when possible)
- [ ] T005 [P] Auth middleware for Atajo write routes (`Authorization: Bearer` / `X-Api-Key`)
- [ ] T006 [P] Shared validation helpers (monto `es-AR`, alias de cuenta)
- [ ] T007 Ensure Telegram (if still in tree) MUST NOT block process startup
- [ ] T008 Error JSON shape `{ ok: false, error }` on 4xx/5xx of Atajo routes

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> Omit this subsection ONLY if the story does not touch money parsers, Atajo auth, or persistence.

- [ ] T010 [P] [US1] Auth test: missing token → 401
- [ ] T011 [P] [US1] Contract/integration test against temp SQLite in `tests/` or `temp/`

### Implementation for User Story 1

- [ ] T012 [US1] Persist via `api/services/dbHelper.js` (no duplicated SQL in routes)
- [ ] T013 [US1] Route/handler in `api/routes/`
- [ ] T014 [US1] Validation and actionable Spanish errors
- [ ] T015 [US1] Stable JSON (`ok`, `mensaje`, `duplicado` when applicable)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2

- [ ] T018 [P] [US2] Integration test on temp SQLite

### Implementation for User Story 2

- [ ] T020 [US2] Implement in `api/` (and `public/` only if spec says the dashboard changes)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Update README contract for Atajo JSON if the API changed
- [ ] TXXX Confirm transferencia interna does not inflate expenses
- [ ] TXXX Confirm no comprobante files are stored
- [ ] TXXX Run `pnpm test` and quickstart.md validation
- [ ] TXXX Constitution Check re-run (quality, tests, UX, performance)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests (when required by Constitution II) MUST be written and FAIL before implementation
- dbHelper before routes
- Validation before persistence
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Tests marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- Commit after each task or logical group
- Avoid: vague tasks, same file conflicts, persistence that bypasses `dbHelper`
