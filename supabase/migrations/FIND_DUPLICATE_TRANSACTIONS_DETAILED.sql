-- =====================================================
-- BUSCAR TODAS LAS TRANSACCIONES DEL 8 DE FEBRERO
-- =====================================================

-- 1️⃣ Todas las transacciones del 8/2 (cualquier hora)
SELECT 
  '🔍 TODAS LAS TRANSACCIONES 8/2' as tipo,
  id,
  teacher_id,
  student_id,
  manual_client_name,
  type,
  amount,
  description,
  payment_status,
  payment_method,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as fecha_hora_exacta,
  created_by
FROM transactions
WHERE DATE(created_at) = '2026-02-08'
  AND (teacher_id IS NOT NULL OR manual_client_name IS NOT NULL)
ORDER BY created_at;

-- 2️⃣ Contar cuántas transacciones tiene cada profesor del 8/2
SELECT 
  '📊 RESUMEN POR PROFESOR - 8/2' as tipo,
  tp.full_name as profesor,
  COUNT(*) as total_transacciones,
  SUM(amount) as total_deuda,
  STRING_AGG(DISTINCT TO_CHAR(t.created_at, 'HH24:MI'), ', ' ORDER BY TO_CHAR(t.created_at, 'HH24:MI')) as horas
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE DATE(t.created_at) = '2026-02-08'
  AND t.type = 'purchase'
  AND t.amount < 0
GROUP BY tp.id, tp.full_name
HAVING COUNT(*) > 1
ORDER BY total_transacciones DESC;

-- 3️⃣ Ver profesores con pedidos duplicados o triplicados del 8 o 9 de febrero
SELECT 
  '🚨 PROFESORES CON MÚLTIPLES TRANSACCIONES' as problema,
  tp.full_name as profesor,
  DATE(t.created_at) as fecha,
  COUNT(*) as cantidad_transacciones,
  STRING_AGG(t.description, ' | ' ORDER BY t.created_at) as descripciones,
  STRING_AGG(t.amount::text, ' | ' ORDER BY t.created_at) as montos
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE DATE(t.created_at) IN ('2026-02-08', '2026-02-09')
  AND t.type = 'purchase'
  AND t.amount < 0
GROUP BY tp.id, tp.full_name, DATE(t.created_at)
HAVING COUNT(*) >= 2
ORDER BY fecha DESC, cantidad_transacciones DESC;

-- 4️⃣ Ver las lunch_orders del 8 de febrero
SELECT 
  '🍽️ PEDIDOS DE ALMUERZO 8/2' as tipo,
  lo.id as order_id,
  tp.full_name as profesor,
  lo.order_date,
  lo.status,
  lo.is_cancelled,
  TO_CHAR(lo.created_at, 'YYYY-MM-DD HH24:MI:SS') as pedido_creado
FROM lunch_orders lo
JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE lo.order_date = '2026-02-08'
ORDER BY lo.created_at;
