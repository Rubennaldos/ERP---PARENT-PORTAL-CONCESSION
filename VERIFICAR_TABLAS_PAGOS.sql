-- =========================================
-- VERIFICAR SI EXISTEN LAS TABLAS DE PAGOS
-- Ejecuta esto primero en Supabase SQL Editor
-- =========================================

-- Verificar si existe payment_transactions
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
ORDER BY ordinal_position;

-- Verificar si existe payment_gateway_config
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_gateway_config'
ORDER BY ordinal_position;

-- Si NO aparece nada, ejecuta SISTEMA_CUENTA_LIBRE_Y_PAGOS.sql

