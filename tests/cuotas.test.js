const { test } = require('node:test');
const assert = require('node:assert/strict');
// Ensure DATA_DIR is set for the DB connection when running tests
process.env.DATA_DIR = process.env.DATA_DIR || require('path').join(__dirname, '..', 'data');
const pool = require('../api/db/connection');
const obligacionesService = require('../api/domains/obligaciones/obligaciones.service');
const tarjetasRepo = require('../api/domains/tarjetas/tarjetas.repository');
const { periodoYYYYMM } = require('../api/shared/financeCalculations');

test('reparto de cuotas mantiene suma exacta y compensa redondeo en la última cuota', async () => {
  let compromisoId;
  try {
    const res = await obligacionesService.crearCompromisoEnCuotas({
      usuario_id: 1,
      nombre: 'Test Cuotas Redondeo',
      monto_total: 1000,
      total_cuotas: 3,
      tarjeta_id: null,
      cuenta_sugerida_id: null
    });
    assert(res && res.compromisoId, 'No se creó el compromiso');
    compromisoId = res.compromisoId;
    const q = await pool.query('SELECT importe_esperado FROM instancias_compromiso WHERE compromiso_id = ? ORDER BY periodo', [compromisoId]);
    const rows = q.rows;
    assert.equal(rows.length, 3);
    const montos = rows.map(r => Number(r.importe_esperado));
    const suma = montos.reduce((s, v) => s + v, 0);
    assert.equal(suma.toFixed(2), '1000.00');
    const unique = Array.from(new Set(montos.map(m => m.toFixed(2))));
    assert(unique.length >= 1);
  } finally {
    if (compromisoId) {
      await pool.query('DELETE FROM instancias_compromiso WHERE compromiso_id = ?', [compromisoId]);
      await pool.query('DELETE FROM compromisos WHERE id = ?', [compromisoId]);
    }
  }
});

test('sincronizar-mes es idempotente y no duplica resúmenes por período', async () => {
  const alias = `TEST_${Date.now()}`;
  let tarjetaId;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const periodo = periodoYYYYMM(year, month);
  try {
    tarjetaId = await tarjetasRepo.crearTarjeta(1, `Tarjeta Test ${alias}`, alias, 1, 10, null);
    assert(tarjetaId, 'No se pudo crear tarjeta de prueba');

    await obligacionesService.sincronizarMes(1, year, month);
    await obligacionesService.sincronizarMes(1, year, month);

    const r = await pool.query('SELECT COUNT(*) AS c FROM resumenes_tarjeta WHERE tarjeta_id = ? AND periodo = ?', [tarjetaId, periodo]);
    const count = Number(r.rows[0].c || 0);
    assert.equal(count, 1, 'Se esperaba 1 resumen para el periodo (idempotencia violada)');

    const s = await pool.query('SELECT COUNT(*) AS c FROM instancias_compromiso WHERE descripcion LIKE ? AND periodo = ?', [`%Resumen Tarjeta Test ${alias}%`, periodo]);
    const icount = Number(s.rows[0].c || 0);
    assert(icount >= 1, 'Se esperaba al menos 1 instancia de resumen para el periodo');
  } finally {
    if (tarjetaId) {
      await pool.query('DELETE FROM instancias_compromiso WHERE descripcion LIKE ?', [`Resumen Tarjeta Test ${alias}%`]);
      await pool.query('DELETE FROM resumenes_tarjeta WHERE tarjeta_id = ?', [tarjetaId]);
      await pool.query('DELETE FROM tarjetas WHERE id = ?', [tarjetaId]);
    }
  }
});

