// Cargar variables de entorno según el ambiente
const path = require('path');
const fs = require('fs');
const env = process.env.NODE_ENV || 'development';

// Ruta absoluta al directorio raíz del proyecto
const projectRoot = path.join(__dirname, '..');

// Intentar cargar el archivo específico del entorno (.env.development, .env.production)
// Si no existe, cargar .env por defecto
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

const express = require('express');
const app = express();

// Importar servicios y rutas
const db = require('./services/db.js');
const webRoutes = require('./routes/web.js');
const cuentasRoutes = require('./routes/cuentas.js');




const PORT = process.env.API_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API - DESPUÉS del middleware - Las rutas más específicas deben ir PRIMERO
// Montar rutas principales
app.use('/api/cuentas', cuentasRoutes);
app.use('/api', webRoutes);
// Rutas de planificación (compromisos, instancias, confirmaciones)
const planningRoutes = require('./routes/planning.js');
app.use('/api/planning', planningRoutes);

const enableTelegram = (process.env.ENABLE_TELEGRAM_BOT || 'false').toLowerCase() === 'true';
if (enableTelegram) {
  const telegramRoutes = require('./routes/telegram.js');
  const { bot: telegramBot } = require('./bots/telegramBot.js');
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
    console.log(`📁 Archivos estáticos servidos desde: ${path.join(__dirname, '../public')}`);

});

module.exports = { db };