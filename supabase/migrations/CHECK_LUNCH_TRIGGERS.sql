-- =====================================================
-- BUSCAR TRIGGERS EN lunch_orders Y transactions
-- =====================================================

-- 1. Ver todos los triggers en lunch_orders
SELECT 
  '🔍 TRIGGERS EN lunch_orders' as paso,
  trigger_name,
  event_manipulation as evento,
  action_timing as cuando,
  action_statement as codigo
FROM information_schema.triggers
WHERE event_object_table = 'lunch_orders'
ORDER BY trigger_name;

-- 2. Ver todos los triggers en transactions
SELECT 
  '🔍 TRIGGERS EN transactions' as paso,
  trigger_name,
  event_manipulation as evento,
  action_timing as cuando,
  action_statement as codigo
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
ORDER BY trigger_name;

-- 3. Ver funciones relacionadas con lunch o transactions
SELECT 
  '🔍 FUNCIONES RELACIONADAS' as paso,
  routine_name as nombre_funcion,
  routine_type as tipo,
  routine_definition as codigo
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name ILIKE '%lunch%' OR routine_name ILIKE '%transaction%')
ORDER BY routine_name;
