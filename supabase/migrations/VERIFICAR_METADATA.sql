-- Ver si las transacciones tienen el metadata correcto
SELECT 
    t.id,
    t.created_at,
    t.description,
    COALESCE(s.full_name, tp.full_name, t.manual_client_name) as cliente,
    t.payment_status,
    t.metadata,
    t.metadata->>'lunch_order_id' as lunch_order_id_extraido,
    t.metadata->>'source' as source
FROM public.transactions t
LEFT JOIN public.students s ON t.student_id = s.id
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-01'
  AND t.description ILIKE '%Almuerzo%'
ORDER BY t.created_at DESC
LIMIT 20;
