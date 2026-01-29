const pool = require('./db');
const { getFormattedDate } = require('./utils');

// Helper para obtener banco_id por nombre
async function obtenerBancoId(nombreBanco) {
  const result = await pool.query(
    'SELECT id FROM bancos WHERE nombre = $1',
    [nombreBanco]
  );
  return result.rows[0]?.id || null;
}

async function registrarMovimiento(tipo, banco, descripcion, monto, banco_destino = null) {
  try {
    const fecha = getFormattedDate();

    // Obtener IDs de los bancos
    const bancoId = await obtenerBancoId(banco);
    const bancoDestinoId = banco_destino ? await obtenerBancoId(banco_destino) : null;

    if (!bancoId) {
      throw new Error(`Banco "${banco}" no encontrado`);
    }

    // Determinar debe/haber según el tipo de movimiento
    // Convertir monto a positivo siempre
    const montoAbs = Math.abs(monto);
    let debeHaber;
    
    if (tipo === 'ingreso' || tipo === 'deposito' || tipo === 'deposito de sueldo') {
      debeHaber = 'debe';
    } else if (tipo === 'egreso' || tipo === 'gasto' || tipo === 'retiro') {
      debeHaber = 'haber';
    } else if (tipo === 'transferencia') {
      // Para transferencias: salida es haber, entrada es debe
      debeHaber = banco_destino ? 'haber' : 'debe';
    } else {
      // Por defecto, si el monto es positivo es debe, si es negativo es haber
      debeHaber = monto >= 0 ? 'debe' : 'haber';
    }

    await pool.query(
      `INSERT INTO movimientos (tipo, banco_id, descripcion, monto, banco_destino_id, debeHaber, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tipo, bancoId, descripcion, montoAbs, bancoDestinoId, debeHaber, fecha]
    );

    console.log('✅ Movimiento registrado en PostgreSQL');
  } catch (error) {
    console.error('❌ Error al registrar movimiento:', error);
    throw error;
  }
}

async function consultarUltimoDepositoSueldo() {
  try {
    const result = await pool.query(
      `SELECT monto
       FROM movimientos
       WHERE tipo = 'deposito de sueldo' AND debeHaber = 'debe'
       ORDER BY fecha DESC
       LIMIT 1`
    );

    return result.rows[0] ? Number(result.rows[0].monto) : 0;
  } catch (error) {
    console.error('❌ Error al consultar último depósito:', error);
    throw error;
  }
}

async function consultarSaldosPorBanco() {
  try {
    const result = await pool.query(
      `SELECT 
        b.nombre as banco, 
        SUM(CASE WHEN m.debeHaber = 'debe' THEN m.monto ELSE -m.monto END) AS saldo
       FROM movimientos m
       JOIN bancos b ON m.banco_id = b.id
       GROUP BY b.nombre
       ORDER BY b.nombre`
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar saldos:', error);
    throw error;
  }
}

async function consultarRegistrosHoy() {
  try {
    const fechaHoy = getFormattedDate().split(' ')[0]; // Solo la fecha

    const result = await pool.query(
      `SELECT 
        m.id,
        m.tipo,
        b.nombre as banco,
        COALESCE(b.codigo, b.nombre) as banco_codigo,
        bd.nombre as banco_destino,
        COALESCE(bd.codigo, bd.nombre) as banco_destino_codigo,
        m.descripcion,
        m.monto,
        m.debeHaber,
        TO_CHAR(m.fecha, 'DD/MM/YYYY HH24:MI:SS') as fecha
       FROM movimientos m
       JOIN bancos b ON m.banco_id = b.id
       LEFT JOIN bancos bd ON m.banco_destino_id = bd.id
       WHERE m.fecha::date = $1::date
       ORDER BY m.fecha DESC`,
      [fechaHoy]
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar registros de hoy:', error);
    throw error;
  }
}

async function consultarTodosLosMovimientos() {
  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        COALESCE(b.codigo, b.nombre) as banco, 
        COALESCE(bd.codigo, bd.nombre) as banco_destino,
        m.descripcion, 
        m.monto,
        m.debeHaber,
        TO_CHAR(m.fecha, 'DD/MM/YYYY HH24:MI:SS') as fecha
       FROM movimientos m
       JOIN bancos b ON m.banco_id = b.id
       LEFT JOIN bancos bd ON m.banco_destino_id = bd.id
       ORDER BY m.fecha DESC`
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Error al consultar movimientos:', error);
    throw error;
  }
}

module.exports = { 
  registrarMovimiento, 
  consultarUltimoDepositoSueldo, 
  consultarSaldosPorBanco, 
  consultarRegistrosHoy,
  consultarTodosLosMovimientos
};