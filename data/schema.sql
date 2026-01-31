-- ============================================================================
-- SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS
-- Sistema de Finanzas Personales
-- Base de datos: SQLite
-- ============================================================================

-- Eliminar tablas si existen (útil para desarrollo/testing)
DROP TABLE IF EXISTS transacciones;
DROP TABLE IF EXISTS transferencias;
DROP TABLE IF EXISTS cuentas;
DROP TABLE IF EXISTS usuarios;

-- ============================================================================
-- TABLA: usuarios
-- Descripción: Almacena los usuarios del sistema (vos, tu papá, etc.)
-- ============================================================================
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas por telegram_user_id
CREATE INDEX idx_usuarios_telegram_id ON usuarios(telegram_user_id);

-- ============================================================================
-- TABLA: cuentas
-- Descripción: Cuentas bancarias, billeteras virtuales, efectivo, etc.
-- ============================================================================
CREATE TABLE cuentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    alias TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,  -- Formato hex: #FF5733
    moneda TEXT NOT NULL DEFAULT 'ARS',  -- ARS, USD, EUR, etc.
    activa BOOLEAN NOT NULL DEFAULT 1,  -- 1=activa, 0=inactiva
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Clave foránea
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para mejorar performance
CREATE INDEX idx_cuentas_usuario_id ON cuentas(usuario_id);
CREATE INDEX idx_cuentas_activa ON cuentas(activa);
CREATE INDEX idx_cuentas_alias ON cuentas(alias);

-- ============================================================================
-- TABLA: transferencias
-- Descripción: Registra transferencias entre cuentas
-- ============================================================================
CREATE TABLE transferencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cuenta_origen_id INTEGER NOT NULL,
    cuenta_destino_id INTEGER NOT NULL,
    monto DECIMAL(15, 2) NOT NULL CHECK(monto > 0),
    descripcion TEXT,
    
    -- Claves foráneas
    FOREIGN KEY (cuenta_origen_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    
    -- Validación: origen y destino deben ser diferentes
    CHECK (cuenta_origen_id != cuenta_destino_id)
);

-- Índices para búsquedas
CREATE INDEX idx_transferencias_fecha ON transferencias(fecha_hora);
CREATE INDEX idx_transferencias_origen ON transferencias(cuenta_origen_id);
CREATE INDEX idx_transferencias_destino ON transferencias(cuenta_destino_id);

-- ============================================================================
-- TABLA: transacciones
-- Descripción: Libro diario - Todos los movimientos de dinero
-- ============================================================================
CREATE TABLE transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cuenta_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('debe', 'haber')),
    signo INTEGER NOT NULL CHECK(signo IN (1, -1)),
    monto DECIMAL(15, 2) NOT NULL CHECK(monto > 0),
    descripcion TEXT NOT NULL,
    notas TEXT,
    transferencia_id INTEGER,  -- NULL si no es transferencia
    telegram_message_id INTEGER,
    
    -- Claves foráneas
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (transferencia_id) REFERENCES transferencias(id) ON DELETE CASCADE
);

-- Índices para mejorar performance en consultas frecuentes
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha_hora);
CREATE INDEX idx_transacciones_cuenta_id ON transacciones(cuenta_id);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX idx_transacciones_transferencia ON transacciones(transferencia_id);
CREATE INDEX idx_transacciones_cuenta_fecha ON transacciones(cuenta_id, fecha_hora);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Validar que tipo y signo sean consistentes
CREATE TRIGGER validar_tipo_signo BEFORE INSERT ON transacciones
BEGIN
    SELECT CASE
        WHEN (NEW.tipo = 'debe' AND NEW.signo != 1) THEN
            RAISE(ABORT, 'Error: tipo "debe" debe tener signo = 1')
        WHEN (NEW.tipo = 'haber' AND NEW.signo != -1) THEN
            RAISE(ABORT, 'Error: tipo "haber" debe tener signo = -1')
    END;
END;

-- ============================================================================
-- VISTAS ÚTILES
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
ORDER BY tr.fecha_hora DESC;

-- ============================================================================
-- DATOS INICIALES DE EJEMPLO (Opcional - comentar si no se necesitan)
-- ============================================================================

-- Insertar usuario de ejemplo
-- INSERT INTO usuarios (telegram_user_id, nombre) VALUES (123456789, 'Vos');
-- INSERT INTO usuarios (telegram_user_id, nombre) VALUES (987654321, 'Papá');

-- Insertar cuentas de ejemplo
-- INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda) 
-- VALUES 
--     (1, 'MercadoPago', 'MP', '#00B1EA', 'ARS'),
--     (1, 'Uala', 'uala', '#FF4D4D', 'ARS'),
--     (1, 'BBVA', 'bbva', '#004481', 'ARS'),
--     (1, 'Efectivo', 'efectivo', '#4CAF50', 'ARS');

-- ============================================================================
-- QUERIES ÚTILES PARA CONSULTAS
-- ============================================================================

-- Ver saldo de todas las cuentas:
-- SELECT * FROM vista_saldos_cuentas;

-- Ver últimas 10 transacciones:
-- SELECT * FROM vista_transacciones_completas LIMIT 10;

-- Ver todas las transferencias:
-- SELECT * FROM vista_transferencias_completas;

-- Calcular saldo de una cuenta específica:
-- SELECT 
--     c.nombre,
--     c.alias,
--     SUM(t.monto * t.signo) AS saldo
-- FROM cuentas c
-- LEFT JOIN transacciones t ON c.id = t.cuenta_id
-- WHERE c.alias = 'MP'
-- GROUP BY c.id;

-- Ver movimientos del mes actual de una cuenta:
-- SELECT 
--     fecha_hora,
--     tipo,
--     monto,
--     descripcion
-- FROM vista_transacciones_completas
-- WHERE cuenta_alias = 'MP'
--   AND strftime('%Y-%m', fecha_hora) = strftime('%Y-%m', 'now')
-- ORDER BY fecha_hora DESC;

-- Total de ingresos y gastos del mes actual:
-- SELECT 
--     SUM(CASE WHEN tipo = 'debe' THEN monto ELSE 0 END) AS total_ingresos,
--     SUM(CASE WHEN tipo = 'haber' THEN monto ELSE 0 END) AS total_gastos,
--     SUM(monto * signo) AS balance
-- FROM transacciones
-- WHERE strftime('%Y-%m', fecha_hora) = strftime('%Y-%m', 'now');

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================