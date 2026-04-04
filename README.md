# 💸 KashFlow

**KashFlow** es una aplicación personal para registrar movimientos financieros (ingresos, egresos y transferencias entre cuentas bancarias) mediante un bot de Telegram con lenguaje natural. Los datos se almacenan en SQLite y se visualizan en un dashboard web.

---

## 🧠 ¿Qué hace?

Permite enviar mensajes en lenguaje natural al bot de Telegram para registrar automáticamente movimientos financieros en una base de datos SQLite. Incluye un dashboard web para visualizar y gestionar los movimientos.

---

## 📦 Estructura del Proyecto
```
kashflow
├─ .env / .env.example
├─ api
│  ├─ bots
│  │  ├─ commands.js        # Comandos específicos del bot
│  │  └─ telegramBot.js     # Configuración del bot de Telegram
│  ├─ index.js              # Punto de entrada de la API
│  ├─ routes
│  │  ├─ cuentas.js         # Rutas para gestión de cuentas
│  │  ├─ telegram.js        # Rutas para el webhook de Telegram
│  │  └─ web.js             # Rutas de la API REST
│  └─ services
│     ├─ bodyParser.js      # Parser de mensajes en lenguaje natural
│     ├─ db.js              # Configuración y conexión a SQLite
│     ├─ dbHelper.js        # Funciones para interactuar con la BD
│     └─ utils.js           # Utilidades varias
├─ data
│  └─ kashflow.db           # Base de datos SQLite
├─ docker-compose.yml
├─ Dockerfile
├─ docs/
├─ package.json
├─ public
│  ├─ css
│  │  └─ journal.css        # Estilos del dashboard
│  ├─ icons/
│  ├─ img/
│  ├─ js
│  │  ├─ accounts-crud.js   # CRUD de cuentas
│  │  ├─ accounts.js        # Gestión de cuentas
│  │  ├─ journal.js         # Lógica del dashboard
│  │  ├─ utils.js           # Utilidades del frontend
│  │  └─ particles/
│  │     └─ particles.min.js
│  └─ index.html            # Dashboard web
├─ README.md
└─ temp/
```

---

## 🧪 Tecnologías

- **Backend:** Node.js + Express.js
- **Base de datos:** SQLite (better-sqlite3)
- **Bot:** Telegram Bot API (node-telegram-bot-api)
- **Frontend:** HTML/CSS/JS vanilla con particles.js
- **Gestor de paquetes:** pnpm
- **Contenedor:** Docker

---

## 📥 Estructura de Mensajes

El bot interpreta los siguientes comandos en lenguaje natural:

#### ➖ Egreso : " GASTE DE 'banco' 'monto' PARA 'descripcion' "
#### ➕ Ingreso : " RECIBI EN 'banco' 'monto' DE 'descripcion' "
#### 🔁 Movimiento entre bancos : " MOVI DE 'banco' A 'banco' 'monto' "
#### 💰 Depósito de sueldo : " SUELDO 'monto' "

### Ejemplos de mensajes:

- gaste de Uala 1500 para comprar leche
- gaste de BBVA 1500 para comprar pan
- recibi en Uala 2000 de Lucas por comida
- recibi en MercadoPago 300 de ganancias
- movi de Uala a MercadoPago 4000
- sueldo 1234561

---

## 🛠 Cómo correr el proyecto

1. Cloná el repositorio
2. Instalá las dependencias:
   ```bash
   pnpm install
   ```

3. Configurá las variables de entorno:
   
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   BOT_TOKEN=tu_token_de_telegram
   WEBHOOK_URL=https://tu-dominio.com
   API_PORT=3000
   NODE_ENV=development
   ```
   
   Para obtener el token del bot:
   - Hablá con [@BotFather](https://t.me/BotFather) en Telegram
   - Creá un nuevo bot con `/newbot`
   - Copiá el token que te proporciona

4. Si usás CloudFlared (para exponer el webhook localmente):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Luego actualizá `WEBHOOK_URL` en tu `.env` con la URL que te proporciona CloudFlared.

5. Ejecutá el proyecto:
   ```bash
   # Modo desarrollo (con auto-reload)
   pnpm dev
   
   # Modo producción
   pnpm start
   ```

6. Accedé al dashboard web en `http://localhost:3000`

---

## 🚀 Deploy con Docker

### Imagen

La imagen está publicada en `ghcr.io/kevinkling/kashflow:latest`

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
BOT_TOKEN=tu_bot_token_aqui
WEBHOOK_URL=https://tu-dominio.com
WEBHOOK_PORT=8443
API_PORT=3000
NODE_ENV=production
DATA_DIR=data
DB_PATH=/app/data/kashflow.db
UPDATES_DIR=/app/scripts/updates
TZ=America/Argentina/Buenos_Aires
```

### Docker Compose

```yaml
services:
  kashflow:
    image: ghcr.io/kevinkling/kashflow:latest
    container_name: kashflow
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - kashflow-data:/app/data
    networks:
      - hosting-network

volumes:
  kashflow-data:

networks:
  hosting-network:
    name: hosting-network
    external: true
```

### Notas de Deploy

- Los datos persisten en el volumen Docker `kashflow-data`
- Puerto expuesto: `3000`
- Timezone configurada: `America/Argentina/Buenos_Aires`
- Para backups, se puede usar `docker-volume-backup`

## 📌 Notas
⚠️ El proyecto está en desarrollo y enfocado en uso personal.
En el futuro, agregar soporte para múltiples cuentas (por ejemplo: mi cuenta, la de papá, etc.).
