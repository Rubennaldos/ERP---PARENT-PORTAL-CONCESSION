-- 🔍 VERIFICAR POLÍTICAS RLS DE SELECT PARA LUNCH_ORDERS
-- Este script verifica qué políticas están activas para operadores de caja

-- 1. Ver todas las políticas activas en lunch_orders
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'lunch_orders'
ORDER BY policyname;

-- 2. Verificar si hay política de SELECT específica
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'lunch_orders'
  AND cmd = 'SELECT';
