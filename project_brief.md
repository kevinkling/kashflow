# PROJECT BRIEF: KashFlow - Sistema de Gestión Financiera Personal

**Tipo de Documento**: Especificación Técnica Completa para AI/LLM  
**Última actualización**: Febrero 2026  
**Versión**: 1.1.0  
**Propósito**: Este documento proporciona contexto completo del proyecto para modelos de IA, incluyendo arquitectura, patrones de código, estructura de datos y lógica de negocio.

---

## ÍNDICE DE CONTENIDOS

1. RESUMEN EJECUTIVO Y CONTEXTO DEL PROYECTO
2. ARQUITECTURA Y COMPONENTES DEL SISTEMA
3. TECNOLOGÍAS Y DEPENDENCIAS
4. ESTRUCTURA DE ARCHIVOS Y MÓDULOS
5. MODELO DE DATOS Y ESQUEMA DE BASE DE DATOS
6. API REST Y ENDPOINTS
7. BOT DE TELEGRAM - COMANDOS Y PARSERS
8. FRONTEND WEB - DASHBOARD
9. SERVICIOS Y LÓGICA DE NEGOCIO
10. CONFIGURACIÓN Y VARIABLES DE ENTORNO
11. PATRONES DE CÓDIGO Y CONVENCIONES
12. CASOS DE USO Y FLUJOS DE TRABAJO
13. DESPLIEGUE Y CONTENEDORIZACIÓN
14. EXTENSIONES Y MEJORAS FUTURAS

---

## 1. RESUMEN EJECUTIVO Y CONTEXTO DEL PROYECTO

### Descripción General

KashFlow es una aplicación de gestión financiera personal que combina un bot de Telegram como interfaz principal de entrada de datos con un dashboard web para visualización. El sistema permite registrar transacciones financieras (ingresos, egresos, transferencias) mediante mensajes en lenguaje natural español, almacenándolos en una base de datos SQLite local.

### Características Principales

**Entrada de Datos:**
- Mensajes de texto en lenguaje natural a través de Telegram Bot
- Soporte para mensajes de voz con transcripción automática (Whisper AI)
- Comandos para consultas rápidas (/resumen, /ahorro, etc.)
- Parsing mediante expresiones regulares adaptadas al español argentino

**Almacenamiento:**
- Base de datos SQLite con modelo contable (debe/haber)
- Gestión multi-cuenta (bancos, billeteras virtuales)
- Tracking de transferencias entre cuentas propias
- Migraciones SQL versionadas

**Visualización:**
- Dashboard web con tabla de transacciones
- Filtros por fecha, cuenta y búsqueda textual
- Indicadores clave (balance, gastos del día, etc.)
- Vista de saldos por cuenta con códigos de color

**Gestión de Cuentas (NUEVO):**
- CRUD completo de cuentas desde el dashboard web
- Creación de cuentas con selección de usuario, nombre, alias, color y moneda
- Edición de cuentas existentes (nombre, alias, color, moneda)
- Archivado de cuentas (soft delete)
- Validación de alias únicos
- Interfaz modal con tabla de gestión y formularios

### Casos de Uso Principales

1. **Registro rápido de gastos**: Usuario gasta dinero y envía mensaje inmediatamente al bot
2. **Consulta de saldos**: Usuario verifica sus finanzas desde Telegram o web
3. **Transferencias entre cuentas**: Registrar movimientos internos de dinero
4. **Análisis de gastos**: Revisar histórico y patrones en el dashboard
5. **Gestión de cuentas**: Crear, editar y archivar cuentas bancarias desde el dashboard web

### Contexto Técnico

- **Lenguaje**: JavaScript (Node.js)
- **Runtime**: Node.js >= 18.0.0
- **Base de datos**: SQLite (archivo local)
- **Deployment**: Docker con Docker Compose
- **APIs externas**: Telegram Bot API, OpenAI Whisper (local)

---

## 2. ARQUITECTURA Y COMPONENTES DEL SISTEMA

### Capas de la Aplicación

**CAPA 1: Interfaces de Usuario**
- Cliente Telegram (entrada principal de datos)
- Navegador web (visualización y consultas)

**CAPA 2: API Server (Express.js)**
- Manejo de webhooks de Telegram
- Endpoints REST para el frontend
- Serving de archivos estáticos
- Middleware de parsing y validación

**CAPA 3: Lógica de Negocio**
- bodyParser.js: Parsing de mensajes en lenguaje natural
- whisperService.js: Transcripción de audio a texto
- dbHelper.js: Operaciones CRUD
- transactionParser.js: Parser avanzado de transacciones
- utils.js: Funciones auxiliares

**CAPA 4: Acceso a Datos**
- db.js: Configuración de conexión SQLite
- Queries SQL directas con better-sqlite3
- Vistas SQL para simplificar consultas

**CAPA 5: Persistencia**
- kashflow.db: Base de datos SQLite
- Archivos temporales (audio, transcripciones)

### Componentes Críticos

**1. API Server (api/index.js)**
- Punto de entrada de la aplicación
- Carga variables de entorno según NODE_ENV
- Configura middleware de Express
- Registra rutas de Telegram y API web
- Configura webhook de Telegram al iniciar
- Sirve archivos estáticos del frontend

**2. Parser de Lenguaje Natural (api/services/bodyParser.js)**
- Función principal: parsearMensaje(mensaje)
- Utiliza regex para extraer: tipo, banco, monto, descripción
- Soporta 4 formatos: egreso, ingreso, movimiento, sueldo
- Valida formato y retorna objeto estructurado o error
- Case-insensitive, soporta decimales con coma o punto

**3. Database Helper (api/services/dbHelper.js)**
- Funciones CRUD para transacciones, cuentas, usuarios
- consultarSaldosPorCuenta(): Saldos actuales por cuenta
- consultarRegistrosHoy(): Movimientos del día
- consultarUltimoDepositoSueldo(): Para cálculos de ahorro
- Manejo de transferencias con transacciones atómicas

**4. Whisper Service (api/services/whisperService.js)**
- Clase WhisperService con métodos:
  - checkWhisperInstallation(): Verifica Python y Whisper
  - convertToWav(inputPath): Convierte audio a WAV con ffmpeg
  - transcribeAudio(audioPath, options): Ejecuta Whisper CLI
- Soporta modelos: tiny, base, small, medium, large
- Configuración via variables de entorno

**5. Telegram Bot (api/bots/telegramBot.js + commands.js)**
- Inicialización con token de BotFather
- Configuración de webhook (no polling)
- Comandos implementados: hola, resumen, resumenHoy, regla503020, ahorro, voz
- Manejo de mensajes de texto y audio

**6. Frontend Dashboard (public/js/journal.js)**
- loadTransactions(): Carga datos del API
- applyFilters(): Filtra por fecha, búsqueda, cuenta
- renderTransactions(): Renderiza tabla con datos
- updateIndicators(): Calcula y muestra KPIs
- filterByAccount(accountId): Filtra por cuenta específica

### Flujo de Datos

**Flujo A: Registro de Transacción via Telegram**
1. Usuario envía mensaje de texto al bot de Telegram
2. Telegram API llama al webhook configurado (POST /telegram/webhook)
3. Express recibe el request en routes/telegram.js
4. Se extrae el texto del mensaje y se pasa a bodyParser.js
5. bodyParser parsea el mensaje y extrae datos estructurados
6. dbHelper valida datos y busca la cuenta por alias
7. Se inserta registro en tabla transacciones
8. Bot responde al usuario con confirmación o error
9. Usuario recibe respuesta inmediata en Telegram

**Flujo B: Consulta de Movimientos via Dashboard**
1. Usuario abre el dashboard en navegador
2. Navegador carga index.html y archivos JS/CSS
3. journal.js ejecuta loadTransactions() al cargar la página
4. Se hace fetch a GET /api/movimientos
5. Express consulta vista v_transacciones_completas en SQLite
6. Se retorna JSON con array de transacciones
7. Frontend procesa y transforma datos
8. Se renderizan componentes: tabla, indicadores, cuentas
9. Usuario ve datos actualizados en pantalla

**Flujo C: Mensaje de Voz**
1. Usuario graba y envía nota de voz al bot
2. Bot recibe update con objeto voice
3. Se descarga archivo de audio (.oga) a carpeta temp/
4. whisperService.convertToWav() convierte a formato WAV
5. whisperService.transcribeAudio() ejecuta Whisper CLI (Python)
6. Whisper retorna texto transcrito en español
7. Texto se procesa como mensaje normal (Flujo A desde paso 4)
8. Bot responde confirmación de registro

---

## 3. TECNOLOGÍAS Y DEPENDENCIAS


### Dependencias de Producción (package.json)

**Runtime y Framework:**
- node >= 18.0.0 (engine requerido)
- express 5.1.0 (framework web)
- dotenv 17.2.1 (variables de entorno)

**Base de Datos:**
- better-sqlite3 11.8.1 (driver SQLite nativo, más rápido que sqlite3)

**Telegram Bot:**
- node-telegram-bot-api 0.66.0 (cliente oficial de Telegram)

**Servicios de Audio:**
- @ffmpeg-installer/ffmpeg 1.1.0 (conversión de formatos de audio)

**Cliente HTTP y Utilidades:**
- axios 1.13.4 (HTTP client)
- node-fetch 3.3.2 (Fetch API polyfill)
- form-data 4.0.5 (multipart/form-data para uploads)

**Procesamiento de Datos:**
- xlsx 0.18.5 (exportación a Excel, futuro)

**IA y ML:**
- openai 6.18.0 (SDK de OpenAI, para futuras integraciones)

### Dependencias Externas (No npm)

**Python y Whisper (Transcripción de voz):**
- Python >= 3.8
- openai-whisper (instalado via pip)
- Modelos disponibles: tiny (~75MB), base (~150MB), small (~500MB), medium (~1.5GB), large (~3GB)

**Servicios Externos:**
- Telegram Bot API (webhook HTTPS requerido en producción)

### Package Manager

- pnpm 10.28.2 (gestor de paquetes, más eficiente que npm)

### Scripts Disponibles

```json
{
  "dev": "node --watch api/index.js",      // Desarrollo con hot reload
  "start": "node api/index.js",            // Producción
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

---

## 4. ESTRUCTURA DE ARCHIVOS Y MÓDULOS

### Raíz del Proyecto

```
kashflow/
├── .env                    # Variables de entorno (NO commitear)
├── .env.development        # Configuración desarrollo
├── .env.production         # Configuración producción
├── .gitignore             # Exclusiones de Git
├── docker-compose.yml     # Orquestación Docker
├── Dockerfile             # Imagen Docker multi-stage
├── package.json           # Dependencias Node.js
├── pnpm-lock.yaml         # Lockfile pnpm
├── README.md              # Documentación usuario
├── PROJECT_BRIEF.md       # Este documento (contexto para IA)
```

### Directorio api/ (Backend)

**ARCHIVOS PRINCIPALES:**

`api/index.js` - Punto de entrada principal
- Responsabilidades: Carga de .env, inicialización Express, configuración middleware, registro de rutas, configuración webhook Telegram, inicio del servidor
- Patrones: Carga condicional de .env según NODE_ENV, middleware antes de rutas, healthcheck endpoint

**SUBDIRECTORIO api/bots/:**

`api/bots/telegramBot.js` - Configuración del bot
- Exports: { bot } (instancia de TelegramBot)
- Configuración: polling: false (usa webhook), token desde process.env.BOT_TOKEN

`api/bots/commands.js` - Implementación de comandos
- Exports: función que recibe bot y retorna objeto con comandos
- Comandos: hola, regla503020, ahorro, resumen, resumenHoy, voz
- Dependencias: dbHelper para consultas, utils para formateo

**SUBDIRECTORIO api/routes/:**

`api/routes/telegram.js` - Rutas webhook Telegram
- Ruta principal: POST /webhook
- Maneja: mensajes de texto, mensajes de voz, comandos
- Flujo: recibe update → procesa → responde al usuario

`api/routes/web.js` - API REST para frontend
- Rutas: GET /movimientos, GET /health
- Retorna: JSON con datos de la base de datos
- Usa: dbHelper para queries

`api/routes/cuentas.js` - API REST para CRUD de cuentas (NUEVO)
- Rutas: 
  - GET /api/cuentas - Listar todas las cuentas con saldos
  - GET /api/cuentas/usuarios - Listar usuarios disponibles
  - GET /api/cuentas/:id - Obtener cuenta específica
  - POST /api/cuentas - Crear nueva cuenta
  - PUT /api/cuentas/:id - Actualizar cuenta existente
  - DELETE /api/cuentas/:id - Archivar cuenta (soft delete)
- Validaciones: alias único, formato de color, campos requeridos
- Retorna: JSON con mensajes de éxito/error

**SUBDIRECTORIO api/services/:**

`api/services/bodyParser.js` - Parser de lenguaje natural
- Export principal: { parsearMensaje }
- Función: parsearMensaje(mensaje) → objeto parseado o { error }
- Patrones regex: 4 tipos (egreso, ingreso, movimiento, sueldo)
- Validaciones: texto no vacío, formato válido, monto positivo

`api/services/db.js` - Conexión a SQLite
- Export: instancia de Database de better-sqlite3
- Configuración: archivo data/kashflow.db, modo read-write-create
- Opciones: verbose para logs en desarrollo

`api/services/dbHelper.js` - Operaciones CRUD
- Funciones principales:
  - consultarSaldosPorCuenta()
  - consultarRegistrosHoy()
  - consultarUltimoDepositoSueldo()
  - registrarTransaccion(data)
  - registrarTransferencia(origen, destino, monto)
  - obtenerTodasLasCuentasConSaldos() (NUEVO)
  - obtenerCuentaPorId(id) (NUEVO)
  - actualizarCuenta(id, datos) (NUEVO)
  - archivarCuenta(id) (NUEVO)
  - validarAliasUnico(alias, excluir) (NUEVO)
- Patrón: prepared statements para prevenir SQL injection

`api/services/transactionParser.js` - Parser avanzado
- Propósito: extensión del bodyParser con lógica adicional
- Funcionalidad: normalización de textos, conversión de números escritos

`api/services/utils.js` - Utilidades generales
- Funciones: formateo de fechas, cálculos porcentuales, validaciones
- Export: múltiples funciones helper

`api/services/whisperService.js` - Transcripción de audio
- Clase: WhisperService
- Métodos principales:
  - checkWhisperInstallation()
  - convertToWav(inputPath)
  - transcribeAudio(audioPath, options)
  - cleanup() para archivos temporales
- Dependencias: ffmpeg, Python, Whisper CLI

### Directorio data/ (Base de Datos)

```
data/
├── kashflow.db            # Base de datos SQLite (generada en runtime)
├── init.js                # Script de inicialización Node.js
├── migrate.py             # Script de migraciones Python
├── schema.sql             # Esquema completo de tablas y vistas
├── seed.sql               # Datos iniciales de prueba
└── updates/               # Migraciones incrementales
    ├── 001_cambiar_fecha_a_localtime.sql
    ├── 002_agregar_color_a_vista.sql
    ├── 003_normaliza_usuarios_cuentas.sql
    └── 004_agregar_constraint_tipo_signo.sql
```

**Propósito de cada archivo:**
- schema.sql: Definición inicial de todas las tablas
- seed.sql: Usuarios y cuentas de ejemplo
- updates/: Migraciones aplicadas en orden numérico
- init.js: Ejecuta schema.sql si kashflow.db no existe

### Directorio public/ (Frontend)

**ARCHIVOS HTML:**

`public/index.html` - Dashboard principal
- Estructura: header con filtros, main con tabla, aside con indicadores
- Dependencias: journal.css, journal.js, particles.js

**SUBDIRECTORIO public/css/:**

`public/css/journal.css` - Estilos del dashboard
- Características: tema oscuro, variables CSS, responsive design
- Componentes: tabla transacciones, cards de cuentas, filtros

**SUBDIRECTORIO public/js/:**

`public/js/journal.js` - Lógica principal del dashboard
- Variables globales: transactions[], filteredTransactions[], selectedAccount
- Funciones principales:
  - loadTransactions() - Carga datos del API
  - applyFilters() - Aplica filtros de fecha/búsqueda/cuenta
  - renderTransactions() - Renderiza tabla
  - updateIndicators() - Actualiza KPIs
  - filterByAccount(accountId) - Filtra por cuenta

`public/js/accounts.js` - Gestión de cuentas (visualización)
- Funciones: renderTopAccounts(), getAccountColor(), populateAllAccountsModal()

`public/js/accounts-crud.js` - CRUD de cuentas (NUEVO)
- Variables globales: allAccounts[], allUsers[], currentEditingAccountId
- Funciones principales:
  - loadAllAccounts() - Carga cuentas desde API
  - loadAllUsers() - Carga usuarios disponibles
  - renderAccountsManagementTable() - Renderiza tabla de gestión
  - openCreateAccountModal() - Abre formulario de creación
  - openEditAccountModal(id) - Abre formulario de edición
  - saveAccount() - Guarda cuenta (POST o PUT)
  - archiveAccount(id) - Archiva cuenta (DELETE)
  - confirmArchiveAccount() - Confirmación antes de archivar
- Event listeners: botón gestionar, nueva cuenta, guardar, formulario submit

`public/js/utils.js` - Utilidades frontend
- Funciones: formatDate(), formatCurrency(), parseDate(), showAlert()

**SUBDIRECTORIO public/js/particles/:**
- particles.min.js: Librería de efectos visuales
- particlesjs-config.json: Configuración de partículas de fondo

### Directorio scripts/

`scripts/test_parser.js` - Testing del parser
- Propósito: Probar bodyParser con casos de prueba
- Uso: node scripts/test_parser.js

### Directorio temp/

- Propósito: Almacenamiento temporal de archivos de audio
- Contenido: archivos .oga, .wav (limpiados automáticamente)
- No trackeado en Git (.gitignore)

---

## 5. MODELO DE DATOS Y ESQUEMA DE BASE DE DATOS

### Tablas Principales

**TABLA: usuarios**

Propósito: Almacenar usuarios del sistema (multi-usuario en futuro)

Esquema:
```sql
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

Campos:
- id: Identificador único interno
- telegram_user_id: ID de Telegram del usuario (único)
- nombre: Nombre del usuario
- fecha_creacion: Timestamp de registro

Índices:
- idx_usuarios_telegram_id en telegram_user_id

---

**TABLA: cuentas**

Propósito: Cuentas bancarias, billeteras virtuales, efectivo

Esquema:
```sql
CREATE TABLE cuentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    alias TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'ARS',
    activa BOOLEAN NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

Campos:
- id: Identificador único
- usuario_id: Referencia a tabla usuarios
- nombre: Nombre completo (ej: "Banco BBVA Francés")
- alias: Nombre corto usado en mensajes (ej: "BBVA", "Uala", "MP")
- color: Color hexadecimal para UI (ej: "#FF5733")
- moneda: Código ISO 4217 (ARS, USD, EUR)
- activa: 1=activa, 0=archivada
- fecha_creacion: Timestamp de creación

Índices:
- idx_cuentas_usuario_id en usuario_id
- idx_cuentas_activa en activa
- idx_cuentas_alias en alias (para búsquedas rápidas en parser)

Reglas de negocio:
- alias debe ser único (usado en mensajes de Telegram)
- Búsqueda case-insensitive en alias

---

**TABLA: transferencias**

Propósito: Registrar movimientos entre cuentas propias

Esquema:
```sql
CREATE TABLE transferencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    cuenta_origen_id INTEGER NOT NULL,
    cuenta_destino_id INTEGER NOT NULL,
    monto DECIMAL(15, 2) NOT NULL CHECK(monto > 0),
    descripcion TEXT,
    FOREIGN KEY (cuenta_origen_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    CHECK (cuenta_origen_id != cuenta_destino_id)
);
```

Campos:
- id: Identificador único
- fecha_hora: Timestamp del movimiento
- cuenta_origen_id: Cuenta desde donde sale el dinero
- cuenta_destino_id: Cuenta hacia donde va el dinero
- monto: Cantidad transferida (siempre positivo)
- descripcion: Nota opcional

Índices:
- idx_transferencias_fecha en fecha_hora
- idx_transferencias_origen en cuenta_origen_id
- idx_transferencias_destino en cuenta_destino_id

Reglas de negocio:
- Origen y destino deben ser diferentes
- Una transferencia genera 2 transacciones (egreso en origen + ingreso en destino)
- Operación atómica (ambas transacciones o ninguna)

---

**TABLA: transacciones (Libro Diario)**

Propósito: Registro de todos los movimientos contables

Esquema:
```sql
CREATE TABLE transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    cuenta_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('debe', 'haber')),
    signo INTEGER NOT NULL CHECK(signo IN (1, -1)),
    monto DECIMAL(15, 2) NOT NULL CHECK(monto > 0),
    descripcion TEXT NOT NULL,
    notas TEXT,
    transferencia_id INTEGER,
    telegram_message_id INTEGER,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (transferencia_id) REFERENCES transferencias(id) ON DELETE CASCADE
);
```

Campos:
- id: Identificador único
- fecha_hora: Timestamp de la transacción
- cuenta_id: Cuenta afectada
- tipo: 'debe' (ingreso/activo) o 'haber' (egreso/pasivo)
- signo: 1 (suma al saldo) o -1 (resta del saldo)
- monto: Valor absoluto de la transacción
- descripcion: Descripción del movimiento
- notas: Información adicional opcional
- transferencia_id: NULL si no es transferencia, ID de transferencias si lo es
- telegram_message_id: ID del mensaje de Telegram que generó la transacción

Índices:
- idx_transacciones_fecha en fecha_hora
- idx_transacciones_cuenta_id en cuenta_id
- idx_transacciones_tipo en tipo
- idx_transacciones_transferencia en transferencia_id

Reglas de negocio:
- tipo='debe' + signo=1: Ingreso (aumenta saldo)
- tipo='haber' + signo=-1: Egreso (disminuye saldo)
- monto siempre es valor absoluto
- Para transferencias: 2 registros con mismo transferencia_id

---

### Vistas SQL

**VISTA: v_transacciones_completas**

Propósito: Simplificar consultas del frontend, combina datos de múltiples tablas

Definición:
```sql
CREATE VIEW v_transacciones_completas AS
SELECT 
    t.id,
    CAST(strftime('%s', t.fecha_hora) AS INTEGER) * 1000 AS fecha_timestamp,
    REPLACE(datetime(t.fecha_hora, 'localtime'), 'T', ' ') AS fecha,
    c.nombre AS banco_nombre,
    c.alias AS banco,
    c.color AS banco_color,
    t.monto,
    t.signo,
    t.descripcion,
    t.tipo AS debeHaber,
    CASE 
        WHEN tr.id IS NOT NULL THEN 
            (SELECT c2.alias FROM cuentas c2 
             WHERE c2.id = CASE 
                 WHEN tr.cuenta_origen_id = c.id THEN tr.cuenta_destino_id
                 ELSE tr.cuenta_origen_id
             END)
        ELSE NULL
    END AS banco_destino
FROM transacciones t
JOIN cuentas c ON t.cuenta_id = c.id
LEFT JOIN transferencias tr ON t.transferencia_id = tr.id
ORDER BY t.fecha_hora DESC;
```

Campos retornados:
- id: ID de la transacción
- fecha_timestamp: Timestamp en milisegundos (para JavaScript)
- fecha: Fecha formateada legible
- banco_nombre: Nombre completo de la cuenta
- banco: Alias de la cuenta
- banco_color: Color hexadecimal
- monto: Monto de la transacción
- signo: 1 o -1
- descripcion: Descripción del movimiento
- debeHaber: 'debe' o 'haber'
- banco_destino: Si es transferencia, cuenta destino/origen complementaria

Uso: Endpoint GET /api/movimientos consulta esta vista

---

### Relaciones entre Tablas

**Relación usuarios → cuentas:**
- Tipo: 1 a N
- Descripción: Un usuario puede tener múltiples cuentas
- Cascade: ON DELETE CASCADE (si se borra usuario, se borran sus cuentas)

**Relación cuentas → transacciones:**
- Tipo: 1 a N
- Descripción: Una cuenta tiene muchas transacciones
- Cascade: ON DELETE RESTRICT (no se puede borrar cuenta con transacciones)

**Relación transferencias → transacciones:**
- Tipo: 1 a 2
- Descripción: Una transferencia genera exactamente 2 transacciones
- Cascade: ON DELETE CASCADE (si se borra transferencia, se borran sus transacciones)

---

### Cálculos y Queries Comunes

**Cálculo de Saldo de una Cuenta:**
```sql
SELECT 
    c.id,
    c.nombre,
    c.alias,
    COALESCE(SUM(t.monto * t.signo), 0) AS saldo_actual
FROM cuentas c
LEFT JOIN transacciones t ON c.id = t.cuenta_id
WHERE c.activa = 1
GROUP BY c.id, c.nombre, c.alias;
```

**Transacciones de Hoy:**
```sql
SELECT * FROM v_transacciones_completas
WHERE DATE(fecha_timestamp/1000, 'unixepoch', 'localtime') = DATE('now', 'localtime');
```

**Último Depósito de Sueldo:**
```sql
SELECT monto 
FROM transacciones 
WHERE descripcion LIKE '%sueldo%' 
  AND tipo = 'debe'
ORDER BY fecha_hora DESC 
LIMIT 1;
```

---

## 6. API REST Y ENDPOINTS


### Rutas Telegram (api/routes/telegram.js)

**ENDPOINT: POST /telegram/webhook**

Descripción: Recibe actualizaciones del Telegram Bot API

Request Body Ejemplo:
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 987654321,
    "from": {
      "id": 123456789,
      "first_name": "Kevin",
      "username": "kevin_user"
    },
    "chat": {
      "id": 123456789,
      "type": "private"
    },
    "date": 1707303600,
    "text": "gaste de Uala 1500 para comprar leche"
  }
}
```

Response Ejemplo:
```json
{
  "ok": true,
  "message": "Egreso registrado correctamente"
}
```

Lógica de Procesamiento:
1. Verificar que es un mensaje (no callback_query, inline_query, etc.)
2. Detectar tipo de contenido: texto, voz, comando
3. Si es comando (/hola, /resumen, etc.), ejecutar handler del comando
4. Si es texto normal, pasar a bodyParser.parsearMensaje()
5. Si es voz, descargar audio → transcribir con Whisper → parsear texto
6. Validar resultado del parser
7. Guardar en DB con dbHelper
8. Responder al usuario con mensaje de confirmación o error

Manejo de Errores:
- Parser no reconoce formato: Enviar mensaje con formatos válidos
- Cuenta no encontrada: "La cuenta [alias] no existe"
- Error de DB: "Error al guardar, intenta nuevamente"
- Error de Whisper: "No pude transcribir el audio"

---

### Rutas Web (api/routes/web.js)

**ENDPOINT: GET /api/movimientos**

Descripción: Retorna todas las transacciones desde la vista v_transacciones_completas

Query Parameters:
- desde (opcional): Fecha inicio formato YYYY-MM-DD
- hasta (opcional): Fecha fin formato YYYY-MM-DD
- cuenta (opcional): Alias de cuenta para filtrar

Response Ejemplo:
```json
[
  {
    "id": 1,
    "fecha_timestamp": 1707303600000,
    "fecha": "2026-02-07 14:30:00",
    "banco_nombre": "Uala",
    "banco": "Uala",
    "banco_color": "#FF5733",
    "monto": 1500.00,
    "signo": -1,
    "descripcion": "Comprar leche",
    "debeHaber": "haber",
    "banco_destino": null
  },
  {
    "id": 2,
    "fecha_timestamp": 1707217200000,
    "fecha": "2026-02-06 10:15:00",
    "banco_nombre": "MercadoPago",
    "banco": "MP",
    "banco_color": "#00AEEF",
    "monto": 5000.00,
    "signo": 1,
    "descripcion": "Freelance web",
    "debeHaber": "debe",
    "banco_destino": null
  }
]
```

Uso en Frontend:
```javascript
const response = await fetch('/api/movimientos');
const data = await response.json();
transactions = data.map((item, index) => {
    return {
        id: item.id,
        date: parseDate(item.fecha),
        description: item.descripcion,
        account: item.banco,
        account_name: item.banco_nombre,
        account_color: item.banco_color,
        amount: item.monto * item.signo,
        type: item.debeHaber,
        debit: item.debeHaber === 'debe' ? Math.abs(item.monto) : 0,
        credit: item.debeHaber === 'haber' ? Math.abs(item.monto) : 0
    };
});
```

---

**ENDPOINT: GET /api/cuentas**

Descripción: Lista todas las cuentas activas con sus saldos

Response Ejemplo:
```json
[
  {
    "id": 1,
    "nombre": "Uala",
    "alias": "Uala",
    "color": "#FF5733",
    "moneda": "ARS",
    "saldo_actual": 50000.00
  },
  {
    "id": 2,
    "nombre": "Banco BBVA Francés",
    "alias": "BBVA",
    "color": "#004481",
    "moneda": "ARS",
    "saldo_actual": 123456.78
  }
]
```

SQL Query Interno:
```sql
SELECT 
    c.id,
    c.nombre,
    c.alias,
    c.color,
    c.moneda,
    COALESCE(SUM(t.monto * t.signo), 0) AS saldo_actual
FROM cuentas c
LEFT JOIN transacciones t ON c.id = t.cuenta_id
WHERE c.activa = 1
GROUP BY c.id, c.nombre, c.alias, c.color, c.moneda;
```

---

**ENDPOINT: GET /api/resumen**

Descripción: Resumen financiero general con indicadores clave

Response Ejemplo:
```json
{
  "balance_total": 173456.78,
  "gastos_dia": 1500.00,
  "ingresos_mes": 850000.00,
  "egresos_mes": 450000.00,
  "gastos_mes": 450000.00,
  "cuentas": [
    {
      "nombre": "Uala",
      "alias": "Uala",
      "saldo": 50000.00,
      "moneda": "ARS"
    },
    {
      "nombre": "BBVA",
      "alias": "BBVA",
      "saldo": 123456.78,
      "moneda": "ARS"
    }
  ]
}
```

Cálculos Realizados:
- balance_total: Suma de saldos de todas las cuentas activas
- gastos_dia: Suma de egresos (tipo='haber') del día actual
- ingresos_mes: Suma de ingresos (tipo='debe') del mes actual
- egresos_mes: Suma de egresos (tipo='haber') del mes actual

---

**ENDPOINT: GET /api/health**

Descripción: Health check para Docker healthcheck y monitoreo

Response Ejemplo:
```json
{
  "status": "ok",
  "timestamp": "2026-02-07T14:30:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

Uso en Docker Compose:
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 5s
  retries: 3
```

---

### Seguridad y Validaciones

**Webhook de Telegram:**
- Validación de token en headers (X-Telegram-Bot-Api-Secret-Token)
- Verificación de IP de origen (opcional, IPs de Telegram)
- Rate limiting por chat_id (prevenir spam)

**API REST:**
- Sanitización de inputs para prevenir SQL injection
- Validación de tipos de datos (fechas, números)
- CORS habilitado solo para dominio propio
- Headers de seguridad (helmet middleware en futuro)

**Best Practices Implementadas:**
- Prepared statements en todas las queries SQL
- Validación de datos antes de insertar en DB
- Manejo de errores con try-catch
- Logging de errores sin exponer detalles al usuario

---

## 7. BOT DE TELEGRAM - COMANDOS Y PARSERS

### Inicialización del Bot (api/bots/telegramBot.js)

Configuración:
```javascript
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });
module.exports = { bot };
```

Configuración de Webhook (api/index.js):
```javascript
const webhookUrl = process.env.WEBHOOK_URL;
if (webhookUrl) {
    const fullWebhookUrl = `${webhookUrl}/telegram/webhook`;
    telegramBot.setWebHook(fullWebhookUrl)
        .then(() => console.log('Webhook configurado:', fullWebhookUrl))
        .catch(err => console.error('Error webhook:', err.message));
}
```

Notas Importantes:
- polling: false porque se usa webhook (más eficiente en producción)
- Webhook requiere HTTPS (usar ngrok en desarrollo)
- Token debe mantenerse secreto (nunca commitear)

---

### Comandos del Bot (api/bots/commands.js)

Estructura del Módulo:
```javascript
module.exports = bot => ({
  comando1: async msg => { /* lógica */ },
  comando2: async msg => { /* lógica */ },
  // ...
});
```

---

**COMANDO: /hola**

Propósito: Saludo personalizado con fecha actual

Implementación:
```javascript
hola: async msg => {
  const chatId = msg.chat.id;
  const nombre = msg.from?.first_name || "amigo";
  const { getFormattedDate } = require("../services/utils");
  const fechaActual = getFormattedDate();
  await bot.sendMessage(chatId, `¡Hola ${nombre}! la fecha actual es ${fechaActual} 👋`);
}
```

Ejemplo de Interacción:
- Usuario: /hola
- Bot: "¡Hola Kevin! la fecha actual es 07/02/2026 👋"

---

**COMANDO: /resumen**

Propósito: Muestra saldos actuales de todas las cuentas

Implementación:
```javascript
resumen: async msg => {
  const chatId = msg.chat.id;
  const { consultarSaldosPorCuenta } = require("../services/dbHelper");
  
  const saldos = await consultarSaldosPorCuenta();
  
  if (saldos.length === 0) {
    await bot.sendMessage(chatId, "💳 No hay cuentas registradas.");
    return;
  }
  
  let mensaje = "💳 *Resumen de saldos por cuenta:*\n\n";
  saldos.forEach(saldo => {
    const nombre = capitalize(saldo.cuenta);
    const monto = Number(saldo.saldo_actual).toLocaleString("es-AR", { 
      minimumFractionDigits: 2 
    });
    mensaje += `🏦 ${nombre} (${saldo.alias}): *$${monto}* ${saldo.moneda}\n`;
  });
  
  await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
}
```

Ejemplo de Interacción:
- Usuario: /resumen
- Bot: 
```
💳 Resumen de saldos por cuenta:

🏦 Uala (Uala): $50,000.00 ARS
🏦 Bbva (BBVA): $123,456.78 ARS
🏦 Mercadopago (MP): $15,200.50 ARS
```

---

**COMANDO: /resumenHoy**

Propósito: Lista todas las transacciones del día actual

Implementación:
```javascript
resumenHoy: async msg => {
  const chatId = msg.chat.id;
  const { consultarRegistrosHoy } = require("../services/dbHelper");
  
  const registros = await consultarRegistrosHoy();
  
  if (registros.length === 0) {
    await bot.sendMessage(chatId, "📅 No hay registros cargados hasta la fecha de hoy.");
    return;
  }
  
  let mensaje = "📋 *Registros cargados hasta hoy:*\n\n";
  registros.forEach(registro => {
    const tipoEmoji = registro.tipo === 'debe' ? '➕' : '➖';
    const monto = Number(registro.monto).toLocaleString("es-AR", { 
      minimumFractionDigits: 2 
    });
    mensaje += `${tipoEmoji} *${registro.descripcion}*\n`;
    mensaje += `   - Cuenta: ${registro.cuenta} (${registro.cuenta_alias})\n`;
    mensaje += `   - Monto: $${monto}\n\n`;
  });
  
  await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
}
```

---

**COMANDO: /regla503020**

Propósito: Calcula distribución del sueldo según regla 50/30/20

Concepto:
- 50% Necesidades (gastos fijos: alquiler, servicios, comida)
- 30% Deseos (entretenimiento, salidas, caprichos)
- 20% Ahorro (inversiones, fondo de emergencia)

Implementación:
```javascript
regla503020: async msg => {
  const chatId = msg.chat.id;
  const { consultarUltimoDepositoSueldo } = require("../services/dbHelper");
  
  const ultimoDepositoSueldo = await consultarUltimoDepositoSueldo();
  
  const necesidades = ultimoDepositoSueldo * 0.5;
  const deseos = ultimoDepositoSueldo * 0.3;
  const ahorro = ultimoDepositoSueldo * 0.2;
  
  const fecha = new Date();
  const nombre_mes = fecha.toLocaleString("es-ES", { month: "long" });
  
  const formatMonto = (valor) => valor.toLocaleString("es-AR", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  const respuesta = `💰 Regla 50/30/20

Sueldo de ${nombre_mes} $ ${formatMonto(ultimoDepositoSueldo)}
Gastos imprescindibles $ ${formatMonto(necesidades)}
Gastos prescindibles $ ${formatMonto(deseos)}
Ahorro del mes $ ${formatMonto(ahorro)}`;
  
  await bot.sendMessage(chatId, respuesta);
}
```

---

**COMANDO: /ahorro**

Propósito: Calcula el monto recomendado de ahorro (20% del último sueldo)

Implementación:
```javascript
ahorro: async msg => {
  const chatId = msg.chat.id;
  const { consultarUltimoDepositoSueldo } = require("../services/dbHelper");
  const { calcularPorcentajeRedondeado } = require("../services/utils");
  
  const ultimoDepositoSueldo = await consultarUltimoDepositoSueldo();
  const porcentajeAhorro = 0.2;
  const monto = calcularPorcentajeRedondeado(ultimoDepositoSueldo, porcentajeAhorro);
  
  await bot.sendMessage(chatId, 
    `💰 El monto que debes ahorrar este mes es $${monto.toLocaleString("es-AR")} pesos.`
  );
}
```

---

**COMANDO: /voz**

Propósito: Instrucciones para enviar mensajes de voz

Implementación:
```javascript
voz: async msg => {
  const chatId = msg.chat.id;
  const instrucciones = `
🎤 *Mensajes de Voz*

Puedes enviar notas de voz y yo las transcribiré automáticamente.

*Ejemplos:*
• "Gasté de Uala mil quinientos para comprar leche"
• "Recibí en MercadoPago cinco mil de freelance"
• "Moví de Uala a BBVA diez mil"

*Tips:*
✅ Habla claro y despacio
✅ Menciona el nombre del banco completo
✅ Di los montos en números ("mil quinientos") o cifras ("1500")

La transcripción puede tardar unos segundos.
  `;
  
  await bot.sendMessage(chatId, instrucciones, { parse_mode: "Markdown" });
}
```

---

### Parser de Lenguaje Natural (api/services/bodyParser.js)

Función Principal:
```javascript
function parsearMensaje(mensaje) {
  // Validación inicial
  if (typeof mensaje !== 'string' || mensaje.trim() === '') {
    throw new Error('El mensaje debe ser un texto no vacío');
  }
  
  // Array de patrones regex
  const patrones = [
    { tipo: 'egreso', regex: /.../, parse: (match) => ({...}) },
    { tipo: 'ingreso', regex: /.../, parse: (match) => ({...}) },
    { tipo: 'movimiento', regex: /.../, parse: (match) => ({...}) },
    { tipo: 'deposito de sueldo', regex: /.../, parse: (match) => ({...}) }
  ];
  
  // Intentar cada patrón
  for (const patron of patrones) {
    const match = mensaje.match(patron.regex);
    if (match) {
      return patron.parse(match);
    }
  }
  
  // Ningún patrón coincide
  return { error: 'Formato de mensaje no reconocido' };
}

module.exports = { parsearMensaje };
```

---

**PATRÓN 1: EGRESO**

Formato: "gaste de [banco] [monto] para [descripcion]"

Regex:
```javascript
{
  tipo: 'egreso',
  regex: /^gaste de (\w+) (\d+([.,]\d{1,3})?) para (.+)$/i,
  parse: (match) => ({
    tipo: 'egreso',
    banco: match[1],
    monto: parseFloat(match[2].replace(',', '.')),
    descripcion: match[4]
  })
}
```

Ejemplos Válidos:
- "gaste de Uala 1500 para comprar leche"
- "gaste de BBVA 25000.50 para alquiler"
- "GASTE DE mp 350,75 PARA cafe"

Objeto Retornado:
```json
{
  "tipo": "egreso",
  "banco": "Uala",
  "monto": 1500,
  "descripcion": "comprar leche"
}
```

---

**PATRÓN 2: INGRESO**

Formato: "recibi en [banco] [monto] de [descripcion]"

Regex:
```javascript
{
  tipo: 'ingreso',
  regex: /^recibi en (\w+) (\d+([.,]\d{1,3})?) de (.+)$/i,
  parse: (match) => ({
    tipo: 'ingreso',
    banco: match[1],
    monto: parseFloat(match[2].replace(',', '.')),
    descripcion: match[4]
  })
}
```

Ejemplos Válidos:
- "recibi en MercadoPago 5000 de freelance"
- "recibi en Uala 2000.50 de Lucas por comida"
- "RECIBI EN bbva 150000 DE sueldo"

---

**PATRÓN 3: TRANSFERENCIA**

Formato: "movi de [banco_origen] a [banco_destino] [monto]"

Regex:
```javascript
{
  tipo: 'movimiento',
  regex: /^movi de (\w+) a (\w+) (\d+([.,]\d{1,3})?)$/i,
  parse: (match) => ({
    tipo: 'movimiento',
    banco: match[1],
    bancoDestino: match[2],
    monto: parseFloat(match[3].replace(',', '.'))
  })
}
```

Ejemplos Válidos:
- "movi de Uala a MercadoPago 4000"
- "movi de BBVA a Uala 10000.50"
- "MOVI DE mp A uala 500"

Objeto Retornado:
```json
{
  "tipo": "movimiento",
  "banco": "Uala",
  "bancoDestino": "MercadoPago",
  "monto": 4000
}
```

---

**PATRÓN 4: DEPÓSITO DE SUELDO**

Formato: "sueldo [monto]"

Regex:
```javascript
{
  tipo: 'deposito de sueldo',
  regex: /^sueldo (\d+([.,]\d{1,3})?)$/i,
  parse: (match) => ({
    tipo: 'deposito de sueldo',
    banco: 'BBVA',  // Cuenta predeterminada
    monto: parseFloat(match[1].replace(',', '.')),
    descripcion: 'Depósito de sueldo'
  })
}
```

Ejemplos Válidos:
- "sueldo 850000"
- "sueldo 1234567.50"
- "SUELDO 500000"

Nota: Este patrón usa una cuenta predeterminada (configurable en código)

---

### Características del Parser

**Case-Insensitive:**
- Todos los regex usan flag /i
- "GASTE", "gaste", "Gaste" son equivalentes

**Soporte de Decimales:**
- Coma: 1500,50
- Punto: 1500.50
- Sin decimales: 1500
- Regex: (\d+([.,]\d{1,3})?)
- Conversión: replace(',', '.') antes de parseFloat()

**Validaciones:**
- Mensaje no vacío
- Formato reconocido por algún patrón
- Montos positivos (> 0)
- Alias de banco existe en DB (validación posterior en dbHelper)

**Manejo de Errores:**
```javascript
try {
  const resultado = parsearMensaje(mensaje);
  if (resultado.error) {
    // Formato no reconocido
    return mensajeDeAyuda();
  }
  // Procesar resultado
} catch (error) {
  console.error('Error al parsear:', error.message);
  return { error: error.message };
}
```

---

## 8. FRONTEND WEB - DASHBOARD

### Estructura HTML (public/index.html)

Secciones Principales:
1. Header: Filtros de fecha, búsqueda y selector de cuenta
2. Main: Tabla de transacciones (libro diario)
3. Aside: Panel de indicadores (KPIs) y top cuentas

Head Imports:
```html
<link rel="stylesheet" href="/css/journal.css">
<script src="/js/particles/particles.min.js"></script>
<script src="/js/utils.js"></script>
<script src="/js/accounts.js"></script>
<script src="/js/journal.js"></script>
```

---

### JavaScript Principal (public/js/journal.js)

**Variables Globales:**
```javascript
let transactions = [];           // Todas las transacciones cargadas
let filteredTransactions = [];   // Transacciones después de aplicar filtros
let selectedAccount = null;      // Cuenta seleccionada para filtrar (null = todas)
```

---

**FUNCIÓN: loadTransactions()**

Propósito: Cargar datos del API y procesar para renderizado

Implementación:
```javascript
async function loadTransactions() {
  try {
    const response = await fetch('/api/movimientos');
    const data = await response.json();
    
    // Transformar datos del API al formato interno
    transactions = data.map((item, index) => {
      const monto = parseFloat(item.monto) || 0;
      const esDebito = item.debeHaber === 'debe';
      
      return {
        id: item.id || index + 1,
        date: parseDate(item.fecha),
        description: item.descripcion,
        account: item.banco,
        account_name: item.banco_nombre || item.banco,
        account_color: item.banco_color || '#6c757d',
        banco_destino: item.banco_destino,
        amount: monto * item.signo,  // Monto con signo
        type: item.debeHaber,
        debit: esDebito ? Math.abs(monto) : 0,
        credit: !esDebito ? Math.abs(monto) : 0
      };
    });
    
    // Ordenar por fecha descendente
    transactions.sort((a, b) => b.date - a.date);
    
    // Aplicar filtros y renderizar
    applyFilters();
    renderTransactions();
    updateIndicators();
    renderTopAccounts(transactions);
    
  } catch (error) {
    console.error('Error al cargar transacciones:', error);
    showAlert('Error al cargar los datos', 'danger');
  }
}
```

Llamada Inicial:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  loadTransactions();
  // Configurar event listeners de filtros
});
```

---

**FUNCIÓN: applyFilters()**

Propósito: Filtrar transacciones por fecha, búsqueda y cuenta

Implementación:
```javascript
function applyFilters() {
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  filteredTransactions = transactions.filter(transaction => {
    // Filtro por fecha desde
    const transactionDate = transaction.date.toISOString().split('T')[0];
    if (dateFrom && transactionDate < dateFrom) return false;
    
    // Filtro por fecha hasta
    if (dateTo && transactionDate > dateTo) return false;
    
    // Filtro por término de búsqueda
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm)) {
      return false;
    }
    
    // Filtro por cuenta seleccionada
    if (selectedAccount && transaction.account !== selectedAccount) {
      return false;
    }
    
    return true;
  });
}
```

Event Listeners:
```javascript
document.getElementById('dateFrom').addEventListener('change', () => {
  applyFilters();
  renderTransactions();
  updateIndicators();
});

document.getElementById('searchInput').addEventListener('input', debounce(() => {
  applyFilters();
  renderTransactions();
}, 300));
```

---

**FUNCIÓN: renderTransactions()**

Propósito: Renderizar tabla HTML con transacciones filtradas

Implementación:
```javascript
function renderTransactions() {
  const tbody = document.getElementById('journalTableBody');
  tbody.innerHTML = '';
  
  if (filteredTransactions.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="text-center">No hay transacciones</td>';
    tbody.appendChild(row);
    return;
  }
  
  filteredTransactions.forEach(transaction => {
    const row = document.createElement('tr');
    
    // Determinar si es transferencia
    const cuentaDisplay = transaction.banco_destino 
      ? `${transaction.account} → ${transaction.banco_destino}`
      : transaction.account_name;
    
    row.innerHTML = `
      <td>${formatDate(transaction.date)}</td>
      <td>${escapeHtml(transaction.description)}</td>
      <td>
        <span class="badge" style="background-color: ${transaction.account_color}">
          ${cuentaDisplay}
        </span>
      </td>
      <td class="text-success">${formatCurrency(transaction.debit)}</td>
      <td class="text-danger">${formatCurrency(transaction.credit)}</td>
    `;
    
    tbody.appendChild(row);
  });
}
```

---

**FUNCIÓN: updateIndicators()**

Propósito: Calcular y actualizar KPIs en el panel lateral

Implementación:
```javascript
function updateIndicators() {
  // Balance total
  const totalBalance = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  document.getElementById('totalBalance').textContent = formatCurrency(totalBalance);
  
  // Gastos del día
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayExpenses = filteredTransactions
    .filter(t => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() === today.getTime() && t.type === 'haber';
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  document.getElementById('todayExpenses').textContent = formatCurrency(todayExpenses);
  
  // Ingresos del mes
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthIncome = filteredTransactions
    .filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth 
        && tDate.getFullYear() === currentYear 
        && t.type === 'debe';
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  document.getElementById('monthIncome').textContent = formatCurrency(monthIncome);
  
  // Egresos del mes
  const monthExpenses = filteredTransactions
    .filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth 
        && tDate.getFullYear() === currentYear 
        && t.type === 'haber';
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  document.getElementById('monthExpenses').textContent = formatCurrency(monthExpenses);
}
```

---

**FUNCIÓN: filterByAccount(accountId)**

Propósito: Filtrar transacciones por una cuenta específica

Implementación:
```javascript
function filterByAccount(accountId) {
  selectedAccount = accountId;
  applyFilters();
  renderTransactions();
  updateIndicators();
  updateAccountFilterBadge();
}

function updateAccountFilterBadge() {
  const searchInput = document.getElementById('searchInput');
  let badge = document.getElementById('accountFilterBadge');
  
  if (selectedAccount) {
    // Crear o actualizar badge
    const transaction = transactions.find(t => t.account === selectedAccount);
    const accountName = transaction ? transaction.account_name : selectedAccount;
    
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'accountFilterBadge';
      badge.className = 'filter-badge';
      searchInput.parentNode.appendChild(badge);
    }
    
    badge.innerHTML = `
      Filtrando: ${accountName}
      <button onclick="clearAccountFilter()" class="clear-filter">✕</button>
    `;
    badge.style.display = 'inline-block';
  } else {
    // Ocultar badge
    if (badge) {
      badge.style.display = 'none';
    }
  }
}

function clearAccountFilter() {
  filterByAccount(null);
}
```

---

**FUNCIÓN: renderTopAccounts()**

Propósito: Renderizar tarjetas de cuentas con saldos

Implementación:
```javascript
async function renderTopAccounts(transactions) {
  try {
    const response = await fetch('/api/cuentas');
    const cuentas = await response.json();
    
    const container = document.getElementById('topAccountsContainer');
    container.innerHTML = '';
    
    cuentas.forEach(cuenta => {
      const card = document.createElement('div');
      card.className = 'account-card';
      card.style.borderLeft = `4px solid ${cuenta.color}`;
      card.onclick = () => filterByAccount(cuenta.alias);
      
      card.innerHTML = `
        <div class="account-name">${cuenta.nombre}</div>
        <div class="account-alias">${cuenta.alias}</div>
        <div class="account-balance">${formatCurrency(cuenta.saldo_actual)}</div>
        <div class="account-currency">${cuenta.moneda}</div>
      `;
      
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error al cargar cuentas:', error);
  }
}
```

---

### Utilidades Frontend (public/js/utils.js)

**FUNCIÓN: formatCurrency(value)**

Propósito: Formatear números como moneda argentina

Implementación:
```javascript
function formatCurrency(value) {
  if (value === 0) return '-';
  return '$' + Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
```

Ejemplos:
- formatCurrency(1500) → "$1.500,00"
- formatCurrency(1234567.89) → "$1.234.567,89"
- formatCurrency(0) → "-"

---

**FUNCIÓN: formatDate(date)**

Propósito: Formatear fecha en formato argentino

Implementación:
```javascript
function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

Ejemplo:
- formatDate(new Date('2026-02-07T14:30:00')) → "07/02/2026 14:30"

---

**FUNCIÓN: parseDate(dateString)**

Propósito: Convertir string de fecha a objeto Date

Implementación:
```javascript
function parseDate(dateString) {
  // Formato esperado: "2026-02-07 14:30:00" o timestamp
  if (typeof dateString === 'number') {
    return new Date(dateString);
  }
  return new Date(dateString.replace(' ', 'T'));
}
```

---

**FUNCIÓN: showAlert(message, type)**

Propósito: Mostrar alertas al usuario

Implementación:
```javascript
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  alertContainer.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 5000);
}
```

Tipos: 'success', 'danger', 'warning', 'info'

---

**FUNCIÓN: escapeHtml(text)**

Propósito: Prevenir XSS escapando HTML

Implementación:
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

**FUNCIÓN: debounce(func, wait)**

Propósito: Limitar frecuencia de ejecución de funciones

Implementación:
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

Uso: Optimizar búsqueda en tiempo real sin hacer peticiones en cada tecla

---

### Estilos CSS (public/css/journal.css)

Tema y Variables:
```css
:root {
  --primary-color: #4CAF50;
  --danger-color: #f44336;
  --success-color: #4CAF50;
  --background-dark: #1a1a1a;
  --card-background: #2d2d2d;
  --text-light: #ffffff;
  --text-muted: #999999;
  --border-color: #444444;
}
```

Características Responsivas:
```css
/* Mobile First */
.container {
  width: 100%;
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}

/* Desktop */
@media (min-width: 1200px) {
  .container {
    max-width: 1140px;
  }
  
  /* Lado a lado: tabla + panel */
  .main-content {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
  }
}
```

Clases Importantes:
- .badge: Etiquetas de cuentas con colores
- .account-card: Tarjetas de resumen de cuentas
- .filter-badge: Badge de filtro activo
- .text-success / .text-danger: Colores para debe/haber

---

## 9. SERVICIOS Y LÓGICA DE NEGOCIO

### 🔧 Archivo `.env`

```env
# ============================================================================
# CONFIGURACIÓN DE KASHFLOW
# ============================================================================

# ----------------------------------------------------------------------------
# Telegram Bot
# ----------------------------------------------------------------------------
BOT_TOKEN=8599285827:AAFBL7VPsliZtdMX9h7SnO5xU1adp2pLgAw
# Token del bot obtenido de @BotFather en Telegram

WEBHOOK_URL=https://kashflow.kashflow.site
# URL pública para recibir webhooks de Telegram
# Debe ser HTTPS en producción

WEBHOOK_PORT=8443
# Puerto para webhook (8443, 443, 80, 88)

# ----------------------------------------------------------------------------
# Servidor API
# ----------------------------------------------------------------------------
API_PORT=3000
# Puerto donde escucha Express

NODE_ENV=production
# Ambiente: development | production

# ----------------------------------------------------------------------------
# Base de Datos
# ----------------------------------------------------------------------------
DATA_DIR=data
# Directorio donde se guarda kashflow.db

# ----------------------------------------------------------------------------
# Whisper (Transcripción de voz)
# ----------------------------------------------------------------------------
USE_LOCAL_WHISPER=true
# true: usar Whisper local | false: usar API de OpenAI

WHISPER_MODEL=small
# Modelo: tiny | base | small | medium | large

# ----------------------------------------------------------------------------
# OpenAI API (opcional - futuro)
# ----------------------------------------------------------------------------
# OPENAI_API_KEY=sk-...
# OPENAI_ORG_ID=org-...
```

### 📝 Variables por Ambiente

#### Desarrollo (`.env.development`)
```env
BOT_TOKEN=...
WEBHOOK_URL=https://ngrok-url.ngrok.io
API_PORT=3000
NODE_ENV=development
USE_LOCAL_WHISPER=true
WHISPER_MODEL=base  # Más rápido para desarrollo
```

#### Producción (`.env.production`)
```env
BOT_TOKEN=...
WEBHOOK_URL=https://kashflow.tudominio.com
API_PORT=3000
NODE_ENV=production
USE_LOCAL_WHISPER=true
WHISPER_MODEL=small  # Balance velocidad/precisión
```

### 🚀 Inicialización

**Orden de carga (api/index.js):**

```javascript
const env = process.env.NODE_ENV || 'development';
const envFiles = [
    path.join(projectRoot, `.env.${env}`),
    path.join(projectRoot, '.env')
];

for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
        require('dotenv').config({ path: envFile });
        console.log(`✅ Variables cargadas desde: ${path.basename(envFile)}`);
        break;
    }
}
```

### 🔐 Seguridad

**❌ NUNCA commitear:**
- `.env`
- `.env.production`
- `.env.development`

**✅ Usar en Git:**
- `.env.example` (plantilla sin valores reales)

**Ejemplo de `.env.example`:**
```env
BOT_TOKEN=your_bot_token_here
WEBHOOK_URL=https://your-domain.com
API_PORT=3000
NODE_ENV=production
USE_LOCAL_WHISPER=true
WHISPER_MODEL=small
```

---

## 15. EXTENSIONES Y MEJORAS FUTURAS (continuación desde sección 14)

### Roadmap de Desarrollo

**Fase 1: Visualización Avanzada**

Objetivo: Mejorar capacidades de análisis de datos

Características:
- Gráficos interactivos con Chart.js
- Categorización automática de gastos
- Reportes mensuales por categoría
- Comparativa mes a mes
- Exportación a PDF

Estado: Planeado Q2 2026

---

**Fase 2: Inteligencia Artificial**

Objetivo: Automatización mediante aprendizaje automático

Características:
- Parser mejorado con NLP (GPT-4)
- Categorización automática con ML
- Predicción de gastos futuros
- Detección de anomalías
- Sugerencias de ahorro personalizadas

Estado: Planeado Q3 2026

---

**Fase 3: Multi-Usuario**

Objetivo: Soporte para múltiples usuarios independientes

Características:
- Sistema de autenticación
- Múltiples usuarios por instancia
- Compartir gastos (roommates)
- Roles y permisos
- Notificaciones personalizadas

Estado: Planeado Q4 2026

---

**Fase 4: Gestión Financiera Avanzada**

Objetivo: Herramientas profesionales de finanzas

Características:
- Presupuestos por categoría
- Metas de ahorro
- Inversiones y rendimientos
- Conversión de divisas
- Integración con bancos (Open Banking API)

Estado: Planeado Q1 2027

---

**Fase 5: Aplicación Móvil Nativa**

Objetivo: App nativa con mejor UX móvil

Características:
- App nativa con React Native
- Modo offline-first
- Sincronización automática
- Widgets iOS/Android
- Notificaciones push

Estado: Planeado Q2 2027

---

**Fase 6: Seguridad y Compliance**

Objetivo: Máxima seguridad y cumplimiento normativo

Características:
- Encriptación end-to-end
- Backup automático en la nube
- Autenticación de dos factores (2FA)
- Auditoría de cambios
- GDPR compliance

Estado: Planeado Q3 2027

---

### Bugs Conocidos y Pendientes

**BUG-001: Parser no reconoce montos con separador de miles**
- Síntoma: "gaste de Uala 1.500 para..." falla
- Causa: Regex espera formato sin puntos de miles
- Solución propuesta: Actualizar regex para soportar (\d{1,3}(.\d{3})*([.,]\d{2})?)
- Prioridad: Media

**BUG-002: Whisper falla con audios muy cortos**
- Síntoma: Audios de menos de 2 segundos no transcriben
- Causa: Whisper requiere mínimo de audio
- Solución propuesta: Validar duración antes de transcribir, enviar mensaje de error
- Prioridad: Baja

**BUG-003: Dashboard no actualiza en tiempo real**
- Síntoma: Después de registrar en Telegram, dashboard no refleja cambio automáticamente
- Causa: Sin WebSocket ni polling
- Solución propuesta: Implementar SSE o WebSocket para actualización live
- Prioridad: Media

**BUG-004: Sin validación de duplicados**
- Síntoma: Se puede registrar mismo gasto múltiples veces
- Causa: No hay validación de transacciones similares en corto tiempo
- Solución propuesta: Validar (monto, descripción, cuenta) en últimos 5 minutos
- Prioridad: Alta

---

### Mejoras Rápidas (Quick Wins)

**QW-001: Comando /balance**
- Tiempo estimado: 1 hora
- Descripción: Mostrar balance total de todas las cuentas
- Implementación:
```javascript
balance: async msg => {
  const saldos = await consultarSaldosPorCuenta();
  const total = saldos.reduce((sum, c) => sum + c.saldo_actual, 0);
  await bot.sendMessage(msg.chat.id, 
    `Balance Total: $${total.toLocaleString("es-AR")}`
  );
}
```

**QW-002: Soporte para emojis en descripciones**
- Tiempo estimado: 30 minutos
- Descripción: Permitir emojis en campo descripcion
- Implementación: Validar que regex no restringe caracteres Unicode

**QW-003: Comando /undo**
- Tiempo estimado: 2 horas
- Descripción: Eliminar última transacción registrada
- Implementación: Guardar último ID por chat_id, permitir eliminación

**QW-004: Tema claro/oscuro en dashboard**
- Tiempo estimado: 3 horas
- Descripción: Toggle para cambiar entre tema claro y oscuro
- Implementación: CSS custom properties + localStorage

**QW-005: Atajos de teclado en dashboard**
- Tiempo estimado: 2 horas
- Descripción: Navegación con teclado (j/k para navegar, / para buscar)
- Implementación: Event listener en document.addEventListener('keydown')

---

## 16. RECURSOS ADICIONALES

### Documentación Externa

Links a recursos oficiales:

- Telegram Bot API: https://core.telegram.org/bots/api
- node-telegram-bot-api: https://github.com/yagop/node-telegram-bot-api
- Whisper OpenAI: https://github.com/openai/whisper
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- Express.js: https://expressjs.com/
- Docker Documentation: https://docs.docker.com/

---

### Herramientas de Desarrollo Recomendadas

**Postman**
- Propósito: Testing de API REST
- URL: https://www.postman.com/
- Uso: Probar endpoints /api/movimientos, /api/cuentas, etc.

**Ngrok**
- Propósito: Túnel HTTPS para desarrollo local
- URL: https://ngrok.com/
- Uso: Exponer servidor local para webhook de Telegram

**DB Browser for SQLite**
- Propósito: Explorar base de datos visualmente
- URL: https://sqlitebrowser.org/
- Uso: Ver y editar kashflow.db

**BotFather (Telegram)**
- Propósito: Gestión de bots de Telegram
- Usuario: @BotFather
- Uso: Crear bot, obtener token, configurar comandos

---

### Guías de Configuración

**Configurar Webhook con Ngrok:**

Pasos:
1. Instalar ngrok (brew install ngrok en macOS, o descargar de https://ngrok.com/)
2. Iniciar túnel: ngrok http 3000
3. Copiar URL HTTPS generada (ej: https://abc123.ngrok.io)
4. Actualizar .env: WEBHOOK_URL=https://abc123.ngrok.io
5. Reiniciar servidor: npm run dev

**Instalar Whisper (Transcripción de Voz):**

Requisitos:
- Python >= 3.8
- ffmpeg instalado

Pasos:
1. Verificar Python: python --version
2. Instalar Whisper: pip install openai-whisper
3. Instalar ffmpeg:
   - macOS: brew install ffmpeg
   - Ubuntu/Debian: sudo apt install ffmpeg
   - Windows: Descargar de https://ffmpeg.org/download.html
4. Probar instalación: python -c "import whisper; print('Whisper OK')"

---

## 17. RESUMEN Y CONCLUSIÓN

### Resumen Ejecutivo del Proyecto

KashFlow es una solución completa de gestión financiera personal que combina:

1. Interfaz conversacional via Telegram Bot
2. Parser inteligente de lenguaje natural en español
3. Base de datos robusta SQLite con modelo contable debe/haber
4. Dashboard web moderno para visualización de datos
5. Transcripción de voz mediante Whisper AI local
6. Despliegue containerizado con Docker

---

### Casos de Uso Ideales

El sistema es ideal para:

- Personas que buscan simplicidad sobre complejidad
- Usuarios que quieren registrar gastos inmediatamente sin abrir apps
- Quienes valoran la privacidad (datos almacenados localmente)
- Entusiastas de self-hosting y control total de datos
- Usuarios de Telegram como plataforma de comunicación principal

---

### Fortalezas del Proyecto

**UX (User Experience)**
- Registro de transacciones en menos de 10 segundos via Telegram
- Sin necesidad de abrir apps adicionales
- Interfaz conversacional natural

**Privacidad**
- Base de datos SQLite local, sin servicios en la nube
- Control total sobre los datos personales
- Sin tracking externo

**Tecnología**
- Stack moderno y mantenible (Node.js 18+, Express 5.x)
- Buenas prácticas (prepared statements, async/await, try-catch)
- Arquitectura modular extensible

**Despliegue**
- Docker one-command deployment
- Multi-stage build optimizado (~200MB imagen final)
- Health checks integrados

---

### Logros Técnicos

Implementaciones exitosas:

- Parser regex robusto con 95%+ de precisión en formatos estándar
- Integración completa de Whisper local para transcripción de voz
- Modelo de datos contable profesional (debe/haber, transferencias)
- API REST bien estructurada con 6 endpoints
- Frontend responsive sin frameworks pesados (Vanilla JS)
- Build multi-stage de Docker optimizado

---

### Métricas del Proyecto

Estadísticas clave:

- Líneas de código Backend: aproximadamente 1,500
- Líneas de código Frontend: aproximadamente 800
- Endpoints API: 6 principales
- Comandos de bot: 6+ comandos implementados
- Tablas de base de datos: 4 tablas principales
- Tamaño imagen Docker final: aproximadamente 200MB
- Tiempo de startup: menos de 5 segundos

---

### Información de Contacto

Desarrollador: Kevin
Repositorio: github.com/kevinkling/kashflow
Licencia: MIT
Versión: 1.0.0
Última actualización: Febrero 2026

---

## 18. NOTAS PARA SISTEMAS DE INTELIGENCIA ARTIFICIAL

### Propósito de Este Documento

Este PROJECT_BRIEF está diseñado específicamente para ser consumido por modelos de IA (como Claude, GPT-4, Gemini, etc.) que necesiten:

1. Generar código adicional para nuevas features
2. Debuggear problemas existentes
3. Responder preguntas sobre arquitectura y decisiones técnicas
4. Extender funcionalidad del sistema
5. Documentar cambios y generar documentación adicional

---

### Información Clave para IA

**Tecnologías Core:**
- Node.js 18+ con Express 5.x
- SQLite con better-sqlite3 (driver nativo)
- Telegram Bot API en modo webhook
- Whisper AI local (Python 3.8+)
- Vanilla JavaScript en frontend (sin frameworks)

**Archivos Críticos a Considerar:**
- api/index.js: Punto de entrada del servidor
- api/services/bodyParser.js: Parser de mensajes en lenguaje natural
- api/services/dbHelper.js: Todas las operaciones de base de datos
- api/services/whisperService.js: Servicio de transcripción de audio
- data/schema.sql: Estructura completa de base de datos
- public/js/journal.js: Lógica principal del dashboard

**Patrones de Código Importantes:**
- Usar prepared statements para todas las queries SQL
- Async/await para operaciones asíncronas
- Try-catch para manejo de errores
- Transacciones SQL para operaciones atómicas (transferencias)
- Validación de inputs antes de procesar

**Contexto del Usuario:**
- Usuario argentino, formatos locales (es-AR)
- Moneda principal: ARS (pesos argentinos)
- Timezone: America/Argentina/Buenos_Aires
- Idioma: Español para mensajes y transcripciones

**Limitaciones Actuales a Tener en Cuenta:**
- Sin autenticación (single-user implícito por chat_id)
- Sin actualización en tiempo real del dashboard
- Parser limitado a 4 formatos regex predefinidos
- Sin categorización automática de gastos
- Sin integración con APIs bancarias reales

---

### Keywords para Búsqueda en Este Documento

Si necesitas buscar información específica, usa estos términos:

- "Telegram Bot": Configuración y comandos del bot
- "bodyParser": Parser de lenguaje natural
- "Whisper": Transcripción de voz
- "SQLite" o "schema": Estructura de base de datos
- "transacciones": Tabla principal de movimientos financieros
- "Docker": Configuración de contenedores
- "API REST": Endpoints del backend
- "dashboard" o "journal.js": Lógica del frontend
- "dbHelper": Operaciones CRUD de base de datos

---

### Estructura de Datos Principales

**Tabla transacciones:**
- Campos: id, cuenta_id, tipo, signo, monto, descripcion, fecha_hora, transferencia_id, telegram_message_id
- tipo: 'debe' (ingreso) o 'haber' (egreso)
- signo: 1 (suma) o -1 (resta)

**Tabla cuentas:**
- Campos: id, nombre, alias, color, moneda, activa
- alias: Nombre corto para identificar cuenta en mensajes

**Tabla transferencias:**
- Campos: id, cuenta_origen_id, cuenta_destino_id, monto, descripcion, fecha_hora
- Relaciona dos transacciones (egreso origen + ingreso destino)

**Tabla usuarios:**
- Campos: id, nombre, telegram_chat_id
- Actualmente single-user, preparado para multi-usuario

---

### Patrones de Código para Generación

Cuando generes código para KashFlow, sigue estos patrones:

**Pattern 1: Prepared Statements SQL**
```javascript
const stmt = db.prepare('SELECT * FROM tabla WHERE campo = ?');
const result = stmt.get(valor);
```

**Pattern 2: Async Functions con Error Handling**
```javascript
async function miFuncion() {
  try {
    const resultado = await operacion();
    return resultado;
  } catch (error) {
    console.error('Error en miFuncion:', error.message);
    throw error;
  }
}
```

**Pattern 3: Validación de Inputs**
```javascript
if (!input || typeof input !== 'string') {
  throw new Error('Input inválido');
}
const inputLimpio = input.trim().toLowerCase();
```

**Pattern 4: Respuestas Consistentes del Bot**
```javascript
await bot.sendMessage(chatId, `Operación exitosa\nDetalles: ${info}`);
```

**Pattern 5: Transacciones SQL Atómicas**
```javascript
const transaction = db.transaction(() => {
  // Múltiples operaciones que deben ejecutarse juntas
  stmt1.run(data1);
  stmt2.run(data2);
});
transaction();
```

---

### Comandos Útiles para Desarrollo

**Desarrollo Local:**
```bash
pnpm install          # Instalar dependencias
pnpm dev              # Modo desarrollo
node scripts/test_parser.js  # Probar parser
```

**Testing Manual de API:**
```bash
curl http://localhost:3000/api/movimientos
curl http://localhost:3000/api/cuentas
curl http://localhost:3000/api/health
```

**Base de Datos:**
```bash
sqlite3 data/kashflow.db
SELECT * FROM transacciones ORDER BY fecha_hora DESC LIMIT 10;
SELECT * FROM cuentas WHERE activa = 1;
```

**Docker:**
```bash
docker-compose up -d --build    # Build y run
docker-compose logs -f          # Ver logs
docker-compose restart kashflow # Reiniciar
```

---

### Contexto de Decisiones Arquitectónicas

**Por qué Telegram Bot:**
- Interface familiar para el usuario
- No requiere desarrollo de app móvil
- API robusta y bien documentada
- Mensajes de voz integrados de forma nativa

**Por qué SQLite:**
- Simplicidad: archivo único, sin servidor
- Suficiente para datos personales/pequeña escala
- Backups fáciles (copiar archivo)
- ACID compliance (transacciones seguras)

**Por qué Vanilla JS en Frontend:**
- Proyecto pequeño, no justifica framework pesado
- Carga rápida, sin bundle gigante
- Aprendizaje de fundamentos
- Sin dependencias de build tools complejas

**Por qué Whisper Local:**
- Privacidad: audio no se envía a servidores externos
- Sin costo por uso (API de OpenAI es paga)
- Funciona offline si está instalado localmente
- Control total sobre modelo y parámetros

---

### Casos Edge Importantes

**Edge Case 1: Alias ambiguo de cuenta**
- Problema: "MP" puede ser MercadoPago o MePago
- Solución actual: Primera coincidencia en DB
- Mejora futura: Desambiguación con GPT-4

**Edge Case 2: Monto con formato inválido**
- Problema: "1500.50.25" es matemáticamente inválido
- Solución actual: parseFloat retorna 1500.5 (trunca)
- Mejora: Validación estricta de formato antes de parsear

**Edge Case 3: Transferencia a cuenta inexistente**
- Problema: "movi de Uala a CuentaFalsa 1000"
- Solución actual: Error al buscar cuenta destino
- Mejora: Sugerir cuentas similares (fuzzy matching)

**Edge Case 4: Audio en idioma incorrecto**
- Problema: Whisper transcribe en inglés por error
- Solución actual: Forzar language='es' en configuración
- Mejora: Detectar idioma automáticamente

---

**VERSION DEL DOCUMENTO:** 1.0.0  
**FECHA:** Febrero 2026  
**PROYECTO:** KashFlow - Sistema de Gestión Financiera Personal  
**REPOSITORIO:** github.com/kevinkling/kashflow  
**LICENCIA:** MIT

---

**FIN DEL DOCUMENTO**

