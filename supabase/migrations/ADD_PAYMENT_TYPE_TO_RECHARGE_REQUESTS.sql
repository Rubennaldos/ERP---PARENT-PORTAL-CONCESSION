-- ============================================================
-- Agregar tipo de pago y descripción a recharge_requests
-- Para diferenciar recargas de pagos de almuerzo
-- ============================================================

ALTER TABLE recharge_requests
  ADD COLUMN IF NOT EXISTS request_type  TEXT DEFAULT 'recharge' CHECK (request_type IN ('recharge', 'lunch_payment')),
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS lunch_order_ids UUID[];

-- Actualizar registros existentes
UPDATE recharge_requests 
SET request_type = 'recharge', description = 'Recarga de saldo'
WHERE request_type IS NULL;

NOTIFY pgrst, 'reload schema';
SELECT 'Columnas request_type, description y lunch_order_ids agregadas a recharge_requests' AS resultado;
