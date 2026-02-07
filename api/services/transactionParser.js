/**
 * Servicio para parsear transcripciones de voz y extraer información de transacciones
 * Interpreta comandos en lenguaje natural para registrar movimientos financieros
 */

class TransactionParser {
  constructor() {
    // Palabras clave para identificar ingresos
    this.ingresoKeywords = [
      'ingreso', 'deposito', 'depósito', 'cobro', 'cobré', 'gané', 'recibí',
      'entró', 'entrada', 'sueldo', 'salario', 'ganancia', 'venta'
    ];

    // Palabras clave para identificar egresos
    this.egresoKeywords = [
      'gasto', 'gasté', 'egreso', 'pago', 'pagué', 'compra', 'compré',
      'salida', 'salió', 'consumo', 'consumí', 'costo', 'costó'
    ];

    // Palabras clave para transferencias
    this.transferenciaKeywords = [
      'transferencia', 'transferir', 'transferí', 'pasé', 'moví',
      'envié', 'enviar', 'mover', 'pasar'
    ];

    // Preposiciones que indican destino/origen
    this.preposicionesOrigen = ['de', 'desde'];
    this.preposicionesDestino = ['a', 'para', 'hacia', 'en'];

    console.log('📝 TransactionParser inicializado');
  }

  /**
   * Extrae el monto de un texto
   * Soporta formatos: 1000, 1.000, 1,000, $1000, etc.
   */
  extractAmount(text) {
    // Patrones para encontrar montos
    const patterns = [
      /\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g,  // Con separadores de miles
      /\$?\s*(\d+(?:[.,]\d{2})?)/g                      // Sin separadores
    ];

    let amounts = [];

    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      amounts = amounts.concat(
        matches.map(match => {
          // Normalizar el número (eliminar puntos de miles, reemplazar coma decimal por punto)
          let amount = match[1].replace(/\./g, '').replace(',', '.');
          return parseFloat(amount);
        })
      );
    }

    // Filtrar montos válidos y retornar el primero (o el más grande si hay varios)
    const validAmounts = amounts.filter(a => !isNaN(a) && a > 0);
    
    if (validAmounts.length === 0) return null;
    if (validAmounts.length === 1) return validAmounts[0];
    
    // Si hay múltiples montos, retornar el más grande (probablemente es el principal)
    return Math.max(...validAmounts);
  }

  /**
   * Extrae el nombre de la cuenta del texto
   * Busca palabras después de preposiciones como "de", "en", "desde", etc.
   */
  extractAccountName(text, prepositions = null) {
    if (!prepositions) {
      prepositions = [...this.preposicionesOrigen, ...this.preposicionesDestino];
    }

    const textLower = text.toLowerCase();

    for (const prep of prepositions) {
      // Buscar patrón: preposición + palabra(s)
      const pattern = new RegExp(`\\b${prep}\\s+([a-záéíóúñ]+)(?:\\s+([a-záéíóúñ]+))?`, 'i');
      const match = textLower.match(pattern);

      if (match) {
        // Tomar 1 o 2 palabras después de la preposición
        const accountName = match[2] ? `${match[1]} ${match[2]}` : match[1];
        return accountName.trim();
      }
    }

    return null;
  }

  /**
   * Extrae la descripción del movimiento
   * Toma palabras clave y contexto
   */
  extractDescription(text, keywords) {
    const textLower = text.toLowerCase();

    // Buscar la primera palabra clave
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        // Extraer desde la palabra clave hasta el monto o preposición
        const startIdx = textLower.indexOf(keyword);
        let description = text.slice(startIdx);

        // Limpiar: tomar hasta encontrar un monto, preposición o fin
        description = description
          .replace(/\$?\d+([.,]\d+)?/g, '') // Quitar montos
          .replace(/\b(de|en|desde|a|para|hacia)\b.*/gi, '') // Quitar después de preposiciones
          .trim();

        if (description.length > 3) {
          return description.charAt(0).toUpperCase() + description.slice(1);
        }
      }
    }

    // Si no se encontró descripción específica, usar el texto completo limpio
    let cleanText = text
      .replace(/\$?\d+([.,]\d+)?/g, '')
      .replace(/\b(de|en|desde|a|para|hacia)\b.*/gi, '')
      .trim();

    return cleanText || 'Movimiento registrado por voz';
  }

  /**
   * Determina el tipo de transacción (ingreso, egreso, transferencia)
   */
  determineTransactionType(text) {
    const textLower = text.toLowerCase();

    // Verificar transferencias primero (más específico)
    for (const keyword of this.transferenciaKeywords) {
      if (textLower.includes(keyword)) {
        return 'transferencia';
      }
    }

    // Verificar ingresos
    for (const keyword of this.ingresoKeywords) {
      if (textLower.includes(keyword)) {
        return 'ingreso';
      }
    }

    // Verificar egresos
    for (const keyword of this.egresoKeywords) {
      if (textLower.includes(keyword)) {
        return 'egreso';
      }
    }

    return 'desconocido';
  }

  /**
   * Parsea un texto transcrito y extrae información de la transacción
   * @param {string} text - Texto transcrito
   * @returns {Object} - Objeto con información parseada
   */
  parse(text) {
    console.log('📝 Parseando transcripción:', text);

    const tipo = this.determineTransactionType(text);
    const monto = this.extractAmount(text);

    let result = {
      tipo,
      monto,
      textoOriginal: text,
      valido: false,
      errores: []
    };

    if (!monto) {
      result.errores.push('No se pudo identificar el monto');
      return result;
    }

    switch (tipo) {
      case 'transferencia':
        return this.parseTransferencia(text, monto, result);
      
      case 'ingreso':
        return this.parseIngreso(text, monto, result);
      
      case 'egreso':
        return this.parseEgreso(text, monto, result);
      
      default:
        result.errores.push('No se pudo identificar el tipo de transacción');
        return result;
    }
  }

  /**
   * Parsea una transferencia
   */
  parseTransferencia(text, monto, result) {
    // Extraer cuenta origen (después de "de", "desde")
    const cuentaOrigen = this.extractAccountName(text, this.preposicionesOrigen);
    
    // Extraer cuenta destino (después de "a", "para", "hacia")
    const cuentaDestino = this.extractAccountName(text, this.preposicionesDestino);

    result.cuentaOrigen = cuentaOrigen;
    result.cuentaDestino = cuentaDestino;
    result.descripcion = this.extractDescription(text, this.transferenciaKeywords);

    if (!cuentaOrigen) {
      result.errores.push('No se pudo identificar la cuenta origen');
    }
    if (!cuentaDestino) {
      result.errores.push('No se pudo identificar la cuenta destino');
    }

    result.valido = monto && cuentaOrigen && cuentaDestino;

    console.log('📤 Transferencia parseada:', result);
    return result;
  }

  /**
   * Parsea un ingreso
   */
  parseIngreso(text, monto, result) {
    const cuenta = this.extractAccountName(text);
    
    result.cuenta = cuenta;
    result.descripcion = this.extractDescription(text, this.ingresoKeywords);

    if (!cuenta) {
      result.errores.push('No se pudo identificar la cuenta');
    }

    result.valido = monto && cuenta;

    console.log('📥 Ingreso parseado:', result);
    return result;
  }

  /**
   * Parsea un egreso
   */
  parseEgreso(text, monto, result) {
    const cuenta = this.extractAccountName(text);
    
    result.cuenta = cuenta;
    result.descripcion = this.extractDescription(text, this.egresoKeywords);

    if (!cuenta) {
      result.errores.push('No se pudo identificar la cuenta');
    }

    result.valido = monto && cuenta;

    console.log('📤 Egreso parseado:', result);
    return result;
  }

  /**
   * Genera un resumen legible de la transacción parseada
   */
  generarResumen(parsedTransaction) {
    const { tipo, monto, cuenta, cuentaOrigen, cuentaDestino, descripcion, valido, errores } = parsedTransaction;

    if (!valido) {
      return `❌ No se pudo procesar la transacción:\n${errores.join('\n')}`;
    }

    const montoFormateado = `$${monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    switch (tipo) {
      case 'transferencia':
        return `📤 Transferencia de ${montoFormateado}\n` +
               `   De: ${cuentaOrigen}\n` +
               `   A: ${cuentaDestino}\n` +
               `   Descripción: ${descripcion}`;

      case 'ingreso':
        return `📥 Ingreso de ${montoFormateado}\n` +
               `   En: ${cuenta}\n` +
               `   Descripción: ${descripcion}`;

      case 'egreso':
        return `📤 Egreso de ${montoFormateado}\n` +
               `   De: ${cuenta}\n` +
               `   Descripción: ${descripcion}`;

      default:
        return '❓ Transacción desconocida';
    }
  }

  /**
   * Genera ejemplos de uso para el usuario
   */
  static generarEjemplos() {
    return `📝 *Ejemplos de comandos de voz:*

*Ingresos:*
• "Ingreso de 50000 en efectivo"
• "Cobré 1500 pesos en Mercado Pago"
• "Depósito de 80000 en banco"

*Egresos:*
• "Gasto de 2500 en supermercado con tarjeta"
• "Pagué 1000 pesos de uber en efectivo"
• "Compra de 15000 en Mercado Pago"

*Transferencias:*
• "Transferencia de 5000 de banco a Mercado Pago"
• "Pasé 3000 pesos de efectivo a banco"
• "Moví 10000 desde tarjeta a Mercado Pago"

*Consejos:*
✓ Menciona el monto claramente
✓ Indica el tipo de movimiento (ingreso/gasto/transferencia)
✓ Especifica la cuenta (usa el alias de tu cuenta)`;
  }
}

module.exports = new TransactionParser();
