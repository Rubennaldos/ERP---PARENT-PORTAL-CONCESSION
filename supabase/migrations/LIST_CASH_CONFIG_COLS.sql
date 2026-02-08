-- 🔍 VER COLUMNAS DE CASH_REGISTER_CONFIG

SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'cash_register_config'
ORDER BY ordinal_position;
