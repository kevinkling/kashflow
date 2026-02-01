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
    
    def _init_migrations_table(self):
        """Crea tabla para trackear migraciones aplicadas"""
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version INTEGER UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                archivo TEXT NOT NULL,
                fecha_aplicada DATETIME DEFAULT (datetime('now', 'localtime'))
            )
        ''')
        self.conn.commit()
        print("✓ Sistema de migraciones inicializado")
    
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
                # Formato esperado: 001_nombre_descriptivo.sql
                match = re.match(r'^(\d+)_(.+)\.sql$', filename)
                if match:
                    version = int(match.group(1))
                    nombre = match.group(2).replace('_', ' ')
                    files.append({
                        'version': version,
                        'nombre': nombre,
                        'archivo': filename,
                        'path': os.path.join(self.migrations_dir, filename)
                    })
        
        return sorted(files, key=lambda x: x['version'])
    
    def apply_migration(self, migration):
        """Aplica una migración desde archivo .sql"""
        print(f"\n→ Aplicando migración {migration['version']:03d}: {migration['nombre']}")
        
        try:
            # Leer el archivo SQL
            with open(migration['path'], 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Iniciar transacción
            self.cursor.execute('BEGIN TRANSACTION')
            
            # Dividir el contenido en statements individuales
            # Removemos comentarios y líneas vacías
            statements = []
            current_statement = []
            
            for line in sql_content.split('\n'):
                # Ignorar comentarios de línea completa
                if line.strip().startswith('--'):
                    continue
                
                # Remover comentarios inline
                if '--' in line:
                    line = line[:line.index('--')]
                
                line = line.strip()
                if line:
                    current_statement.append(line)
                    
                    # Si la línea termina en ;, es el fin del statement
                    if line.endswith(';'):
                        statement = ' '.join(current_statement)
                        # Remover el ; final
                        statement = statement[:-1].strip()
                        if statement:
                            statements.append(statement)
                        current_statement = []
            
            # Ejecutar cada statement
            for i, statement in enumerate(statements, 1):
                try:
                    self.cursor.execute(statement)
                    print(f"  ✓ Statement {i}/{len(statements)} ejecutado")
                except Exception as e:
                    print(f"  ✗ Error en statement {i}: {e}")
                    print(f"  SQL: {statement[:100]}...")
                    raise
            
            # Registrar la migración
            self.cursor.execute('''
                INSERT INTO migrations (version, nombre, archivo)
                VALUES (?, ?, ?)
            ''', (migration['version'], migration['nombre'], migration['archivo']))
            
            # Confirmar transacción
            self.conn.commit()
            print(f"✓ Migración {migration['version']:03d} aplicada exitosamente")
            return True
            
        except Exception as e:
            self.conn.rollback()
            print(f"\n✗ ERROR en migración {migration['version']:03d}")
            print(f"  Motivo: {e}")
            print(f"  Los cambios fueron revertidos (rollback)")
            raise
    
    def migrate(self):
        """Aplica todas las migraciones pendientes"""
        current_version = self.get_current_version()
        migrations = self.get_migration_files()
        
        if not migrations:
            print("⚠ No se encontraron archivos de migración en la carpeta 'data/updates/'")
            return
        
        pending = [m for m in migrations if m['version'] > current_version]
        
        if not pending:
            print(f"✓ Base de datos actualizada (versión {current_version})")
            print("  No hay migraciones pendientes")
            return
        
        print("=" * 70)
        print(f"  SISTEMA DE MIGRACIONES")
        print("=" * 70)
        print(f"Base de datos: {self.db_path}")
        print(f"Versión actual: {current_version}")
        print(f"Migraciones pendientes: {len(pending)}")
        print("-" * 70)
        
        for migration in pending:
            self.apply_migration(migration)
        
        print("\n" + "=" * 70)
        print(f"✓ Base de datos actualizada a versión {self.get_current_version()}")
        print("=" * 70)
    
    def status(self):
        """Muestra el estado de las migraciones"""
        current_version = self.get_current_version()
        migrations = self.get_migration_files()
        
        print("=" * 70)
        print("  ESTADO DE MIGRACIONES")
        print("=" * 70)
        print(f"Base de datos: {self.db_path}")
        print(f"Versión actual: {current_version}")
        print()
        
        if not migrations:
            print("⚠ No se encontraron archivos de migración")
            print("=" * 70)
            return
        
        print("Migraciones disponibles:")
        print("-" * 70)
        
        for migration in migrations:
            if migration['version'] <= current_version:
                status = "✓ Aplicada"
                # Obtener fecha de aplicación
                self.cursor.execute(
                    'SELECT fecha_aplicada FROM migrations WHERE version = ?',
                    (migration['version'],)
                )
                fecha = self.cursor.fetchone()
                fecha_str = f" ({fecha[0]})" if fecha else ""
            else:
                status = "⏳ Pendiente"
                fecha_str = ""
            
            print(f"{migration['version']:03d} | {status:12} | {migration['nombre']}{fecha_str}")
        
        print("=" * 70)
    
    def close(self):
        self.conn.close()


def main():
    # Obtener DATA_DIR de variable de entorno (sin valor por defecto)
    DATA_DIR = os.getenv('DATA_DIR')
    if not DATA_DIR:
        print(f"✗ ERROR: La variable de entorno DATA_DIR no está definida")
        sys.exit(1)
    
    DB_PATH = os.path.join(DATA_DIR, 'kashflow.db')
    
    # Verificar si existe la base de datos
    if not os.path.exists(DB_PATH):
        print(f"✗ ERROR: La base de datos '{DB_PATH}' no existe")
        sys.exit(1)
    
    # Crear manager
    manager = MigrationManager(DB_PATH)
    
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