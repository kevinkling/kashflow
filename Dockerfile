# ============================================================================
# Dockerfile Multi-Stage para KashFlow
# Sistema de Finanzas Personales con Telegram Bot
# ============================================================================

# ============================================================================
# STAGE 1: Builder - Instalar dependencias
# ============================================================================
FROM node:20-slim AS builder

# Instalar dependencias necesarias para better-sqlite3 (compilación nativa)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Habilitar corepack para usar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Establecer directorio de trabajo
WORKDIR /app

# Copiar SOLO los archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias de producción
RUN pnpm install --frozen-lockfile --ignore-scripts

# Manually build better-sqlite3 with npm
RUN cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && \
    npm run build-release && \
    cd /app
# ============================================================================
# STAGE 2: Runtime - Imagen final optimizada
# ============================================================================
FROM node:20-slim

# Metadata
LABEL maintainer="Kevin"
LABEL description="KashFlow - Sistema de Finanzas Personales"
LABEL version="1.0.0"

# Instalar solo SQLite runtime
RUN apt-get update && apt-get install -y sqlite3 tzdata python3 && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

# Configurar timezone (Argentina)
ENV TZ=America/Argentina/Buenos_Aires
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Crear usuario no-root para seguridad
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Establecer directorio de trabajo
WORKDIR /app

# Crear directorio para la base de datos con permisos correctos (ANTES de copiar archivos)
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app/data && \
    chmod 755 /app/data

# Copiar dependencias desde el builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código fuente
COPY --chown=nodejs:nodejs api ./api
COPY --chown=nodejs:nodejs public ./public
COPY --chown=nodejs:nodejs package.json ./

# Cambiar al usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production \
    API_PORT=3000

# Healthcheck
#HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "api/index.js"]