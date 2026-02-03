const pool = require('./db');
const { getFormattedDate } = require('./utils');

// ============================================================================
// FUNCIONES DE USUARIOS
// ============================================================================

/**
 * Obtener o crear un usuario por telegram_user_id
 */
async function obtenerOCrearUsuario(telegramUserId, nombre) {
  try {
    // Verificar si el usuario ya existe
    let result = await pool.query(
      'SELECT id FROM usuarios WHERE telegram_user_id = ?',
      [telegramUserId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Si no existe, crearlo
    await pool.query(
      'INSERT INTO usuarios (telegram_user_id, nombre) VALUES (?, ?)',
      [telegramUserId, nombre]
    );

    // Obtener el ID del nuevo usuario
    result = await pool.query(
      'SELECT id FROM usuarios WHERE telegram_user_id = ?',
      [telegramUserId]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('❌ Error al obtener/crear usuario:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE CUENTAS
// ============================================================================

/**
 * Obtener cuenta por alias (case-insensitive)
 */
async function obtenerCuentaPorAlias(alias) {
  try {
    const result = await pool.query(
      'SELECT * FROM cuentas WHERE UPPER(alias) = UPPER(?) AND activa = 1',
      [alias]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error al obtener cuenta:', error);
    throw error;
  }
}

/**
 * Obtener todas las cuentas activas de un usuario
 */
async function obtenerCuentasUsuario(usuarioId) {
  try {
    const result = await pool.query(
      'SELECT * FROM cuentas WHERE usuario_id = ? AND activa = 1 ORDER BY nombre',
      [usuarioId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error al obtener cuentas:', error);
    throw error;
  }
}

/**
 * Crear una nueva cuenta
 */
async function crearCuenta(usuarioId, nombre, alias, color = '#4CAF50', moneda = 'ARS') {
  try {
    await pool.query(
      'INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda) VALUES (?, ?, ?, ?, ?)',
      [usuarioId, nombre, alias, color, moneda]
    );
    console.log(`✅ Cuenta "${nombre}" creada exitosamente`);
  } catch (error) {
    console.error('❌ Error al crear cuenta:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE TRANSACCIONES
// ============================================================================

/**
 * Registrar una transacción individual (ingreso o egreso)
 * @param {number} cuentaId - ID de la cuenta
 * @param {string} tipo - 'debe' (ingreso) o 'haber' (egreso)
 * @param {number} monto - Monto siempre positivo
 * @param {string} descripcion - Descripción de la transacción
 * @param {string} notas - Notas opcionales
 * @param {number} telegramMessageId - ID del mensaje de Telegram (opcional)
 */
async function registrarTransaccion(cuentaId, tipo, monto, descripcion, notas = null, telegramMessageId = null) {
  try {
    const montoAbs = Math.abs(monto);
    const signo = tipo === 'debe' ? 1 : -1;

    await pool.query(
      `INSERT INTO transacciones 
        (cuenta_id, tipo, signo, monto, descripcion, notas, telegram_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cuentaId, tipo, signo, montoAbs, descripcion, notas, telegramMessageId]
    );

    console.log(`✅ Transacción registrada: ${tipo} de $${montoAbs}`);
  } catch (error) {
    console.error('❌ Error al registrar transacción:', error);
    throw error;
  }
}

/**
 * Registrar una transferencia entre cuentas
 * Crea automáticamente 2 transacciones vinculadas
 */
async function registrarTransferencia(cuentaOrigenId, cuentaDestinoId, monto, descripcion) {
  try {
    const montoAbs = Math.abs(monto);

    // 1. Crear el registro de transferencia
    await pool.query(
      `INSERT INTO transferencias 
        (cuenta_origen_id, cuenta_destino_id, monto, descripcion)
       VALUES (?, ?, ?, ?)`,
      [cuentaOrigenId, cuentaDestinoId, montoAbs, descripcion]
    );

    // 2. Obtener el ID de la transferencia recién creada
    const result = await pool.query(
      'SELECT id FROM transferencias ORDER BY id DESC LIMIT 1'
    );
    const transferenciaId = result.rows[0].id;

    // 3. Crear transacción HABER (salida) en cuenta origen
    await pool.query(
      `INSERT INTO transacciones 
        (cuenta_id, tipo, signo, monto, descripcion, transferencia_id)
       VALUES (?, 'haber', -1, ?, ?, ?)`,
      [cuentaOrigenId, montoAbs, descripcion, transferenciaId]
    );

    // 4. Crear transacción DEBE (entrada) en cuenta destino
    await pool.query(
      `INSERT INTO transacciones 
        (cuenta_id, tipo, signo, monto, descripcion, transferencia_id)
       VALUES (?, 'debe', 1, ?, ?, ?)`,
      [cuentaDestinoId, montoAbs, descripcion, transferenciaId]
    );

    console.log(`✅ Transferencia registrada: $${montoAbs} de cuenta ${cuentaOrigenId} a ${cuentaDestinoId}`);
  } catch (error) {
    console.error('❌ Error al registrar transferencia:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE CONSULTA
// ============================================================================

/**
 * Consultar el último depósito de sueldo
 */
async function consultarUltimoDepositoSueldo() {
  try {
    const result = await pool.query(
      `SELECT monto
       FROM transacciones
       WHERE tipo = 'debe' AND descripcion LIKE '%sueldo%'
       ORDER BY fecha_hora DESC
       LIMIT 1`
    );

    return result.rows[0] ? Number(result.rows[0].monto) : 0;
  } catch (error) {
    console.error('❌ Error al consultar último depósito:', error);
    throw error;
  }
}

/**
 * Consultar saldos de todas las cuentas activas
 */
async function consultarSaldosPorCuenta() {
  try {
    const result = await pool.query(
      `SELECT * FROM vista_saldos_cuentas ORDER BY cuenta`
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar saldos:', error);
    throw error;
  }
}

/**
 * Consultar transacciones de hoy
 */
async function consultarRegistrosHoy() {
  try {
    const result = await pool.query(
      `SELECT 
        t.id,
        t.fecha_hora,
        c.nombre as cuenta,
        c.alias as cuenta_alias,
        t.tipo,
        t.monto,
        t.descripcion,
        t.notas,
        CASE WHEN t.transferencia_id IS NOT NULL THEN 'Transferencia' ELSE 'Normal' END as es_transferencia
       FROM transacciones t
       JOIN cuentas c ON t.cuenta_id = c.id
       WHERE DATE(t.fecha_hora) = DATE('now', 'localtime')
       ORDER BY t.fecha_hora DESC`
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar registros de hoy:', error);
    throw error;
  }
}

/**
 * Consultar todas las transacciones
 */
async function consultarTodasLasTransacciones() {
  try {
    const result = await pool.query(
      `SELECT * FROM vista_transacciones_completas LIMIT 100`
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar transacciones:', error);
    throw error;
  }
}

/**
 * Calcular saldo de una cuenta específica
 */
async function calcularSaldoCuenta(cuentaId) {
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(monto * signo), 0) as saldo
       FROM transacciones
       WHERE cuenta_id = ?`,
      [cuentaId]
    );

    return Number(result.rows[0].saldo);
  } catch (error) {
    console.error('❌ Error al calcular saldo:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = { 
  // Usuarios
  obtenerOCrearUsuario,
  
  // Cuentas
  obtenerCuentaPorAlias,
  obtenerCuentasUsuario,
  crearCuenta,
  
  // Transacciones
  registrarTransaccion,
  registrarTransferencia,
  
  // Consultas
  consultarUltimoDepositoSueldo,
  consultarSaldosPorCuenta,
  consultarRegistrosHoy,
  consultarTodasLasTransacciones,
  calcularSaldoCuenta,

  // Compatibilidad con código anterior (deprecado)
  registrarMovimiento: registrarTransaccion,
  consultarSaldosPorBanco: consultarSaldosPorCuenta,
  consultarTodosLosMovimientos: consultarTodasLasTransacciones
};