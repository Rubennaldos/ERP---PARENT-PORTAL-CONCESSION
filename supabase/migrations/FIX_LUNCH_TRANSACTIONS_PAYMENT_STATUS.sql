-- =====================================================
-- VERIFICAR POR QUÉ LOS ALMUERZOS NO APARECEN EN COBRANZAS
-- =====================================================

-- 1. Ver las transacciones de almuerzo con su estado de pago
SELECT 
  t.id,
  t.type,
  t.amount,
  t.payment_status,
  t.student_id,
  t.teacher_id,
  t.manual_client_name,
  t.school_id,
  s.name as school_name,
  tp.full_name as teacher_name,
  t.description,
  t.created_at
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-04'
ORDER BY t.created_at DESC;

-- 2. Contar cuántos tienen payment_status = 'pending'
SELECT 
  payment_status,
  COUNT(*) as cantidad
FROM transactions
WHERE type = 'purchase'
  AND created_at >= '2026-02-04'
GROUP BY payment_status;

-- 3. ACTUALIZAR payment_status a 'pending' si está NULL o incorrecto
UPDATE transactions
SET payment_status = 'pending'
WHERE type = 'purchase'
  AND created_at >= '2026-02-04'
  AND (payment_status IS NULL OR payment_status != 'pending');

-- 4. Verificar después de actualizar
SELECT 
  t.id,
  t.payment_status,
  t.teacher_id,
  tp.full_name as teacher_name,
  t.amount,
  t.description
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-04'
ORDER BY t.created_at DESC;
