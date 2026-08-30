-- Categorías por defecto (idempotente)
INSERT INTO categorias (nombre, icono, tipo) VALUES
  ('Comida', '🍔', 'egreso'),
  ('Transporte', '🚆', 'egreso'),
  ('Vivienda', '🏠', 'egreso'),
  ('Servicios', '💡', 'egreso'),
  ('Suscripciones', '🎧', 'egreso'),
  ('Salud', '💊', 'egreso'),
  ('Educación', '🎓', 'egreso'),
  ('Ahorro', '💰', 'ingreso'),
  ('Regalo', '🎁', 'egreso'),
  ('Otros', '🔖', 'egreso')
ON CONFLICT(nombre) DO NOTHING;
