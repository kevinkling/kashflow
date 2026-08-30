-- 011_resumenes_tarjeta_y_cuotas.sql
-- Crea la tabla resumenes_tarjeta y agrega columnas relacionadas a instancias/compromisos

PRAGMA foreign_keys = ON;

-- Tabla para almacenar resúmenes de tarjetas de crédito por periodo
CREATE TABLE IF NOT EXISTS resumenes_tarjeta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarjeta_id INTEGER NOT NULL,
  periodo TEXT NOT NULL, -- Formato YYYY-MM
  monto_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  pagado INTEGER NOT NULL DEFAULT 0, -- 0=pendiente, 1=pagado
  fecha_vencimiento DATE,
  fecha_creacion DATETIME DEFAULT (datetime('now','localtime')),
  fecha_modificacion DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (tarjeta_id) REFERENCES tarjetas(id) ON DELETE CASCADE,
  UNIQUE (tarjeta_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_resumenes_tarjeta_tarjeta_periodo ON resumenes_tarjeta(tarjeta_id, periodo);

-- Nota: las columnas total_cuotas / es_compra en compromisos pueden haber sido creadas anteriormente.
-- Agregamos solo las columnas faltantes en instancias_compromiso.

-- Agrega columna para vincular una instancia a una tarjeta (si corresponde)
ALTER TABLE instancias_compromiso ADD COLUMN tarjeta_id INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_instancias_compromiso_tarjeta_id ON instancias_compromiso(tarjeta_id);

-- Agrega columna para vincular una instancia a un consumo de tarjeta (cuota)
ALTER TABLE instancias_compromiso ADD COLUMN consumo_tarjeta_id INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_instancias_compromiso_consumo_tarjeta_id ON instancias_compromiso(consumo_tarjeta_id);

