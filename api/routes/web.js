const express = require('express');
const router = express.Router();
const { consultarTodosLosMovimientos } = require('../services/dbHelper.js');

// Health check endpoint para Docker
router.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Endpoint para obtener los movimientos
router.get('/movimientos', async (req, res) => {
    try {
        const movimientos = await consultarTodosLosMovimientos();
        
        // Mapear los datos al formato que espera el frontend
        const movimientosMapeados = movimientos.map(m => ({
            id: m.id,
            fecha: m.fecha_hora,
            descripcion: m.descripcion,
            banco: m.cuenta_alias || m.cuenta, // Usar alias primero, luego nombre
            banco_destino: null, // TODO: implementar lógica de transferencias si es necesario
            monto: m.monto_con_signo, // Ya incluye el signo (+/-)
            debeHaber: m.tipo // 'debe' o 'haber'
        }));
        
        res.json(movimientosMapeados);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error al obtener los datos' });
    }
});

module.exports = router;
