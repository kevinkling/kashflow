const express = require('express');
const router = express.Router();
const { parsearMensaje } = require('../services/bodyParser');
const { 
    registrarTransaccion, 
    registrarTransferencia, 
    obtenerCuentaPorAlias 
} = require('../services/dbHelper');
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
        let tipo = datos.tipo ?? null;
        const bancoAlias = (datos.banco ?? datos.bancoOrigen)?.toUpperCase() ?? null;
        const bancoDestinoAlias = (datos.banco_destino ?? datos.bancoDestino)?.toUpperCase() ?? null;
        const descripcion = datos.descripcion || (tipo === 'movimiento' && bancoDestinoAlias ? `Transferencia de ${bancoAlias} a ${bancoDestinoAlias}` : null);
        const monto = datos.monto ?? null;

        // Normalizar tipo "deposito de sueldo" a "ingreso"
        if (tipo === 'deposito de sueldo') {
            tipo = 'ingreso';
        }

        // Validaciones básicas para evitar que se rompa la lógica
        if (!tipo || !bancoAlias || typeof monto !== 'number' || isNaN(monto) || monto <= 0) {
            console.warn('Datos esenciales faltantes o inválidos:', { tipo, bancoAlias, monto });
            throw new Error('datos esenciales inválidos o faltantes');
        }

        // Validar descripción para ingresos y egresos
        if ((tipo === 'ingreso' || tipo === 'egreso') && !descripcion) {
            throw new Error('Se requiere descripción para ingresos y egresos');
        }

        // Obtener cuenta(s) por alias
        const cuentaOrigen = await obtenerCuentaPorAlias(bancoAlias);
        if (!cuentaOrigen) {
            throw new Error(`La cuenta "${bancoAlias}" no existe o está inactiva`);
        }

        // Registrar movimiento según el tipo
        if (tipo === 'movimiento') {
            // Es una transferencia entre cuentas
            if (!bancoDestinoAlias) {
                throw new Error('Para movimientos se requiere cuenta destino');
            }

            const cuentaDestino = await obtenerCuentaPorAlias(bancoDestinoAlias);
            if (!cuentaDestino) {
                throw new Error(`La cuenta destino "${bancoDestinoAlias}" no existe o está inactiva`);
            }

            logMovimiento(tipo, bancoAlias, descripcion, monto, bancoDestinoAlias);
            await registrarTransferencia(cuentaOrigen.id, cuentaDestino.id, monto, descripcion);

        } else if (tipo === 'egreso') {
            // Es un egreso (haber) - monto siempre positivo
            logMovimiento(tipo, bancoAlias, descripcion, monto);
            await registrarTransaccion(cuentaOrigen.id, 'haber', monto, descripcion);

        } else if (tipo === 'ingreso') {
            // Es un ingreso (debe) - monto siempre positivo
            logMovimiento(tipo, bancoAlias, descripcion, monto);
            await registrarTransaccion(cuentaOrigen.id, 'debe', monto, descripcion);

        } else {
            throw new Error(`Tipo de transacción desconocido: ${tipo}`);
        }

        // ✅ Enviar confirmación
        await bot.sendMessage(chatId, '✅ Movimiento registrado correctamente.');

        return res.json({ status: 'ok', datos });
    } catch (err) {
        console.error('❌ Error procesando el webhook:', err.message);

        // ❌ Enviar error a Telegram con mensaje específico
        if (chatId) {
            const mensajeError = err.message.includes('no existe') || err.message.includes('inválidos') || err.message.includes('descripción')
                ? `❌ ${err.message}`
                : '❌ Error procesando el mensaje. Verificá el formato.';
            
            await bot.sendMessage(chatId, mensajeError);
        }

        return res.status(200).json({
            status: 'error',
            error: err.message
        });
    }
});

module.exports = router;