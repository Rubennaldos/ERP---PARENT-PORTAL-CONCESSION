-- =====================================================
-- CORRECCIÓN DEFINITIVA: TODOS LOS PROFESORES A PENDING
-- =====================================================
-- 
-- FLUJO CORRECTO:
-- 1. Profesor pide desde su app → PENDING (siempre)
-- 2. Cajero hace pedido con crédito → PENDING (siempre)
-- 3. SOLO cuando cajero cobra en módulo de cobranzas → PAID
--
-- Por lo tanto: NINGÚN profesor debería tener status PAID
-- sin haber pasado por el módulo de cobranzas primero.
-- =====================================================

-- PASO 1️⃣: Ver TODOS los profesores que están como PAID
SELECT 
  '🚨 PROFESORES CON STATUS PAID (ANTES)' as tipo,
  COUNT(*) as cantidad_total,
  COUNT(CASE WHEN payment_method = 'efectivo' THEN 1 END) as efectivo,
  COUNT(CASE WHEN payment_method != 'efectivo' THEN 1 END) as otros_metodos
FROM transactions
WHERE teacher_id IS NOT NULL
  AND payment_status = 'paid'
  AND type = 'purchase'
  AND amount < 0;

-- PASO 2️⃣: MOVER TODOS LOS PROFESORES A PENDING
-- Excepto los que fueron pagados explícitamente por el cajero en módulo de cobranzas
-- (estos deberían tener un registro en payment_history, pero como no existe esa tabla,
-- vamos a mover TODOS a PENDING por seguridad)
UPDATE transactions
SET 
  payment_status = 'pending',
  payment_method = NULL,
  operation_number = NULL
WHERE teacher_id IS NOT NULL
  AND payment_status = 'paid'
  AND type = 'purchase'
  AND amount < 0;

-- PASO 3️⃣: Verificar resultado
SELECT 
  '✅ PROFESORES DESPUÉS DE CORRECCIÓN' as tipo,
  payment_status,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN payment_method = 'efectivo' THEN 1 END) as efectivo,
  COUNT(CASE WHEN operation_number IS NOT NULL THEN 1 END) as con_operation_number
FROM transactions
WHERE teacher_id IS NOT NULL
  AND type = 'purchase'
  AND amount < 0
GROUP BY payment_status
ORDER BY payment_status;

-- PASO 4️⃣: Verificar que NO QUEDEN profesores en PAID
SELECT 
  '✅ VERIFICACIÓN FINAL' as tipo,
  COUNT(*) as profesores_en_paid,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PERFECTO - Todos están en PENDING'
    ELSE '⚠️ AÚN HAY PROFESORES EN PAID'
  END as estado
FROM transactions
WHERE teacher_id IS NOT NULL
  AND payment_status = 'paid'
  AND type = 'purchase'
  AND amount < 0;

-- PASO 5️⃣: Resumen final de TODAS las transacciones
SELECT 
  '📊 RESUMEN GENERAL FINAL' as tipo,
  payment_status,
  COUNT(*) as total_transacciones,
  COUNT(CASE WHEN teacher_id IS NOT NULL THEN 1 END) as profesores,
  COUNT(CASE WHEN student_id IS NOT NULL THEN 1 END) as estudiantes,
  COUNT(CASE WHEN manual_client_name IS NOT NULL THEN 1 END) as manuales,
  COUNT(CASE WHEN operation_number IS NOT NULL THEN 1 END) as con_operation_number,
  COUNT(CASE WHEN payment_method = 'efectivo' THEN 1 END) as efectivo
FROM transactions
WHERE type = 'purchase'
  AND amount < 0
GROUP BY payment_status
ORDER BY payment_status;
