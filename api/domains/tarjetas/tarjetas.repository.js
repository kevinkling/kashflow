const pool = require('../../db/connection');

async function crearTarjeta(usuarioId, nombre, alias, diaCierre, diaVencimiento, cuentaPagoId) {
  const insert = await pool.query(
    `INSERT INTO tarjetas (usuario_id, nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, nombre, alias, diaCierre, diaVencimiento, cuentaPagoId]
  );
  return insert.lastInsertRowid;
}

async function obtenerTarjetasUsuario(usuarioId) {
  const result = await pool.query(
    `SELECT * FROM tarjetas WHERE usuario_id = ? AND activa = 1 ORDER BY nombre`,
    [usuarioId]
  );
  return result.rows;
}

async function obtenerTarjetaPorId(tarjetaId, usuarioId = null) {
  if (usuarioId) {
    const result = await pool.query('SELECT * FROM tarjetas WHERE id = ? AND usuario_id = ?', [tarjetaId, usuarioId]);
    return result.rows[0] || null;
  }
  const result = await pool.query('SELECT * FROM tarjetas WHERE id = ?', [tarjetaId]);
  return result.rows[0] || null;
}

async function actualizarTarjeta(tarjetaId, { nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id }) {
  const result = await pool.query(
    `UPDATE tarjetas SET nombre = ?, alias = ?, dia_cierre = ?, dia_vencimiento = ?, cuenta_pago_id = ?,
       fecha_modificacion = datetime('now','localtime')
     WHERE id = ?`,
    [nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id, tarjetaId]
  );
  return result.rowCount > 0;
}

async function archivarTarjeta(tarjetaId) {
  const result = await pool.query(
    `UPDATE tarjetas SET activa = 0, fecha_modificacion = datetime('now','localtime') WHERE id = ? AND activa = 1`,
    [tarjetaId]
  );
  return result.rowCount > 0;
}

async function insertarConsumo(tarjetaId, descripcion, monto, fechaCompra, cuotas) {
  const insert = await pool.query(
    `INSERT INTO consumos_tarjeta (tarjeta_id, descripcion, monto, fecha_compra, cuotas)
     VALUES (?, ?, ?, ?, ?)`,
    [tarjetaId, descripcion, monto, fechaCompra, cuotas]
  );
  return insert.lastInsertRowid;
}

async function insertarCuotas(cronograma) {
  const stmt = `INSERT INTO cuotas_consumo (consumo_id, numero_cuota, total_cuotas, monto_cuota, periodo, fecha_vencimiento_estimada, instancia_resumen_id, fecha_creacion)
                VALUES (?, ?, ?, ?, ?, ?, NULL, datetime('now','localtime'))`;
  for (const q of cronograma) {
    await pool.query(stmt, [q.consumo_id, q.numero_cuota, q.total_cuotas, q.monto_cuota, q.periodo, q.fecha_vencimiento_estimada]);
  }
}

async function obtenerConsumosTarjeta(tarjetaId) {
  const result = await pool.query(
    `SELECT * FROM consumos_tarjeta WHERE tarjeta_id = ? ORDER BY fecha_compra DESC`,
    [tarjetaId]
  );
  return result.rows;
}

async function totalCuotasPeriodo(tarjetaId, periodo) {
  const cuotasRes = await pool.query(
    `SELECT COALESCE(SUM(qc.monto_cuota), 0) AS total_cuotas
     FROM cuotas_consumo qc
     JOIN consumos_tarjeta ct ON qc.consumo_id = ct.id
     WHERE ct.tarjeta_id = ? AND qc.periodo = ? AND qc.instancia_resumen_id IS NULL`,
    [tarjetaId, periodo]
  );
  return Number(cuotasRes.rows[0].total_cuotas || 0);
}

async function totalConsumosVentana(tarjetaId, desde, hasta) {
  const consumos = await pool.query(
    `SELECT COALESCE(SUM(monto), 0) AS total FROM consumos_tarjeta
     WHERE tarjeta_id = ? AND DATE(fecha_compra) BETWEEN DATE(?) AND DATE(?) AND instancia_resumen_id IS NULL`,
    [tarjetaId, desde, hasta]
  );
  return Number(consumos.rows[0].total || 0);
}

async function vincularResumen(tarjetaId, instanciaId, desde, hasta) {
  await pool.query(
    `UPDATE consumos_tarjeta SET instancia_resumen_id = ?
     WHERE tarjeta_id = ? AND DATE(fecha_compra) BETWEEN DATE(?) AND DATE(?) AND instancia_resumen_id IS NULL`,
    [instanciaId, tarjetaId, desde, hasta]
  );
  await pool.query(
    `UPDATE cuotas_consumo SET instancia_resumen_id = ?
     WHERE consumo_id IN (
       SELECT id FROM consumos_tarjeta WHERE tarjeta_id = ? AND DATE(fecha_compra) BETWEEN DATE(?) AND DATE(?)
     ) AND instancia_resumen_id IS NULL`,
    [instanciaId, tarjetaId, desde, hasta]
  );
}

// Vincular solo cuotas del periodo especificado (más preciso)
async function vincularResumenPeriodo(tarjetaId, instanciaId, desde, hasta, periodo) {
  if (!periodo) return vincularResumen(tarjetaId, instanciaId, desde, hasta);
  await pool.query(
    `UPDATE cuotas_consumo SET instancia_resumen_id = ?
     WHERE periodo = ? AND consumo_id IN (
       SELECT id FROM consumos_tarjeta WHERE tarjeta_id = ? AND DATE(fecha_compra) BETWEEN DATE(?) AND DATE(?)
     ) AND instancia_resumen_id IS NULL`,
    [instanciaId, periodo, tarjetaId, desde, hasta]
  );
}

// Inserta un registro de resumen de tarjeta (idempotente)
async function insertarResumen(tarjetaId, periodo, montoTotal, fechaVencimiento = null) {
  const insert = await pool.query(
    `INSERT OR IGNORE INTO resumenes_tarjeta (tarjeta_id, periodo, monto_total, pagado, fecha_vencimiento, fecha_creacion)
     VALUES (?, ?, ?, 0, ?, datetime('now','localtime'))`,
    [tarjetaId, periodo, montoTotal, fechaVencimiento]
  );
  return insert.lastInsertRowid;
}

async function resumenExiste(tarjetaId, periodo) {
  const res = await pool.query(
    `SELECT id FROM resumenes_tarjeta WHERE tarjeta_id = ? AND periodo = ?`,
    [tarjetaId, periodo]
  );
  return res.rows.length > 0;
}

async function obtenerCuotasUsuario(usuarioId) {
  const res = await pool.query(
    `SELECT qc.* FROM cuotas_consumo qc
     JOIN consumos_tarjeta ct ON qc.consumo_id = ct.id
     JOIN tarjetas t ON ct.tarjeta_id = t.id
     WHERE t.usuario_id = ?`,
    [usuarioId]
  );
  return res.rows;
}

async function obtenerCuotasPendientesTarjeta(tarjetaId) {
  const cuotas = await pool.query(
    `SELECT qc.* FROM cuotas_consumo qc
     JOIN consumos_tarjeta ct ON qc.consumo_id = ct.id
     WHERE ct.tarjeta_id = ? AND (qc.instancia_resumen_id IS NULL OR qc.instancia_resumen_id = '')`,
    [tarjetaId]
  );
  return cuotas.rows;
}

module.exports = {
  crearTarjeta,
  obtenerTarjetasUsuario,
  obtenerTarjetaPorId,
  actualizarTarjeta,
  archivarTarjeta,
  insertarConsumo,
  insertarCuotas,
  obtenerConsumosTarjeta,
  totalCuotasPeriodo,
  totalConsumosVentana,
  vincularResumen,
  obtenerCuotasUsuario,
  obtenerCuotasPendientesTarjeta
  , insertarResumen, resumenExiste, vincularResumenPeriodo
};
