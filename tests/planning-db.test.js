const { test } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function applySqlFile(db, file) {
  const sql = fs.readFileSync(file, 'utf8');
  db.exec(sql);
}

test('confirmación atómica enlaza transacción y no duplica al repetir', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  applySqlFile(db, path.join(__dirname, '../data/schema.sql'));
  applySqlFile(db, path.join(__dirname, '../data/updates/006_add_financial_planning_tables.sql'));
  applySqlFile(db, path.join(__dirname, '../data/updates/007_add_simulation_tables.sql'));

  db.prepare('INSERT INTO usuarios (telegram_user_id, nombre) VALUES (?, ?)').run(1, 'Test');
  db.prepare("INSERT INTO cuentas (usuario_id, nombre, alias, color) VALUES (1, 'BBVA', 'bbva', '#000')").run();
  db.prepare("INSERT INTO compromisos (usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id) VALUES (1, 'Alquiler', 'egreso', 'mensual', 5, 430000, 1)").run();
  db.prepare("INSERT INTO instancias_compromiso (compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, estado, cuenta_pago_id) VALUES (1, 1, 'Alquiler', '2026-09', '2026-09-05', 430000, 'pendiente', 1)").run();

  const confirmar = db.transaction((id, cuenta, monto, desc) => {
    const inst = db.prepare('SELECT ic.*, c.tipo AS compromiso_tipo FROM instancias_compromiso ic LEFT JOIN compromisos c ON ic.compromiso_id = c.id WHERE ic.id = ?').get(id);
    if (inst.estado === 'pagado') throw new Error('La instancia ya está pagada');
    const info = db.prepare("INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion) VALUES (?, 'haber', -1, ?, ?)").run(cuenta, monto, desc);
    db.prepare("UPDATE instancias_compromiso SET transaccion_id = ?, importe_final = ?, estado = 'pagado' WHERE id = ?").run(info.lastInsertRowid, monto, id);
    return info.lastInsertRowid;
  });

  const txId = confirmar(1, 1, 430000, 'Alquiler');
  assert.ok(txId);
  const inst = db.prepare('SELECT * FROM instancias_compromiso WHERE id = 1').get();
  assert.equal(inst.estado, 'pagado');
  assert.equal(inst.transaccion_id, txId);
  const count = db.prepare('SELECT COUNT(*) AS n FROM transacciones').get().n;
  assert.equal(count, 1);
  assert.throws(() => confirmar(1, 1, 430000, 'Alquiler'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transacciones').get().n, 1);
});

test('generación de instancias es idempotente por compromiso y período', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  applySqlFile(db, path.join(__dirname, '../data/schema.sql'));
  applySqlFile(db, path.join(__dirname, '../data/updates/006_add_financial_planning_tables.sql'));
  applySqlFile(db, path.join(__dirname, '../data/updates/008_unique_instancias_periodo.sql'));

  db.prepare('INSERT INTO usuarios (telegram_user_id, nombre) VALUES (?, ?)').run(1, 'Test');
  db.prepare("INSERT INTO cuentas (usuario_id, nombre, alias, color) VALUES (1, 'BBVA', 'bbva', '#000')").run();
  db.prepare("INSERT INTO compromisos (usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id) VALUES (1, 'Internet', 'egreso', 'mensual', 10, 25000, 1)").run();

  const insert = db.prepare("INSERT INTO instancias_compromiso (compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, estado) VALUES (1, 1, 'Internet', '2026-09', '2026-09-10', 25000, 'pendiente')");
  insert.run();
  assert.throws(() => insert.run());
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM instancias_compromiso').get().n, 1);
});
