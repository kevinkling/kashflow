-- Migración: Cambiar CURRENT_TIMESTAMP a datetime('now', 'localtime')
-- Versión: 1
-- Descripción: Actualiza las columnas de fecha para usar hora local en lugar de UTC
-- Tablas afectadas: usuarios, cuentas, transferencias, transacciones
-- Fecha: 2026-02-01
--
-- IMPORTANTE: 
-- 1. Las vistas se eliminan primero y se recrean al final
-- 2. El orden de tablas está optimizado para no romper foreign keys
-- 3. Todos los datos existentes se preservan
-- 4. Los índices se recrean automáticamente

-- ============================================================================
-- PASO 0: Eliminar todas las vistas (dependen de las tablas)
-- ============================================================================

DROP VIEW IF EXISTS vista_saldos_cuentas;
DROP VIEW IF EXISTS vista_transacciones_completas;
DROP VIEW IF EXISTS vista_transferencias_completas;

-- ============================================================================
-- PASO 1: Migrar TRANSACCIONES (depende de cuentas y transferencias)
-- ============================================================================

CREATE TABLE transacciones_nueva (
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
    
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (transferencia_id) REFERENCES transferencias(id) ON DELETE CASCADE
);

INSERT INTO transacciones_nueva SELECT * FROM transacciones;
DROP TABLE transacciones;
ALTER TABLE transacciones_nueva RENAME TO transacciones;

-- Recrear índices de transacciones
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha_hora);
CREATE INDEX idx_transacciones_cuenta_id ON transacciones(cuenta_id);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX idx_transacciones_transferencia ON transacciones(transferencia_id);
CREATE INDEX idx_transacciones_cuenta_fecha ON transacciones(cuenta_id, fecha_hora);

-- ============================================================================
-- PASO 2: Migrar TRANSFERENCIAS (depende de cuentas)
-- ============================================================================

CREATE TABLE transferencias_nueva (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    cuenta_origen_id INTEGER NOT NULL,
    cuenta_destino_id INTEGER NOT NULL,
    monto DECIMAL(15, 2) NOT NULL CHECK(monto > 0),
    descripcion TEXT,
    
    FOREIGN KEY (cuenta_origen_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    
    CHECK (cuenta_origen_id != cuenta_destino_id)
);

INSERT INTO transferencias_nueva SELECT * FROM transferencias;
DROP TABLE transferencias;
ALTER TABLE transferencias_nueva RENAME TO transferencias;

-- Recrear índices de transferencias
CREATE INDEX idx_transferencias_fecha ON transferencias(fecha_hora);
CREATE INDEX idx_transferencias_origen ON transferencias(cuenta_origen_id);
CREATE INDEX idx_transferencias_destino ON transferencias(cuenta_destino_id);

-- ============================================================================
-- PASO 3: Migrar CUENTAS (depende de usuarios)
-- ============================================================================

CREATE TABLE cuentas_nueva (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    alias TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'ARS',
    activa BOOLEAN NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

INSERT INTO cuentas_nueva SELECT * FROM cuentas;
DROP TABLE cuentas;
ALTER TABLE cuentas_nueva RENAME TO cuentas;

-- Recrear índices de cuentas
CREATE INDEX idx_cuentas_usuario_id ON cuentas(usuario_id);
CREATE INDEX idx_cuentas_activa ON cuentas(activa);
CREATE INDEX idx_cuentas_alias ON cuentas(alias);

-- ============================================================================
-- PASO 4: Migrar USUARIOS (no depende de nadie)
-- ============================================================================

CREATE TABLE usuarios_nueva (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
);

INSERT INTO usuarios_nueva SELECT * FROM usuarios;
DROP TABLE usuarios;
ALTER TABLE usuarios_nueva RENAME TO usuarios;

-- Recrear índice de usuarios
CREATE INDEX idx_usuarios_telegram_id ON usuarios(telegram_user_id);

-- ============================================================================
-- PASO 5: Recrear las vistas con las tablas actualizadas
-- ============================================================================

-- Vista: Saldos actuales de todas las cuentas activas
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

-- Vista: Resumen de transacciones con información de cuenta
CREATE VIEW vista_transacciones_completas AS
SELECT 
    t.id,
    t.fecha_hora,
    u.nombre AS usuario,
    c.nombre AS cuenta,
    c.alias AS cuenta_alias,
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

-- Vista: Detalle de transferencias con cuentas origen y destino
CREATE VIEW vista_transferencias_completas AS
SELECT 
    tr.id,
    tr.fecha_hora,
    co.nombre AS cuenta_origen,
    co.alias AS alias_origen,
    uo.nombre AS usuario_origen,
    cd.nombre AS cuenta_destino,
    cd.alias AS alias_destino,
    ud.nombre AS usuario_destino,
    tr.monto,
    tr.descripcion
FROM transferencias tr
JOIN cuentas co ON tr.cuenta_origen_id = co.id
JOIN cuentas cd ON tr.cuenta_destino_id = cd.id
JOIN usuarios uo ON co.usuario_id = uo.id
JOIN usuarios ud ON cd.usuario_id = ud.id
ORDER BY tr.fecha_hora DESC;;