const express = require('express');
const router = express.Router();
const service = require('./movimientos.service');

function handle(err, res, fallback) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || fallback });
}

router.get('/movimientos', async (req, res) => {
  try {
    res.json(await service.listar());
  } catch (err) {
    handle(err, res, 'Error al obtener los datos');
  }
});

router.post('/movimientos', async (req, res) => {
  try {
    const id = await service.crear(req.body);
    res.status(201).json({ id });
  } catch (err) {
    handle(err, res, 'Error al registrar el movimiento');
  }
});

router.post('/transferencias', async (req, res) => {
  try {
    await service.transferir(req.body);
    res.status(201).json({ ok: true });
  } catch (err) {
    handle(err, res, 'Error al registrar la transferencia');
  }
});

router.put('/movimientos/:id', async (req, res) => {
  try {
    const id = await service.actualizar(req.params.id, req.body);
    res.json({ id });
  } catch (err) {
    handle(err, res, 'Error al actualizar la transacción');
  }
});

router.delete('/movimientos/:id', async (req, res) => {
  try {
    const result = await service.eliminar(req.params.id);
    res.json({ ok: true, result });
  } catch (err) {
    handle(err, res, 'Error al eliminar la transacción');
  }
});

module.exports = router;
