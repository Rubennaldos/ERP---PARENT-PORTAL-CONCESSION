-- =====================================================
-- SOLUCIÓN COMPLETA: CORREGIR PAGOS Y CREAR TICKET_NUMBER
-- =====================================================

-- PASO 1️⃣: Crear la columna ticket_number
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50);

-- PASO 2️⃣: Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_transactions_ticket_number 
ON transactions(ticket_number);

-- PASO 3️⃣: Ver estado actual de transacciones PAID incorrectas
SELECT 
  '🚨 ESTADO ACTUAL - PAID INCORRECTOS' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN teacher_id IS NOT NULL THEN 1 END) as profesores,
  COUNT(CASE WHEN operation_number IS NULL AND payment_method != 'efectivo' THEN 1 END) as sin_numero_operacion
FROM transactions
WHERE payment_status = 'paid'
  AND (
    (teacher_id IS NOT NULL AND (payment_method IS NULL OR payment_method = 'teacher_account'))
    OR (operation_number IS NULL AND payment_method NOT IN ('efectivo', 'teacher_account') AND payment_method IS NOT NULL)
  );

-- PASO 4️⃣: CORREGIR - Mover profesores con crédito de PAID → PENDING
UPDATE transactions
SET 
  payment_status = 'pending',
  payment_method = NULL,
  operation_number = NULL
WHERE payment_status = 'paid'
  AND teacher_id IS NOT NULL
  AND (payment_method IS NULL OR payment_method = 'teacher_account')
  AND type = 'purchase'
  AND amount < 0;

-- PASO 5️⃣: CORREGIR - Mover ventas sin operation_number (excepto efectivo) a PENDING
UPDATE transactions
SET payment_status = 'pending'
WHERE payment_status = 'paid'
  AND operation_number IS NULL
  AND payment_method NOT IN ('efectivo', 'teacher_account')
  AND payment_method IS NOT NULL
  AND type = 'purchase'
  AND amount < 0;

-- PASO 6️⃣: Ver resultado final
SELECT 
  '✅ RESULTADO FINAL' as tipo,
  payment_status,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN teacher_id IS NOT NULL THEN 1 END) as profesores,
  COUNT(CASE WHEN operation_number IS NULL THEN 1 END) as sin_operation_number
FROM transactions
WHERE type = 'purchase'
  AND amount < 0
GROUP BY payment_status
ORDER BY payment_status;

-- PASO 7️⃣: VERIFICAR DUPLICADOS EN PAGOS REALIZADOS
WITH duplicados AS (
  SELECT 
    COALESCE(t.student_id::text, t.teacher_id::text, t.manual_client_name, 'generico') as cliente_key,
    DATE(t.created_at) as fecha,
    t.description,
    t.amount,
    COUNT(*) as cantidad
  FROM transactions t
  WHERE t.payment_status = 'paid'
    AND t.type = 'purchase'
  GROUP BY cliente_key, DATE(t.created_at), t.description, t.amount
  HAVING COUNT(*) > 1
)
SELECT 
  '🚨 DUPLICADOS EN PAGOS REALIZADOS' as tipo,
  d.*,
  (SELECT json_agg(json_build_object(
    'id', t2.id,
    'created_at', t2.created_at,
    'created_by', p.full_name
  ))
  FROM transactions t2
  LEFT JOIN profiles p ON t2.created_by = p.id
  WHERE COALESCE(t2.student_id::text, t2.teacher_id::text, t2.manual_client_name, 'generico') = d.cliente_key
    AND DATE(t2.created_at) = d.fecha
    AND t2.description = d.description
    AND t2.amount = d.amount
    AND t2.payment_status = 'paid'
  ) as detalles
FROM duplicados d
ORDER BY d.cantidad DESC;
