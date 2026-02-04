-- =====================================================
-- VERIFICAR ESTADO ACTUAL DE TRANSACCIONES
-- Para entender qué quedó después de borrar ventas
-- =====================================================

-- 1. Ver resumen por tipo de transacción
SELECT 
  type,
  COUNT(*) as cantidad,
  SUM(amount) as total_monto
FROM transactions
WHERE created_at >= '2026-02-01'
GROUP BY type
ORDER BY type;

-- 2. Ver las transacciones tipo 'purchase' (compras de almuerzo)
SELECT 
  t.id,
  t.type,
  t.amount,
  t.description,
  t.school_id,
  s.name as school_name,
  t.student_id,
  t.teacher_id,
  t.manual_client_name,
  t.payment_status,
  t.created_at
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-01'
ORDER BY t.created_at DESC
LIMIT 20;

-- 3. Ver si hay transacciones tipo 'sale' (ventas del POS)
SELECT 
  t.id,
  t.type,
  t.amount,
  t.description,
  t.school_id,
  s.name as school_name,
  t.created_at
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
WHERE t.type = 'sale'
  AND t.created_at >= '2026-02-01'
ORDER BY t.created_at DESC;

-- 4. Ver transacciones sin school_id
SELECT 
  t.id,
  t.type,
  t.amount,
  t.description,
  t.student_id,
  t.teacher_id,
  t.manual_client_name,
  t.created_at
FROM transactions t
WHERE t.school_id IS NULL
  AND t.created_at >= '2026-02-01'
ORDER BY t.created_at DESC
LIMIT 10;
