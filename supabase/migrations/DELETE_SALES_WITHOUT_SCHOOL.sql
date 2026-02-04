-- =====================================================
-- Borrar todas las ventas de prueba sin school_id
-- (Transacciones y sus items relacionados)
-- =====================================================

-- IMPORTANTE: Este script borra permanentemente datos
-- Ejecutar solo en la base de datos correcta

-- Paso 1: Ver cuántas transacciones se borrarán
SELECT 
  COUNT(*) as total_transacciones_sin_sede,
  SUM(ABS(amount)) as monto_total
FROM transactions
WHERE type = 'purchase' 
  AND school_id IS NULL;

-- Paso 2: Ver detalles de las transacciones que se borrarán
SELECT 
  id,
  ticket_code,
  created_at,
  amount,
  description,
  student_id,
  teacher_id
FROM transactions
WHERE type = 'purchase' 
  AND school_id IS NULL
ORDER BY created_at DESC;

-- ====================================================
-- DESCOMENTAR ESTAS LÍNEAS CUANDO ESTÉS SEGURO DE BORRAR
-- ====================================================

-- Paso 3: Borrar los items de las transacciones (tabla relacionada)
-- DELETE FROM transaction_items
-- WHERE transaction_id IN (
--   SELECT id 
--   FROM transactions 
--   WHERE type = 'purchase' 
--     AND school_id IS NULL
-- );

-- Paso 4: Borrar las transacciones sin school_id
-- DELETE FROM transactions
-- WHERE type = 'purchase' 
--   AND school_id IS NULL;

-- Paso 5: Borrar ventas relacionadas en tabla sales (si existe)
-- DELETE FROM sales
-- WHERE school_id IS NULL;

-- ====================================================
-- Mensaje de confirmación
-- ====================================================
-- SELECT '✅ Ventas de prueba sin sede borradas correctamente' as resultado;
