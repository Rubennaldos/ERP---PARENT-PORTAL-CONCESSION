-- ================================================================
-- BORRAR PEDIDOS DE PRUEBA POR NOMBRE DE ESTUDIANTE
-- ================================================================

-- Ver primero qué vamos a borrar
SELECT 
  lo.id,
  s.full_name,
  lo.order_date,
  lo.menu_id
FROM lunch_orders lo
LEFT JOIN students s ON lo.student_id = s.id
WHERE s.full_name ILIKE '%prueba niño%';

-- Borrar los pedidos de estudiantes de prueba
DELETE FROM lunch_orders 
WHERE student_id IN (
  SELECT id FROM students WHERE full_name ILIKE '%prueba niño%'
);

-- Verificar que se borraron
SELECT COUNT(*) as pedidos_restantes 
FROM lunch_orders lo
LEFT JOIN students s ON lo.student_id = s.id
WHERE s.full_name ILIKE '%prueba niño%';

