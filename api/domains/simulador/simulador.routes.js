const express = require('express');
const router = express.Router();
const service = require('./simulador.service');

function handle(err, res, fallback) {
  console.error(err);
  res.status(500).json({ error: err.message || fallback });
}

router.post('/escenarios', async (req, res) => {
  try {
    const { usuario_id, nombre } = req.body;
    const id = await service.crearEscenario(usuario_id, nombre);
    res.status(201).json({ id });
  } catch (err) {
    handle(err, res, 'Error creando escenario');
  }
});

router.get('/escenarios', async (req, res) => {
  try {
    res.json(await service.obtenerEscenariosUsuario(req.query.usuario_id));
  } catch (err) {
    handle(err, res, 'Error obteniendo escenarios');
  }
});

router.post('/escenarios/:id/ajustes', async (req, res) => {
  try {
    const { tipo, instancia_compromiso_id, descripcion, fecha_estimada, monto_simulado, signo } = req.body;
    let id;
    if (tipo === 'instancia' && instancia_compromiso_id) {
      id = await service.upsertAjusteInstancia(
        req.params.id,
        instancia_compromiso_id,
        descripcion,
        fecha_estimada,
        monto_simulado,
        signo
      );
    } else {
      id = await service.agregarAjusteEscenario(
        req.params.id,
        tipo,
        instancia_compromiso_id,
        descripcion,
        fecha_estimada,
        monto_simulado,
        signo
      );
    }
    res.status(201).json({ id });
  } catch (err) {
    handle(err, res, 'Error agregando ajuste');
  }
});

router.delete('/escenarios/:id/ajustes/:ajusteId', async (req, res) => {
  try {
    const ok = await service.eliminarAjuste(req.params.id, req.params.ajusteId);
    if (!ok) return res.status(404).json({ error: 'Ajuste no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    handle(err, res, 'Error eliminando ajuste');
  }
});

router.get('/escenarios/:id/ajustes', async (req, res) => {
  try {
    res.json(await service.obtenerAjustesEscenario(req.params.id));
  } catch (err) {
    handle(err, res, 'Error obteniendo ajustes');
  }
});

router.get('/escenarios/:id/saldo-simulado', async (req, res) => {
  try {
    const { desde, hasta, usuario_id } = req.query;
    res.json(await service.calcularSaldoSimulado(req.params.id, desde, hasta, usuario_id));
  } catch (err) {
    handle(err, res, 'Error calculando saldo simulado');
  }
});

router.get('/escenarios/:id/saldo-simulado-mensual', async (req, res) => {
  try {
    const meses = Number(req.query.meses) || 6;
    const usuarioId = req.query.usuario_id || null;
    res.json(await service.calcularProyeccionMensual(req.params.id, meses, usuarioId));
  } catch (err) {
    handle(err, res, 'Error calculando proyección mensual');
  }
});

module.exports = router;
