-- ============================================================================
-- Script de actualización de usuarios y cuentas
-- Fecha: 2026-02-01
-- ============================================================================

-- ============================================================================
-- PARTE 0: ACTUALIZACIONES DE TABLA USUARIOS
-- ============================================================================

-- Actualizar telegram_user_id y nombres
UPDATE usuarios SET telegram_user_id = 1597425565, nombre = 'Kevin' WHERE id = 1;
UPDATE usuarios SET telegram_user_id = 2222222222, nombre = 'Jorge' WHERE id = 2; 

-- ============================================================================
-- PARTE 1: ACTUALIZACIONES DE REGISTROS EXISTENTES EN CUENTAS
-- ============================================================================

-- PASO 1: Actualizar todos los usuario_id a 1
UPDATE cuentas SET usuario_id = 1;

-- PASO 2: Desactivar cuentas específicas
UPDATE cuentas SET activa = 0 WHERE LOWER(nombre) = 'banco nación';
UPDATE cuentas SET activa = 0 WHERE LOWER(nombre) = 'brubank';
UPDATE cuentas SET activa = 0 WHERE LOWER(nombre) = 'dólares';

-- PASO 3: Actualizar colores (con #)
UPDATE cuentas SET color = '#0c3f0d' WHERE LOWER(nombre) = 'dólares';
UPDATE cuentas SET color = '#6650da' WHERE LOWER(nombre) = 'brubank';
UPDATE cuentas SET color = '#097d97' WHERE LOWER(nombre) = 'banco nación';
UPDATE cuentas SET color = '#7d967f' WHERE LOWER(nombre) = 'efectivo';
UPDATE cuentas SET color = '#001491' WHERE LOWER(nombre) = 'bbva';
UPDATE cuentas SET color = '#ff5e62' WHERE LOWER(nombre) = 'uala';
UPDATE cuentas SET color = '#09b1f2' WHERE LOWER(nombre) = 'mercadopago';

-- ============================================================================
-- PARTE 2: INSERTAR NUEVAS CUENTAS
-- ============================================================================

-- 1. Naranja X
INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda, activa, fecha_creacion)
VALUES (1, 'Naranja X', 'nx', '#ff5508', 'ARS', 1, datetime('now', 'localtime'))
ON CONFLICT(alias) DO UPDATE SET 
    nombre = excluded.nombre,
    color = excluded.color,
    activa = excluded.activa;

-- 2. Lemon
INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda, activa, fecha_creacion)
VALUES (1, 'Lemon', 'lemon', '#0dc88e', 'ARS', 1, datetime('now', 'localtime'))
ON CONFLICT(alias) DO UPDATE SET 
    nombre = excluded.nombre,
    color = excluded.color,
    activa = excluded.activa;

-- 3. Galicia (asignado a usuario 2 - Jorge)
INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda, activa, fecha_creacion)
VALUES (2, 'Galicia', 'galicia', '#fa7621', 'ARS', 1, datetime('now', 'localtime'))
ON CONFLICT(alias) DO UPDATE SET 
    nombre = excluded.nombre,
    color = excluded.color,
    activa = excluded.activa;

-- 4. ClaroPay
INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda, activa, fecha_creacion)
VALUES (1, 'ClaroPay', 'claro', '#c90908', 'ARS', 1, datetime('now', 'localtime'))
ON CONFLICT(alias) DO UPDATE SET 
    nombre = excluded.nombre,
    color = excluded.color,
    activa = excluded.activa;

-- 5. AstroPay
INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda, activa, fecha_creacion)
VALUES (1, 'AstroPay', 'astro', '#0d3c3a', 'ARS', 1, datetime('now', 'localtime'))
ON CONFLICT(alias) DO UPDATE SET 
    nombre = excluded.nombre,
    color = excluded.color,
    activa = excluded.activa;

-- 6. Belo
INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda, activa, fecha_creacion)
VALUES (1, 'Belo', 'belo', '#5e15e6', 'ARS', 1, datetime('now', 'localtime'))
ON CONFLICT(alias) DO UPDATE SET 
    nombre = excluded.nombre,
    color = excluded.color,
    activa = excluded.activa;

-- 7. Carrefour
INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda, activa, fecha_creacion)
VALUES (1, 'Carrefour', 'carrefour', '#ff0808', 'ARS', 1, datetime('now', 'localtime'))
ON CONFLICT(alias) DO UPDATE SET 
    nombre = excluded.nombre,
    color = excluded.color,
    activa = excluded.activa;

-- 8. PersonalPay
INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda, activa, fecha_creacion)
VALUES (1, 'PersonalPay', 'personal', '#5f55fa', 'ARS', 1, datetime('now', 'localtime'))
ON CONFLICT(alias) DO UPDATE SET 
    nombre = excluded.nombre,
    color = excluded.color,
    activa = excluded.activa;