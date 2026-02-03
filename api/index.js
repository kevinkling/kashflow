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
const telegramRoutes = require('./routes/telegram.js');
const webRoutes = require('./routes/web.js');

// Importar bot para configurar webhook
const { bot: telegramBot } = require('./bots/telegramBot.js');


const PORT = process.env.API_PORT || 3000;

app.use(express.json());

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/kashflow/telegram', telegramRoutes);
app.use('/api', webRoutes);

// Configurar webhook de Telegram al iniciar
const webhookUrl = process.env.WEBHOOK_URL;
console.log('WEBHOOK_URL:', webhookUrl);
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