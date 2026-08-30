const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const cuentasRepo = require('./cuentas.repository');
const usuariosRepo = require('../usuarios/usuarios.repository');

async function listar(gestion) {
  if (gestion === 'true') return cuentasRepo.obtenerTodasLasCuentasGestion();
  return cuentasRepo.obtenerTodasLasCuentasConSaldos();
}

async function obtener(id) {
  return cuentasRepo.obtenerCuentaPorId(id);
}

async function crear({ usuario_id, nombre, alias, color, moneda }) {
  if (!usuario_id || !nombre || !alias) {
    const err = new Error('Faltan campos requeridos: usuario_id, nombre, alias');
    err.status = 400;
    throw err;
  }
  const aliasUnico = await cuentasRepo.validarAliasUnico(alias);
  if (!aliasUnico) {
    const err = new Error(`El alias "${alias}" ya está en uso`);
    err.status = 400;
    throw err;
  }
  if (color && !HEX_COLOR.test(color)) {
    const err = new Error('El color debe estar en formato hexadecimal (#RRGGBB)');
    err.status = 400;
    throw err;
  }
  const colorFinal = color || '#4CAF50';
  const monedaFinal = moneda || 'ARS';
  await cuentasRepo.crearCuenta(usuario_id, nombre, alias, colorFinal, monedaFinal);
  return { usuario_id, nombre, alias, color: colorFinal, moneda: monedaFinal };
}

async function actualizar(id, { nombre, alias, color, moneda, activa }) {
  const cuentaExistente = await cuentasRepo.obtenerCuentaPorId(id);
  if (!cuentaExistente) {
    const err = new Error('Cuenta no encontrada');
    err.status = 404;
    throw err;
  }
  if (alias && alias !== cuentaExistente.alias) {
    const aliasUnico = await cuentasRepo.validarAliasUnico(alias, id);
    if (!aliasUnico) {
      const err = new Error(`El alias "${alias}" ya está en uso`);
      err.status = 400;
      throw err;
    }
  }
  if (color && !HEX_COLOR.test(color)) {
    const err = new Error('El color debe estar en formato hexadecimal (#RRGGBB)');
    err.status = 400;
    throw err;
  }
  await cuentasRepo.actualizarCuenta(id, { nombre, alias, color, moneda, activa });
  return { id, nombre, alias, color, moneda, activa };
}

async function toggle(id) {
  return cuentasRepo.toggleCuentaActiva(id);
}

async function listarUsuarios() {
  return usuariosRepo.listarUsuarios();
}

module.exports = { listar, obtener, crear, actualizar, toggle, listarUsuarios };
