const { fechaVencimientoMensual, periodoYYYYMM } = require('../../shared/financeCalculations');
const repo = require('./obligaciones.repository');
const tarjetasRepo = require('../tarjetas/tarjetas.repository');
const tarjetasService = require('../tarjetas/tarjetas.service');

async function generarInstanciasDelPeriodo(usuarioId, year, month) {
  const periodo = periodoYYYYMM(year, month);
  const compromisos = await repo.obtenerCompromisosUsuario(usuarioId);
  const creadas = [];
  for (const c of compromisos) {
    if (!c.activa) continue;
    if (c.frecuencia !== 'mensual') continue;
    const fecha = fechaVencimientoMensual(year, month, c.dia_vencimiento);
    const exists = await repo.existeInstanciaEnPeriodo(c.id, periodo);
    if (exists) continue;
    const id = await repo.crearInstanciaCompromiso(
      c.id,
      usuarioId,
      c.nombre,
      periodo,
      fecha,
      c.importe_estimado,
      c.cuenta_sugerida_id
    );
    creadas.push(id);
  }
  return creadas;
}

// Crear un compromiso que representa una compra (N cuotas). Crea N instancias con reparto correcto.
async function crearCompromisoEnCuotas({ usuario_id, nombre, monto_total, total_cuotas = 1, tarjeta_id = null, cuenta_sugerida_id = null }) {
  const monto = Number(monto_total || 0);
  const n = Math.max(1, Number(total_cuotas || 1));

  // Crear compromiso base (frecuencia 'unica', importe_estimado = monto)
  const compromisoId = await repo.crearCompromiso(usuario_id, nombre, 'egreso', 'unica', null, monto, cuenta_sugerida_id);

  // Actualizar campos extras (total_cuotas, es_compra, tarjeta_id)
  await repo.actualizarCompromisoExtras(compromisoId, n, 1, tarjeta_id);

  // Obtener día de vencimiento desde tarjeta si existe, si no usar 10
  let diaVenc = 10;
  if (tarjeta_id) {
    const t = await tarjetasRepo.obtenerTarjetaPorId(tarjeta_id, usuario_id);
    if (t && Number(t.dia_vencimiento)) diaVenc = Number(t.dia_vencimiento);
  }

  // Cálculo en centavos para evitar problemas de coma flotante
  const totalCents = Math.round(monto * 100);
  const perCents = Math.floor(totalCents / n);
  const cuotas = [];
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth() + 2; // mes siguiente

  for (let i = 0; i < n; i++) {
    const cuotaNumber = i + 1;
    const isLast = cuotaNumber === n;
    const thisCents = isLast ? (totalCents - perCents * (n - 1)) : perCents;
    const thisMonto = +(thisCents / 100).toFixed(2);

    // calcular year/month para la cuota i (mes siguiente + i)
    const d = new Date(startYear, startMonth - 1 + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const periodo = periodoYYYYMM(year, month);
    const fechaVenc = fechaVencimientoMensual(year, month, diaVenc);

    const instanciaId = await repo.crearInstanciaCompromiso(
      compromisoId,
      usuario_id,
      `${nombre} - Cuota ${cuotaNumber}/${n}`,
      periodo,
      fechaVenc,
      thisMonto,
      cuenta_sugerida_id
    );
    cuotas.push(instanciaId);
  }

  return { compromisoId, instancias: cuotas };
}

// Sincronizar mes: genera instancias recurrentes y resúmenes de tarjetas (idempotente)
async function sincronizarMes(usuario_id, year, month) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || (now.getMonth() + 1);
  // Generar instancias recurrentes
  const creadas = await generarInstanciasDelPeriodo(usuario_id, y, m);
  // Generar resúmenes de tarjetas si no existen para el período
  const tarjetas = await tarjetasRepo.obtenerTarjetasUsuario(usuario_id);
  const resGenerados = [];
  for (const t of tarjetas || []) {
    const periodo = periodoYYYYMM(y, m);
    const existe = await tarjetasRepo.resumenExiste(t.id, periodo);
    if (existe) continue;
    try {
      const r = await tarjetasService.generarResumenTarjeta(t.id, usuario_id, y, m);
      resGenerados.push(r);
    } catch (err) {
      console.warn(`Error generando resumen para tarjeta ${t.id}:`, err.message);
    }
  }
  return { instancias_creadas: creadas, resumenes_generados: resGenerados };
}

module.exports = {
  crearCompromiso: (...args) => repo.crearCompromiso(...args),
  obtenerCompromisosUsuario: (...args) => repo.obtenerCompromisosUsuario(...args),
  crearInstanciaCompromiso: (...args) => repo.crearInstanciaCompromiso(...args),
  obtenerInstanciasPorPeriodo: (...args) => repo.obtenerInstanciasPorPeriodo(...args),
  confirmarInstancia: (...args) => repo.confirmarInstancia(...args),
  obtenerAgenda: (...args) => repo.obtenerAgenda(...args),
  generarInstanciasDelPeriodo,
  crearCompromisoEnCuotas,
  sincronizarMes
};

