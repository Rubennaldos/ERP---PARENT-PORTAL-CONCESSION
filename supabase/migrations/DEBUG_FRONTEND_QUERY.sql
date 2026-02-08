-- 🔍 SIMULAR LA QUERY QUE HACE EL FRONTEND
-- Esto replica exactamente lo que hace PermissionProtectedRoute.tsx

-- ===================================================================
-- PASO 1: Ver la estructura de role_permissions
-- ===================================================================
SELECT 
  '📋 Estructura de role_permissions' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'role_permissions'
ORDER BY ordinal_position;

-- ===================================================================
-- PASO 2: Intentar la query con JOIN (como hace el frontend)
-- ===================================================================
SELECT 
  '🔍 Query con JOIN explícito' as test,
  rp.role,
  rp.granted,
  p.module,
  p.action,
  p.name
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'gestor_unidad'
  AND rp.granted = true
  AND p.module = 'ventas'
  AND p.action = 'access';

-- ===================================================================
-- PASO 3: Ver TODOS los permisos de gestor_unidad
-- ===================================================================
SELECT 
  '📊 TODOS los permisos de gestor_unidad' as info,
  rp.role,
  rp.granted,
  p.module,
  p.action
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'gestor_unidad'
  AND rp.granted = true
ORDER BY p.module, p.action;

-- ===================================================================
-- PASO 4: Verificar si existe la relación en Supabase
-- ===================================================================
-- Ver las foreign keys de role_permissions
SELECT 
  '🔗 Foreign Keys de role_permissions' as info,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'role_permissions'
  AND tc.constraint_type = 'FOREIGN KEY';
