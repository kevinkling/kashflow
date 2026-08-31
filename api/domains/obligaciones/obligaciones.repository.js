const pool = require('../../db/connection');

async function crearCompromiso(usuarioId, nombre, tipo, frecuencia, diaVencimiento, importeEstimado, cuentaSugeridaId, esVariable = 0) {
  const insert = await pool.query(
    `INSERT INTO compromisos
      (usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id, es_variable)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [usuarioId, nombre, tipo, frecuencia, diaVencimiento, importeEstimado, cuentaSugeridaId, esVariable ? 1 : 0]
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

async function crearInstanciaCompromiso(compromisoId, usuarioId, descripcion, periodo, fechaVencimiento, importeEsperado, cuentaPagoId, tarjetaId = null) {
  const insert = await pool.query(
    `INSERT INTO instancias_compromiso
      (compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, cuenta_pago_id, tarjeta_id, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [compromisoId, usuarioId, descripcion, periodo, fechaVencimiento, importeEsperado, cuentaPagoId, tarjetaId]
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
    c.es_variable AS compromiso_es_variable,
    COALESCE(cp.alias, cs.alias) AS cuenta_alias,
    COALESCE(ic.tarjeta_id, c.tarjeta_id) AS tarjeta_id,
    t.nombre AS tarjeta_nombre
   FROM instancias_compromiso ic
   LEFT JOIN compromisos c ON ic.compromiso_id = c.id
   LEFT JOIN cuentas cp ON ic.cuenta_pago_id = cp.id
   LEFT JOIN cuentas cs ON c.cuenta_sugerida_id = cs.id
   LEFT JOIN tarjetas t ON t.id = COALESCE(ic.tarjeta_id, c.tarjeta_id)
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

async function obtenerInstanciaPorId(instanciaId) {
  const result = await pool.query('SELECT * FROM instancias_compromiso WHERE id = ?', [instanciaId]);
  return result.rows[0] || null;
}

async function actualizarInstancia(instanciaId, { descripcion, fecha_vencimiento, importe_esperado, cuenta_pago_id, estado }) {
  const result = await pool.query(
    `UPDATE instancias_compromiso SET descripcion = ?, fecha_vencimiento = ?, importe_esperado = ?, cuenta_pago_id = ?, estado = ?,
       fecha_modificacion = datetime('now','localtime')
     WHERE id = ?`,
    [descripcion, fecha_vencimiento, importe_esperado, cuenta_pago_id, estado, instanciaId]
  );
  return result.rowCount > 0;
}

async function obtenerCompromisoPorId(compromisoId) {
  const result = await pool.query('SELECT * FROM compromisos WHERE id = ?', [compromisoId]);
  return result.rows[0] || null;
}

async function actualizarCompromisoTipoYVariable(compromisoId, { tipo, es_variable }) {
  const result = await pool.query(
    `UPDATE compromisos SET tipo = ?, es_variable = ?, fecha_modificacion = datetime('now','localtime') WHERE id = ?`,
    [tipo, es_variable ? 1 : 0, compromisoId]
  );
  return result.rowCount > 0;
}

async function eliminarInstancia(instanciaId) {
  const result = await pool.query('DELETE FROM instancias_compromiso WHERE id = ?', [instanciaId]);
  return result.rowCount > 0;
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
  actualizarCompromisoExtras,
  obtenerInstanciaPorId,
  actualizarInstancia,
  eliminarInstancia,
  obtenerCompromisoPorId,
  actualizarCompromisoTipoYVariable
};

