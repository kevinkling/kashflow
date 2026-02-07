const TelegramBot = require('node-telegram-bot-api');
const commands = require('./commands');

const token = process.env.BOT_TOKEN;

// Bot sin webhook propio - manejado por API
const bot = new TelegramBot(token, { polling: false });

console.log('Bot Telegram inicializado');

const telegramCommands = commands(bot);

// Comandos de texto
bot.onText(/\/hola/, (msg) => telegramCommands.hola(msg));
bot.onText(/\/503020/, (msg) => telegramCommands.regla503020(msg));
bot.onText(/\/ahorro/, (msg) => telegramCommands.ahorro(msg));
bot.onText(/^\/resumen$/, (msg) => telegramCommands.resumen(msg));
bot.onText(/^\/resumen_hoy$/, (msg) => telegramCommands.resumenHoy(msg));
bot.onText(/^\/ayuda_voz$/, (msg) => telegramCommands.ayudaVoz(msg));

// Manejador de mensajes de voz
bot.on('voice', (msg) => telegramCommands.voz(msg));

// Manejador de confirmaciones de transacción (texto que contenga Sí/No)
bot.on('message', (msg) => {
  // Solo procesar si es una confirmación (contiene sí o no)
  if (msg.text && (msg.text.toLowerCase().includes('sí') || 
                   msg.text.toLowerCase().includes('si') || 
                   msg.text.toLowerCase().includes('no') ||
                   msg.text.includes('✅') ||
                   msg.text.includes('❌'))) {
    telegramCommands.confirmarTransaccion(msg);
  }
});

module.exports = { bot };
