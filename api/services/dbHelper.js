const Database = require("better-sqlite3");
const path = require("path");
const { getFormattedDate } = require("../services/utils");
const dbPath = path.join(__dirname, "../../data/kashflow.db");
const db = new Database(dbPath);

// Crear tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    banco TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    monto REAL NOT NULL,
    banco_destino TEXT,
    fecha TEXT NOT NULL
  );
`);

function registrarMovimiento(tipo, banco, descripcion, monto, banco_destino = null) {
  const fecha = getFormattedDate();

  const stmt = db.prepare(`
    INSERT INTO movimientos (tipo, banco, descripcion, monto, banco_destino, fecha)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(tipo, banco, descripcion, monto, banco_destino, fecha);

  console.log("✅ Movimiento registrado en la base de datos SQLite");
}

function consultarUltimoDepositoSueldo() {
  const stmt = db.prepare(`
    SELECT monto
    FROM movimientos
    WHERE tipo = 'deposito de sueldo'
    ORDER BY fecha DESC
    LIMIT 1
  `);
  const row = stmt.get();

  return Number(row.monto);
}

function consultarSaldosPorBanco() {
    const stmt = db.prepare(`
        SELECT banco, SUM(monto) AS saldo
        FROM movimientos
        GROUP BY banco
    `);
    return stmt.all(); // Devuelve todos los resultados como un array
}

function consultarRegistrosHoy() {
  const { getFormattedDate } = require("../services/utils");
  const fechaHoy = getFormattedDate().split(" ")[0]; // Obtener solo la parte de la fecha

  const stmt = db.prepare(`
      SELECT *
      FROM movimientos
      WHERE fecha LIKE ?
      ORDER BY fecha DESC
  `);
  return stmt.all(fechaHoy + '%'); // Devuelve todos los registros hasta la fecha de hoy
}

module.exports = { registrarMovimiento, consultarUltimoDepositoSueldo, consultarSaldosPorBanco, consultarRegistrosHoy };