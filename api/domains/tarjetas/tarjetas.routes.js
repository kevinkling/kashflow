const express = require('express');
const router = express.Router();
const service = require('./tarjetas.service');

function handle(err, res, fallback) {
  console.error(err);
  res.status(500).json({ error: err.message || fallback });
}

router.post('/tarjetas', async (req, res) => {
  try {
    const { usuario_id, nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id } = req.body;
    const id = await service.crearTarjeta(usuario_id, nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id);
    res.status(201).json({ id });
  } catch (err) {
    handle(err, res, 'Error creando tarjeta');
  }
});

router.get('/tarjetas', async (req, res) => {
  try {
    res.json(await service.obtenerTarjetasUsuario(req.query.usuario_id));
  } catch (err) {
    handle(err, res, 'Error obteniendo tarjetas');
  }
});

router.put('/tarjetas/:id', async (req, res) => {
  try {
    const { nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id } = req.body;
    const tarjeta = await service.actualizarTarjeta(req.params.id, { nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id });
    res.json(tarjeta);
  } catch (err) {
    handle(err, res, 'Error actualizando tarjeta');
  }
});

router.delete('/tarjetas/:id', async (req, res) => {
  try {
    await service.archivarTarjeta(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handle(err, res, 'Error archivando tarjeta');
  }
});

router.get('/tarjetas/:id/resumen-actual', async (req, res) => {
  try {
    const { usuario_id, year, month } = req.query;
    const result = await service.obtenerResumenTarjetaActual(
      req.params.id,
      usuario_id,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined
    );
    res.json(result);
  } catch (err) {
    handle(err, res, 'Error obteniendo resumen de tarjeta');
  }
});

router.post('/tarjetas/:id/resumen', async (req, res) => {
  try {
    const { usuario_id, year, month } = req.body;
    const now = new Date();
    const result = await service.generarResumenTarjeta(
      req.params.id,
      usuario_id,
      year || now.getFullYear(),
      month || (now.getMonth() + 1)
    );
    res.json(result);
  } catch (err) {
    handle(err, res, 'Error generando resumen');
  }
});

router.post('/consumos', async (req, res) => {
  try {
    const { tarjeta_id, descripcion, monto, fecha_compra, cuotas } = req.body;
    const id = await service.registrarConsumoTarjeta(tarjeta_id, descripcion, monto, fecha_compra, cuotas || '1/1');
    res.status(201).json({ id });
  } catch (err) {
    handle(err, res, 'Error registrando consumo');
  }
});

router.get('/consumos', async (req, res) => {
  try {
    res.json(await service.obtenerConsumosTarjeta(req.query.tarjeta_id));
  } catch (err) {
    handle(err, res, 'Error obteniendo consumos');
  }
});

module.exports = router;
