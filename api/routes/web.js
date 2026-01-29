const express = require('express');
const router = express.Router();
const { consultarTodosLosMovimientos } = require('../services/dbHelper.js');

// Endpoint para obtener los movimientos
router.get('/movimientos', async (req, res) => {
    try {
        const movimientos = await consultarTodosLosMovimientos();
        res.json(movimientos);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error al obtener los datos' });
    }
});

module.exports = router;
