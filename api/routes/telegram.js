const express = require('express');
const router = express.Router();
const { parsearMensaje } = require('../services/bodyParser');
const { registrarMovimiento } = require('../services/dbHelper');
const { logMovimiento } = require('../services/utils');
const { bot } = require('../bots/telegramBot');

router.post('/webhook', async (req, res) => {
    const chatId = req.body?.message?.chat?.id;
    const text = req.body?.message?.text?.trim();

    try {
        // console.log('Webhook recibido:', JSON.stringify(req.body, null, 2));

        // Procesar update del bot (esto maneja comandos automáticamente)
        await bot.processUpdate(req.body);

        // Si es comando o no hay texto, no procesar como movimiento
        if (!text || text.startsWith('/')) return res.sendStatus(200);

        const mensaje = text.trim();
        const datos = parsearMensaje(mensaje);

        if (!datos || typeof datos !== 'object' || datos.error) {
            console.warn('Mensaje no reconocido o datos inválidos:', datos);
            throw new Error(datos?.error || 'formato inválido');
        }

        // Normalizo campos, usando nullish coalescing y optional chaining
        const tipo = datos.tipo ?? null;
        const banco = (datos.banco ?? datos.bancoOrigen)?.toUpperCase() ?? null;
        const banco_destino = (datos.banco_destino ?? datos.bancoDestino)?.toUpperCase() ?? null;
        const descripcion = datos.descripcion || (tipo === 'movimiento' && banco_destino ? `Movimiento de ${banco} a ${banco_destino}` : null);
        let monto = datos.monto ?? null;

        // Validaciones básicas para evitar que se rompa la lógica
        if (!tipo || !banco || typeof monto !== 'number' || isNaN(monto)) {
            console.warn('Datos esenciales faltantes o inválidos:', { tipo, banco, monto });
            throw new Error(datos?.error || 'datos esenciales inválidos o faltantes');
        }

        // Registrar movimiento según el tipo
        if (tipo === 'movimiento' && banco_destino !== null) {
            logMovimiento(tipo, banco, descripcion, monto, banco_destino);
            registrarMovimiento(tipo, banco, descripcion, -Math.abs(monto), banco_destino);
            registrarMovimiento(tipo, banco_destino, descripcion, monto, banco_destino); // Contraparte
        } else if (tipo === 'egreso') {
            monto = -Math.abs(monto)
            logMovimiento(tipo, banco, descripcion, monto);
            registrarMovimiento(tipo, banco, descripcion, monto);
        } else {
            logMovimiento(tipo, banco, descripcion, monto);
            registrarMovimiento(tipo, banco, descripcion, monto);
        }

        // ✅ Enviar confirmación
        await bot.sendMessage(chatId, '✅ Movimiento registrado correctamente.');

        return res.json({ status: 'ok', datos });
    } catch (err) {
        // console.error('Error procesando el webhook:', err);

        // ❌ Enviar error a Telegram
        if (chatId) {
            await bot.sendMessage(chatId, '❌ Error procesando el mensaje. Verificá el formato.');
        }

        return res.status(200).json({
            status: 'error',
            error: err.message
        });
    }
});

module.exports = router;