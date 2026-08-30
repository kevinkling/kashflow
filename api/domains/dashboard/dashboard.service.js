const { calcularComprometido } = require('../../shared/financeCalculations');
const cuentasRepo = require('../cuentas/cuentas.repository');
const movimientosRepo = require('../movimientos/movimientos.repository');
const obligacionesRepo = require('../obligaciones/obligaciones.repository');
const tarjetasRepo = require('../tarjetas/tarjetas.repository');

async function calcularResumenFinanciero(usuarioId, desde, hasta) {
  const saldoTotal = await cuentasRepo.saldoTotalUsuario(usuarioId);
  const { ingresosPeriodo, gastadoPeriodo, gastosPorCategoria } = await movimientosRepo.resumenPeriodo(usuarioId, desde, hasta);
  const instancias = await obligacionesRepo.obtenerInstanciasPorPeriodo(desde, hasta, usuarioId);
  const cuotas = await tarjetasRepo.obtenerCuotasUsuario(usuarioId);
  const comprometido = calcularComprometido({ instancias, cuotas });
  const agenda = await obligacionesRepo.obtenerAgenda(desde, hasta, usuarioId);
  return {
    saldoTotal,
    ingresosPeriodo,
    gastadoPeriodo,
    comprometido,
    disponibleReal: saldoTotal - comprometido,
    proximosCompromisos: (agenda || []).slice(0, 6),
    gastosPorCategoria
  };
}

module.exports = { calcularResumenFinanciero };
