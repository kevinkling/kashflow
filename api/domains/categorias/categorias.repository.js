const pool = require('../../db/connection');

async function obtenerCategorias() {
  const res = await pool.query('SELECT * FROM categorias ORDER BY nombre');
  return res.rows;
}

module.exports = { obtenerCategorias };
