-- =====================================================
-- VER LAS 7 TRANSACCIONES PENDING Y SU ESTADO
-- =====================================================

-- PASO 1: Ver las 7 transacciones pending en detalle
SELECT 
    '🔴 LAS 7 TRANSACCIONES PENDING' as titulo,
    t.id,
    t.created_at,
    t.amount,
    t.description,
    COALESCE(s.full_name, tp.full_name, t.manual_client_name) as cliente,
    sch.name as sede
FROM public.transactions t
LEFT JOIN public.students s ON t.student_id = s.id
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN public.schools sch ON t.school_id = sch.id
WHERE t.type = 'purchase'
  AND t.payment_status = 'pending'
  AND t.created_at >= '2026-02-01'
ORDER BY t.created_at DESC;

-- PASO 2: Ver si tienen duplicados PAID
SELECT 
    '💰 VERIFICAR SI YA ESTÁN PAGADOS' as titulo,
    COALESCE(s.full_name, tp.full_name, t.manual_client_name) as cliente,
    t.description,
    t.payment_status,
    COUNT(*) as cantidad,
    ARRAY_AGG(t.id) as transaction_ids,
    ARRAY_AGG(t.payment_status) as statuses,
    ARRAY_AGG(t.created_at) as fechas
FROM public.transactions t
LEFT JOIN public.students s ON t.student_id = s.id
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-01'
  AND (
    COALESCE(t.student_id::text, t.teacher_id::text, t.manual_client_name) IN (
      SELECT COALESCE(t2.student_id::text, t2.teacher_id::text, t2.manual_client_name)
      FROM public.transactions t2
      WHERE t2.payment_status = 'pending'
        AND t2.created_at >= '2026-02-01'
    )
  )
GROUP BY cliente, t.description, t.payment_status
ORDER BY cliente, t.description;

-- PASO 3: ACTUALIZAR TODAS LAS PENDING A PAID
-- ⚠️ ESTO MARCARÁ TODAS COMO PAGADAS
-- Solo ejecutar si estás seguro de que todas ya fueron pagadas

/*
UPDATE public.transactions
SET 
    payment_status = 'paid',
    payment_method = 'efectivo',
    operation_number = 'Ajuste manual'
WHERE id IN (
    SELECT t.id
    FROM public.transactions t
    WHERE t.type = 'purchase'
      AND t.payment_status = 'pending'
      AND t.created_at >= '2026-02-01'
);
*/

-- PASO 4: Verificar resultado
SELECT 
    '✅ DESPUÉS DE ACTUALIZAR' as titulo,
    COUNT(*) as transacciones_pending_restantes
FROM public.transactions
WHERE type = 'purchase'
  AND payment_status = 'pending'
  AND created_at >= '2026-02-01';
