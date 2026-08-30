const express = require('express');
const router = express.Router();
const service = require('./dashboard.service');

router.get('/resumen-financiero', async (req, res) => {
  try {
    const { usuario_id, desde, hasta } = req.query;
    if (!usuario_id || !desde || !hasta) {
      return res.status(400).json({ error: 'Faltan parametros: usuario_id, desde, hasta' });
    }
    res.json(await service.calcularResumenFinanciero(usuario_id, desde, hasta));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo resumen financiero' });
  }
});

module.exports = router;
