-- ============================================
-- DEBUG: Verificar pedidos anulados
-- ============================================

-- 1. Ver estructura de la tabla lunch_orders
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lunch_orders'
AND column_name LIKE '%cancel%'
ORDER BY ordinal_position;

-- 2. Ver todos los pedidos con su estado de cancelación
SELECT 
  id,
  COALESCE(student_id::text, teacher_id::text, 'manual') as client_type,
  order_date,
  status,
  is_cancelled,
  cancellation_reason,
  cancelled_at,
  created_at
FROM lunch_orders
WHERE order_date >= '2026-02-03'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Contar pedidos anulados vs activos
SELECT 
  CASE 
    WHEN is_cancelled IS NULL THEN 'NULL'
    WHEN is_cancelled = true THEN 'ANULADO'
    ELSE 'ACTIVO'
  END as estado_cancelacion,
  COUNT(*) as cantidad
FROM lunch_orders
WHERE order_date >= '2026-02-03'
GROUP BY is_cancelled
ORDER BY is_cancelled;

-- ============================================
-- RESULTADO ESPERADO:
-- - Debe existir la columna is_cancelled (boolean)
-- - Debe tener valores true/false (no NULL)
-- - Los pedidos anulados deben tener is_cancelled = true
-- ============================================
