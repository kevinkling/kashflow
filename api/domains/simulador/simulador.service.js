const {
  calcularProyeccionSimulada,
  periodoYYYYMM,
  rangoMesLocal,
  filtrarAjustesPorPeriodo
} = require('../../shared/financeCalculations');
const repo = require('./simulador.repository');
const cuentasRepo = require('../cuentas/cuentas.repository');
const obligacionesRepo = require('../obligaciones/obligaciones.repository');

async function calcularSaldoSimulado(escenarioId, desde, hasta, usuarioId = null) {
  const saldoReal = await cuentasRepo.saldoTotal(usuarioId);
  const instancias = await obligacionesRepo.obtenerInstanciasParaSimulacion(desde, hasta, usuarioId);
  const ajustes = await repo.obtenerAjustesEscenario(escenarioId);
  const periodo = String(desde || '').slice(0, 7);
  const ajustesDelMes = filtrarAjustesPorPeriodo(ajustes, periodo, { incluirSinFecha: true });
  return calcularProyeccionSimulada({ saldoReal, instancias, ajustes: ajustesDelMes });
}

async function calcularProyeccionMensual(escenarioId, meses = 6, usuarioId = null) {
  const results = [];
  const today = new Date();
  const year = today.getFullYear();
  const month0 = today.getMonth() + 1;
  const ajustes = await repo.obtenerAjustesEscenario(escenarioId);
  const saldoReal = await cuentasRepo.saldoTotal(usuarioId);

  for (let i = 0; i < meses; i++) {
    const d = new Date(year, month0 - 1 + i, 1);
    const y = d.getFullYear();
    const mm = d.getMonth() + 1;
    const { desde, hasta } = rangoMesLocal(y, mm);
    const periodo = periodoYYYYMM(y, mm);
    const instancias = await obligacionesRepo.obtenerInstanciasParaSimulacion(desde, hasta, usuarioId);
    const ajustesDelMes = filtrarAjustesPorPeriodo(ajustes, periodo, { incluirSinFecha: i === 0 });
    const base = calcularProyeccionSimulada({ saldoReal, instancias, ajustes: [] });
    const sim = calcularProyeccionSimulada({ saldoReal, instancias, ajustes: ajustesDelMes });
    results.push({
      periodo,
      desde,
      hasta,
      ...sim,
      saldoBase: base.saldoSimulado,
      delta: sim.saldoSimulado - base.saldoSimulado
    });
  }
  return results;
}

module.exports = {
  crearEscenario: (...args) => repo.crearEscenario(...args),
  obtenerEscenariosUsuario: (...args) => repo.obtenerEscenariosUsuario(...args),
  agregarAjusteEscenario: (...args) => repo.agregarAjusteEscenario(...args),
  upsertAjusteInstancia: (...args) => repo.upsertAjusteInstancia(...args),
  obtenerAjustesEscenario: (...args) => repo.obtenerAjustesEscenario(...args),
  eliminarAjuste: (...args) => repo.eliminarAjuste(...args),
  calcularSaldoSimulado,
  calcularProyeccionMensual
};
