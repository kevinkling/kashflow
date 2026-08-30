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
            account_id: m.cuenta_id, // ID de la cuenta para filtrado robusto
            banco: m.cuenta_alias || m.cuenta, // Usar alias primero, luego nombre
            banco_nombre: m.cuenta, // Nombre completo del banco
            banco_color: m.cuenta_color || '#6c757d', // Color del banco (con fallback)
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

router.post('/movimientos', async (req, res) => {
    try {
        const { registrarTransaccion } = require('../services/dbHelper.js');
        const { cuenta_id, tipo, monto, descripcion } = req.body;
        if (!cuenta_id || !tipo || !monto || !descripcion) {
            return res.status(400).json({ error: 'cuenta_id, tipo, monto y descripcion son requeridos' });
        }
        const id = await registrarTransaccion(cuenta_id, tipo, monto, descripcion);
        res.status(201).json({ id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error al registrar el movimiento' });
    }
});

router.post('/transferencias', async (req, res) => {
    try {
        const { registrarTransferencia } = require('../services/dbHelper.js');
        const { cuenta_origen_id, cuenta_destino_id, monto, descripcion } = req.body;
        await registrarTransferencia(cuenta_origen_id, cuenta_destino_id, monto, descripcion || 'Transferencia');
        res.status(201).json({ ok: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error al registrar la transferencia' });
    }
});

module.exports = router;
