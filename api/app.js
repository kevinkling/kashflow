const path = require('path');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html') || req.path === '/sw.js') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

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

module.exports = app;
