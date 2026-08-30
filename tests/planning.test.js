const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  fechaVencimientoMensual,
  calcularProyeccionSimulada
} = require('../api/services/planningLogic');

test('fecha de vencimiento se ajusta al último día del mes', () => {
  assert.equal(fechaVencimientoMensual(2026, 2, 31), '2026-02-28');
  assert.equal(fechaVencimientoMensual(2026, 1, 10), '2026-01-10');
});

test('proyección usa importes esperados de pendientes', () => {
  const r = calcularProyeccionSimulada({
    saldoReal: 1000000,
    instancias: [
      { id: 1, importe_esperado: 430000, compromiso_tipo: 'egreso', estado: 'pendiente' },
      { id: 2, importe_esperado: 900000, compromiso_tipo: 'egreso', estado: 'pendiente' }
    ],
    ajustes: []
  });
  assert.equal(r.saldoSimulado, 1000000 - 430000 - 900000);
});

test('ajuste de instancia reemplaza el esperado sin mutar el array original', () => {
  const instancias = [
    { id: 1, importe_esperado: 900000, compromiso_tipo: 'egreso', estado: 'pendiente' }
  ];
  const r = calcularProyeccionSimulada({
    saldoReal: 1000000,
    instancias,
    ajustes: [{ tipo: 'instancia', instancia_compromiso_id: 1, monto_simulado: 350000, signo: -1 }]
  });
  assert.equal(r.saldoSimulado, 1000000 - 350000);
  assert.equal(instancias[0].importe_esperado, 900000);
});

test('línea libre hipotética se suma a la proyección', () => {
  const r = calcularProyeccionSimulada({
    saldoReal: 500000,
    instancias: [{ id: 1, importe_esperado: 430000, compromiso_tipo: 'egreso', estado: 'pendiente' }],
    ajustes: [{ tipo: 'libre', monto_simulado: 100000, signo: -1 }]
  });
  assert.equal(r.saldoSimulado, 500000 - 430000 - 100000);
});

test('instancias pagadas no impactan la proyección', () => {
  const r = calcularProyeccionSimulada({
    saldoReal: 200,
    instancias: [{ id: 1, importe_esperado: 50, compromiso_tipo: 'egreso', estado: 'pagado' }],
    ajustes: []
  });
  assert.equal(r.saldoSimulado, 200);
});
