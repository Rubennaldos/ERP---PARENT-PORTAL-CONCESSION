-- Ver la última transacción creada para profesorjbl
SELECT 
    t.id,
    t.created_at,
    t.description,
    t.payment_status,
    t.payment_method,
    t.operation_number,
    t.metadata,
    t.metadata::text as metadata_texto,
    tp.full_name
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
ORDER BY t.created_at DESC
LIMIT 5;
