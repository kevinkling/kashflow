-- ============================================================================
-- MIGRACIÓN 004: Agregar constraint para tipo-signo en transacciones
-- Fecha: 2026-02-02
-- Descripción: Asegura la consistencia entre el tipo de transacción y su signo
--              - tipo 'debe'  debe tener signo  1
--              - tipo 'haber' debe tener signo -1
-- ============================================================================

-- SQLite no permite agregar CHECK constraints a tablas existentes directamente
-- Necesitamos recrear la tabla con la nueva constraint

-- IMPORTANTE: Primero eliminamos las vistas que dependen de la tabla transacciones
DROP VIEW IF EXISTS vista_saldos_cuentas;
DROP VIEW IF EXISTS vista_transacciones_completas;

-- 1. Crear tabla temporal con la nueva estructura
CREATE TABLE transacciones_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    cuenta_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('debe', 'haber')),
    signo INTEGER NOT NULL CHECK(signo IN (1, -1)),
    monto DECIMAL(15, 2) NOT NULL CHECK(monto > 0),
    descripcion TEXT NOT NULL,
    notas TEXT,
    transferencia_id INTEGER,
    telegram_message_id INTEGER,
    
    -- Claves foráneas
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (transferencia_id) REFERENCES transferencias(id) ON DELETE CASCADE,
    
    -- NUEVA CONSTRAINT: Validar que tipo y signo sean consistentes
    CHECK (
        (tipo = 'debe'  AND signo =  1) OR
        (tipo = 'haber' AND signo = -1)
    )
);

-- 2. Copiar datos de la tabla original a la nueva
INSERT INTO transacciones_new 
SELECT * FROM transacciones;

-- 3. Eliminar la tabla original
DROP TABLE transacciones;

-- 4. Renombrar la tabla nueva
ALTER TABLE transacciones_new RENAME TO transacciones;

-- 5. Recrear los índices
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha_hora);
CREATE INDEX idx_transacciones_cuenta_id ON transacciones(cuenta_id);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX idx_transacciones_transferencia ON transacciones(transferencia_id);

-- 6. Recrear las vistas que dependen de la tabla transacciones
CREATE VIEW vista_saldos_cuentas AS
SELECT 
    c.id AS cuenta_id,
    c.usuario_id,
    u.nombre AS usuario,
    c.nombre AS cuenta,
    c.alias,
    c.color,
    c.moneda,
    COALESCE(SUM(t.monto * t.signo), 0) AS saldo_actual,
    COUNT(t.id) AS cantidad_transacciones
FROM cuentas c
LEFT JOIN transacciones t ON c.id = t.cuenta_id
LEFT JOIN usuarios u ON c.usuario_id = u.id
WHERE c.activa = 1
GROUP BY c.id, c.usuario_id, u.nombre, c.nombre, c.alias, c.color, c.moneda;

CREATE VIEW vista_transacciones_completas AS
SELECT 
    t.id,
    t.fecha_hora,
    u.nombre AS usuario,
    c.nombre AS cuenta,
    c.alias AS cuenta_alias,
    c.color AS cuenta_color,
    t.tipo,
    t.monto,
    t.signo,
    t.monto * t.signo AS monto_con_signo,
    t.descripcion,
    t.notas,
    CASE 
        WHEN t.transferencia_id IS NOT NULL THEN 'Transferencia'
        ELSE 'Transacción normal'
    END AS tipo_operacion,
    t.transferencia_id,
    t.telegram_message_id
FROM transacciones t
JOIN cuentas c ON t.cuenta_id = c.id
JOIN usuarios u ON c.usuario_id = u.id
ORDER BY t.fecha_hora DESC;
