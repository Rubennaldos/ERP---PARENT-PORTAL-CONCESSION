-- 🔧 AGREGAR COLUMNAS FALTANTES PARA PAGOS MIXTOS EN TRANSACTIONS

-- ===================================================================
-- Agregar columnas para pagos mixtos
-- ===================================================================
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS paid_with_mixed BOOLEAN DEFAULT false;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS cash_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS card_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS yape_amount DECIMAL(10,2) DEFAULT 0;

-- ===================================================================
-- Verificación
-- ===================================================================
SELECT 
  '✅ Columnas agregadas' as resultado,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('paid_with_mixed', 'cash_amount', 'card_amount', 'yape_amount')
ORDER BY column_name;
