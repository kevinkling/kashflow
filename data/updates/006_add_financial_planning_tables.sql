-- 006_add_financial_planning_tables.sql

-- Tabla: compromisos
CREATE TABLE compromisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
    frecuencia TEXT NOT NULL CHECK(frecuencia IN ('unica', 'mensual', 'quincenal', 'anual')),
    dia_vencimiento INTEGER, -- Día del mes (1-31) o NULL para 'unica'
    importe_estimado DECIMAL(15, 2) NOT NULL CHECK(importe_estimado >= 0),
    cuenta_sugerida_id INTEGER,
    activa BOOLEAN NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    fecha_modificacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cuenta_sugerida_id) REFERENCES cuentas(id) ON DELETE SET NULL
);
CREATE INDEX idx_compromisos_usuario_id ON compromisos(usuario_id);
CREATE INDEX idx_compromisos_activa ON compromisos(activa);

-- Tabla: instancias_compromiso
CREATE TABLE instancias_compromiso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compromiso_id INTEGER, -- NULL para gastos extraordinarios/cuotas manuales
    usuario_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    periodo TEXT, -- 'YYYY-MM' para recurrentes, NULL para 'unica'
    fecha_vencimiento DATE NOT NULL,
    importe_esperado DECIMAL(15, 2) NOT NULL CHECK(importe_esperado >= 0),
    importe_final DECIMAL(15, 2), -- Puede diferir del esperado
    estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'vencido', 'pagado', 'cancelado')),
    cuenta_pago_id INTEGER, -- Cuenta usada para el pago/cobro real
    transaccion_id INTEGER UNIQUE, -- Referencia a la transacción real en la tabla transacciones
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    fecha_modificacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (compromiso_id) REFERENCES compromisos(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cuenta_pago_id) REFERENCES cuentas(id) ON DELETE SET NULL,
    FOREIGN KEY (transaccion_id) REFERENCES transacciones(id) ON DELETE SET NULL
);
CREATE INDEX idx_instancias_compromiso_compromiso_id ON instancias_compromiso(compromiso_id);
CREATE INDEX idx_instancias_compromiso_usuario_id ON instancias_compromiso(usuario_id);
CREATE INDEX idx_instancias_compromiso_fecha_vencimiento ON instancias_compromiso(fecha_vencimiento);
CREATE INDEX idx_instancias_compromiso_estado ON instancias_compromiso(estado);

-- Tabla: tarjetas
CREATE TABLE tarjetas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    alias TEXT NOT NULL UNIQUE,
    dia_cierre INTEGER NOT NULL CHECK(dia_cierre >= 1 AND dia_cierre <= 31),
    dia_vencimiento INTEGER NOT NULL CHECK(dia_vencimiento >= 1 AND dia_vencimiento <= 31),
    cuenta_pago_id INTEGER, -- Cuenta por defecto para pagar el resumen
    activa BOOLEAN NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    fecha_modificacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cuenta_pago_id) REFERENCES cuentas(id) ON DELETE SET NULL
);
CREATE INDEX idx_tarjetas_usuario_id ON tarjetas(usuario_id);
CREATE INDEX idx_tarjetas_activa ON tarjetas(activa);
CREATE INDEX idx_tarjetas_alias ON tarjetas(alias);

-- Tabla: consumos_tarjeta
CREATE TABLE consumos_tarjeta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tarjeta_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    monto DECIMAL(15, 2) NOT NULL CHECK(monto > 0),
    fecha_compra DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    cuotas TEXT, -- '1/1', '1/3', '2/3' etc.
    instancia_resumen_id INTEGER, -- FK a instancias_compromiso (el resumen al que pertenece)
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (tarjeta_id) REFERENCES tarjetas(id) ON DELETE CASCADE,
    FOREIGN KEY (instancia_resumen_id) REFERENCES instancias_compromiso(id) ON DELETE SET NULL
);
CREATE INDEX idx_consumos_tarjeta_tarjeta_id ON consumos_tarjeta(tarjeta_id);
CREATE INDEX idx_consumos_tarjeta_fecha_compra ON consumos_tarjeta(fecha_compra);
CREATE INDEX idx_consumos_tarjeta_instancia_resumen_id ON consumos_tarjeta(instancia_resumen_id);
