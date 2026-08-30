CREATE UNIQUE INDEX IF NOT EXISTS idx_instancias_compromiso_periodo
ON instancias_compromiso(compromiso_id, periodo)
WHERE compromiso_id IS NOT NULL AND periodo IS NOT NULL;
