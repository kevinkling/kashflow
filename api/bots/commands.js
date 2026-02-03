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
});
