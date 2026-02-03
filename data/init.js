#!/usr/bin/env node
/**
 * Script de inicialización de base de datos
 * Ejecutar: node data/init.js [--seed]
 * 
 * --seed: Incluye datos de ejemplo
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'kashflow.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const seedPath = path.join(__dirname, 'seed.sql');

const args = process.argv.slice(2);
const includeSeed = args.includes('--seed');

console.log('🚀 Iniciando configuración de base de datos...\n');

try {
  // Eliminar base de datos existente si existe
  if (fs.existsSync(dbPath)) {
    console.log('⚠️  Base de datos existente encontrada');
    console.log('🗑️  Eliminando base de datos antigua...');
    fs.unlinkSync(dbPath);
  }

  // Crear nueva base de datos
  console.log('📦 Creando nueva base de datos...');
  const db = new Database(dbPath);

  // Ejecutar schema
  console.log('🏗️  Aplicando schema...');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('✅ Schema aplicado correctamente');

  // Ejecutar seed si se solicitó
  if (includeSeed) {
    console.log('\n🌱 Insertando datos de ejemplo...');
    const seed = fs.readFileSync(seedPath, 'utf8');
    db.exec(seed);
    console.log('✅ Datos de ejemplo insertados');
    
    // Mostrar resumen de datos
    console.log('\n📊 Resumen de datos:');
    const usuarios = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    const cuentas = db.prepare('SELECT COUNT(*) as count FROM cuentas').get();
    const transacciones = db.prepare('SELECT COUNT(*) as count FROM transacciones').get();
    const transferencias = db.prepare('SELECT COUNT(*) as count FROM transferencias').get();
    
    console.log(`   👤 Usuarios: ${usuarios.count}`);
    console.log(`   💳 Cuentas: ${cuentas.count}`);
    console.log(`   📝 Transacciones: ${transacciones.count}`);
    console.log(`   🔄 Transferencias: ${transferencias.count}`);
  }

  // Verificar tablas
  console.log('\n📋 Tablas creadas:');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  tables.forEach(table => {
    console.log(`   ✓ ${table.name}`);
  });

  // Verificar vistas
  console.log('\n👁️  Vistas creadas:');
  const views = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='view' 
    ORDER BY name
  `).all();
  
  views.forEach(view => {
    console.log(`   ✓ ${view.name}`);
  });

  db.close();
  
  console.log('\n✨ Base de datos inicializada exitosamente!');
  console.log(`📍 Ubicación: ${dbPath}\n`);

} catch (error) {
  console.error('\n❌ Error durante la inicialización:', error.message);
  process.exit(1);
}
