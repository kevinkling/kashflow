const repo = require('./movimientos.repository');

function mapearMovimiento(m) {
  return {
    id: m.id,
    fecha: m.fecha_hora,
    descripcion: m.descripcion,
    account_id: m.cuenta_id,
    banco: m.cuenta_alias || m.cuenta,
    banco_nombre: m.cuenta,
    banco_color: m.cuenta_color || '#6c757d',
    banco_destino: m.banco_destino || null,
    cuenta_origen_id: m.cuenta_origen_id || null,
    cuenta_destino_id: m.cuenta_destino_id || null,
    categoria_id: m.categoria_id || null,
    transferencia_id: m.transferencia_id || null,
    monto: m.monto_con_signo,
    debeHaber: m.tipo
  };
}

async function listar() {
  const rows = await repo.consultarTodasLasTransacciones();
  return (rows || []).map(mapearMovimiento);
}

async function crear({ cuenta_id, tipo, monto, descripcion, categoria_id }) {
  if (!cuenta_id || !tipo || !monto || !descripcion) {
    const err = new Error('cuenta_id, tipo, monto y descripcion son requeridos');
    err.status = 400;
    throw err;
  }
  return repo.registrarTransaccion(cuenta_id, tipo, monto, descripcion, null, categoria_id || null);
}

async function transferir({ cuenta_origen_id, cuenta_destino_id, monto, descripcion }) {
  return repo.registrarTransferencia(cuenta_origen_id, cuenta_destino_id, monto, descripcion || 'Transferencia');
}

function requiredPayload(body) {
  const cuenta_id = Number(body.cuenta_id);
  const monto = Number(body.monto);
  const descripcion = (body.descripcion || '').trim();
  if (!cuenta_id || !monto || !descripcion) {
    const err = new Error('cuenta_id, tipo, monto y descripcion son requeridos');
    err.status = 400;
    throw err;
  }
  return {
    cuenta_id,
    monto,
    descripcion,
    categoria_id: body.categoria_id || null,
    fecha: body.fecha || null
  };
}

async function actualizar(id, body) {
  const row = await repo.obtenerPorId(id);
  if (!row) {
    const err = new Error('Transacción no encontrada');
    err.status = 404;
    throw err;
  }
  const base = requiredPayload(body);
  const esTransfer = body.tipo === 'transferencia' || body.cuenta_destino_id;
  if (esTransfer) {
    const dest = Number(body.cuenta_destino_id);
    if (!dest || dest === base.cuenta_id) {
      const err = new Error('La cuenta destino debe ser distinta a la de origen');
      err.status = 400;
      throw err;
    }
    return repo.guardarComoTransferencia(id, {
      cuenta_origen_id: base.cuenta_id,
      cuenta_destino_id: dest,
      monto: base.monto,
      descripcion: base.descripcion,
      fecha: base.fecha,
      categoria_id: base.categoria_id
    });
  }

  const payload = {
    ...base,
    tipo: body.tipo === 'debe' ? 'debe' : 'haber'
  };
  if (row.transferencia_id) {
    return repo.convertirTransferenciaAMovimiento(id, payload);
  }
  return repo.actualizarTransaccion(id, payload);
}

async function eliminar(id) {
  return repo.eliminarTransaccion(id);
}

module.exports = { listar, crear, transferir, actualizar, eliminar };
