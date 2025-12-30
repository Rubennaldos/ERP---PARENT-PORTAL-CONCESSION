-- ========================================================
-- INSERTAR PRODUCTOS MOCK - VERSIÓN SIMPLE
-- ========================================================
-- Este script inserta productos adaptándose a la estructura existente
-- ========================================================

-- 1. LIMPIAR PRODUCTOS ANTERIORES (opcional)
DELETE FROM products;

-- 2. INSERTAR PRODUCTOS SOLO CON COLUMNAS QUE EXISTEN
-- Ajusta según la estructura real de tu tabla

-- BEBIDAS
INSERT INTO products (name, price, category, image_url, is_active) VALUES
('Agua Mineral 500ml', 2.00, 'bebidas', 'https://api.dicebear.com/7.x/shapes/svg?seed=agua', true),
('Coca Cola 500ml', 3.50, 'bebidas', 'https://api.dicebear.com/7.x/shapes/svg?seed=coca', true),
('Inca Kola 500ml', 3.50, 'bebidas', 'https://api.dicebear.com/7.x/shapes/svg?seed=inca', true),
('Jugo de Naranja', 4.50, 'bebidas', 'https://api.dicebear.com/7.x/shapes/svg?seed=jugo', true),
('Chicha Morada', 3.00, 'bebidas', 'https://api.dicebear.com/7.x/shapes/svg?seed=chicha', true);

-- SNACKS
INSERT INTO products (name, price, category, image_url, is_active) VALUES
('Papas Lays', 2.50, 'snacks', 'https://api.dicebear.com/7.x/shapes/svg?seed=papas', true),
('Piqueo', 3.00, 'snacks', 'https://api.dicebear.com/7.x/shapes/svg?seed=piqueo', true),
('Galletas Oreo', 2.00, 'snacks', 'https://api.dicebear.com/7.x/shapes/svg?seed=oreo', true),
('Chocosoda', 1.50, 'snacks', 'https://api.dicebear.com/7.x/shapes/svg?seed=choco', true),
('Sublime', 2.50, 'snacks', 'https://api.dicebear.com/7.x/shapes/svg?seed=sublime', true);

-- MENÚ
INSERT INTO products (name, price, category, image_url, is_active) VALUES
('Sándwich de Pollo', 8.00, 'menu', 'https://api.dicebear.com/7.x/shapes/svg?seed=sandwich', true),
('Hamburguesa', 10.00, 'menu', 'https://api.dicebear.com/7.x/shapes/svg?seed=burger', true),
('Hot Dog', 7.00, 'menu', 'https://api.dicebear.com/7.x/shapes/svg?seed=hotdog', true),
('Pizza Personal', 9.00, 'menu', 'https://api.dicebear.com/7.x/shapes/svg?seed=pizza', true),
('Salchipapa', 6.50, 'menu', 'https://api.dicebear.com/7.x/shapes/svg?seed=salchi', true),
('Empanada de Carne', 4.00, 'menu', 'https://api.dicebear.com/7.x/shapes/svg?seed=empanada', true);

-- 3. VERIFICAR
SELECT category, COUNT(*), SUM(price) as total_valor
FROM products
WHERE is_active = true
GROUP BY category;

SELECT * FROM products ORDER BY category, price;

