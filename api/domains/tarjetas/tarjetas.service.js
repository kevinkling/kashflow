const { calcularCronogramaCuotas, fechaVencimientoMensual, periodoYYYYMM, fechaLocalISO } = require('../../shared/financeCalculations');
const repo = require('./tarjetas.repository');
const obligacionesRepo = require('../obligaciones/obligaciones.repository');

function ventanaCierre(tarjeta, year, month) {
  const cierre = Number(tarjeta.dia_cierre);
  const start = new Date(year, month - 2, cierre + 1);
  const end = new Date(year, month - 1, cierre);
  return {
    desde: fechaLocalISO(start),
    hasta: fechaLocalISO(end)
  };
}

async function registrarConsumoTarjeta(tarjetaId, descripcion, monto, fechaCompra, cuotas) {
  const consumoId = await repo.insertarConsumo(tarjetaId, descripcion, monto, fechaCompra, cuotas);
  try {
    const tarjeta = await repo.obtenerTarjetaPorId(tarjetaId);
    const cronograma = calcularCronogramaCuotas(
      { id: consumoId, monto, fecha_compra: fechaCompra, cuotas },
      tarjeta
    );
    if (cronograma && cronograma.length) {
      await repo.insertarCuotas(cronograma);
    }
  } catch (err) {
    console.error('⚠️ Error generando cuotas para consumo:', err);
  }
  return consumoId;
}

async function generarResumenTarjeta(tarjetaId, usuarioId, year, month) {
  const tarjeta = await repo.obtenerTarjetaPorId(tarjetaId);
  if (!tarjeta) throw new Error('Tarjeta no encontrada');
  const periodo = periodoYYYYMM(year, month);
  const fecha = fechaVencimientoMensual(year, month, tarjeta.dia_vencimiento);
  const { desde, hasta } = ventanaCierre(tarjeta, year, month);

  let total = await repo.totalCuotasPeriodo(tarjetaId, periodo);
  if (!total) {
    total = await repo.totalConsumosVentana(tarjetaId, desde, hasta);
  }

  const instanciaId = await obligacionesRepo.crearInstanciaCompromiso(
    null,
    usuarioId,
    `Resumen ${tarjeta.nombre} ${periodo}`,
    periodo,
    fecha,
    total || 0,
    tarjeta.cuenta_pago_id,
    tarjeta.id
  );
  await repo.vincularResumen(tarjetaId, instanciaId, desde, hasta);
  // Además, vincular únicamente las cuotas que correspondan al periodo del resumen
  await repo.vincularResumenPeriodo(tarjetaId, instanciaId, desde, hasta, periodo);
  // Registrar en tabla resumenes_tarjeta para idempotencia y trazabilidad
  try {
    await repo.insertarResumen(tarjetaId, periodo, total || 0, fecha);
  } catch (err) {
    console.warn('No se pudo insertar resumen en tabla resumenes_tarjeta:', err.message);
  }
  return { instanciaId, total, desde, hasta };
}

async function obtenerResumenTarjetaActual(tarjetaId, usuarioId, year, month) {
  const tarjeta = await repo.obtenerTarjetaPorId(tarjetaId, usuarioId);
  if (!tarjeta) throw new Error('Tarjeta no encontrada');
  const nowYear = year || new Date().getFullYear();
  const nowMonth = month || (new Date().getMonth() + 1);
  const { desde, hasta } = ventanaCierre(tarjeta, nowYear, nowMonth);
  const totalPendiente = await repo.totalConsumosVentana(tarjetaId, desde, hasta);
  const cuotas = await repo.obtenerCuotasPendientesTarjeta(tarjetaId);
  return {
    tarjeta,
    periodo: periodoYYYYMM(nowYear, nowMonth),
    desde,
    hasta,
    totalPendiente,
    cuotas
  };
}

async function actualizarTarjeta(tarjetaId, datos) {
  const tarjeta = await repo.obtenerTarjetaPorId(tarjetaId);
  if (!tarjeta) throw new Error('Tarjeta no encontrada');
  const ok = await repo.actualizarTarjeta(tarjetaId, {
    nombre: datos.nombre,
    alias: datos.alias,
    dia_cierre: datos.dia_cierre,
    dia_vencimiento: datos.dia_vencimiento,
    cuenta_pago_id: datos.cuenta_pago_id || null
  });
  if (!ok) throw new Error('No se pudo actualizar la tarjeta');
  return repo.obtenerTarjetaPorId(tarjetaId);
}

async function archivarTarjeta(tarjetaId) {
  const tarjeta = await repo.obtenerTarjetaPorId(tarjetaId);
  if (!tarjeta) throw new Error('Tarjeta no encontrada');
  if (!tarjeta.activa) throw new Error('La tarjeta ya está archivada');
  const ok = await repo.archivarTarjeta(tarjetaId);
  if (!ok) throw new Error('No se pudo archivar la tarjeta');
  return true;
}

module.exports = {
  crearTarjeta: (...args) => repo.crearTarjeta(...args),
  obtenerTarjetasUsuario: (...args) => repo.obtenerTarjetasUsuario(...args),
  obtenerConsumosTarjeta: (...args) => repo.obtenerConsumosTarjeta(...args),
  registrarConsumoTarjeta,
  generarResumenTarjeta,
  obtenerResumenTarjetaActual,
  actualizarTarjeta,
  archivarTarjeta
};
