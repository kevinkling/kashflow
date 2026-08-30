const express = require('express');
const router = express.Router();
const service = require('./cuentas.service');

function handle(err, res, fallback) {
  const status = err.status || 500;
  console.error(err);
  res.status(status).json({ error: err.message || fallback });
}

router.get('/', async (req, res) => {
  try {
    res.json(await service.listar(req.query.gestion));
  } catch (error) {
    handle(error, res, 'Error al obtener las cuentas');
  }
});

router.get('/usuarios', async (req, res) => {
  try {
    res.json(await service.listarUsuarios());
  } catch (error) {
    handle(error, res, 'Error al obtener los usuarios');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cuenta = await service.obtener(req.params.id);
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(cuenta);
  } catch (error) {
    handle(error, res, 'Error al obtener la cuenta');
  }
});

router.post('/', async (req, res) => {
  try {
    const cuenta = await service.crear(req.body);
    res.status(201).json({ message: 'Cuenta creada exitosamente', cuenta });
  } catch (error) {
    handle(error, res, 'Error al crear la cuenta');
  }
});

router.put('/:id/toggle', async (req, res) => {
  try {
    const nuevoEstado = await service.toggle(req.params.id);
    res.json({
      message: nuevoEstado ? 'Cuenta activada correctamente' : 'Cuenta desactivada correctamente',
      activa: nuevoEstado
    });
  } catch (error) {
    handle(error, res, 'Error al cambiar estado de la cuenta');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const cuenta = await service.actualizar(req.params.id, req.body);
    res.json({ message: 'Cuenta actualizada exitosamente', cuenta });
  } catch (error) {
    handle(error, res, 'Error al actualizar la cuenta');
  }
});

module.exports = router;
