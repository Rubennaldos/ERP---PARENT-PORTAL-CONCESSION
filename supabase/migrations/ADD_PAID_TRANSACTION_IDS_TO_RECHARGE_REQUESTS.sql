-- =============================================
-- Agregar campo paid_transaction_ids a recharge_requests
-- Para rastrear qué transacciones se están pagando con el voucher
-- (complementa a lunch_order_ids que solo tiene IDs de lunch_orders)
-- =============================================

ALTER TABLE recharge_requests
  ADD COLUMN IF NOT EXISTS paid_transaction_ids UUID[];

-- Agregar 'debt_payment' como tipo válido de solicitud
ALTER TABLE recharge_requests DROP CONSTRAINT IF EXISTS recharge_requests_request_type_check;
ALTER TABLE recharge_requests ADD CONSTRAINT recharge_requests_request_type_check
  CHECK (request_type IN ('recharge', 'lunch_payment', 'debt_payment'));
