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
    banco_destino: null,
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

async function actualizar(id, payload) {
  return repo.actualizarTransaccion(id, payload);
}

async function eliminar(id) {
  return repo.eliminarTransaccion(id);
}

module.exports = { listar, crear, transferir, actualizar, eliminar };
