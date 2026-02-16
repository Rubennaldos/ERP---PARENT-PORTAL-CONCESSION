-- ============================================================
-- LIMPIAR DATOS DE PRUEBA
-- Buscar y eliminar transacciones/estudiantes de prueba
-- ============================================================

-- PASO 1: DIAGNOSTICO - Encontrar estudiantes de prueba
-- (nombres que contengan "prueba", "test", etc.)
SELECT 
  s.id,
  s.full_name,
  s.parent_id,
  s.school_id,
  s.grade,
  s.section,
  s.created_at,
  pp.full_name AS parent_name
FROM students s
LEFT JOIN parent_profiles pp ON pp.user_id = s.parent_id
WHERE LOWER(s.full_name) LIKE '%prueba%'
   OR LOWER(s.full_name) LIKE '%test%'
ORDER BY s.created_at DESC
LIMIT 50


-- PASO 2: Ver transacciones de esos estudiantes de prueba
-- SELECT 
--   t.id,
--   t.ticket_code,
--   t.description,
--   t.amount,
--   t.payment_status,
--   t.created_at,
--   s.full_name AS student_name
-- FROM transactions t
-- INNER JOIN students s ON s.id = t.student_id
-- WHERE LOWER(s.full_name) LIKE '%prueba%'
--    OR LOWER(s.full_name) LIKE '%test%'
-- ORDER BY t.created_at DESC
-- LIMIT 100


-- PASO 3: ELIMINAR transacciones de estudiantes de prueba
-- DESCOMENTA PARA EJECUTAR:
-- DELETE FROM transaction_items
-- WHERE transaction_id IN (
--   SELECT t.id FROM transactions t
--   INNER JOIN students s ON s.id = t.student_id
--   WHERE LOWER(s.full_name) LIKE '%prueba%'
--      OR LOWER(s.full_name) LIKE '%test%'
-- )

-- DELETE FROM transactions
-- WHERE student_id IN (
--   SELECT id FROM students
--   WHERE LOWER(full_name) LIKE '%prueba%'
--      OR LOWER(full_name) LIKE '%test%'
-- )


-- PASO 4: ELIMINAR lunch_orders de estudiantes de prueba
-- DELETE FROM lunch_orders
-- WHERE student_id IN (
--   SELECT id FROM students
--   WHERE LOWER(full_name) LIKE '%prueba%'
--      OR LOWER(full_name) LIKE '%test%'
-- )


-- PASO 5: ELIMINAR estudiantes de prueba (SOLO si confirmas)
-- DELETE FROM students
-- WHERE LOWER(full_name) LIKE '%prueba%'
--    OR LOWER(full_name) LIKE '%test%'
