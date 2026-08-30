-- 007_add_simulation_tables.sql

-- Tabla: escenarios_simulacion
CREATE TABLE escenarios_simulacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    fecha_modificacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_escenarios_usuario_id ON escenarios_simulacion(usuario_id);

-- Tabla: escenario_ajustes
CREATE TABLE escenario_ajustes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    escenario_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('instancia', 'libre')),
    instancia_compromiso_id INTEGER, -- FK nullable a instancias_compromiso
    descripcion TEXT,
    fecha_estimada DATE,
    monto_simulado DECIMAL(15,2) NOT NULL,
    signo INTEGER NOT NULL CHECK(signo IN (1, -1)),
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (escenario_id) REFERENCES escenarios_simulacion(id) ON DELETE CASCADE,
    FOREIGN KEY (instancia_compromiso_id) REFERENCES instancias_compromiso(id) ON DELETE SET NULL
);
CREATE INDEX idx_ajustes_escenario_id ON escenario_ajustes(escenario_id);

