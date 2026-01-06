# 💸 KashFlow

**KashFlow** es una pequeña aplicación personal pensada para registrar ingresos, egresos y movimientos entre cuentas bancarias desde un bot de Telegram, que guarda los datos en una base de datos SQLite y ofrece un dashboard web para visualizar los movimientos.

---

## 🧠 ¿Qué hace?

Este proyecto permite enviar mensajes con estructuras predefinidas al bot de Telegram y registrar automáticamente los datos en una base de datos SQLite.  
También incluye un dashboard web para visualizar y gestionar los movimientos financieros.

---

## 📦 Estructura del Proyecto
```
kashflow
├─ .env.development / .env.production
├─ api
│  ├─ bots
│  │  ├─ commands.js        # Comandos específicos del bot
│  │  └─ telegramBot.js     # Configuración del bot de Telegram
│  ├─ index.js              # Punto de entrada de la API
│  ├─ routes
│  │  ├─ telegram.js        # Rutas para el webhook de Telegram
│  │  └─ web.js             # Rutas de la API REST
│  └─ services
│     ├─ bodyParser.js      # Parser de mensajes en lenguaje natural
│     ├─ db.js              # Configuración y conexión a SQLite
│     ├─ dbHelper.js        # Funciones para interactuar con la BD
│     └─ utils.js           # Utilidades varias
├─ data
│  └─ kashflow.db           # Base de datos SQLite
├─ package.json
├─ public
│  ├─ css
│  │  └─ journal.css        # Estilos del dashboard
│  ├─ icons
│  │  └─ favicon.ico
│  ├─ img
│  │  └─ kashflow_image.jpg
│  ├─ js
│  │  ├─ journal.js         # Lógica del dashboard
│  │  ├─ utils.js           # Utilidades del frontend
│  │  └─ particles
│  │     ├─ particles.min.js
│  │     └─ particlesjs-config.json
│  └─ index.html            # Dashboard web
└─ README.md
```

---

## 🧪 Tecnologías Usadas

### 📦 API

  - `Node.js` : entorno de ejecución
  - `express` : framework para crear la API
  - `SQLite` : base de datos
  - `better-sqlite3` :  como biblioteca para interactuar con la base de datos SQLite

### 🤖 BOT - Telegram
  - [`node-telegram-bot-api`](https://github.com/yagop/node-telegram-bot-api)

### 🎨 Frontend
  - [`particles.js`](https://github.com/VincentGarreau/particles.js/) - Efectos visuales

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
   
   Crea un archivo `.env.development` (o `.env.production`) en la raíz del proyecto:
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

## 📌 Notas
⚠️ El proyecto está en desarrollo y enfocado en uso personal.
En el futuro, agregar soporte para múltiples cuentas (por ejemplo: mi cuenta, la de papá, etc.).
