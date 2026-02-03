-- ============================================================================
-- SCRIPT DE ACTUALIZACIÓN 002
-- Agregar campo color a la vista de transacciones completas
-- ============================================================================

-- Eliminar la vista existente
DROP VIEW IF EXISTS vista_transacciones_completas;

-- Recrear la vista con el campo color
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
