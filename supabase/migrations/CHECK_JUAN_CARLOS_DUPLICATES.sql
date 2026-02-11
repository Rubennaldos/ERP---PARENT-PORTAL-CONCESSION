-- =====================================================
-- VERIFICACIÓN: ¿LAS TRANSACCIONES DE JUAN CARLOS SON DUPLICADAS?
-- =====================================================

-- 1. VER TODAS SUS TRANSACCIONES PENDIENTES
SELECT 
    t.id as transaction_id,
    t.created_at as fecha_creacion,
    t.amount as monto,
    t.description,
    t.payment_status,
    t.created_by,
    CASE 
        WHEN t.created_by IS NULL THEN 'SIN REGISTRAR (sistema)'
        WHEN t.created_by = t.teacher_id THEN 'EL PROFESOR MISMO'
        ELSE 'OTRO USUARIO'
    END as quien_lo_creo
FROM transactions t
WHERE 
    t.teacher_id IN (
        SELECT id FROM profiles 
        WHERE full_name ILIKE '%Juan Carlos Lynch%'
    )
    AND t.payment_status = 'pending'
ORDER BY t.created_at DESC;

-- 2. VER SUS LUNCH_ORDERS (pedidos reales de almuerzo)
SELECT 
    lo.id as lunch_order_id,
    lo.order_date,
    lo.menu_item,
    lo.price,
    lo.status,
    lo.created_at,
    lo.lunch_category_id,
    lc.name as categoria_menu,
    lc.price as precio_categoria
FROM lunch_orders lo
LEFT JOIN lunch_categories lc ON lo.lunch_category_id = lc.id
WHERE 
    lo.teacher_id IN (
        SELECT id FROM profiles 
        WHERE full_name ILIKE '%Juan Carlos Lynch%'
    )
    AND lo.order_date >= '2026-02-08'
ORDER BY lo.order_date DESC, lo.created_at DESC;

-- 3. COMPARAR: ¿Cuántos lunch_orders vs cuántas transacciones?
SELECT 
    'Lunch Orders (pedidos reales)' as tipo,
    COUNT(*) as cantidad
FROM lunch_orders lo
WHERE 
    lo.teacher_id IN (
        SELECT id FROM profiles 
        WHERE full_name ILIKE '%Juan Carlos Lynch%'
    )
    AND lo.order_date >= '2026-02-08'

UNION ALL

SELECT 
    'Transacciones pendientes' as tipo,
    COUNT(*) as cantidad
FROM transactions t
WHERE 
    t.teacher_id IN (
        SELECT id FROM profiles 
        WHERE full_name ILIKE '%Juan Carlos Lynch%'
    )
    AND t.payment_status = 'pending';

-- 4. VERIFICAR EN TODAS LAS SEDES: ¿Hay más profesores con duplicados?
-- (Más transacciones pendientes que lunch_orders)
SELECT 
    p.full_name as profesor,
    s.name as sede,
    COUNT(DISTINCT t.id) as total_transacciones_pending,
    COUNT(DISTINCT lo.id) as total_lunch_orders,
    CASE 
        WHEN COUNT(DISTINCT t.id) > COUNT(DISTINCT lo.id) THEN '⚠️ POSIBLE DUPLICADO'
        WHEN COUNT(DISTINCT t.id) = COUNT(DISTINCT lo.id) THEN '✅ OK'
        ELSE '❓ FALTAN TRANSACCIONES'
    END as estado
FROM profiles p
JOIN schools s ON p.school_id = s.id
LEFT JOIN transactions t ON t.teacher_id = p.id AND t.payment_status = 'pending' AND t.type = 'purchase'
LEFT JOIN lunch_orders lo ON lo.teacher_id = p.id AND lo.order_date >= '2026-02-08'
WHERE p.role = 'teacher'
GROUP BY p.full_name, s.name
HAVING COUNT(DISTINCT t.id) > 0
ORDER BY 
    CASE WHEN COUNT(DISTINCT t.id) > COUNT(DISTINCT lo.id) THEN 0 ELSE 1 END,
    p.full_name;
