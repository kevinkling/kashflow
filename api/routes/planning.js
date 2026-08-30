const express = require('express');
const router = express.Router();
const dbHelper = require('../services/dbHelper');

// Crear compromiso
router.post('/compromisos', async (req, res) => {
  try {
    const { usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id } = req.body;
    const id = await dbHelper.crearCompromiso(usuario_id, nombre, tipo, frecuencia, dia_vencimiento, importe_estimado, cuenta_sugerida_id);
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando compromiso' });
  }
});

// Listar compromisos de usuario
router.get('/compromisos', async (req, res) => {
  try {
    const usuarioId = req.query.usuario_id;
    const rows = await dbHelper.obtenerCompromisosUsuario(usuarioId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo compromisos' });
  }
});

// Crear instancia de compromiso
router.post('/instancias', async (req, res) => {
  try {
    const { compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, cuenta_pago_id } = req.body;
    const id = await dbHelper.crearInstanciaCompromiso(compromiso_id, usuario_id, descripcion, periodo, fecha_vencimiento, importe_esperado, cuenta_pago_id);
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando instancia' });
  }
});

// Obtener instancias por periodo
router.get('/instancias', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const rows = await dbHelper.obtenerInstanciasPorPeriodo(desde, hasta);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo instancias' });
  }
});

router.post('/instancias/generar', async (req, res) => {
  try {
    const { usuario_id, year, month } = req.body;
    const now = new Date();
    const creadas = await dbHelper.generarInstanciasDelPeriodo(
      usuario_id,
      year || now.getFullYear(),
      month || (now.getMonth() + 1)
    );
    res.json({ creadas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando instancias' });
  }
});

router.post('/instancias/:id/confirm', async (req, res) => {
  try {
    const transaccionId = await dbHelper.confirmarInstancia(
      req.params.id,
      req.body.cuenta_pago_id,
      req.body.monto_final,
      req.body.descripcion
    );
    res.json({ transaccion_id: transaccionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error confirmando instancia' });
  }
});

router.get('/agenda', async (req, res) => {
  try {
    const rows = await dbHelper.obtenerAgenda(req.query.desde, req.query.hasta);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo agenda' });
  }
});

router.post('/tarjetas', async (req, res) => {
  try {
    const { usuario_id, nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id } = req.body;
    const id = await dbHelper.crearTarjeta(usuario_id, nombre, alias, dia_cierre, dia_vencimiento, cuenta_pago_id);
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando tarjeta' });
  }
});

router.get('/tarjetas', async (req, res) => {
  try {
    const rows = await dbHelper.obtenerTarjetasUsuario(req.query.usuario_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo tarjetas' });
  }
});

router.post('/consumos', async (req, res) => {
  try {
    const { tarjeta_id, descripcion, monto, fecha_compra, cuotas } = req.body;
    const id = await dbHelper.registrarConsumoTarjeta(tarjeta_id, descripcion, monto, fecha_compra, cuotas || '1/1');
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registrando consumo' });
  }
});

router.get('/consumos', async (req, res) => {
  try {
    const rows = await dbHelper.obtenerConsumosTarjeta(req.query.tarjeta_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo consumos' });
  }
});

router.post('/tarjetas/:id/resumen', async (req, res) => {
  try {
    const { usuario_id, year, month } = req.body;
    const now = new Date();
    const result = await dbHelper.generarResumenTarjeta(
      req.params.id,
      usuario_id,
      year || now.getFullYear(),
      month || (now.getMonth() + 1)
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error generando resumen' });
  }
});

// --------------------
// Simulador: escenarios
// --------------------

// Crear escenario
router.post('/escenarios', async (req, res) => {
  try {
    const { usuario_id, nombre } = req.body;
    const id = await dbHelper.crearEscenario(usuario_id, nombre);
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando escenario' });
  }
});

// Listar escenarios de usuario
router.get('/escenarios', async (req, res) => {
  try {
    const usuarioId = req.query.usuario_id;
    const rows = await dbHelper.obtenerEscenariosUsuario(usuarioId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo escenarios' });
  }
});

// Agregar ajuste a escenario
router.post('/escenarios/:id/ajustes', async (req, res) => {
  try {
    const escenarioId = req.params.id;
    const { tipo, instancia_compromiso_id, descripcion, fecha_estimada, monto_simulado, signo } = req.body;
    const id = await dbHelper.agregarAjusteEscenario(escenarioId, tipo, instancia_compromiso_id, descripcion, fecha_estimada, monto_simulado, signo);
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error agregando ajuste' });
  }
});

// Obtener ajustes de escenario
router.get('/escenarios/:id/ajustes', async (req, res) => {
  try {
    const escenarioId = req.params.id;
    const rows = await dbHelper.obtenerAjustesEscenario(escenarioId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo ajustes' });
  }
});

// Calcular saldo simulado para escenario en rango
router.get('/escenarios/:id/saldo-simulado', async (req, res) => {
  try {
    const escenarioId = req.params.id;
    const { desde, hasta } = req.query;
    const result = await dbHelper.calcularSaldoSimulado(escenarioId, desde, hasta);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error calculando saldo simulado' });
  }
});

module.exports = router;


