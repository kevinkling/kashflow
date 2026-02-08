-- Migración: Actualizar vistas para transacciones y administración de cuentas
-- Fecha: 2026-02-08
-- Descripción: Agrega cuenta_id a vista_transacciones_completas y crea vista_saldos_cuentas_admin

-- Eliminar vistas anteriores si existen
DROP VIEW IF EXISTS vista_transacciones_completas;
DROP VIEW IF EXISTS vista_saldos_cuentas_admin;

-- Recrear vista_transacciones_completas con cuenta_id
CREATE VIEW vista_transacciones_completas AS
SELECT 
    t.id,
    t.fecha_hora,
    u.nombre AS usuario,
    c.id AS cuenta_id,
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

-- Crear vista_saldos_cuentas_admin para ver TODAS las cuentas (activas e inactivas)
CREATE VIEW vista_saldos_cuentas_admin AS
SELECT 
    c.id AS cuenta_id,
    c.usuario_id,
    u.nombre AS usuario,
    c.nombre AS cuenta,
    c.alias,
    c.color,
    c.moneda,
    c.activa,
    COALESCE(SUM(t.monto * t.signo), 0) AS saldo_actual,
    COUNT(t.id) AS cantidad_transacciones
FROM cuentas c
LEFT JOIN transacciones t ON c.id = t.cuenta_id
LEFT JOIN usuarios u ON c.usuario_id = u.id
GROUP BY c.id, c.usuario_id, u.nombre, c.nombre, c.alias, c.color, c.moneda, c.activa;
