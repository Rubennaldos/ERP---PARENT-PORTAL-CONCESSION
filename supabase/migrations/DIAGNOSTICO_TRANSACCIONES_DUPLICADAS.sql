-- =====================================================
-- DIAGNÓSTICO: Ver estado de transacciones y duplicados
-- =====================================================
-- Este script ayuda a identificar transacciones duplicadas
-- y ver el estado actual de los pagos
-- =====================================================

-- 1. Ver transacciones del profesor "profesorjbl" (últimas 10)
SELECT 
    t.id,
    t.created_at,
    t.amount,
    t.payment_status,
    t.payment_method,
    t.operation_number,
    t.description,
    t.metadata,
    tp.full_name as profesor_nombre
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name ILIKE '%profesorjbl%'
ORDER BY t.created_at DESC
LIMIT 10;

-- 2. Buscar DUPLICADOS de almuerzos (mismo día, mismo profesor, múltiples transacciones)
SELECT 
    DATE(t.created_at) as fecha_transaccion,
    t.description,
    tp.full_name as profesor_nombre,
    t.payment_status,
    COUNT(*) as cantidad_transacciones,
    ARRAY_AGG(t.id) as ids_transacciones,
    ARRAY_AGG(t.payment_status) as estados,
    SUM(ABS(t.amount)) as monto_total
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.type = 'purchase'
  AND t.description ILIKE '%Almuerzo%'
  AND DATE(t.created_at) >= '2026-02-01'
GROUP BY DATE(t.created_at), t.description, tp.full_name, t.payment_status
HAVING COUNT(*) > 1
ORDER BY fecha_transaccion DESC;

-- 3. Ver pedidos de almuerzo con sus transacciones asociadas
SELECT 
    lo.id as lunch_order_id,
    lo.order_date,
    lo.status as order_status,
    lo.is_cancelled,
    tp.full_name as profesor_nombre,
    COUNT(t.id) as cantidad_transacciones,
    ARRAY_AGG(t.id) as transaction_ids,
    ARRAY_AGG(t.payment_status) as payment_statuses,
    ARRAY_AGG(t.amount) as amounts
FROM public.lunch_orders lo
LEFT JOIN public.teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN public.transactions t ON t.metadata->>'lunch_order_id' = lo.id::text
WHERE lo.order_date >= '2026-02-01'
  AND lo.teacher_id IS NOT NULL
GROUP BY lo.id, lo.order_date, lo.status, lo.is_cancelled, tp.full_name
HAVING COUNT(t.id) > 1  -- Solo mostrar los que tienen más de 1 transacción
ORDER BY lo.order_date DESC;

-- 4. Ver TODAS las transacciones pendientes o parciales (lo que aparece en "¡Cobrar!")
SELECT 
    t.id,
    t.created_at,
    t.amount,
    t.payment_status,
    t.description,
    COALESCE(s.full_name, tp.full_name, t.manual_client_name) as cliente_nombre,
    sch.name as sede_nombre
FROM public.transactions t
LEFT JOIN public.students s ON t.student_id = s.id
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN public.schools sch ON t.school_id = sch.id
WHERE t.type = 'purchase'
  AND t.payment_status IN ('pending', 'partial')
ORDER BY t.created_at DESC
LIMIT 20;
