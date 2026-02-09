-- Verificar si hay alguna columna para marcar ventas de prueba
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND (
    column_name LIKE '%test%' 
    OR column_name LIKE '%demo%' 
    OR column_name LIKE '%prueba%'
    OR column_name LIKE '%sandbox%'
  );

-- Ver si hay transacciones con has_error = true (podrían ser de prueba)
SELECT 
  COUNT(*) as total_con_error,
  COUNT(CASE WHEN has_error = true THEN 1 END) as con_error_true,
  COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as con_mensaje_error
FROM transactions
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Ver transacciones con error
SELECT 
  t.id,
  t.ticket_code,
  t.created_at,
  t.amount,
  t.has_error,
  t.error_message,
  t.type,
  p.email as cajero_email,
  p.full_name as cajero_nombre
FROM transactions t
LEFT JOIN profiles p ON t.created_by = p.id
WHERE t.has_error = true
  AND t.created_at >= NOW() - INTERVAL '30 days'
ORDER BY t.created_at DESC
LIMIT 20;

-- Ver si hay metadata que indique modo prueba
SELECT 
  t.id,
  t.ticket_code,
  t.created_at,
  t.amount,
  t.metadata,
  p.email as cajero_email
FROM transactions t
LEFT JOIN profiles p ON t.created_by = p.id
WHERE t.metadata IS NOT NULL
  AND t.created_at >= NOW() - INTERVAL '7 days'
ORDER BY t.created_at DESC
LIMIT 10;
