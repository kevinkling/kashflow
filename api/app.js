const path = require('path');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const webDist = path.join(__dirname, '../dist');

app.use((req, res, next) => {
  if (
    req.path === '/' ||
    req.path.endsWith('.html') ||
    req.path === '/sw.js' ||
    req.path === '/registerSW.js' ||
    req.path === '/manifest.webmanifest'
  ) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.use(express.static(webDist));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/cuentas', require('./domains/cuentas/cuentas.routes'));
app.use('/api', require('./domains/movimientos/movimientos.routes'));
app.use('/api', require('./domains/categorias/categorias.routes'));
app.use('/api/planning', require('./domains/obligaciones/obligaciones.routes'));
app.use('/api/planning', require('./domains/tarjetas/tarjetas.routes'));
app.use('/api/planning', require('./domains/simulador/simulador.routes'));
app.use('/api/planning', require('./domains/dashboard/dashboard.routes'));

// Fallback SPA: Vue Router usa history mode, asi que refrescar /movimientos, /obligaciones,
// etc. tiene que servir index.html (nunca 404). Las rutas /api/* ya devolvieron su propia
// respuesta (o 404 de Express) antes de llegar aca porque estan montadas primero.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

module.exports = app;
