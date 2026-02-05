-- =====================================================
-- VERIFICAR PEDIDOS DEL 04/02/2026 QUE DEBERÍAN APARECER EN COBRANZAS
-- =====================================================

-- 1. Ver todos los pedidos confirmados del 04/02/2026
SELECT 
  lo.id,
  lo.order_date,
  lo.status,
  lo.is_cancelled,
  lo.teacher_id,
  lo.student_id,
  lo.manual_name,
  lo.school_id as order_school_id,
  tp.full_name as teacher_name,
  tp.school_id_1 as teacher_school_id,
  s.name as student_name,
  s.school_id as student_school_id,
  sc.name as school_name_from_order,
  sc2.name as school_name_from_teacher,
  sc3.name as school_name_from_student
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN students s ON lo.student_id = s.id
LEFT JOIN schools sc ON lo.school_id = sc.id
LEFT JOIN schools sc2 ON tp.school_id_1 = sc2.id
LEFT JOIN schools sc3 ON s.school_id = sc3.id
WHERE lo.order_date = '2026-02-04'
AND lo.status = 'confirmed'
AND lo.is_cancelled = false
ORDER BY lo.created_at DESC;

-- 2. Verificar si tienen transacciones asociadas
SELECT 
  t.id,
  t.type,
  t.amount,
  t.payment_status,
  t.teacher_id,
  t.student_id,
  t.school_id,
  t.description,
  t.created_at,
  tp.full_name as teacher_name,
  s.full_name as student_name
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN students s ON t.student_id = s.id
WHERE t.type = 'purchase'
AND t.payment_status = 'pending'
AND (
  (t.teacher_id IN (
    SELECT teacher_id FROM lunch_orders 
    WHERE order_date = '2026-02-04' 
    AND status = 'confirmed'
    AND is_cancelled = false
  ))
  OR
  (t.student_id IN (
    SELECT student_id FROM lunch_orders 
    WHERE order_date = '2026-02-04' 
    AND status = 'confirmed'
    AND is_cancelled = false
  ))
)
ORDER BY t.created_at DESC;

-- 3. Comparar: pedidos confirmados vs transacciones pendientes del 04/02
SELECT 
  'Pedidos confirmados' as tipo,
  COUNT(*) as cantidad
FROM lunch_orders
WHERE order_date = '2026-02-04'
AND status = 'confirmed'
AND is_cancelled = false

UNION ALL

SELECT 
  'Transacciones pendientes' as tipo,
  COUNT(*) as cantidad
FROM transactions
WHERE type = 'purchase'
AND payment_status = 'pending'
AND DATE(created_at) = '2026-02-04';

-- 4. Ver pedidos confirmados del 04/02 SIN transacciones
SELECT 
  lo.id as order_id,
  lo.order_date,
  lo.teacher_id,
  lo.student_id,
  lo.manual_name,
  tp.full_name as teacher_name,
  s.full_name as student_name,
  CASE 
    WHEN lo.teacher_id IS NOT NULL THEN 'Profesor'
    WHEN lo.student_id IS NOT NULL THEN 'Estudiante'
    WHEN lo.manual_name IS NOT NULL THEN 'Manual'
    ELSE 'Desconocido'
  END as tipo_cliente,
  CASE 
    WHEN lo.school_id IS NOT NULL THEN lo.school_id::text
    WHEN tp.school_id_1 IS NOT NULL THEN tp.school_id_1::text
    WHEN s.school_id IS NOT NULL THEN s.school_id::text
    ELSE 'SIN SCHOOL_ID'
  END as school_id_final
FROM lunch_orders lo
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN students s ON lo.student_id = s.id
WHERE lo.order_date = '2026-02-04'
AND lo.status = 'confirmed'
AND lo.is_cancelled = false
AND NOT EXISTS (
  SELECT 1 FROM transactions t
  WHERE (
    (t.teacher_id = lo.teacher_id AND lo.teacher_id IS NOT NULL)
    OR (t.student_id = lo.student_id AND lo.student_id IS NOT NULL)
  )
  AND t.type = 'purchase'
  AND t.payment_status = 'pending'
  AND t.description ILIKE '%Almuerzo%'
  AND DATE(t.created_at) = lo.order_date
)
ORDER BY lo.created_at DESC;
