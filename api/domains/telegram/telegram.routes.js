const express = require('express');
const router = express.Router();
const { parsearMensaje } = require('../../shared/bodyParser');
const { registrarTransaccion, registrarTransferencia } = require('../movimientos/movimientos.repository');
const { obtenerCuentaPorAlias } = require('../cuentas/cuentas.repository');
const { logMovimiento } = require('../../shared/utils');
const { bot } = require('./telegramBot');

router.post('/webhook', async (req, res) => {
  const chatId = req.body?.message?.chat?.id;
  const text = req.body?.message?.text?.trim();

  try {
    await bot.processUpdate(req.body);
    if (!text || text.startsWith('/')) return res.sendStatus(200);

    const datos = parsearMensaje(text.trim());
    if (!datos || typeof datos !== 'object' || datos.error) {
      throw new Error(datos?.error || 'formato inválido');
    }

    let tipo = datos.tipo ?? null;
    const bancoAlias = (datos.banco ?? datos.bancoOrigen)?.toUpperCase() ?? null;
    const bancoDestinoAlias = (datos.banco_destino ?? datos.bancoDestino)?.toUpperCase() ?? null;
    const descripcion = datos.descripcion || (tipo === 'movimiento' && bancoDestinoAlias ? `Transferencia de ${bancoAlias} a ${bancoDestinoAlias}` : null);
    const monto = datos.monto ?? null;

    if (tipo === 'deposito de sueldo') tipo = 'ingreso';

    if (!tipo || !bancoAlias || typeof monto !== 'number' || isNaN(monto) || monto <= 0) {
      throw new Error('datos esenciales inválidos o faltantes');
    }
    if ((tipo === 'ingreso' || tipo === 'egreso') && !descripcion) {
      throw new Error('Se requiere descripción para ingresos y egresos');
    }

    const cuentaOrigen = await obtenerCuentaPorAlias(bancoAlias);
    if (!cuentaOrigen) throw new Error(`La cuenta "${bancoAlias}" no existe o está inactiva`);

    if (tipo === 'movimiento') {
      if (!bancoDestinoAlias) throw new Error('Para movimientos se requiere cuenta destino');
      const cuentaDestino = await obtenerCuentaPorAlias(bancoDestinoAlias);
      if (!cuentaDestino) throw new Error(`La cuenta destino "${bancoDestinoAlias}" no existe o está inactiva`);
      logMovimiento(tipo, bancoAlias, descripcion, monto, bancoDestinoAlias);
      await registrarTransferencia(cuentaOrigen.id, cuentaDestino.id, monto, descripcion);
    } else if (tipo === 'egreso') {
      logMovimiento(tipo, bancoAlias, descripcion, monto);
      await registrarTransaccion(cuentaOrigen.id, 'haber', monto, descripcion);
    } else if (tipo === 'ingreso') {
      logMovimiento(tipo, bancoAlias, descripcion, monto);
      await registrarTransaccion(cuentaOrigen.id, 'debe', monto, descripcion);
    } else {
      throw new Error(`Tipo de transacción desconocido: ${tipo}`);
    }

    await bot.sendMessage(chatId, '✅ Movimiento registrado correctamente.');
    return res.json({ status: 'ok', datos });
  } catch (err) {
    console.error('❌ Error procesando el webhook:', err.message);
    if (chatId) {
      const mensajeError = err.message.includes('no existe') || err.message.includes('inválidos') || err.message.includes('descripción')
        ? `❌ ${err.message}`
        : '❌ Error procesando el mensaje. Verificá el formato.';
      await bot.sendMessage(chatId, mensajeError);
    }
    return res.status(200).json({ status: 'error', error: err.message });
  }
});

module.exports = router;
