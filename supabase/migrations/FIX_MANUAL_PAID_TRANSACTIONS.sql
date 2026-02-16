-- ============================================================
-- FIX: Transacciones de pedidos manuales ya pagados
-- que tienen payment_status = 'pending' cuando deberian ser 'paid'
-- ============================================================
-- PROBLEMA: Cuando un admin registra un pedido manual con pago
-- inmediato (efectivo, tarjeta, yape, etc.), el PhysicalOrderWizard
-- NO crea transaccion (correcto). Pero luego, el proceso de
-- backfill o close_lunch_day creo transacciones con
-- payment_status = 'pending' para estos pedidos YA PAGADOS.
-- 
-- EJEMPLO: Paolo Baca - ticket HIST-20260203-022
-- Pedido pagado con tarjeta, pero la transaccion dice 'pending'
-- ============================================================

-- ============================================================
-- PASO 1: DIAGNOSTICO - Encontrar TODOS los casos afectados
-- Transacciones con payment_status='pending' vinculadas a
-- lunch_orders que tienen payment_method != 'pagar_luego'
-- ============================================================
SELECT 
  t.id AS transaction_id,
  t.ticket_code,
  t.payment_status AS tx_status,
  t.amount,
  t.manual_client_name,
  t.description,
  lo.id AS lunch_order_id,
  lo.payment_method AS order_payment_method,
  lo.manual_name AS order_manual_name,
  lo.order_date,
  lo.status AS order_status
FROM transactions t
INNER JOIN lunch_orders lo ON lo.id = (t.metadata->>'lunch_order_id')::uuid
WHERE t.payment_status = 'pending'
  AND t.type = 'purchase'
  AND lo.manual_name IS NOT NULL
  AND lo.payment_method IS NOT NULL
  AND lo.payment_method != 'pagar_luego'
ORDER BY t.created_at DESC
LIMIT 200


-- ============================================================
-- PASO 2: FIX - Actualizar estas transacciones a 'paid'
-- Tambien copiar el payment_method del lunch_order
-- ============================================================
-- DESCOMENTA PARA EJECUTAR:

-- UPDATE transactions t
-- SET 
--   payment_status = 'paid',
--   payment_method = lo.payment_method,
--   metadata = COALESCE(t.metadata, '{}'::jsonb) || jsonb_build_object(
--     'auto_fixed', true,
--     'fix_reason', 'manual_order_already_paid',
--     'fix_date', NOW()::text,
--     'original_payment_status', t.payment_status
--   )
-- FROM lunch_orders lo
-- WHERE lo.id = (t.metadata->>'lunch_order_id')::uuid
--   AND t.payment_status = 'pending'
--   AND t.type = 'purchase'
--   AND lo.manual_name IS NOT NULL
--   AND lo.payment_method IS NOT NULL
--   AND lo.payment_method != 'pagar_luego'


-- ============================================================
-- PASO 3: VERIFICACION - Confirmar que no quedan casos
-- ============================================================
-- SELECT 
--   COUNT(*) AS casos_restantes
-- FROM transactions t
-- INNER JOIN lunch_orders lo ON lo.id = (t.metadata->>'lunch_order_id')::uuid
-- WHERE t.payment_status = 'pending'
--   AND t.type = 'purchase'
--   AND lo.manual_name IS NOT NULL
--   AND lo.payment_method IS NOT NULL
--   AND lo.payment_method != 'pagar_luego'
-- LIMIT 1
