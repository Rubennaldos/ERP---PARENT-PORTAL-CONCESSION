-- =====================================================
-- DIAGNÓSTICO: Por qué Pascual Vivanco no aparece en Cobranzas
-- =====================================================

-- 1. Ver TODAS las transacciones de hoy
SELECT 
  t.id,
  t.type,
  t.amount,
  t.payment_status,
  t.description,
  t.student_id,
  t.teacher_id,
  tp.full_name as teacher_name,
  t.school_id,
  s.name as school_name,
  t.created_at
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN schools s ON t.school_id = s.id
WHERE DATE(t.created_at) = CURRENT_DATE
ORDER BY t.created_at DESC;

-- 2. Ver los pedidos de almuerzo (lunch_orders) de hoy
SELECT 
  lo.id,
  lo.order_date,
  lo.status,
  lo.student_id,
  lo.teacher_id,
  lo.manual_name,
  lo.payment_method,
  tp.full_name as teacher_name,
  lo.created_at
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE lo.order_date = CURRENT_DATE
ORDER BY lo.created_at DESC;

-- 3. Verificar si se crearon transacciones para esos pedidos
SELECT 
  'Pedido de almuerzo' as tipo,
  lo.id as order_id,
  tp.full_name as nombre,
  lo.created_at as fecha_pedido,
  (SELECT COUNT(*) FROM transactions t WHERE t.teacher_id = lo.teacher_id AND DATE(t.created_at) = DATE(lo.created_at)) as tiene_transaccion
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE lo.order_date = CURRENT_DATE
  AND lo.teacher_id IS NOT NULL
ORDER BY lo.created_at DESC;

-- 4. Ver si el problema es que no se creó la transacción
-- O si se creó pero con payment_status incorrecto
SELECT 
  t.id,
  t.type,
  t.payment_status,
  t.amount,
  t.description,
  tp.full_name as teacher_name
FROM transactions t
INNER JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name ILIKE '%Pascual%'
  AND DATE(t.created_at) = CURRENT_DATE;
