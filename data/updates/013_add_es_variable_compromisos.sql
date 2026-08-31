-- 013_add_es_variable_compromisos.sql
-- Permite elegir explícitamente si un compromiso (obligación) es de monto Fijo o Variable
-- en lugar de inferirlo por heurística de texto/compromiso_id.

ALTER TABLE compromisos ADD COLUMN es_variable INTEGER NOT NULL DEFAULT 0;
