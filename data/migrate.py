#!/usr/bin/env python3
"""
Sistema de Migraciones para SQLite
Uso:
    python migrate.py          # Aplica migraciones pendientes
    python migrate.py status   # Ver estado de migraciones
"""

import sqlite3
import os
import re
import sys
import glob
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv() # python3.13.exe -m pip install python-dotenv 


class MigrationManager:
    def __init__(self, db_path, migrations_dir='data/updates'):
        self.db_path = db_path
        self.migrations_dir = migrations_dir
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self._init_migrations_table()
        self._ensure_hash_column()
    
    def _init_migrations_table(self):
        """Crea tabla para trackear migraciones aplicadas"""
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version INTEGER UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                archivo TEXT NOT NULL,
                hash TEXT,
                fecha_aplicada DATETIME DEFAULT (datetime('now', 'localtime'))
            )
        ''')
        self.conn.commit()
        # print("✓ Sistema de migraciones inicializado")

    def _ensure_hash_column(self):
        """Asegura que exista la columna hash (para migraciones anteriores)"""
        try:
            self.cursor.execute('SELECT hash FROM migrations LIMIT 1')
        except sqlite3.OperationalError:
            print("→ Agregando columna 'hash' a tabla migrations...")
            self.cursor.execute('ALTER TABLE migrations ADD COLUMN hash TEXT')
            self.conn.commit()
    
    def calculate_file_hash(self, filepath):
        """Calcula hash SHA256 del contenido del archivo"""
        import hashlib
        with open(filepath, 'rb') as f:
            return hashlib.sha256(f.read()).hexdigest()

    def get_applied_migrations(self):
        """Obtiene diccionario {version: hash} de migraciones aplicadas"""
        self.cursor.execute('SELECT version, hash FROM migrations')
        return {row[0]: row[1] for row in self.cursor.fetchall()}
    
    def get_current_version(self):
        """Obtiene la versión actual de la base de datos"""
        self.cursor.execute('SELECT MAX(version) FROM migrations')
        result = self.cursor.fetchone()[0]
        return result if result else 0
    
    def get_migration_files(self):
        """Lee todos los archivos .sql de la carpeta updates"""
        if not os.path.exists(self.migrations_dir):
            print(f"✗ ERROR: La carpeta '{self.migrations_dir}/' no existe")
            sys.exit(1)
        
        files = []
        for filename in sorted(os.listdir(self.migrations_dir)):
            if filename.endswith('.sql'):
                # Extraer número de versión del nombre del archivo
                match = re.match(r'^(\d+)_(.+)\.sql$', filename)
                if match:
                    version = int(match.group(1))
                    nombre = match.group(2).replace('_', ' ')
                    path = os.path.join(self.migrations_dir, filename)
                    files.append({
                        'version': version,
                        'nombre': nombre,
                        'archivo': filename,
                        'path': path,
                        'hash': self.calculate_file_hash(path)
                    })
        
        return sorted(files, key=lambda x: x['version'])
    
    def update_migration_hash(self, version, file_hash):
        """Actualiza el hash de una migración existente (backfill)"""
        self.cursor.execute('UPDATE migrations SET hash = ? WHERE version = ?', (file_hash, version))
        self.conn.commit()
        print(f"  ✓ Hash actualizado para versión {version}")

    def apply_migration(self, migration):
        """Aplica una migración desde archivo .sql"""
        print(f"\n→ Aplicando migración {migration['version']:03d}: {migration['nombre']}")
        
        try:
            # Leer el archivo SQL
            with open(migration['path'], 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Iniciar transacción
            self.cursor.execute('BEGIN TRANSACTION')
            
            # Dividir e ignorar comentarios (lógica simplificada)
            statements = []
            current_statement = []
            
            for line in sql_content.split('\n'):
                if line.strip().startswith('--'): continue
                if '--' in line: line = line[:line.index('--')]
                
                line = line.strip()
                if line:
                    current_statement.append(line)
                    if line.endswith(';'):
                        stmt = ' '.join(current_statement)[:-1].strip()
                        if stmt: statements.append(stmt)
                        current_statement = []
            
            # Ejecutar statements
            for i, statement in enumerate(statements, 1):
                try:
                    self.cursor.execute(statement)
                    print(f"  ✓ Statement {i}/{len(statements)} ejecutado")
                except Exception as e:
                    print(f"  ✗ Error en statement {i}: {e}")
                    # print(f"  SQL: {statement[:100]}...")
                    raise
            
            # Registrar o actualizar la migración con hash correcto
            # Usamos INSERT OR REPLACE para manejar re-runs
            self.cursor.execute('''
                INSERT OR REPLACE INTO migrations (version, nombre, archivo, hash, fecha_aplicada)
                VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
            ''', (migration['version'], migration['nombre'], migration['archivo'], migration['hash']))
            
            self.conn.commit()
            print(f"✓ Migración {migration['version']:03d} aplicada correctamente")
            return True
            
        except Exception as e:
            self.conn.rollback()
            print(f"\n✗ ERROR en migración {migration['version']:03d}")
            print(f"  Motivo: {e}")
            raise
    
    def migrate(self):
        """Aplica todas las migraciones pendientes o modificadas"""
        applied = self.get_applied_migrations()
        migrations = self.get_migration_files()
        
        if not migrations:
            print("⚠ No se encontraron archivos de migración")
            return
        
        pending = []
        
        print("Verificando estado de migraciones...")
        for m in migrations:
            v = m['version']
            h = m['hash']
            
            if v not in applied:
                pending.append(m)
            else:
                db_hash = applied[v]
                if db_hash is None:
                    # Si no tiene hash en DB (migración vieja), guardamos el actual y NO re-ejecutamos
                    # Asumimos que la DB ya tiene esos cambios aplicados
                    self.update_migration_hash(v, h)
                elif db_hash != h:
                    print(f"⚠ Migración {v:03d} ha sido modificada. Se volverá a aplicar.")
                    pending.append(m)
        
        if not pending:
            print(f"✓ Base de datos actualizada (versión {self.get_current_version()})")
            return
        
        print("=" * 70)
        print(f"  SISTEMA DE MIGRACIONES - {len(pending)} PENDIENTES/MODIFICADAS")
        print("=" * 70)
        
        for migration in pending:
            self.apply_migration(migration)
        
        print("\n" + "=" * 70)
        print(f"✓ Proceso finalizado. Versión actual: {self.get_current_version()}")
        print("=" * 70)
    
    def status(self):
        """Muestra el estado de las migraciones"""
        applied = self.get_applied_migrations()
        migrations = self.get_migration_files()
        
        print("=" * 70)
        print("  ESTADO DE MIGRACIONES")
        print("=" * 70)
        
        if not migrations:
            print("⚠ No se encontraron archivos")
            return
        
        print(f"{'VER':<4} | {'ESTADO':<12} | {'ARCHIVO':<40}")
        print("-" * 70)
        
        for m in migrations:
            v = m['version']
            h = m['hash']
            
            if v not in applied:
                status = "⏳ PENDIENTE"
            else:
                db_hash = applied[v]
                if db_hash is None or db_hash == h:
                    status = "✓ APLICADA"
                else:
                    status = "⚠ MODIFICADA"
            
            print(f"{v:03d}  | {status:<12} | {m['archivo']}")
        
        print("=" * 70)
    
    def close(self):
        self.conn.close()


def main():
    # Leer rutas desde variables de entorno con fallbacks para desarrollo
    DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "kashflow.db"))
    UPDATES_DIR = os.getenv("UPDATES_DIR", os.path.join(os.path.dirname(__file__), "updates"))
    
    # Obtener DATA_DIR de variable de entorno (sin valor por defecto)
    DATA_DIR = os.getenv('DATA_DIR')
    if not DATA_DIR:
        print(f"✗ ERROR: La variable de entorno DATA_DIR no está definida")
        sys.exit(1)
    
    DB_PATH = os.path.join(DATA_DIR, 'kashflow.db')
    print(f"📍 Using DB: {DB_PATH}")
    print(f"📁 Using updates: {UPDATES_DIR}")
    
    # Verificar si existe la base de datos
    if not os.path.exists(DB_PATH):
        print(f"✗ ERROR: La base de datos '{DB_PATH}' no existe")
        sys.exit(1)
    
    # Crear manager
    manager = MigrationManager(DB_PATH, UPDATES_DIR)
    
    try:
        # Verificar argumentos
        if len(sys.argv) > 1:
            comando = sys.argv[1].lower()
            
            if comando == 'status':
                manager.status()
            elif comando == 'help':
                print(__doc__)
            else:
                print(f"✗ Comando desconocido: {comando}")
                print(__doc__)
        else:
            # Sin argumentos: aplicar migraciones
            manager.migrate()
    
    finally:
        manager.close()


if __name__ == '__main__':
    main()