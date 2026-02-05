-- =====================================================
-- REVERTIR: Volver transacciones a PENDING si no fueron pagadas realmente
-- =====================================================

-- Ver cuáles marcamos como paid incorrectamente
SELECT 
    t.id,
    t.created_at,
    t.amount,
    t.description,
    COALESCE(s.full_name, tp.full_name, t.manual_client_name) as cliente,
    t.payment_status,
    t.payment_method
FROM public.transactions t
LEFT JOIN public.students s ON t.student_id = s.id
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-01'
  AND t.payment_method = 'efectivo'  -- Las que acabamos de marcar
ORDER BY t.created_at DESC;

-- ⚠️ SOLO ejecuta esto si quieres REVERTIR el cambio anterior
-- Esto devolverá a 'pending' las transacciones que NO tienen un pago real
/*
UPDATE public.transactions
SET 
    payment_status = 'pending',
    payment_method = NULL
WHERE type = 'purchase'
  AND created_at >= '2026-02-01'
  AND payment_method = 'efectivo'
  AND operation_number = 'Ajuste manual';  -- Solo las que marcamos nosotros
*/
