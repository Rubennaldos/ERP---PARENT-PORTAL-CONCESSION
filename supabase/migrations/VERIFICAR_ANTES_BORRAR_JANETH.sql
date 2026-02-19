-- ============================================================
-- VERIFICACIÓN COMPLETA ANTES DE BORRAR
-- Usuario: janeth.valderrama@upsjb.edu.pe
-- UID: 4ed725ab-854b-442a-95e0-2f67102fc0ad
-- ============================================================

-- 1. Ver su perfil actual (rol, sede, deuda)
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.school_id,
  s.name AS sede,
  p.balance,
  p.free_account
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 2. Ver columnas de teacher_profiles y si existe el registro
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'teacher_profiles' 
ORDER BY ordinal_position;

-- 2b. Ver si existe como profesor
SELECT * FROM teacher_profiles
WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 3. Ver sus transacciones (ventas y cobros)
SELECT 
  t.id,
  t.type,
  t.amount,
  t.payment_status,
  t.description,
  t.created_at,
  s.name AS sede
FROM transactions t
LEFT JOIN schools s ON s.id = t.school_id
WHERE t.teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
   OR t.created_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
ORDER BY t.created_at DESC
LIMIT 50;

-- 4. Cuántas transacciones pendientes (deudas)
SELECT 
  COUNT(*) AS total_transacciones,
  SUM(CASE WHEN payment_status = 'pending' THEN ABS(amount) ELSE 0 END) AS deuda_pendiente,
  SUM(CASE WHEN payment_status = 'paid' THEN ABS(amount) ELSE 0 END) AS total_pagado
FROM transactions
WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 5. Ver pedidos de almuerzo
SELECT 
  COUNT(*) AS total_pedidos,
  SUM(CASE WHEN is_cancelled = false AND status != 'paid' THEN final_price ELSE 0 END) AS pendiente_almuerzo
FROM lunch_orders
WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 6. Resumen final de deudas
SELECT
  (SELECT COALESCE(SUM(ABS(amount)), 0) FROM transactions 
   WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad' 
   AND payment_status = 'pending' AND type = 'purchase') AS deuda_compras,
  (SELECT COUNT(*) FROM transactions 
   WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad') AS total_transacciones,
  (SELECT COUNT(*) FROM lunch_orders 
   WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad' 
   AND is_cancelled = false) AS pedidos_almuerzo_activos;
