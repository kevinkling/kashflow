-- 009_add_categories_and_cuotas.sql
-- Agrega tabla de categorias, columna categoria_id en transacciones y tabla cuotas_consumo
PRAGMA foreign_keys = ON;

-- Tabla de categorías para clasificar movimientos
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  icono TEXT,
  tipo TEXT, -- 'ingreso' | 'egreso' | 'neutral'
  fecha_creacion DATETIME DEFAULT (datetime('now','localtime'))
);

-- Agregar columna categoria_id a transacciones (nullable)
-- Nota: ALTER TABLE ADD COLUMN es soportado por SQLite
ALTER TABLE transacciones ADD COLUMN categoria_id INTEGER;

-- Tabla de cuotas generadas a partir de consumos de tarjeta
CREATE TABLE IF NOT EXISTS cuotas_consumo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consumo_id INTEGER NOT NULL, -- FK a consumos_tarjeta.id
  numero_cuota INTEGER NOT NULL,
  total_cuotas INTEGER NOT NULL,
  monto_cuota DECIMAL(15,2) NOT NULL,
  periodo TEXT, -- 'YYYY-MM' del período estimado de la cuota
  fecha_vencimiento_estimada DATE,
  instancia_resumen_id INTEGER, -- puede vincularse a instancias_compromiso cuando corresponda
  fecha_creacion DATETIME DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_cuotas_consumo_consumo ON cuotas_consumo(consumo_id);

 

