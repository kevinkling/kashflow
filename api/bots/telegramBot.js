const TelegramBot = require('node-telegram-bot-api');
const commands = require('./commands');

const token = process.env.BOT_TOKEN;

// Bot sin webhook propio - manejado por API
const bot = new TelegramBot(token, { polling: false });

console.log('Bot Telegram inicializado');

const telegramCommands = commands(bot);

bot.onText(/\/hola/, (msg) => telegramCommands.hola(msg));
bot.onText(/\/503020/, (msg) => telegramCommands.regla503020(msg));
bot.onText(/\/ahorro/, (msg) => telegramCommands.ahorro(msg));
bot.onText(/^\/resumen$/, (msg) => telegramCommands.resumen(msg));
bot.onText(/^\/resumen_hoy$/, (msg) => telegramCommands.resumenHoy(msg));

module.exports = { bot };
