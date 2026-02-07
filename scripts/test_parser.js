/**
 * Script de prueba para el Transaction Parser
 * Úsalo para probar el parser sin necesidad de enviar mensajes de voz reales
 * 
 * Ejecutar: node scripts/test_parser.js
 */

const transactionParser = require('../api/services/transactionParser');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Casos de prueba
const testCases = [
  // Ingresos
  {
    nombre: 'Ingreso simple',
    texto: 'Ingreso de 50000 en efectivo',
    esperado: { tipo: 'ingreso', monto: 50000 }
  },
  {
    nombre: 'Cobro con alias',
    texto: 'Cobré 1500 pesos en Mercado Pago',
    esperado: { tipo: 'ingreso', monto: 1500 }
  },
  {
    nombre: 'Depósito en banco',
    texto: 'Depósito de 80000 en banco',
    esperado: { tipo: 'ingreso', monto: 80000 }
  },
  {
    nombre: 'Sueldo',
    texto: 'Recibí sueldo de 150000 en banco',
    esperado: { tipo: 'ingreso', monto: 150000 }
  },

  // Egresos
  {
    nombre: 'Gasto simple',
    texto: 'Gasto de 2500 en supermercado con tarjeta',
    esperado: { tipo: 'egreso', monto: 2500 }
  },
  {
    nombre: 'Pago de servicio',
    texto: 'Pagué 1000 pesos de uber en efectivo',
    esperado: { tipo: 'egreso', monto: 1000 }
  },
  {
    nombre: 'Compra online',
    texto: 'Compra de 15000 en Mercado Pago',
    esperado: { tipo: 'egreso', monto: 15000 }
  },

  // Transferencias
  {
    nombre: 'Transferencia simple',
    texto: 'Transferencia de 5000 de banco a Mercado Pago',
    esperado: { tipo: 'transferencia', monto: 5000 }
  },
  {
    nombre: 'Mover dinero',
    texto: 'Pasé 3000 pesos de efectivo a banco',
    esperado: { tipo: 'transferencia', monto: 3000 }
  },
  {
    nombre: 'Transferencia desde-hacia',
    texto: 'Moví 10000 desde tarjeta a Mercado Pago',
    esperado: { tipo: 'transferencia', monto: 10000 }
  },

  // Casos especiales
  {
    nombre: 'Monto con punto de miles',
    texto: 'Gasto de 1.500 pesos en supermercado',
    esperado: { tipo: 'egreso', monto: 1500 }
  },
  {
    nombre: 'Monto con coma decimal',
    texto: 'Ingreso de 1500,50 en banco',
    esperado: { tipo: 'ingreso', monto: 1500.50 }
  },
  {
    nombre: 'Monto con símbolo $',
    texto: 'Gasté $2500 en efectivo',
    esperado: { tipo: 'egreso', monto: 2500 }
  },
];

function runTests() {
  console.log(colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.cyan + '  🧪 PRUEBAS DEL TRANSACTION PARSER' + colors.reset);
  console.log(colors.cyan + '═'.repeat(80) + colors.reset);
  console.log();

  let passed = 0;
  let failed = 0;

  testCases.forEach((test, index) => {
    console.log(colors.blue + `\n[${index + 1}/${testCases.length}] ${test.nombre}` + colors.reset);
    console.log(colors.yellow + `   Texto: "${test.texto}"` + colors.reset);

    const resultado = transactionParser.parse(test.texto);

    // Verificar tipo
    const tipoMatch = resultado.tipo === test.esperado.tipo;
    // Verificar monto
    const montoMatch = resultado.monto === test.esperado.monto;
    // Verificar validez
    const esValido = resultado.valido;

    if (tipoMatch && montoMatch && esValido) {
      console.log(colors.green + '   ✅ PASÓ' + colors.reset);
      console.log(`   Tipo: ${resultado.tipo}, Monto: $${resultado.monto}`);
      if (resultado.cuenta) console.log(`   Cuenta: ${resultado.cuenta}`);
      if (resultado.cuentaOrigen) console.log(`   Origen: ${resultado.cuentaOrigen} → Destino: ${resultado.cuentaDestino}`);
      console.log(`   Descripción: ${resultado.descripcion}`);
      passed++;
    } else {
      console.log(colors.red + '   ❌ FALLÓ' + colors.reset);
      if (!tipoMatch) {
        console.log(`   Tipo esperado: ${test.esperado.tipo}, obtenido: ${resultado.tipo}`);
      }
      if (!montoMatch) {
        console.log(`   Monto esperado: ${test.esperado.monto}, obtenido: ${resultado.monto}`);
      }
      if (!esValido) {
        console.log(`   Errores: ${resultado.errores.join(', ')}`);
      }
      failed++;
    }
  });

  // Resumen
  console.log();
  console.log(colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.cyan + '  📊 RESUMEN' + colors.reset);
  console.log(colors.cyan + '═'.repeat(80) + colors.reset);
  console.log();
  console.log(`   Total de pruebas: ${testCases.length}`);
  console.log(colors.green + `   ✅ Pasaron: ${passed}` + colors.reset);
  console.log(colors.red + `   ❌ Fallaron: ${failed}` + colors.reset);
  console.log();

  if (failed === 0) {
    console.log(colors.green + '   🎉 ¡Todas las pruebas pasaron!' + colors.reset);
  } else {
    console.log(colors.yellow + '   ⚠️  Algunas pruebas fallaron. Revisa el parser.' + colors.reset);
  }

  console.log(colors.cyan + '═'.repeat(80) + colors.reset);
  console.log();
}

// Función para probar manualmente un texto
function testManual(texto) {
  console.log(colors.cyan + '\n🔍 PRUEBA MANUAL' + colors.reset);
  console.log(colors.yellow + `Texto: "${texto}"` + colors.reset);
  
  const resultado = transactionParser.parse(texto);
  
  console.log('\n📋 Resultado:');
  console.log(JSON.stringify(resultado, null, 2));
  console.log('\n📝 Resumen:');
  console.log(transactionParser.generarResumen(resultado));
}

// Ejecutar
if (process.argv.length > 2) {
  // Si se proporciona un argumento, usarlo como prueba manual
  const textoManual = process.argv.slice(2).join(' ');
  testManual(textoManual);
} else {
  // Si no, ejecutar todas las pruebas
  runTests();
}

// Mostrar ejemplos de uso
console.log(colors.cyan + 'ℹ️  Uso:' + colors.reset);
console.log('   node scripts/test_parser.js                    # Ejecutar todas las pruebas');
console.log('   node scripts/test_parser.js "tu texto aquí"    # Probar un texto específico');
console.log();
