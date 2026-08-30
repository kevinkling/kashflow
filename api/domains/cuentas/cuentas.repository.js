const pool = require('../../db/connection');

async function obtenerCuentaPorAlias(alias) {
  const result = await pool.query(
    'SELECT * FROM cuentas WHERE UPPER(alias) = UPPER(?) AND activa = 1',
    [alias]
  );
  return result.rows[0] || null;
}

async function obtenerCuentasUsuario(usuarioId) {
  const result = await pool.query(
    'SELECT * FROM cuentas WHERE usuario_id = ? AND activa = 1 ORDER BY nombre',
    [usuarioId]
  );
  return result.rows;
}

async function crearCuenta(usuarioId, nombre, alias, color = '#4CAF50', moneda = 'ARS') {
  await pool.query(
    'INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda) VALUES (?, ?, ?, ?, ?)',
    [usuarioId, nombre, alias, color, moneda]
  );
}

async function obtenerTodasLasCuentasConSaldos() {
  const result = await pool.query(
    'SELECT * FROM vista_saldos_cuentas ORDER BY saldo_actual DESC'
  );
  return result.rows;
}

async function obtenerTodasLasCuentasGestion() {
  const result = await pool.query(
    'SELECT * FROM vista_saldos_cuentas_admin ORDER BY activa DESC, cuenta ASC'
  );
  return result.rows;
}

async function obtenerCuentaPorId(id) {
  const result = await pool.query('SELECT * FROM cuentas WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function actualizarCuenta(id, { nombre, alias, color, moneda, activa }) {
  const updates = [];
  const values = [];
  if (nombre !== undefined) { updates.push('nombre = ?'); values.push(nombre); }
  if (alias !== undefined) { updates.push('alias = ?'); values.push(alias); }
  if (color !== undefined) { updates.push('color = ?'); values.push(color); }
  if (moneda !== undefined) { updates.push('moneda = ?'); values.push(moneda); }
  if (activa !== undefined) { updates.push('activa = ?'); values.push(activa ? 1 : 0); }
  if (updates.length === 0) throw new Error('No hay campos para actualizar');
  values.push(id);
  await pool.query(`UPDATE cuentas SET ${updates.join(', ')} WHERE id = ?`, values);
}

async function toggleCuentaActiva(id) {
  const cuenta = await obtenerCuentaPorId(id);
  if (!cuenta) throw new Error('Cuenta no encontrada');
  const nuevoEstado = cuenta.activa ? 0 : 1;
  await pool.query('UPDATE cuentas SET activa = ? WHERE id = ?', [nuevoEstado, id]);
  return nuevoEstado === 1;
}

async function validarAliasUnico(alias, cuentaIdExcluir = null) {
  let query = 'SELECT id FROM cuentas WHERE UPPER(alias) = UPPER(?)';
  const params = [alias];
  if (cuentaIdExcluir !== null) {
    query += ' AND id != ?';
    params.push(cuentaIdExcluir);
  }
  const result = await pool.query(query, params);
  return result.rows.length === 0;
}

async function calcularSaldoCuenta(cuentaId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(monto * signo), 0) as saldo FROM transacciones WHERE cuenta_id = ?`,
    [cuentaId]
  );
  return Number(result.rows[0].saldo);
}

async function saldoTotalUsuario(usuarioId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(saldo_actual),0) as total FROM vista_saldos_cuentas WHERE usuario_id = ?`,
    [usuarioId]
  );
  return Number(result.rows[0].total || 0);
}

async function saldoTotal(usuarioId = null) {
  let query = 'SELECT COALESCE(SUM(saldo_actual),0) as total FROM vista_saldos_cuentas';
  const params = [];
  if (usuarioId) {
    query += ' WHERE usuario_id = ?';
    params.push(usuarioId);
  }
  const result = await pool.query(query, params);
  return Number(result.rows[0].total || 0);
}

module.exports = {
  obtenerCuentaPorAlias,
  obtenerCuentasUsuario,
  crearCuenta,
  obtenerTodasLasCuentasConSaldos,
  obtenerTodasLasCuentasGestion,
  obtenerCuentaPorId,
  actualizarCuenta,
  toggleCuentaActiva,
  validarAliasUnico,
  calcularSaldoCuenta,
  saldoTotalUsuario,
  saldoTotal
};
