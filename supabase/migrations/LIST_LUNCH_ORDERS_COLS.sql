-- 🔍 VER COLUMNAS DE LUNCH_ORDERS

SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'lunch_orders'
ORDER BY ordinal_position;
