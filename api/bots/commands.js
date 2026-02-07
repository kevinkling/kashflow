module.exports = bot => ({
  hola: async msg => {
    const chatId = msg.chat.id;
    const nombre = msg.from?.first_name || "amigo";
    const { getFormattedDate } = require("../services/utils");
    const fechaActual = getFormattedDate();

    await bot.sendMessage(chatId, `¡Hola ${nombre}! la fecha actual es ${fechaActual} 👋`);
  },

  regla503020: async msg => {
    const chatId = msg.chat.id;
    const { consultarUltimoDepositoSueldo } = require("../services/dbHelper");

    const ultimoDepositoSueldo = await consultarUltimoDepositoSueldo();

    const necesidades = ultimoDepositoSueldo * 0.5;
    const deseos = ultimoDepositoSueldo * 0.3;
    const ahorro = ultimoDepositoSueldo * 0.2;

    const fecha = new Date();
    const nombre_mes = fecha.toLocaleString("es-ES", { month: "long" });

    const respuesta = `💰 Regla 50/30/20

    Sueldo de ${nombre_mes} $ ${ultimoDepositoSueldo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    Gastos imprescindibles $ ${necesidades.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    Gastos prescindibles $ ${deseos.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    Ahorro del mes $ ${ahorro.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    `;

    await bot.sendMessage(chatId, respuesta);
  },

  ahorro: async msg => {
    const chatId = msg.chat.id;
    const { consultarUltimoDepositoSueldo } = require("../services/dbHelper");
    const { calcularPorcentajeRedondeado } = require("../services/utils");

    const ultimoDepositoSueldo = await consultarUltimoDepositoSueldo();
    const porcentajeAhorro = 0.2;

    const monto = calcularPorcentajeRedondeado(ultimoDepositoSueldo, porcentajeAhorro);

    await bot.sendMessage(chatId, `💰 El monto que debes ahorrar este mes es $${monto.toLocaleString("es-AR")} pesos.`);
  },

  resumen: async msg => {
    const chatId = msg.chat.id;
    const { consultarSaldosPorCuenta } = require("../services/dbHelper");

    // Función para capitalizar la primera letra
    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    // Consultar los saldos por cuenta
    const saldos = await consultarSaldosPorCuenta();

    if (saldos.length === 0) {
      await bot.sendMessage(chatId, "💳 No hay cuentas registradas.");
      return;
    }

    // Construir el mensaje con los saldos
    let mensaje = "💳 *Resumen de saldos por cuenta:*\n\n"; // Usar Markdown para el título
    saldos.forEach(saldo => {
      mensaje += `🏦 ${capitalize(saldo.cuenta)} (${saldo.alias}): *$${Number(saldo.saldo_actual).toLocaleString("es-AR", { minimumFractionDigits: 2 })}* ${saldo.moneda}\n`;
    });

    // Enviar el mensaje al usuario con la opción de parse_mode
    await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
  },

  resumenHoy: async msg => {
    const chatId = msg.chat.id;
    const { consultarRegistrosHoy } = require("../services/dbHelper");
    const { getFormattedDate } = require("../services/utils");

    const registros = await consultarRegistrosHoy();

    if (registros.length === 0) {
      await bot.sendMessage(chatId, "📅 No hay registros cargados hasta la fecha de hoy.");
      return;
    }

    // Construir el mensaje con los registros
    let mensaje = "📋 *Registros cargados hasta hoy:*\n\n";
    registros.forEach(registro => {
      const tipoEmoji = registro.tipo === 'debe' ? '➕' : '➖';
      mensaje += `${tipoEmoji} *${registro.descripcion}*\n`;
      mensaje += `   - Cuenta: ${registro.cuenta} (${registro.cuenta_alias})\n`;
      mensaje += `   - Monto: $${Number(registro.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}\n`;
      mensaje += `   - Tipo: ${registro.es_transferencia}\n\n`;
    });

    // Enviar el mensaje al usuario
    await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
  },

  voz: async msg => {
    const chatId = msg.chat.id;
    const whisperService = require("../services/whisperService");
    const transactionParser = require("../services/transactionParser");
    const { obtenerOCrearUsuario, obtenerCuentaPorAlias, registrarTransaccion, registrarTransferencia } = require("../services/dbHelper");

    try {
      // Notificar que se está procesando
      await bot.sendMessage(chatId, "🎤 Procesando tu mensaje de voz...");

      // Transcribir el audio
      const transcripcion = await whisperService.transcribeVoiceMessage(bot, msg);
      
      // Mostrar transcripción al usuario
      await bot.sendMessage(chatId, `📝 Escuché: "${transcripcion}"`);

      // Parsear la transcripción
      const parsedTransaction = transactionParser.parse(transcripcion);

      // Si no es válida, mostrar errores
      if (!parsedTransaction.valido) {
        const mensajeError = `❌ No pude procesar la transacción:\n${parsedTransaction.errores.join('\n')}\n\n` +
                           `Intenta de nuevo con más detalles.`;
        await bot.sendMessage(chatId, mensajeError);
        return;
      }

      // Mostrar resumen y pedir confirmación
      const resumen = transactionParser.generarResumen(parsedTransaction);
      await bot.sendMessage(chatId, `${resumen}\n\n¿Es correcto? (Responde Sí/No)`, {
        reply_markup: {
          keyboard: [['✅ Sí', '❌ No']],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });

      // Guardar datos temporalmente para confirmar después
      // (En una implementación más robusta, usarías una base de datos temporal o Redis)
      global.pendingTransactions = global.pendingTransactions || {};
      global.pendingTransactions[chatId] = parsedTransaction;

    } catch (error) {
      console.error('❌ Error procesando mensaje de voz:', error);
      await bot.sendMessage(chatId, `❌ Error al procesar el audio: ${error.message}\n\nAsegúrate de que Whisper esté instalado correctamente.`);
    }
  },

  confirmarTransaccion: async msg => {
    const chatId = msg.chat.id;
    const texto = msg.text.toLowerCase();

    // Verificar si hay una transacción pendiente
    if (!global.pendingTransactions || !global.pendingTransactions[chatId]) {
      return; // No hay transacción pendiente, ignorar
    }

    const parsedTransaction = global.pendingTransactions[chatId];

    try {
      if (texto.includes('sí') || texto.includes('si') || texto.includes('✅')) {
        // Confirmar y registrar la transacción
        const { obtenerOCrearUsuario, obtenerCuentaPorAlias, registrarTransaccion, registrarTransferencia } = require("../services/dbHelper");

        // Obtener o crear usuario
        const usuarioId = await obtenerOCrearUsuario(msg.from.id, msg.from.first_name);

        if (parsedTransaction.tipo === 'transferencia') {
          // Transferencia
          const cuentaOrigen = await obtenerCuentaPorAlias(parsedTransaction.cuentaOrigen);
          const cuentaDestino = await obtenerCuentaPorAlias(parsedTransaction.cuentaDestino);

          if (!cuentaOrigen) {
            await bot.sendMessage(chatId, `❌ No encontré la cuenta origen: "${parsedTransaction.cuentaOrigen}"`);
            delete global.pendingTransactions[chatId];
            return;
          }

          if (!cuentaDestino) {
            await bot.sendMessage(chatId, `❌ No encontré la cuenta destino: "${parsedTransaction.cuentaDestino}"`);
            delete global.pendingTransactions[chatId];
            return;
          }

          await registrarTransferencia(
            cuentaOrigen.id,
            cuentaDestino.id,
            parsedTransaction.monto,
            parsedTransaction.descripcion
          );

          await bot.sendMessage(chatId, `✅ Transferencia registrada exitosamente!\n\n💰 $${parsedTransaction.monto.toLocaleString('es-AR')} de ${cuentaOrigen.nombre} a ${cuentaDestino.nombre}`, {
            reply_markup: { remove_keyboard: true }
          });

        } else {
          // Ingreso o Egreso
          const cuenta = await obtenerCuentaPorAlias(parsedTransaction.cuenta);

          if (!cuenta) {
            await bot.sendMessage(chatId, `❌ No encontré la cuenta: "${parsedTransaction.cuenta}"`);
            delete global.pendingTransactions[chatId];
            return;
          }

          const tipo = parsedTransaction.tipo === 'ingreso' ? 'debe' : 'haber';
          
          await registrarTransaccion(
            cuenta.id,
            tipo,
            parsedTransaction.monto,
            parsedTransaction.descripcion,
            null,
            msg.message_id
          );

          const tipoTexto = parsedTransaction.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
          await bot.sendMessage(chatId, `✅ ${tipoTexto} registrado exitosamente!\n\n💰 $${parsedTransaction.monto.toLocaleString('es-AR')} en ${cuenta.nombre}`, {
            reply_markup: { remove_keyboard: true }
          });
        }

        // Limpiar transacción pendiente
        delete global.pendingTransactions[chatId];

      } else if (texto.includes('no') || texto.includes('❌')) {
        // Cancelar
        await bot.sendMessage(chatId, '❌ Transacción cancelada. Envía otro mensaje de voz si deseas registrar algo.', {
          reply_markup: { remove_keyboard: true }
        });
        delete global.pendingTransactions[chatId];
      }
    } catch (error) {
      console.error('❌ Error confirmando transacción:', error);
      await bot.sendMessage(chatId, `❌ Error al registrar la transacción: ${error.message}`, {
        reply_markup: { remove_keyboard: true }
      });
      delete global.pendingTransactions[chatId];
    }
  },

  ayudaVoz: async msg => {
    const chatId = msg.chat.id;
    const transactionParser = require("../services/transactionParser");
    
    const ejemplos = transactionParser.constructor.generarEjemplos();
    await bot.sendMessage(chatId, ejemplos, { parse_mode: "Markdown" });
  },
});
