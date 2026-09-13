# 💸 KashFlow

**KashFlow** es una aplicación personal para registrar movimientos financieros (ingresos, egresos y transferencias entre cuentas bancarias) mediante un bot de Telegram con lenguaje natural. Los datos se almacenan en SQLite y se visualizan en un dashboard web.

---

## 🧠 ¿Qué hace?

Permite enviar mensajes en lenguaje natural al bot de Telegram (o al Atajo de iOS) para registrar automáticamente movimientos financieros en una base de datos SQLite. Incluye un dashboard web (Vue 3 + Vite) para visualizar y gestionar movimientos, obligaciones, tarjetas y simulaciones.

> El frontend fue migrado de HTML/CSS/JS vanilla + Bootstrap a Vue 3 + Tailwind CSS + Vite en septiembre de 2026.

---

## 📦 Estructura del Proyecto
```
kashflow
├─ .env / .env.example
├─ api                       # Backend Express
│  ├─ domains                # cuentas, movimientos, categorias, obligaciones, tarjetas,
│  │                          # simulador, dashboard, telegram, atajo — cada uno con
│  │                          # .routes.js / .service.js / .repository.js
│  ├─ db/connection.js       # Conexión SQLite (better-sqlite3)
│  ├─ shared/                # financeCalculations.js y otras utilidades compartidas
│  ├─ app.js                 # Express app: estáticos (dist/), rutas, fallback SPA
│  └─ index.js               # Punto de entrada (bot de Telegram opcional vía ENABLE_TELEGRAM_BOT)
├─ src                       # Frontend Vue 3 + TypeScript + Tailwind CSS
│  ├─ views/                 # InicioView, MovimientosView, ObligacionesView, SimuladorView, CuentasView
│  ├─ components/            # ui/ (primitivas sobre Reka UI), layout/, shared/
│  ├─ stores/                # Pinia: session, theme, cuentas, movimientos, obligaciones, tarjetas, simulador
│  ├─ data/                  # http.ts + repositories/ (capa de datos, Resource<T>)
│  ├─ composables/           # useCurrency, useDates, useContrastColor, useToast, useConfirmDialog
│  └─ types/                 # Tipos alineados a las respuestas reales de la API
├─ public                    # Iconos PWA (Vite los copia a dist/ en el build)
├─ index.html
├─ vite.config.mts           # Proxy /api -> :3000 en dev, vite-plugin-pwa en build
├─ data
│  └─ kashflow.db            # Base de datos SQLite
├─ data/updates/*.sql        # Migraciones aditivas (nunca se borra data en runtime)
├─ docker-compose.yml
├─ Dockerfile                # Multi-stage: build de Vite + backend Node
├─ tests/                    # node --test contra SQLite temporal
├─ DESIGN.md
├─ package.json
└─ README.md
```

---

## 🧪 Tecnologías

- **Backend:** Node.js + Express.js
- **Base de datos:** SQLite (better-sqlite3)
- **Bot:** Telegram Bot API (node-telegram-bot-api)
- **Frontend:** Vue 3 (Composition API) + TypeScript + Tailwind CSS + Vite + Pinia + Reka UI + `vite-plugin-pwa`
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

   **Desarrollo** (dos terminales, el frontend en modo Vite con hot-reload):
   ```bash
   # Terminal A: API (puerto 3000)
   pnpm dev

   # Terminal B: frontend Vue con proxy /api -> :3000 (puerto 5173)
   pnpm dev:web
   ```
   En desarrollo, accedé al dashboard en `http://localhost:5173` (Vite). El backend solo
   sirve `http://localhost:3000` (API + el build de producción, si existe).

   **Producción** (un solo proceso, Express sirve el build de Vite):
   ```bash
   pnpm build:web   # genera dist/
   pnpm start       # sirve API + dist/ en :3000
   ```

6. Accedé al dashboard web en `http://localhost:3000` (producción) o `http://localhost:5173` (dev).

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
