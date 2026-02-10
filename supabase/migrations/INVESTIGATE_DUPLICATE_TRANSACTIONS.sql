-- =====================================================
-- INVESTIGAR TRANSACCIONES SOSPECHOSAS DEL 8/2 19:00
-- =====================================================

-- 1️⃣ Ver TODAS las transacciones del 8/2 a las 19:00
SELECT 
  '🔍 TRANSACCIONES 8/2 19:00' as investigacion,
  id,
  teacher_id,
  student_id,
  manual_client_name,
  type,
  amount,
  description,
  payment_status,
  payment_method,
  created_at,
  created_by
FROM transactions
WHERE created_at::date = '2026-02-08'
  AND created_at::time >= '19:00:00'
  AND created_at::time <= '19:01:00'
  AND amount = -13.00
ORDER BY created_at;

-- 2️⃣ Ver si hay un patrón (mismo created_by, mismo horario exacto)
SELECT 
  '📊 ANÁLISIS DE PATRÓN' as analisis,
  created_at,
  COUNT(*) as cantidad,
  STRING_AGG(DISTINCT created_by::text, ', ') as creado_por
FROM transactions
WHERE created_at::date = '2026-02-08'
  AND created_at::time >= '19:00:00'
  AND created_at::time <= '19:01:00'
GROUP BY created_at
ORDER BY created_at;

-- 3️⃣ Ver si hay lunch_orders asociados a esas transacciones
SELECT 
  '🍽️ PEDIDOS ASOCIADOS' as paso,
  lo.id as order_id,
  lo.order_date,
  lo.teacher_id,
  lo.status,
  lo.created_at as order_created_at,
  t.id as transaction_id,
  t.amount as transaction_amount,
  t.created_at as transaction_created_at
FROM lunch_orders lo
LEFT JOIN transactions t ON (
  t.teacher_id = lo.teacher_id 
  AND t.created_at::date = '2026-02-08'
  AND t.created_at::time >= '19:00:00'
)
WHERE lo.order_date = '2026-02-08'
  AND lo.teacher_id IS NOT NULL
ORDER BY lo.teacher_id, lo.created_at;
