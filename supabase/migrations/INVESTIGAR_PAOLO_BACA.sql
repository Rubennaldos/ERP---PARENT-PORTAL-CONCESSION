-- ============================================================
-- INVESTIGACIÓN: Paolo Baca - Pagado en Pedidos pero Deuda en Cobranzas
-- Ticket: HIST-20260203-022
-- ============================================================

-- PASO 1: BUSCAR TODAS LAS TRANSACCIONES de Paolo Baca
-- (por nombre manual, descripción, o cualquier referencia)
SELECT 
  t.id,
  t.ticket_code,
  t.description,
  t.amount,
  t.payment_status,
  t.payment_method,
  t.type,
  t.created_at,
  t.student_id,
  t.teacher_id,
  t.manual_client_name,
  t.school_id,
  s.name AS sede,
  t.metadata::text AS metadata
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
WHERE (
  t.manual_client_name ILIKE '%paolo%'
  OR t.manual_client_name ILIKE '%baca%'
  OR t.description ILIKE '%paolo%baca%'
  OR t.ticket_code = 'HIST-20260203-022'
)
ORDER BY t.created_at DESC
LIMIT 100


-- PASO 2: BUSCAR TODAS LAS LUNCH_ORDERS de Paolo Baca
SELECT 
  lo.id,
  lo.order_date,
  lo.status,
  lo.created_at,
  lo.delivered_at,
  lo.is_cancelled,
  lo.manual_name,
  lo.student_id,
  lo.teacher_id,
  lo.payment_method,
  lo.final_price,
  lo.base_price,
  lo.quantity,
  lo.school_id,
  s.name AS sede
FROM lunch_orders lo
LEFT JOIN schools s ON lo.school_id = s.id
WHERE (
  lo.manual_name ILIKE '%paolo%'
  OR lo.manual_name ILIKE '%baca%'
)
ORDER BY lo.order_date DESC
LIMIT 100


-- PASO 3: CRUZAR - Para cada lunch_order de Paolo Baca
-- ver si tiene transacción vinculada por metadata.lunch_order_id
SELECT 
  lo.id AS lunch_order_id,
  lo.order_date,
  lo.status AS order_status,
  lo.manual_name,
  lo.final_price AS order_price,
  lo.payment_method AS order_payment_method,
  t.id AS transaction_id,
  t.ticket_code,
  t.payment_status AS tx_payment_status,
  t.payment_method AS tx_payment_method,
  t.amount AS tx_amount,
  t.metadata::text AS tx_metadata
FROM lunch_orders lo
LEFT JOIN transactions t ON (
  t.metadata->>'lunch_order_id' = lo.id::text
  AND t.type = 'purchase'
  AND t.payment_status != 'cancelled'
)
WHERE (
  lo.manual_name ILIKE '%paolo%'
  OR lo.manual_name ILIKE '%baca%'
)
ORDER BY lo.order_date DESC
LIMIT 100


-- PASO 4: Buscar si hay teacher_profile para Paolo Baca
-- (el usuario dijo que ahora ya tiene cuenta)
SELECT 
  id,
  full_name,
  email,
  school_id_1,
  created_at
FROM teacher_profiles
WHERE full_name ILIKE '%paolo%baca%'
   OR full_name ILIKE '%baca%'
LIMIT 20


-- PASO 5: BUSCAR LA TRANSACCION ESPECIFICA del ticket HIST-20260203-022
SELECT 
  t.*,
  s.name AS sede_nombre
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
WHERE t.ticket_code = 'HIST-20260203-022'
LIMIT 5
