-- =====================================================
-- AGREGAR COLUMNA operation_number A transactions
-- =====================================================
-- Este script agrega la columna para almacenar el número
-- de operación de pagos con Yape, Plin, Transferencia, Tarjeta
-- =====================================================

-- Agregar columna operation_number si no existe
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS operation_number VARCHAR(100) DEFAULT NULL;

-- Agregar comentario para documentación
COMMENT ON COLUMN public.transactions.operation_number IS 'Número de operación para pagos digitales (Yape, Plin, Transferencia, Tarjeta)';

-- Crear índice para búsquedas rápidas por número de operación
CREATE INDEX IF NOT EXISTS idx_transactions_operation_number ON public.transactions(operation_number) WHERE operation_number IS NOT NULL;

-- Verificar que se creó correctamente
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'operation_number';
