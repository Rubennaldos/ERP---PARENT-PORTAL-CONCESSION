-- =====================================================
-- SEGUNDA RONDA: CORREGIR CASOS RESTANTES Y DUPLICADOS
-- =====================================================

-- PASO 1️⃣: Ver los 18 profesores que todavía están como PAID
SELECT 
  '🚨 18 PROFESORES TODAVÍA PAID' as tipo,
  tp.full_name as profesor,
  t.id,
  t.description,
  t.amount,
  t.payment_status,
  t.payment_method,
  t.operation_number,
  t.created_at
FROM transactions t
INNER JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.payment_status = 'paid'
  AND t.type = 'purchase'
  AND t.amount < 0
ORDER BY t.created_at DESC;

-- PASO 2️⃣: CORREGIR - Mover TODOS los profesores a PENDING si no tienen operation_number válido
UPDATE transactions
SET 
  payment_status = 'pending',
  payment_method = NULL,
  operation_number = NULL
WHERE teacher_id IS NOT NULL
  AND payment_status = 'paid'
  AND type = 'purchase'
  AND amount < 0
  AND (operation_number IS NULL OR operation_number = '' OR payment_method IS NULL OR payment_method = 'teacher_account');

-- PASO 3️⃣: Ver las 73 transacciones PAID sin operation_number
SELECT 
  '🚨 73 PAID SIN OPERATION_NUMBER' as tipo,
  t.id,
  COALESCE(s.full_name, tp.full_name, t.manual_client_name, 'Cliente Genérico') as cliente,
  t.payment_method,
  t.operation_number,
  t.amount,
  t.created_at
FROM transactions t
LEFT JOIN students s ON t.student_id = s.id
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.payment_status = 'paid'
  AND t.operation_number IS NULL
  AND t.payment_method != 'efectivo'
  AND t.type = 'purchase'
ORDER BY t.created_at DESC
LIMIT 20;

-- PASO 4️⃣: CORREGIR - Mover a PENDING todas las transacciones sin operation_number (excepto efectivo)
UPDATE transactions
SET payment_status = 'pending'
WHERE payment_status = 'paid'
  AND (operation_number IS NULL OR operation_number = '')
  AND payment_method != 'efectivo'
  AND payment_method IS NOT NULL
  AND type = 'purchase'
  AND amount < 0;

-- PASO 5️⃣: ELIMINAR DUPLICADOS - Mantener solo el más antiguo de cada grupo
WITH duplicados AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        COALESCE(student_id::text, teacher_id::text, manual_client_name, 'generico'),
        DATE(created_at),
        description,
        amount
      ORDER BY created_at ASC -- Mantener el más antiguo
    ) as rn
  FROM transactions
  WHERE payment_status = 'paid'
    AND type = 'purchase'
)
DELETE FROM transactions
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);

-- PASO 6️⃣: RESULTADO FINAL
SELECT 
  '✅ RESULTADO FINAL DESPUÉS DE LIMPIEZA' as tipo,
  payment_status,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN teacher_id IS NOT NULL THEN 1 END) as profesores,
  COUNT(CASE WHEN operation_number IS NULL AND payment_method != 'efectivo' THEN 1 END) as sin_operation_number
FROM transactions
WHERE type = 'purchase'
  AND amount < 0
GROUP BY payment_status
ORDER BY payment_status;

-- PASO 7️⃣: Verificar que NO QUEDEN duplicados
SELECT 
  '✅ VERIFICACIÓN FINAL - DUPLICADOS' as tipo,
  COUNT(*) as duplicados_restantes
FROM (
  SELECT 
    COALESCE(student_id::text, teacher_id::text, manual_client_name, 'generico') as cliente_key,
    DATE(created_at) as fecha,
    description,
    amount,
    COUNT(*) as cantidad
  FROM transactions
  WHERE payment_status = 'paid'
    AND type = 'purchase'
  GROUP BY cliente_key, DATE(created_at), description, amount
  HAVING COUNT(*) > 1
) AS dups;
