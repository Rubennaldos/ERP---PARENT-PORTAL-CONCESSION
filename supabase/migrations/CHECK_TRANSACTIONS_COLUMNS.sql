-- 🔍 VERIFICAR COLUMNAS DE TRANSACTIONS

-- ===================================================================
-- Ver todas las columnas de la tabla transactions
-- ===================================================================
SELECT 
  '📋 Columnas de transactions' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- ===================================================================
-- Verificar si existe total_amount
-- ===================================================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
        AND column_name = 'total_amount'
    ) THEN '✅ La columna total_amount SÍ existe'
    ELSE '❌ La columna total_amount NO existe'
  END as resultado;
