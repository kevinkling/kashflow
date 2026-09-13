const path = require('path');
const fs = require('fs');
const env = process.env.NODE_ENV || 'development';
const projectRoot = path.join(__dirname, '..');

const envFiles = [
  path.join(projectRoot, `.env.${env}`),
  path.join(projectRoot, '.env')
];

let envLoaded = false;
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    require('dotenv').config({ path: envFile });
    console.log(`✅ Variables de entorno cargadas desde: ${path.basename(envFile)}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  No se encontró archivo .env');
}

const app = require('./app');
const db = require('./db/connection');
const PORT = process.env.API_PORT || 3000;

const enableTelegram = (process.env.ENABLE_TELEGRAM_BOT || 'false').toLowerCase() === 'true';
if (enableTelegram) {
  const telegramRoutes = require('./domains/telegram/telegram.routes');
  const { bot: telegramBot } = require('./domains/telegram/telegramBot');
  app.use('/kashflow/telegram', telegramRoutes);

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    const fullWebhookUrl = `${webhookUrl}/telegram/webhook`;
    telegramBot.setWebHook(fullWebhookUrl)
      .then(() => console.log('Webhook de Telegram configurado:', fullWebhookUrl))
      .catch(err => console.error('Error configurando webhook:', err.message));
  } else {
    console.warn('ENABLE_TELEGRAM_BOT=true pero WEBHOOK_URL no está configurado');
  }
} else {
  console.log('Bot de Telegram desconectado (ENABLE_TELEGRAM_BOT=false)');
}

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
  console.log(`📁 Archivos estáticos servidos desde: ${path.join(__dirname, '../dist')}`);
});

module.exports = { db };
