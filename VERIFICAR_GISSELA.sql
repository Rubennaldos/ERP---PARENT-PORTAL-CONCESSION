-- =====================================================
-- VERIFICAR ESTADO DE PEDIDOS DE GISSELA
-- =====================================================

-- 1. Ver todos los pedidos de Gissela
SELECT 
  lo.id,
  lo.order_date,
  lo.status,
  lo.is_cancelled,
  lo.teacher_id,
  lo.student_id,
  lo.manual_name,
  lo.school_id,
  tp.full_name as teacher_name,
  tp.school_id_1 as teacher_school_id,
  s.name as school_name
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN schools s ON lo.school_id = s.id OR tp.school_id_1 = s.id
WHERE (
  tp.full_name ILIKE '%Gissela%' OR 
  tp.full_name ILIKE '%vela%'
)
AND lo.order_date >= '2026-02-04'
ORDER BY lo.order_date DESC, lo.created_at DESC;

-- 2. Verificar si tiene transacciones
SELECT 
  t.id,
  t.type,
  t.amount,
  t.payment_status,
  t.teacher_id,
  t.school_id,
  t.description,
  t.created_at,
  tp.full_name as teacher_name
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE (
  tp.full_name ILIKE '%Gissela%' OR 
  tp.full_name ILIKE '%vela%'
)
AND t.type = 'purchase'
AND t.created_at >= '2026-02-04'
ORDER BY t.created_at DESC;

-- 3. Ver pedidos confirmados vs entregados de Gissela
SELECT 
  lo.order_date,
  lo.status,
  COUNT(*) as cantidad
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE (
  tp.full_name ILIKE '%Gissela%' OR 
  tp.full_name ILIKE '%vela%'
)
AND lo.order_date >= '2026-02-04'
AND lo.is_cancelled = false
GROUP BY lo.order_date, lo.status
ORDER BY lo.order_date DESC, lo.status;
