-- =====================================================
-- VERIFICAR LUNCH_ORDERS SIN TRANSACCIÓN DE PROFESORJBL
-- =====================================================

-- PASO 1: Ver todos los lunch_orders de profesorjbl
SELECT 
    '📋 TODOS LOS PEDIDOS DE PROFESORJBL' as titulo,
    lo.id as lunch_order_id,
    lo.order_date,
    lo.status,
    lo.is_cancelled,
    tp.full_name
FROM public.lunch_orders lo
LEFT JOIN public.teacher_profiles tp ON lo.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
ORDER BY lo.order_date DESC;

-- PASO 2: Ver cuáles tienen transacción asociada
SELECT 
    '💰 PEDIDOS CON TRANSACCIÓN' as titulo,
    lo.id as lunch_order_id,
    lo.order_date,
    lo.status,
    t.id as transaction_id,
    t.payment_status,
    t.metadata
FROM public.lunch_orders lo
LEFT JOIN public.teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN public.transactions t ON t.metadata->>'lunch_order_id' = lo.id::text
WHERE tp.full_name = 'profesorjbl'
ORDER BY lo.order_date DESC;

-- PASO 3: Encontrar pedidos SIN transacción (estos crean transacciones virtuales)
SELECT 
    '⚠️ PEDIDOS SIN TRANSACCIÓN (APARECEN EN COBRAR)' as titulo,
    lo.id as lunch_order_id,
    lo.order_date,
    lo.status,
    lo.is_cancelled
FROM public.lunch_orders lo
LEFT JOIN public.teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN public.transactions t ON t.metadata->>'lunch_order_id' = lo.id::text
WHERE tp.full_name = 'profesorjbl'
  AND t.id IS NULL  -- No tiene transacción
  AND lo.status IN ('confirmed', 'delivered')  -- Está confirmado o entregado
  AND lo.is_cancelled = false;  -- No está cancelado
