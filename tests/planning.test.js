const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  fechaVencimientoMensual,
  calcularProyeccionSimulada,
  rangoMesLocal,
  filtrarAjustesPorPeriodo,
  fechaLocalISO
} = require('../api/shared/financeCalculations');

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

test('rango de mes se arma en calendario local, no en UTC', () => {
  assert.deepEqual(rangoMesLocal(2026, 8), { desde: '2026-08-01', hasta: '2026-08-31' });
  assert.deepEqual(rangoMesLocal(2026, 2), { desde: '2026-02-01', hasta: '2026-02-28' });
});

test('fecha local no se corre un día por UTC', () => {
  const d = new Date(2026, 7, 1);
  assert.equal(fechaLocalISO(d), '2026-08-01');
});

test('línea libre con fecha solo entra en ese período', () => {
  const ajustes = [
    { tipo: 'libre', monto_simulado: 100000, signo: -1, fecha_estimada: '2026-09-10' },
    { tipo: 'instancia', instancia_compromiso_id: 1, monto_simulado: 10, signo: -1 }
  ];
  const sep = filtrarAjustesPorPeriodo(ajustes, '2026-09', { incluirSinFecha: false });
  const ago = filtrarAjustesPorPeriodo(ajustes, '2026-08', { incluirSinFecha: false });
  assert.equal(sep.filter((a) => a.tipo === 'libre').length, 1);
  assert.equal(ago.filter((a) => a.tipo === 'libre').length, 0);
  assert.equal(ago.filter((a) => a.tipo === 'instancia').length, 1);
});
