const pool = require('../../db/connection');

async function crearCompromiso(usuarioId, nombre, tipo, frecuencia, diaVencimiento, importeEstimado, cuentaSugeridaId) {
  const insert = await pool.query(
    `INSERT INTO compromisos
      (usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [usuarioId, nombre, tipo, frecuencia, diaVencimiento, importeEstimado, cuentaSugeridaId]
  );
  return insert.lastInsertRowid;
}

async function obtenerCompromisosUsuario(usuarioId) {
  const result = await pool.query(
    `SELECT * FROM compromisos WHERE usuario_id = ? ORDER BY nombre`,
    [usuarioId]
  );
  return result.rows;
}

async function crearInstanciaCompromiso(compromisoId, usuarioId, descripcion, periodo, fechaVencimiento, importeEsperado, cuentaPagoId) {
  const insert = await pool.query(
    `INSERT INTO instancias_compromiso
      (compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, cuenta_pago_id, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [compromisoId, usuarioId, descripcion, periodo, fechaVencimiento, importeEsperado, cuentaPagoId]
  );
  return insert.lastInsertRowid;
}

async function obtenerInstanciasPorPeriodo(desde, hasta, usuarioId = null) {
  let query = `SELECT * FROM instancias_compromiso WHERE DATE(fecha_vencimiento) BETWEEN DATE(?) AND DATE(?)`;
  const params = [desde, hasta];
  if (usuarioId) {
    query += ' AND usuario_id = ?';
    params.push(usuarioId);
  }
  query += ' ORDER BY fecha_vencimiento';
  const result = await pool.query(query, params);
  return result.rows;
}

async function confirmarInstancia(instanciaId, cuentaPagoId, montoFinal, descripcion) {
  return pool.withTransaction(() => {
    const inst = pool.raw.prepare(
      `SELECT ic.*, c.tipo AS compromiso_tipo
       FROM instancias_compromiso ic
       LEFT JOIN compromisos c ON ic.compromiso_id = c.id
       WHERE ic.id = ?`
    ).get(instanciaId);
    if (!inst) throw new Error('Instancia no encontrada');
    if (inst.estado === 'pagado') throw new Error('La instancia ya está pagada');
    const transTipo = inst.compromiso_tipo === 'ingreso' ? 'debe' : 'haber';
    const info = pool.raw.prepare(
      `INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion)
       VALUES (?, ?, ?, ?, ?)`
    ).run(cuentaPagoId, transTipo, transTipo === 'debe' ? 1 : -1, Math.abs(montoFinal), descripcion);
    pool.raw.prepare(
      `UPDATE instancias_compromiso SET transaccion_id = ?, importe_final = ?, estado = 'pagado', fecha_modificacion = datetime('now', 'localtime') WHERE id = ?`
    ).run(info.lastInsertRowid, montoFinal, instanciaId);
    return info.lastInsertRowid;
  });
}

async function obtenerAgenda(desde, hasta, usuarioId = null) {
  let query = `SELECT ic.*, c.nombre AS compromiso_nombre, c.tipo AS compromiso_tipo, c.frecuencia, c.total_cuotas AS compromiso_total_cuotas,
    COALESCE(cp.alias, cs.alias) AS cuenta_alias
   FROM instancias_compromiso ic
   LEFT JOIN compromisos c ON ic.compromiso_id = c.id
   LEFT JOIN cuentas cp ON ic.cuenta_pago_id = cp.id
   LEFT JOIN cuentas cs ON c.cuenta_sugerida_id = cs.id
   WHERE DATE(ic.fecha_vencimiento) BETWEEN DATE(?) AND DATE(?)`;
  const params = [desde, hasta];
  if (usuarioId) {
    query += ' AND ic.usuario_id = ?';
    params.push(usuarioId);
  }
  query += ' ORDER BY ic.fecha_vencimiento';
  const result = await pool.query(query, params);
  return result.rows;
}

async function obtenerInstanciasParaSimulacion(desde, hasta, usuarioId = null) {
  let query = `
    SELECT ic.id, ic.importe_esperado, ic.estado, c.tipo as compromiso_tipo
    FROM instancias_compromiso ic
    LEFT JOIN compromisos c ON ic.compromiso_id = c.id
    WHERE DATE(ic.fecha_vencimiento) BETWEEN DATE(?) AND DATE(?)`;
  const params = [desde, hasta];
  if (usuarioId) {
    query += ' AND ic.usuario_id = ?';
    params.push(usuarioId);
  }
  const result = await pool.query(query, params);
  return result.rows;
}

async function existeInstanciaEnPeriodo(compromisoId, periodo) {
  const existing = await pool.query(
    `SELECT id FROM instancias_compromiso WHERE compromiso_id = ? AND periodo = ?`,
    [compromisoId, periodo]
  );
  return existing.rows.length > 0;
}

async function actualizarCompromisoExtras(compromisoId, total_cuotas = null, es_compra = 0, tarjeta_id = null) {
  const update = await pool.query(
    `UPDATE compromisos SET total_cuotas = ?, es_compra = ?, tarjeta_id = ? WHERE id = ?`,
    [total_cuotas, es_compra ? 1 : 0, tarjeta_id, compromisoId]
  );
  return update.rowCount > 0;
}

module.exports = {
  crearCompromiso,
  obtenerCompromisosUsuario,
  crearInstanciaCompromiso,
  obtenerInstanciasPorPeriodo,
  confirmarInstancia,
  obtenerAgenda,
  obtenerInstanciasParaSimulacion,
  existeInstanciaEnPeriodo,
  actualizarCompromisoExtras
};

