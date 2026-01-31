const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || '/app/data';
const dbPath = path.join(dataDir, 'kashflow.db');

function initializeDataDirectory() {
  if (!fs.existsSync(dataDir)) {
    console.log(`📁 Creando directorio: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Verificar permisos de escritura
  try {
    fs.accessSync(dataDir, fs.constants.W_OK);
    console.log(`✅ Directorio ${dataDir} es escribible`);
  } catch (err) {
    console.error(`❌ No se puede escribir en ${dataDir}:`, err.message);
    process.exit(1);
  }
}

// CONFIGURACIÓN DE SQLITE
function configureSQLite(db) {
  db.pragma('journal_mode = DELETE');
  db.pragma('synchronous = FULL');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
  
  console.log('✅ SQLite configurado en DELETE mode (optimizado para Docker)');
}

initializeDataDirectory();

const db = new Database(dbPath, { 
  verbose: process.env.NODE_ENV === 'development' ? console.log : null,
  fileMustExist: false
});

configureSQLite(db);

console.log('✅ Conectado a SQLite:', dbPath);

const pool = {
  /**
   * Ejecuta una query SQL
   * @param {string} sql - Query SQL con placeholders $1, $2, etc.
   * @param {Array} params - Parámetros para la query
   * @returns {Promise<{rows: Array, rowCount: number}>}
   */
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      try {
        // Convertir placeholders de PostgreSQL ($1, $2) a SQLite (?)
        const sqliteSql = sql.replace(/\$(\d+)/g, '?');
        const stmt = db.prepare(sqliteSql);

        // Detectar tipo de query
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

        if (isSelect) {
          const rows = stmt.all(...params);
          resolve({ rows, rowCount: rows.length });
        } else {
          const info = stmt.run(...params);
          resolve({ 
            rows: [], 
            rowCount: info.changes,
            lastInsertRowid: info.lastInsertRowid 
          });
        }
      } catch (error) {
        console.error('❌ Error en query SQL:', error.message);
        console.error('   SQL:', sql);
        console.error('   Params:', params);
        reject(error);
      }
    });
  },

  /**
   * Cierra la conexión a la base de datos
   */
  close: () => {
    db.close();
    console.log('🔒 Conexión a SQLite cerrada');
  }
};

// Cerrar conexión al terminar el proceso
process.on('exit', () => pool.close());
process.on('SIGINT', () => {
  pool.close();
  process.exit(0);
});

module.exports = pool;