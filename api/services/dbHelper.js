const pool = require('./db');
const { getFormattedDate } = require('./utils');
const { fechaVencimientoMensual, periodoYYYYMM, calcularProyeccionSimulada } = require('./planningLogic');

// ============================================================================
// FUNCIONES DE USUARIOS
// ============================================================================

/**
 * Obtener o crear un usuario por telegram_user_id
 */
async function obtenerOCrearUsuario(telegramUserId, nombre) {
  try {
    // Verificar si el usuario ya existe
    let result = await pool.query(
      'SELECT id FROM usuarios WHERE telegram_user_id = ?',
      [telegramUserId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Si no existe, crearlo
    await pool.query(
      'INSERT INTO usuarios (telegram_user_id, nombre) VALUES (?, ?)',
      [telegramUserId, nombre]
    );

    // Obtener el ID del nuevo usuario
    result = await pool.query(
      'SELECT id FROM usuarios WHERE telegram_user_id = ?',
      [telegramUserId]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('❌ Error al obtener/crear usuario:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE CUENTAS
// ============================================================================

/**
 * Obtener cuenta por alias (case-insensitive)
 */
async function obtenerCuentaPorAlias(alias) {
  try {
    const result = await pool.query(
      'SELECT * FROM cuentas WHERE UPPER(alias) = UPPER(?) AND activa = 1',
      [alias]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error al obtener cuenta:', error);
    throw error;
  }
}

/**
 * Obtener todas las cuentas activas de un usuario
 */
async function obtenerCuentasUsuario(usuarioId) {
  try {
    const result = await pool.query(
      'SELECT * FROM cuentas WHERE usuario_id = ? AND activa = 1 ORDER BY nombre',
      [usuarioId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error al obtener cuentas:', error);
    throw error;
  }
}

/**
 * Crear una nueva cuenta
 */
async function crearCuenta(usuarioId, nombre, alias, color = '#4CAF50', moneda = 'ARS') {
  try {
    await pool.query(
      'INSERT INTO cuentas (usuario_id, nombre, alias, color, moneda) VALUES (?, ?, ?, ?, ?)',
      [usuarioId, nombre, alias, color, moneda]
    );
    console.log(`✅ Cuenta "${nombre}" creada exitosamente`);
  } catch (error) {
    console.error('❌ Error al crear cuenta:', error);
    throw error;
  }
}

/**
 * Obtener todas las cuentas con sus saldos (SOLO ACTIVAS - Para vista general)
 */
async function obtenerTodasLasCuentasConSaldos() {
  try {
    const result = await pool.query(
      'SELECT * FROM vista_saldos_cuentas ORDER BY saldo_actual DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error al obtener cuentas con saldos:', error);
    throw error;
  }
}

/**
 * Obtener todas (activas e inactivas) las cuentas con sus saldos
 */
async function obtenerTodasLasCuentasGestion() {
  try {
    const result = await pool.query(
      'SELECT * FROM vista_saldos_cuentas_admin ORDER BY activa DESC, cuenta ASC'
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error al obtener cuentas gestión:', error);
    throw error;
  }
}

/**
 * Obtener cuenta por ID
 */
async function obtenerCuentaPorId(id) {
  try {
    const result = await pool.query(
      'SELECT * FROM cuentas WHERE id = ?',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error al obtener cuenta por ID:', error);
    throw error;
  }
}

/**
 * Actualizar una cuenta existente
 */
async function actualizarCuenta(id, { nombre, alias, color, moneda, activa }) {
  try {
    const updates = [];
    const values = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      values.push(nombre);
    }
    if (alias !== undefined) {
      updates.push('alias = ?');
      values.push(alias);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (moneda !== undefined) {
      updates.push('moneda = ?');
      values.push(moneda);
    }
    if (activa !== undefined) {
      updates.push('activa = ?');
      values.push(activa ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    values.push(id);

    await pool.query(
      `UPDATE cuentas SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`✅ Cuenta ID ${id} actualizada exitosamente`);
  } catch (error) {
    console.error('❌ Error al actualizar cuenta:', error);
    throw error;
  }
}


/**
 * Alternar estado de cuenta (Activa/Inactiva)
 */
async function toggleCuentaActiva(id) {
  try {
    // Obtener estado actual
    const cuenta = await obtenerCuentaPorId(id);
    if (!cuenta) throw new Error('Cuenta no encontrada');

    const nuevoEstado = cuenta.activa ? 0 : 1;

    await pool.query(
      'UPDATE cuentas SET activa = ? WHERE id = ?',
      [nuevoEstado, id]
    );

    console.log(`✅ Cuenta ID ${id} cambiada a estado ${nuevoEstado}`);
    return nuevoEstado === 1;
  } catch (error) {
    console.error('❌ Error al alternar estado de cuenta:', error);
    throw error;
  }
}

/**
 * Validar que un alias sea único (excluyendo una cuenta específica)
 */
async function validarAliasUnico(alias, cuentaIdExcluir = null) {
  try {
    let query = 'SELECT id FROM cuentas WHERE UPPER(alias) = UPPER(?)';
    const params = [alias];

    if (cuentaIdExcluir !== null) {
      query += ' AND id != ?';
      params.push(cuentaIdExcluir);
    }

    const result = await pool.query(query, params);
    return result.rows.length === 0; // true si es único
  } catch (error) {
    console.error('❌ Error al validar alias:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE TRANSACCIONES
// ============================================================================

/**
 * Registrar una transacción individual (ingreso o egreso)
 * @param {number} cuentaId - ID de la cuenta
 * @param {string} tipo - 'debe' (ingreso) o 'haber' (egreso)
 * @param {number} monto - Monto siempre positivo
 * @param {string} descripcion - Descripción de la transacción
 * @param {string} notas - Notas opcionales
 * @param {number} telegramMessageId - ID del mensaje de Telegram (opcional)
 */
async function registrarTransaccion(cuentaId, tipo, monto, descripcion, notas = null, telegramMessageId = null) {
  try {
    const montoAbs = Math.abs(monto);
    const signo = tipo === 'debe' ? 1 : -1;

    const insert = await pool.query(
      `INSERT INTO transacciones 
        (cuenta_id, tipo, signo, monto, descripcion, notas, telegram_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cuentaId, tipo, signo, montoAbs, descripcion, notas, telegramMessageId]
    );

    console.log(`✅ Transacción registrada: ${tipo} de $${montoAbs}`);
    return insert.lastInsertRowid;
  } catch (error) {
    console.error('❌ Error al registrar transacción:', error);
    throw error;
  }
}

/**
 * Registrar una transferencia entre cuentas
 * Crea automáticamente 2 transacciones vinculadas
 */
async function registrarTransferencia(cuentaOrigenId, cuentaDestinoId, monto, descripcion) {
  try {
    const montoAbs = Math.abs(monto);

    // 1. Crear el registro de transferencia
    await pool.query(
      `INSERT INTO transferencias 
        (cuenta_origen_id, cuenta_destino_id, monto, descripcion)
       VALUES (?, ?, ?, ?)`,
      [cuentaOrigenId, cuentaDestinoId, montoAbs, descripcion]
    );

    // 2. Obtener el ID de la transferencia recién creada
    const result = await pool.query(
      'SELECT id FROM transferencias ORDER BY id DESC LIMIT 1'
    );
    const transferenciaId = result.rows[0].id;

    // 3. Crear transacción HABER (salida) en cuenta origen
    await pool.query(
      `INSERT INTO transacciones 
        (cuenta_id, tipo, signo, monto, descripcion, transferencia_id)
       VALUES (?, 'haber', -1, ?, ?, ?)`,
      [cuentaOrigenId, montoAbs, descripcion, transferenciaId]
    );

    // 4. Crear transacción DEBE (entrada) en cuenta destino
    await pool.query(
      `INSERT INTO transacciones 
        (cuenta_id, tipo, signo, monto, descripcion, transferencia_id)
       VALUES (?, 'debe', 1, ?, ?, ?)`,
      [cuentaDestinoId, montoAbs, descripcion, transferenciaId]
    );

    console.log(`✅ Transferencia registrada: $${montoAbs} de cuenta ${cuentaOrigenId} a ${cuentaDestinoId}`);
  } catch (error) {
    console.error('❌ Error al registrar transferencia:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE CONSULTA
// ============================================================================

/**
 * Consultar el último depósito de sueldo
 */
async function consultarUltimoDepositoSueldo() {
  try {
    const result = await pool.query(
      `SELECT monto
       FROM transacciones
       WHERE tipo = 'debe' AND descripcion LIKE '%sueldo%'
       ORDER BY fecha_hora DESC
       LIMIT 1`
    );

    return result.rows[0] ? Number(result.rows[0].monto) : 0;
  } catch (error) {
    console.error('❌ Error al consultar último depósito:', error);
    throw error;
  }
}

/**
 * Consultar saldos de todas las cuentas activas
 */
async function consultarSaldosPorCuenta() {
  try {
    const result = await pool.query(
      `SELECT * FROM vista_saldos_cuentas ORDER BY cuenta`
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar saldos:', error);
    throw error;
  }
}

/**
 * Consultar transacciones de hoy
 */
async function consultarRegistrosHoy() {
  try {
    const result = await pool.query(
      `SELECT 
        t.id,
        t.fecha_hora,
        c.nombre as cuenta,
        c.alias as cuenta_alias,
        t.tipo,
        t.monto,
        t.descripcion,
        t.notas,
        CASE WHEN t.transferencia_id IS NOT NULL THEN 'Transferencia' ELSE 'Normal' END as es_transferencia
       FROM transacciones t
       JOIN cuentas c ON t.cuenta_id = c.id
       WHERE DATE(t.fecha_hora) = DATE('now', 'localtime')
       ORDER BY t.fecha_hora DESC`
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar registros de hoy:', error);
    throw error;
  }
}

/**
 * Consultar todas las transacciones
 */
async function consultarTodasLasTransacciones() {
  try {
    const result = await pool.query(
      `SELECT * FROM vista_transacciones_completas`
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar transacciones:', error);
    throw error;
  }
}

/**
 * Calcular saldo de una cuenta específica
 */
async function calcularSaldoCuenta(cuentaId) {
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(monto * signo), 0) as saldo
       FROM transacciones
       WHERE cuenta_id = ?`,
      [cuentaId]
    );

    return Number(result.rows[0].saldo);
  } catch (error) {
    console.error('❌ Error al calcular saldo:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
// ============================================================================
// FUNCIONES DE PLANIFICACIÓN (compromisos e instancias)
// ============================================================================

/**
 * Crear un compromiso (recurrente o único)
 */
async function crearCompromiso(usuarioId, nombre, tipo, frecuencia, diaVencimiento, importeEstimado, cuentaSugeridaId) {
  try {
    const insert = await pool.query(
      `INSERT INTO compromisos
        (usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, nombre, tipo, frecuencia, diaVencimiento, importeEstimado, cuentaSugeridaId]
    );
    return insert.lastInsertRowid;
  } catch (error) {
    console.error('❌ Error al crear compromiso:', error);
    throw error;
  }
}

async function obtenerCompromisosUsuario(usuarioId) {
  try {
    const result = await pool.query(
      `SELECT * FROM compromisos WHERE usuario_id = ? ORDER BY nombre`,
      [usuarioId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error al obtener compromisos:', error);
    throw error;
  }
}

async function crearInstanciaCompromiso(compromisoId, usuarioId, descripcion, periodo, fechaVencimiento, importeEsperado, cuentaPagoId) {
  try {
    const insert = await pool.query(
      `INSERT INTO instancias_compromiso
        (compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, cuenta_pago_id, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [compromisoId, usuarioId, descripcion, periodo, fechaVencimiento, importeEsperado, cuentaPagoId]
    );
    return insert.lastInsertRowid;
  } catch (error) {
    console.error('❌ Error al crear instancia de compromiso:', error);
    throw error;
  }
}

async function obtenerInstanciasPorPeriodo(desde, hasta) {
  try {
    const result = await pool.query(
      `SELECT * FROM instancias_compromiso WHERE DATE(fecha_vencimiento) BETWEEN DATE(?) AND DATE(?) ORDER BY fecha_vencimiento`,
      [desde, hasta]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error al obtener instancias por periodo:', error);
    throw error;
  }
}

async function confirmarInstancia(instanciaId, cuentaPagoId, montoFinal, descripcion) {
  try {
    const transaccionId = pool.withTransaction(() => {
      const inst = pool.raw.prepare(
        `SELECT ic.*, c.tipo AS compromiso_tipo
         FROM instancias_compromiso ic
         LEFT JOIN compromisos c ON ic.compromiso_id = c.id
         WHERE ic.id = ?`
      ).get(instanciaId);
      if (!inst) throw new Error('Instancia no encontrada');
      if (inst.estado === 'pagado') throw new Error('La instancia ya está pagada');
      const transTipo = inst.compromiso_tipo === 'ingreso' ? 'debe' : 'haber';
      const info = pool.raw.prepare(
        `INSERT INTO transacciones (cuenta_id, tipo, signo, monto, descripcion)
         VALUES (?, ?, ?, ?, ?)`
      ).run(cuentaPagoId, transTipo, transTipo === 'debe' ? 1 : -1, Math.abs(montoFinal), descripcion);
      pool.raw.prepare(
        `UPDATE instancias_compromiso SET transaccion_id = ?, importe_final = ?, estado = 'pagado', fecha_modificacion = datetime('now', 'localtime') WHERE id = ?`
      ).run(info.lastInsertRowid, montoFinal, instanciaId);
      return info.lastInsertRowid;
    });
    return transaccionId;
  } catch (error) {
    console.error('❌ Error al confirmar instancia:', error);
    throw error;
  }
}

async function generarInstanciasDelPeriodo(usuarioId, year, month) {
  const periodo = periodoYYYYMM(year, month);
  const compromisos = await obtenerCompromisosUsuario(usuarioId);
  const creadas = [];
  for (const c of compromisos) {
    if (!c.activa) continue;
    if (c.frecuencia !== 'mensual') continue;
    const fecha = fechaVencimientoMensual(year, month, c.dia_vencimiento);
    const existing = await pool.query(
      `SELECT id FROM instancias_compromiso WHERE compromiso_id = ? AND periodo = ?`,
      [c.id, periodo]
    );
    if (existing.rows.length) continue;
    const id = await crearInstanciaCompromiso(
      c.id,
      usuarioId,
      c.nombre,
      periodo,
      fecha,
      c.importe_estimado,
      c.cuenta_sugerida_id
    );
    creadas.push(id);
  }
  return creadas;
}

async function obtenerAgenda(desde, hasta) {
  const result = await pool.query(
    `SELECT ic.*, c.nombre AS compromiso_nombre, c.tipo AS compromiso_tipo, c.frecuencia
     FROM instancias_compromiso ic
     LEFT JOIN compromisos c ON ic.compromiso_id = c.id
     WHERE DATE(ic.fecha_vencimiento) BETWEEN DATE(?) AND DATE(?)
     ORDER BY ic.fecha_vencimiento`,
    [desde, hasta]
  );
  return result.rows;
}

async function crearTarjeta(usuarioId, nombre, alias, diaCierre, diaVencimiento, cuentaPagoId) {
  const insert = await pool.query(
    `INSERT INTO tarjetas (usuario_id, nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, nombre, alias, diaCierre, diaVencimiento, cuentaPagoId]
  );
  return insert.lastInsertRowid;
}

async function obtenerTarjetasUsuario(usuarioId) {
  const result = await pool.query(
    `SELECT * FROM tarjetas WHERE usuario_id = ? ORDER BY nombre`,
    [usuarioId]
  );
  return result.rows;
}

async function registrarConsumoTarjeta(tarjetaId, descripcion, monto, fechaCompra, cuotas) {
  const insert = await pool.query(
    `INSERT INTO consumos_tarjeta (tarjeta_id, descripcion, monto, fecha_compra, cuotas)
     VALUES (?, ?, ?, ?, ?)`,
    [tarjetaId, descripcion, monto, fechaCompra, cuotas]
  );
  return insert.lastInsertRowid;
}

async function obtenerConsumosTarjeta(tarjetaId) {
  const result = await pool.query(
    `SELECT * FROM consumos_tarjeta WHERE tarjeta_id = ? ORDER BY fecha_compra DESC`,
    [tarjetaId]
  );
  return result.rows;
}

async function generarResumenTarjeta(tarjetaId, usuarioId, year, month) {
  const tarjetaRes = await pool.query('SELECT * FROM tarjetas WHERE id = ?', [tarjetaId]);
  const tarjeta = tarjetaRes.rows[0];
  if (!tarjeta) throw new Error('Tarjeta no encontrada');
  const periodo = periodoYYYYMM(year, month);
  const fecha = fechaVencimientoMensual(year, month, tarjeta.dia_vencimiento);
  const cierre = Number(tarjeta.dia_cierre);
  const start = new Date(year, month - 2, cierre + 1);
  const end = new Date(year, month - 1, cierre);
  const desde = start.toISOString().slice(0, 10);
  const hasta = end.toISOString().slice(0, 10);
  const consumos = await pool.query(
    `SELECT COALESCE(SUM(monto), 0) AS total FROM consumos_tarjeta
     WHERE tarjeta_id = ? AND DATE(fecha_compra) BETWEEN DATE(?) AND DATE(?) AND instancia_resumen_id IS NULL`,
    [tarjetaId, desde, hasta]
  );
  const total = Number(consumos.rows[0].total || 0);
  const instanciaId = await crearInstanciaCompromiso(
    null,
    usuarioId,
    `Resumen ${tarjeta.nombre} ${periodo}`,
    periodo,
    fecha,
    total || 0,
    tarjeta.cuenta_pago_id
  );
  await pool.query(
    `UPDATE consumos_tarjeta SET instancia_resumen_id = ?
     WHERE tarjeta_id = ? AND DATE(fecha_compra) BETWEEN DATE(?) AND DATE(?) AND instancia_resumen_id IS NULL`,
    [instanciaId, tarjetaId, desde, hasta]
  );
  return { instanciaId, total, desde, hasta };
}

// ============================================================================
// FUNCIONES DE SIMULACION (escenarios)
// ============================================================================

async function crearEscenario(usuarioId, nombre) {
  try {
    const insert = await pool.query(
      `INSERT INTO escenarios_simulacion (usuario_id, nombre) VALUES (?, ?)`,
      [usuarioId, nombre]
    );
    return insert.lastInsertRowid;
  } catch (error) {
    console.error('❌ Error al crear escenario:', error);
    throw error;
  }
}

async function obtenerEscenariosUsuario(usuarioId) {
  try {
    const res = await pool.query(
      `SELECT * FROM escenarios_simulacion WHERE usuario_id = ? ORDER BY fecha_creacion DESC`,
      [usuarioId]
    );
    return res.rows;
  } catch (error) {
    console.error('❌ Error al obtener escenarios:', error);
    throw error;
  }
}

async function agregarAjusteEscenario(escenarioId, tipo, instanciaCompromisoId, descripcion, fechaEstimada, montoSimulado, signo) {
  try {
    const idRes = await pool.query(
      `INSERT INTO escenario_ajustes (escenario_id, tipo, instancia_compromiso_id, descripcion, fecha_estimada, monto_simulado, signo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [escenarioId, tipo, instanciaCompromisoId || null, descripcion || null, fechaEstimada || null, montoSimulado, signo]
    );
    return idRes.lastInsertRowid;
  } catch (error) {
    console.error('❌ Error al agregar ajuste al escenario:', error);
    throw error;
  }
}

async function obtenerAjustesEscenario(escenarioId) {
  try {
    const res = await pool.query(
      `SELECT * FROM escenario_ajustes WHERE escenario_id = ? ORDER BY id`,
      [escenarioId]
    );
    return res.rows;
  } catch (error) {
    console.error('❌ Error al obtener ajustes del escenario:', error);
    throw error;
  }
}

/**
 * Calcular el saldo proyectado simulado para un escenario en un rango de fechas.
 * Estrategia:
 *  - Obtener saldo real total (vista_saldos_cuentas)
 *  - Obtener instancias en rango y sumar ingresos/egresos esperados (según compromiso.tipo)
 *  - Aplicar ajustes del escenario: reemplazar importe de instancias ajustadas, sumar líneas libres
 */
async function calcularSaldoSimulado(escenarioId, desde, hasta) {
  try {
    const saldos = await pool.query('SELECT COALESCE(SUM(saldo_actual),0) as total FROM vista_saldos_cuentas');
    const saldoReal = Number(saldos.rows[0].total || 0);

    const instRes = await pool.query(
      `SELECT ic.id, ic.importe_esperado, ic.estado, c.tipo as compromiso_tipo
       FROM instancias_compromiso ic
       LEFT JOIN compromisos c ON ic.compromiso_id = c.id
       WHERE DATE(ic.fecha_vencimiento) BETWEEN DATE(?) AND DATE(?)`,
      [desde, hasta]
    );
    const ajustesRes = await pool.query(
      `SELECT * FROM escenario_ajustes WHERE escenario_id = ?`,
      [escenarioId]
    );

    return calcularProyeccionSimulada({
      saldoReal,
      instancias: instRes.rows,
      ajustes: ajustesRes.rows
    });
  } catch (error) {
    console.error('❌ Error al calcular saldo simulado:', error);
    throw error;
  }
}

// ============================================================================
module.exports = {
  // Usuarios
  obtenerOCrearUsuario,

  // Cuentas
  obtenerCuentaPorAlias,
  obtenerCuentasUsuario,
  crearCuenta,
  obtenerTodasLasCuentasConSaldos,
  obtenerTodasLasCuentasGestion,
  obtenerCuentaPorId,
  actualizarCuenta,
  toggleCuentaActiva,
  validarAliasUnico,

  // Transacciones
  registrarTransaccion,
  registrarTransferencia,

  // Consultas
  consultarUltimoDepositoSueldo,
  consultarSaldosPorCuenta,
  consultarRegistrosHoy,
  consultarTodasLasTransacciones,
  calcularSaldoCuenta,
 
  // Planificación
  crearCompromiso,
  obtenerCompromisosUsuario,
  crearInstanciaCompromiso,
  obtenerInstanciasPorPeriodo,
  confirmarInstancia,
  generarInstanciasDelPeriodo,
  obtenerAgenda,
  crearTarjeta,
  obtenerTarjetasUsuario,
  registrarConsumoTarjeta,
  obtenerConsumosTarjeta,
  generarResumenTarjeta,
  // Simulacion
  crearEscenario,
  obtenerEscenariosUsuario,
  agregarAjusteEscenario,
  obtenerAjustesEscenario,
  calcularSaldoSimulado,

  // Compatibilidad con código anterior (deprecado)
  registrarMovimiento: registrarTransaccion,
  consultarSaldosPorBanco: consultarSaldosPorCuenta,
  consultarTodosLosMovimientos: consultarTodasLasTransacciones
};