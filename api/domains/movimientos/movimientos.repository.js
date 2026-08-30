const pool = require('../../db/connection');

async function registrarTransaccion(cuentaId, tipo, monto, descripcion, notas = null, categoriaId = null, telegramMessageId = null) {
  const montoAbs = Math.abs(monto);
  const signo = tipo === 'debe' ? 1 : -1;
  const insert = await pool.query(
    `INSERT INTO transacciones
      (cuenta_id, tipo, signo, monto, descripcion, notas, categoria_id, telegram_message_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [cuentaId, tipo, signo, montoAbs, descripcion, notas, categoriaId, telegramMessageId]
  );
  return insert.lastInsertRowid;
}

async function registrarTransferencia(cuentaOrigenId, cuentaDestinoId, monto, descripcion) {
  const montoAbs = Math.abs(monto);
  await pool.query(
    `INSERT INTO transferencias (cuenta_origen_id, cuenta_destino_id, monto, descripcion)
     VALUES (?, ?, ?, ?)`,
    [cuentaOrigenId, cuentaDestinoId, montoAbs, descripcion]
  );
  const result = await pool.query('SELECT id FROM transferencias ORDER BY id DESC LIMIT 1');
  const transferenciaId = result.rows[0].id;
  await pool.query(
    `INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion, transferencia_id)
     VALUES (?, 'haber', -1, ?, ?, ?)`,
    [cuentaOrigenId, montoAbs, descripcion, transferenciaId]
  );
  await pool.query(
    `INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion, transferencia_id)
     VALUES (?, 'debe', 1, ?, ?, ?)`,
    [cuentaDestinoId, montoAbs, descripcion, transferenciaId]
  );
}

async function consultarUltimoDepositoSueldo() {
  const result = await pool.query(
    `SELECT monto FROM transacciones
     WHERE tipo = 'debe' AND descripcion LIKE '%sueldo%'
     ORDER BY fecha_hora DESC LIMIT 1`
  );
  return result.rows[0] ? Number(result.rows[0].monto) : 0;
}

async function consultarSaldosPorCuenta() {
  const result = await pool.query(`SELECT * FROM vista_saldos_cuentas ORDER BY cuenta`);
  return result.rows;
}

async function consultarRegistrosHoy() {
  const result = await pool.query(
    `SELECT t.id, t.fecha_hora, c.nombre as cuenta, c.alias as cuenta_alias,
            t.tipo, t.monto, t.descripcion, t.notas,
            CASE WHEN t.transferencia_id IS NOT NULL THEN 'Transferencia' ELSE 'Normal' END as es_transferencia
     FROM transacciones t
     JOIN cuentas c ON t.cuenta_id = c.id
     WHERE DATE(t.fecha_hora) = DATE('now', 'localtime')
     ORDER BY t.fecha_hora DESC`
  );
  return result.rows;
}

async function consultarTodasLasTransacciones() {
  const result = await pool.query(`SELECT * FROM vista_transacciones_completas`);
  return result.rows;
}

async function actualizarTransaccion(id, { cuenta_id, tipo, monto, descripcion, notas = null, categoria_id = null }) {
  const signo = tipo === 'debe' ? 1 : -1;
  await pool.query(
    `UPDATE transacciones SET cuenta_id = ?, tipo = ?, signo = ?, monto = ?, descripcion = ?, notas = ?, categoria_id = ? WHERE id = ?`,
    [cuenta_id, tipo, signo, Math.abs(monto), descripcion, notas, categoria_id, id]
  );
  return id;
}

async function eliminarTransaccion(id) {
  const tx = await pool.query('SELECT * FROM transacciones WHERE id = ?', [id]);
  const row = tx.rows[0];
  if (!row) throw new Error('Transacción no encontrada');
  if (row.transferencia_id) {
    await pool.withTransaction(() => {
      pool.raw.prepare('DELETE FROM transacciones WHERE transferencia_id = ?').run(row.transferencia_id);
      pool.raw.prepare('DELETE FROM transferencias WHERE id = ?').run(row.transferencia_id);
    });
    return { deleted_transferencia_id: row.transferencia_id };
  }
  await pool.query('DELETE FROM transacciones WHERE id = ?', [id]);
  return { deleted_id: id };
}

async function resumenPeriodo(usuarioId, desde, hasta) {
  const ingresosRes = await pool.query(
    `SELECT COALESCE(SUM(t.monto),0) AS ingresos
     FROM transacciones t
     JOIN cuentas c ON t.cuenta_id = c.id
     WHERE c.usuario_id = ? AND DATE(t.fecha_hora) BETWEEN DATE(?) AND DATE(?) AND t.tipo = 'debe'`,
    [usuarioId, desde, hasta]
  );
  const gastosRes = await pool.query(
    `SELECT COALESCE(SUM(t.monto),0) AS gastos
     FROM transacciones t
     JOIN cuentas c ON t.cuenta_id = c.id
     WHERE c.usuario_id = ? AND DATE(t.fecha_hora) BETWEEN DATE(?) AND DATE(?) AND t.tipo = 'haber'`,
    [usuarioId, desde, hasta]
  );
  const gastosPorCategoriaRes = await pool.query(
    `SELECT coalesce(cat.nombre,'Sin categoría') AS categoria, SUM(t.monto) AS total
     FROM transacciones t
     JOIN cuentas c ON t.cuenta_id = c.id
     LEFT JOIN categorias cat ON t.categoria_id = cat.id
     WHERE c.usuario_id = ? AND DATE(t.fecha_hora) BETWEEN DATE(?) AND DATE(?) AND t.tipo = 'haber'
     GROUP BY cat.nombre
     ORDER BY total DESC
     LIMIT 10`,
    [usuarioId, desde, hasta]
  );
  return {
    ingresosPeriodo: Number(ingresosRes.rows[0].ingresos || 0),
    gastadoPeriodo: Number(gastosRes.rows[0].gastos || 0),
    gastosPorCategoria: gastosPorCategoriaRes.rows
  };
}

module.exports = {
  registrarTransaccion,
  registrarTransferencia,
  consultarUltimoDepositoSueldo,
  consultarSaldosPorCuenta,
  consultarRegistrosHoy,
  consultarTodasLasTransacciones,
  actualizarTransaccion,
  eliminarTransaccion,
  resumenPeriodo
};
