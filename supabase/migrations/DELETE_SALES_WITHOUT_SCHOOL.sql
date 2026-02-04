-- =====================================================
-- Borrar todas las ventas de prueba sin school_id
-- (Transacciones y sus items relacionados)
-- =====================================================

-- IMPORTANTE: Este script borra permanentemente datos
-- Ejecutar solo en la base de datos correcta

-- ====================================================
-- PASO 1: VER QUÉ SE VA A BORRAR (EJECUTAR PRIMERO)
-- ====================================================

-- Ver cuántas transacciones se borrarán
SELECT 
  'TRANSACCIONES A BORRAR' as tipo,
  COUNT(*) as total,
  SUM(ABS(amount)) as monto_total
FROM transactions
WHERE type = 'purchase' 
  AND school_id IS NULL;

-- Ver detalles de las transacciones que se borrarán
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

-- Ver items que se borrarán
SELECT 
  'ITEMS A BORRAR' as tipo,
  COUNT(*) as total_items
FROM transaction_items
WHERE transaction_id IN (
  SELECT id 
  FROM transactions 
  WHERE type = 'purchase' 
    AND school_id IS NULL
);

-- ====================================================
-- PASO 2: BORRAR DATOS (EJECUTAR CUANDO ESTÉS SEGURO)
-- ====================================================
-- DESCOMENTA LAS SIGUIENTES LÍNEAS PARA BORRAR:

/*
-- Borrar los items de las transacciones
DELETE FROM transaction_items
WHERE transaction_id IN (
  SELECT id 
  FROM transactions 
  WHERE type = 'purchase' 
    AND school_id IS NULL
);

-- Borrar las transacciones sin school_id
DELETE FROM transactions
WHERE type = 'purchase' 
  AND school_id IS NULL;

-- Borrar ventas relacionadas en tabla sales (si existe)
DELETE FROM sales
WHERE school_id IS NULL;

-- Mensaje de confirmación
SELECT '✅ Ventas de prueba sin sede borradas correctamente' as resultado;
*/
