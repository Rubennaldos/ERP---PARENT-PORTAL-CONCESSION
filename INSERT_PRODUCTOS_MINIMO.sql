-- ========================================================
-- INSERTAR PRODUCTOS - VERSIÓN MÍNIMA (solo name, price, category)
-- ========================================================

-- 1. Ver estructura actual de la tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 2. Limpiar productos anteriores
-- DELETE FROM products;

-- 3. Insertar productos SOLO con columnas básicas
-- Si falla, comenta la columna que da error

-- BEBIDAS
INSERT INTO products (name, price, category) VALUES
('Agua Mineral 500ml', 2.00, 'bebidas'),
('Coca Cola 500ml', 3.50, 'bebidas'),
('Inca Kola 500ml', 3.50, 'bebidas'),
('Jugo de Naranja', 4.50, 'bebidas'),
('Chicha Morada', 3.00, 'bebidas');

-- SNACKS
INSERT INTO products (name, price, category) VALUES
('Papas Lays', 2.50, 'snacks'),
('Piqueo', 3.00, 'snacks'),
('Galletas Oreo', 2.00, 'snacks'),
('Chocosoda', 1.50, 'snacks'),
('Sublime', 2.50, 'snacks');

-- MENÚ
INSERT INTO products (name, price, category) VALUES
('Sándwich de Pollo', 8.00, 'menu'),
('Hamburguesa', 10.00, 'menu'),
('Hot Dog', 7.00, 'menu'),
('Pizza Personal', 9.00, 'menu'),
('Salchipapa', 6.50, 'menu'),
('Empanada de Carne', 4.00, 'menu');

-- 4. Verificar
SELECT * FROM products ORDER BY category, price;

-- ========================================================
-- SI AÚN DA ERROR:
-- ========================================================
-- Copia y ejecuta solo esto:

/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;
*/

-- Y dime qué columnas muestra.
-- Así puedo crear el INSERT correcto.

