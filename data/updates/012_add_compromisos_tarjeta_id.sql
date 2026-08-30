-- 012_add_compromisos_tarjeta_id.sql
-- Agrega columna tarjeta_id a compromisos si no existe

PRAGMA foreign_keys = ON;

-- Agregar columna tarjeta_id a compromisos si aún no existe
BEGIN;
ALTER TABLE compromisos ADD COLUMN tarjeta_id INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_compromisos_tarjeta_id ON compromisos(tarjeta_id);
COMMIT;

