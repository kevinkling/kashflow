// Cargar variables de entorno según el ambiente
const path = require('path');
const env = process.env.NODE_ENV || 'development';

// Ruta absoluta al directorio raíz del proyecto
const projectRoot = path.join(__dirname, '..');

// Intentar cargar el archivo específico del entorno (.env.development o .env.production)
const envResult = require('dotenv').config({ path: path.join(projectRoot, `.env.${env}`) });

const express = require('express');
const app = express();

// Importar servicios y rutas
const db = require('./services/db.js');
const telegramRoutes = require('./routes/telegram.js');
const webRoutes = require('./routes/web.js');

// Importar bot para configurar webhook
const { bot: telegramBot } = require('./bots/telegramBot.js');


const PORT = process.env.API_PORT || 3000;

app.use(express.json());

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/telegram', telegramRoutes);
app.use('/api', webRoutes);

// Configurar webhook de Telegram al iniciar
const webhookUrl = process.env.WEBHOOK_URL;

if (webhookUrl) {
    const fullWebhookUrl = `${webhookUrl}/telegram/webhook`;
    console.log(fullWebhookUrl)

    telegramBot.setWebHook(fullWebhookUrl)
        .then(() => {
            console.log('✅ Webhook de Telegram configurado:', fullWebhookUrl);
        })
        .catch(err => {
            console.error('❌ Error configurando webhook:', err.message);
    console.log(fullWebhookUrl)

        });
} else {
    console.warn('⚠️  WEBHOOK_URL no configurado - Bot no funcionará');
}

app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
    console.log(`📁 Archivos estáticos servidos desde: ${path.join(__dirname, '../public')}`);

});

module.exports = { db };