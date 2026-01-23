-- ============================================================================
-- LIMPIAR PRODUCTOS Y CATEGORÍAS MOCK
-- ============================================================================
-- Este script elimina todos los productos de prueba/demo
-- Las categorías se crearán automáticamente desde la carga masiva

-- 1. Ver cuántos productos hay actualmente
SELECT 
  'Productos a eliminar' as info,
  COUNT(*) as cantidad
FROM products;

-- 2. Ver las categorías actuales
SELECT 
  'Categorías actuales' as info,
  category,
  COUNT(*) as cantidad_productos
FROM products
GROUP BY category
ORDER BY cantidad_productos DESC;

-- 3. ELIMINAR TODOS LOS PRODUCTOS
DELETE FROM products;

-- 4. VERIFICAR QUE NO EXISTA TABLA DE CATEGORÍAS (si existe, limpiarla también)
DROP TABLE IF EXISTS categories CASCADE;

-- 5. CONFIRMAR LIMPIEZA
SELECT 
  'LIMPIEZA COMPLETADA' as status,
  (SELECT COUNT(*) FROM products) as productos_restantes;

SELECT '✅ Base de datos lista para carga masiva de productos con nuevas categorías' as mensaje;
