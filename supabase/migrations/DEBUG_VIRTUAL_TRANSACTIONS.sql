-- =====================================================
-- VERIFICAR ESTADO REAL DE LA BASE DE DATOS
-- =====================================================

-- PASO 1: Ver transacciones REALES de Milagros en la BD
SELECT 
  '🔍 TRANSACCIONES REALES EN BD - MILAGROS' as tipo,
  t.id,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado,
  t.payment_status,
  COALESCE(p.full_name, '🤖 SISTEMA') as creado_por
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE tp.full_name ILIKE '%Milagros%Vilca%'
  AND DATE(t.created_at) >= '2026-02-08'
ORDER BY t.created_at;

-- PASO 2: Ver PEDIDOS de almuerzo de Milagros
SELECT 
  '🍽️ PEDIDOS DE ALMUERZO - MILAGROS' as tipo,
  lo.id as order_id,
  lo.order_date,
  lo.status,
  TO_CHAR(lo.created_at, 'YYYY-MM-DD HH24:MI:SS') as pedido_creado,
  lc.name as categoria,
  lc.price as precio
FROM lunch_orders lo
LEFT JOIN lunch_categories lc ON lo.category_id = lc.id
WHERE lo.teacher_id IN (
  SELECT id FROM teacher_profiles WHERE full_name ILIKE '%Milagros%Vilca%'
)
AND lo.order_date >= '2026-02-08'
ORDER BY lo.order_date;

-- PASO 3: Ver si BillingCollection está creando virtuales
-- (Pedidos sin transacción correspondiente)
SELECT 
  '⚠️ PEDIDOS SIN TRANSACCIÓN (Se mostrarán como virtuales)' as problema,
  tp.full_name as profesor,
  lo.id as order_id,
  lo.order_date,
  lc.name as categoria,
  lc.price as precio
FROM lunch_orders lo
JOIN teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN lunch_categories lc ON lo.category_id = lc.id
LEFT JOIN transactions t ON (
  t.teacher_id = lo.teacher_id 
  AND DATE(t.created_at) = lo.order_date
  AND t.description ILIKE '%almuerzo%'
)
WHERE 
  lo.teacher_id IN (SELECT id FROM teacher_profiles WHERE full_name ILIKE '%Milagros%Vilca%')
  AND lo.order_date >= '2026-02-08'
  AND t.id IS NULL  -- NO tiene transacción
ORDER BY lo.order_date;

-- PASO 4: Contar todos los profesores con este problema
SELECT 
  '📊 RESUMEN - Profesores con pedidos sin transacción' as tipo,
  tp.full_name as profesor,
  COUNT(DISTINCT lo.id) as pedidos_sin_transaccion
FROM lunch_orders lo
JOIN teacher_profiles tp ON lo.teacher_id = tp.id
LEFT JOIN transactions t ON (
  t.teacher_id = lo.teacher_id 
  AND DATE(t.created_at) = lo.order_date
  AND t.description ILIKE '%almuerzo%'
)
WHERE 
  lo.order_date >= '2026-02-08'
  AND t.id IS NULL
GROUP BY tp.full_name
ORDER BY pedidos_sin_transaccion DESC
LIMIT 20;
