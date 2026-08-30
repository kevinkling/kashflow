const pool = require('../../db/connection');

async function crearEscenario(usuarioId, nombre) {
  const insert = await pool.query(
    `INSERT INTO escenarios_simulacion (usuario_id, nombre) VALUES (?, ?)`,
    [usuarioId, nombre]
  );
  return insert.lastInsertRowid;
}

async function obtenerEscenariosUsuario(usuarioId) {
  const res = await pool.query(
    `SELECT * FROM escenarios_simulacion WHERE usuario_id = ? ORDER BY fecha_creacion DESC`,
    [usuarioId]
  );
  return res.rows;
}

async function agregarAjusteEscenario(escenarioId, tipo, instanciaCompromisoId, descripcion, fechaEstimada, montoSimulado, signo) {
  const idRes = await pool.query(
    `INSERT INTO escenario_ajustes (escenario_id, tipo, instancia_compromiso_id, descripcion, fecha_estimada, monto_simulado, signo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [escenarioId, tipo, instanciaCompromisoId || null, descripcion || null, fechaEstimada || null, montoSimulado, signo]
  );
  return idRes.lastInsertRowid;
}

async function upsertAjusteInstancia(escenarioId, instanciaCompromisoId, descripcion, fechaEstimada, montoSimulado, signo) {
  const existing = await pool.query(
    `SELECT id FROM escenario_ajustes
     WHERE escenario_id = ? AND tipo = 'instancia' AND instancia_compromiso_id = ?`,
    [escenarioId, instanciaCompromisoId]
  );
  if (existing.rows.length) {
    const id = existing.rows[0].id;
    await pool.query(
      `UPDATE escenario_ajustes
       SET descripcion = ?, fecha_estimada = ?, monto_simulado = ?, signo = ?
       WHERE id = ? AND escenario_id = ?`,
      [descripcion || null, fechaEstimada || null, montoSimulado, signo, id, escenarioId]
    );
    return id;
  }
  return agregarAjusteEscenario(
    escenarioId,
    'instancia',
    instanciaCompromisoId,
    descripcion,
    fechaEstimada,
    montoSimulado,
    signo
  );
}

async function obtenerAjustesEscenario(escenarioId) {
  const res = await pool.query(
    `SELECT a.*,
            COALESCE(c.nombre, a.descripcion) AS compromiso_nombre,
            ic.fecha_vencimiento,
            ic.importe_esperado,
            ic.descripcion AS instancia_descripcion
     FROM escenario_ajustes a
     LEFT JOIN instancias_compromiso ic ON a.instancia_compromiso_id = ic.id
     LEFT JOIN compromisos c ON ic.compromiso_id = c.id
     WHERE a.escenario_id = ?
     ORDER BY a.id`,
    [escenarioId]
  );
  return res.rows;
}

async function eliminarAjuste(escenarioId, ajusteId) {
  const res = await pool.query(
    `DELETE FROM escenario_ajustes WHERE id = ? AND escenario_id = ?`,
    [ajusteId, escenarioId]
  );
  return res.rowCount > 0;
}

module.exports = {
  crearEscenario,
  obtenerEscenariosUsuario,
  agregarAjusteEscenario,
  upsertAjusteInstancia,
  obtenerAjustesEscenario,
  eliminarAjuste
};
