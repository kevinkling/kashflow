const pool = require('../../db/connection');

async function obtenerOCrearUsuario(telegramUserId, nombre) {
  let result = await pool.query(
    'SELECT id FROM usuarios WHERE telegram_user_id = ?',
    [telegramUserId]
  );
  if (result.rows.length > 0) return result.rows[0].id;

  await pool.query(
    'INSERT INTO usuarios (telegram_user_id, nombre) VALUES (?, ?)',
    [telegramUserId, nombre]
  );
  result = await pool.query(
    'SELECT id FROM usuarios WHERE telegram_user_id = ?',
    [telegramUserId]
  );
  return result.rows[0].id;
}

async function listarUsuarios() {
  const result = await pool.query('SELECT id, nombre FROM usuarios ORDER BY nombre');
  return result.rows;
}

module.exports = { obtenerOCrearUsuario, listarUsuarios };
