const express = require('express');
const router = express.Router();
const repo = require('./categorias.repository');

router.get('/categorias', async (req, res) => {
  try {
    res.json(await repo.obtenerCategorias());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo categorias' });
  }
});

module.exports = router;
