const express = require('express');
const router = express.Router();
const service = require('./obligaciones.service');

function handle(err, res, fallback) {
  console.error(err);
  res.status(500).json({ error: err.message || fallback });
}

router.post('/compromisos', async (req, res) => {
  try {
    const { usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id, es_variable } = req.body;
    const id = await service.crearCompromiso(usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id, es_variable);
    res.status(201).json({ id });
  } catch (err) {
    handle(err, res, 'Error creando compromiso');
  }
});

// Crear compra (cuotas o única)
router.post('/compromisos/compra', async (req, res) => {
  try {
    const { usuario_id, nombre, monto_total, total_cuotas, tarjeta_id, cuenta_sugerida_id } = req.body;
    const result = await service.crearCompromisoEnCuotas({
      usuario_id,
      nombre,
      monto_total,
      total_cuotas,
      tarjeta_id,
      cuenta_sugerida_id
    });
    res.status(201).json(result);
  } catch (err) {
    handle(err, res, 'Error creando compra en cuotas');
  }
});

router.get('/compromisos', async (req, res) => {
  try {
    res.json(await service.obtenerCompromisosUsuario(req.query.usuario_id));
  } catch (err) {
    handle(err, res, 'Error obteniendo compromisos');
  }
});

router.post('/instancias', async (req, res) => {
  try {
    const { compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, cuenta_pago_id } = req.body;
    const id = await service.crearInstanciaCompromiso(compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, cuenta_pago_id);
    res.status(201).json({ id });
  } catch (err) {
    handle(err, res, 'Error creando instancia');
  }
});

router.get('/instancias', async (req, res) => {
  try {
    const { desde, hasta, usuario_id } = req.query;
    res.json(await service.obtenerInstanciasPorPeriodo(desde, hasta, usuario_id));
  } catch (err) {
    handle(err, res, 'Error obteniendo instancias');
  }
});

router.put('/instancias/:id', async (req, res) => {
  try {
    const { descripcion, fecha_vencimiento, importe_esperado, cuenta_pago_id, estado, tipo, es_variable } = req.body;
    const instancia = await service.actualizarInstancia(req.params.id, { descripcion, fecha_vencimiento, importe_esperado, cuenta_pago_id, estado, tipo, es_variable });
    res.json(instancia);
  } catch (err) {
    handle(err, res, 'Error actualizando obligación');
  }
});

router.delete('/instancias/:id', async (req, res) => {
  try {
    await service.eliminarInstancia(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handle(err, res, 'Error eliminando obligación');
  }
});

router.post('/instancias/generar', async (req, res) => {
  try {
    const { usuario_id, year, month } = req.body;
    const now = new Date();
    const creadas = await service.generarInstanciasDelPeriodo(
      usuario_id,
      year || now.getFullYear(),
      month || (now.getMonth() + 1)
    );
    res.json({ creadas });
  } catch (err) {
    handle(err, res, 'Error generando instancias');
  }
});

// Sincronizar mes: generar instancias recurrentes y resúmenes de tarjetas (idempotente)
router.post('/sincronizar-mes', async (req, res) => {
  try {
    const { usuario_id, year, month } = req.body;
    const result = await service.sincronizarMes(usuario_id, year, month);
    res.json(result);
  } catch (err) {
    handle(err, res, 'Error sincronizando mes');
  }
});

router.post('/instancias/:id/confirm', async (req, res) => {
  try {
    const transaccionId = await service.confirmarInstancia(
      req.params.id,
      req.body.cuenta_pago_id,
      req.body.monto_final,
      req.body.descripcion
    );
    res.json({ transaccion_id: transaccionId });
  } catch (err) {
    handle(err, res, 'Error confirmando instancia');
  }
});

router.get('/agenda', async (req, res) => {
  try {
    const { desde, hasta, usuario_id } = req.query;
    res.json(await service.obtenerAgenda(desde, hasta, usuario_id));
  } catch (err) {
    handle(err, res, 'Error obteniendo agenda');
  }
});

module.exports = router;
