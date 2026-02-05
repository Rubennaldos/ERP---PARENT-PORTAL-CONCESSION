-- =====================================================
-- DIAGNÓSTICO: Por qué Alejandra y Gissela no aparecen en cobranzas
-- =====================================================

-- 1. Buscar pedidos de Alejandra y Gissela
SELECT 
  lo.id,
  lo.order_date,
  lo.status,
  lo.is_cancelled,
  lo.student_id,
  lo.teacher_id,
  lo.manual_name,
  lo.school_id,
  lo.category_id,
  lo.created_at,
  tp.full_name as teacher_name,
  tp.school_id_1 as teacher_school_id,
  s.name as school_name
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN schools s ON lo.school_id = s.id OR tp.school_id_1 = s.id
WHERE (
  tp.full_name ILIKE '%Alejandra%' OR 
  tp.full_name ILIKE '%Gissela%' OR
  tp.full_name ILIKE '%Olano%' OR
  tp.full_name ILIKE '%vela%'
)
AND lo.order_date >= '2026-02-04'
ORDER BY lo.order_date DESC, lo.created_at DESC;

-- 2. Verificar si tienen transacciones asociadas
SELECT 
  t.id,
  t.type,
  t.amount,
  t.payment_status,
  t.student_id,
  t.teacher_id,
  t.manual_client_name,
  t.school_id,
  t.description,
  t.created_at,
  tp.full_name as teacher_name,
  s.name as school_name
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN schools s ON t.school_id = s.id
WHERE (
  tp.full_name ILIKE '%Alejandra%' OR 
  tp.full_name ILIKE '%Gissela%' OR
  tp.full_name ILIKE '%Olano%' OR
  tp.full_name ILIKE '%vela%'
)
AND t.type = 'purchase'
AND t.created_at >= '2026-02-04'
ORDER BY t.created_at DESC;

-- 3. Verificar pedidos confirmados sin transacciones
SELECT 
  lo.id as order_id,
  lo.order_date,
  lo.status,
  lo.teacher_id,
  tp.full_name as teacher_name,
  tp.school_id_1,
  lo.school_id as order_school_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM transactions t 
      WHERE (t.teacher_id = lo.teacher_id OR t.student_id = lo.student_id)
      AND t.description ILIKE '%Almuerzo%'
      AND DATE(t.created_at) = lo.order_date
    ) THEN 'TIENE TRANSACCIÓN'
    ELSE 'SIN TRANSACCIÓN'
  END as tiene_transaccion
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE lo.status = 'confirmed'
AND lo.is_cancelled = false
AND lo.order_date >= '2026-02-04'
AND (
  tp.full_name ILIKE '%Alejandra%' OR 
  tp.full_name ILIKE '%Gissela%' OR
  tp.full_name ILIKE '%Olano%' OR
  tp.full_name ILIKE '%vela%'
)
ORDER BY lo.order_date DESC;

-- 4. Ver todos los pedidos confirmados del 04/02/2026
SELECT 
  lo.id,
  lo.order_date,
  lo.status,
  lo.teacher_id,
  lo.student_id,
  lo.manual_name,
  lo.school_id,
  tp.full_name as teacher_name,
  s.name as student_name,
  CASE 
    WHEN lo.teacher_id IS NOT NULL THEN 'Profesor'
    WHEN lo.student_id IS NOT NULL THEN 'Estudiante'
    WHEN lo.manual_name IS NOT NULL THEN 'Manual'
    ELSE 'Desconocido'
  END as tipo_cliente
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN students s ON lo.student_id = s.id
WHERE lo.order_date = '2026-02-04'
AND lo.status = 'confirmed'
AND lo.is_cancelled = false
ORDER BY lo.created_at DESC;
