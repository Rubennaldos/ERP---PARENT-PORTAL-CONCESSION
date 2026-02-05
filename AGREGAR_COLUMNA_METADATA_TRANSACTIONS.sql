-- =====================================================
-- AGREGAR COLUMNA METADATA A TRANSACTIONS
-- Soluciona el error: "Could not find the 'metadata' column"
-- =====================================================

-- Agregar columna metadata si no existe
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Agregar comentario para documentación
COMMENT ON COLUMN public.transactions.metadata IS 'Metadatos adicionales de la transacción (ej: lunch_order_id, source, etc.)';

-- Crear índice para búsquedas por metadata (opcional, pero útil)
CREATE INDEX IF NOT EXISTS idx_transactions_metadata ON public.transactions USING GIN (metadata);

-- Verificar que se agregó correctamente
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
  AND column_name = 'metadata';

-- ✅ Si ves la columna metadata con tipo jsonb, está todo correcto
