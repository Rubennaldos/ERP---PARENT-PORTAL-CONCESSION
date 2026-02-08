-- ================================================
-- VERIFICAR VENTAS DE PRUEBA O TEST NO GUARDADAS
-- ================================================

-- 1. Ver tickets con nombres sospechosos (test, prueba, demo, etc.)
SELECT 
  t.id,
  t.ticket_code,
  t.created_at,
  t.amount,
  t.type,
  t.is_deleted,
  t.client_name,
  p.email as cajero_email,
  p.full_name as cajero_nombre,
  s.name as sede_nombre
FROM transactions t
LEFT JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools s ON t.school_id = s.id
WHERE 
  (
    LOWER(t.client_name) LIKE '%test%' OR
    LOWER(t.client_name) LIKE '%prueba%' OR
    LOWER(t.client_name) LIKE '%demo%' OR
    LOWER(t.ticket_code) LIKE '%test%' OR
    LOWER(t.ticket_code) LIKE '%prueba%'
  )
  AND t.created_at >= NOW() - INTERVAL '30 days'
ORDER BY t.created_at DESC;

-- 2. Ver ventas sin ticket_code (posibles ventas no finalizadas)
SELECT 
  COUNT(*) as ventas_sin_ticket,
  SUM(amount) as monto_total,
  COUNT(DISTINCT created_by) as cajeros_diferentes
FROM transactions
WHERE ticket_code IS NULL
  AND type = 'purchase'
  AND created_at >= NOW() - INTERVAL '7 days';

-- 3. Ver cajeros y cuántas ventas sin ticket_code tienen
SELECT 
  p.email as cajero_email,
  p.full_name as cajero_nombre,
  COUNT(*) as ventas_sin_ticket,
  SUM(t.amount) as monto_total
FROM transactions t
LEFT JOIN profiles p ON t.created_by = p.id
WHERE t.ticket_code IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.email, p.full_name
ORDER BY ventas_sin_ticket DESC;

-- 4. Ver transacciones de almuerzos (lunch_orders)
SELECT 
  COUNT(*) as total_almuerzos,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pendientes,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as pagados,
  SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as efectivo,
  SUM(CASE WHEN payment_method = 'credit' THEN 1 ELSE 0 END) as credito
FROM lunch_orders
WHERE order_date >= NOW() - INTERVAL '7 days';

-- 5. Ver si hay ventas duplicadas (mismo cajero, mismo monto, mismo minuto)
SELECT 
  created_by,
  amount,
  DATE_TRUNC('minute', created_at) as minuto,
  COUNT(*) as cantidad,
  ARRAY_AGG(ticket_code) as tickets
FROM transactions
WHERE type = 'purchase'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY created_by, amount, DATE_TRUNC('minute', created_at)
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- 6. Ver ventas por cajero en los últimos 7 días
SELECT 
  p.email as cajero_email,
  p.full_name as cajero_nombre,
  p.role as rol,
  s.name as sede_asignada,
  COUNT(*) as total_ventas,
  COUNT(CASE WHEN t.ticket_code IS NOT NULL THEN 1 END) as con_ticket,
  COUNT(CASE WHEN t.ticket_code IS NULL THEN 1 END) as sin_ticket,
  SUM(ABS(t.amount)) as monto_total
FROM transactions t
LEFT JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools s ON p.school_id = s.id
WHERE t.type = 'purchase'
  AND t.created_at >= NOW() - INTERVAL '7 days'
  AND (t.is_deleted IS NULL OR t.is_deleted = false)
GROUP BY p.email, p.full_name, p.role, s.name
ORDER BY total_ventas DESC;
