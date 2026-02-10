-- =====================================================
-- BUSCAR TRIGGER ESPECÍFICO QUE CREA TRANSACCIONES AUTOMÁTICAS
-- =====================================================

-- Ver si hay trigger AFTER INSERT en lunch_orders
SELECT 
  '🔍 TRIGGERS AFTER INSERT EN lunch_orders' as paso,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'lunch_orders'
  AND action_timing = 'AFTER'
  AND event_manipulation = 'INSERT';

-- Ver el código completo de cualquier función que se llame desde triggers
SELECT 
  '📝 CÓDIGO DE FUNCIONES DE TRIGGER' as paso,
  proname as nombre_funcion,
  pg_get_functiondef(pg_proc.oid) as codigo_completo
FROM pg_proc
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND proname ILIKE '%lunch%';
