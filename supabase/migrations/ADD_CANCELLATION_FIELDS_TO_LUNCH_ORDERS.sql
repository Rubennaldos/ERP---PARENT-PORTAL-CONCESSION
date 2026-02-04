-- =====================================================
-- AGREGAR CAMPOS DE ANULACIÓN A LUNCH_ORDERS
-- =====================================================

-- 1. Agregar columna is_cancelled
ALTER TABLE lunch_orders 
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;

-- 2. Agregar columna cancellation_reason
ALTER TABLE lunch_orders 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Agregar columna cancelled_by (referencia al usuario que anuló)
ALTER TABLE lunch_orders 
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 4. Agregar columna cancelled_at (timestamp de anulación)
ALTER TABLE lunch_orders 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 5. Crear índice para pedidos anulados
CREATE INDEX IF NOT EXISTS idx_lunch_orders_cancelled 
ON lunch_orders(is_cancelled) 
WHERE is_cancelled = TRUE;

-- 6. Comentarios para documentación
COMMENT ON COLUMN lunch_orders.is_cancelled IS 'Indica si el pedido fue anulado';
COMMENT ON COLUMN lunch_orders.cancellation_reason IS 'Motivo de anulación del pedido';
COMMENT ON COLUMN lunch_orders.cancelled_by IS 'Usuario que anuló el pedido';
COMMENT ON COLUMN lunch_orders.cancelled_at IS 'Fecha y hora de anulación';
