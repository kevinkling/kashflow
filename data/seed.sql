-- ============================================================================
-- SCRIPT DE DATOS INICIALES (SEED)
-- Sistema de Finanzas Personales - KashFlow
-- ============================================================================

-- Limpiar datos existentes (solo en desarrollo)
-- DELETE FROM transacciones;
-- DELETE FROM transferencias;
-- DELETE FROM cuentas;
-- DELETE FROM usuarios;

-- ============================================================================
-- INSERTAR USUARIOS DE EJEMPLO
-- ============================================================================

INSERT INTO usuarios (telegram_user_id, nombre) 
VALUES 
  (123456789, 'Usuario Demo'),
  (987654321, 'Usuario Secundario')
ON CONFLICT(telegram_user_id) DO NOTHING;

-- ============================================================================
-- INSERTAR CUENTAS DE EJEMPLO
-- ============================================================================

INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda) 
VALUES 
  -- Cuentas del primer usuario
  (1, 'MercadoPago', 'MP', '#00B1EA', 'ARS'),
  (1, 'Uala', 'uala', '#FF4D4D', 'ARS'),
  (1, 'BBVA', 'bbva', '#004481', 'ARS'),
  (1, 'Efectivo', 'efectivo', '#4CAF50', 'ARS'),
  (1, 'Dólares', 'usd', '#2E7D32', 'USD'),
  
  -- Cuentas del segundo usuario
  (2, 'Banco Nación', 'nacion', '#003366', 'ARS'),
  (2, 'Brubank', 'brubank', '#FF6B35', 'ARS')
ON CONFLICT(alias) DO NOTHING;

-- ============================================================================
-- INSERTAR TRANSACCIONES DE EJEMPLO
-- ============================================================================

-- Ingreso de sueldo en MercadoPago
INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion, notas)
VALUES (1, 'debe', 1, 500000.00, 'Sueldo enero 2026', 'Depósito de sueldo mensual');

-- Gasto en supermercado
INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion, notas)
VALUES (1, 'haber', -1, 45000.00, 'Compras supermercado', 'Coto');

-- Ingreso extra en Uala
INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion, notas)
VALUES (2, 'debe', 1, 30000.00, 'Freelance proyecto', 'Pago por desarrollo web');

-- Gasto de servicios
INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion, notas)
VALUES (3, 'haber', -1, 15000.00, 'Pago de luz', 'Edenor - enero 2026');

-- Retiro de efectivo
INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion, notas)
VALUES (4, 'debe', 1, 20000.00, 'Retiro cajero', 'Link - Shopping');

-- ============================================================================
-- INSERTAR TRANSFERENCIA DE EJEMPLO
-- ============================================================================

-- Transferencia de MercadoPago a BBVA
INSERT INTO transferencias (cuenta_origen_id, cuenta_destino_id, monto, descripcion)
VALUES (1, 3, 100000.00, 'Ahorro mensual');

-- Obtener el ID de la transferencia recién creada
-- Crear las dos transacciones asociadas
INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion, transferencia_id)
VALUES 
  (1, 'haber', -1, 100000.00, 'Ahorro mensual', (SELECT id FROM transferencias ORDER BY id DESC LIMIT 1)),
  (3, 'debe', 1, 100000.00, 'Ahorro mensual', (SELECT id FROM transferencias ORDER BY id DESC LIMIT 1));

-- ============================================================================
-- VERIFICAR DATOS
-- ============================================================================

-- Ver usuarios
SELECT '=== USUARIOS ===' as tabla;
SELECT * FROM usuarios;

-- Ver cuentas
SELECT '=== CUENTAS ===' as tabla;
SELECT * FROM cuentas;

-- Ver saldos
SELECT '=== SALDOS ===' as tabla;
SELECT * FROM vista_saldos_cuentas;

-- Ver transacciones
SELECT '=== TRANSACCIONES ===' as tabla;
SELECT * FROM vista_transacciones_completas LIMIT 10;

-- Ver transferencias
SELECT '=== TRANSFERENCIAS ===' as tabla;
SELECT * FROM vista_transferencias_completas;
