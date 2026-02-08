-- 🔍 Ver qué roles tienen el permiso ventas-access

-- ===================================================================
-- PASO 1: Ver si existe el permiso ventas-access
-- ===================================================================
SELECT 
  '🎯 Permiso ventas-access' as info,
  id,
  module,
  action,
  name
FROM permissions
WHERE module = 'ventas' AND action = 'access';

-- ===================================================================
-- PASO 2: Ver qué roles tienen asignado ese permiso
-- ===================================================================
SELECT 
  '📋 Roles con permiso ventas-access' as info,
  rp.role,
  rp.granted,
  CASE 
    WHEN rp.granted = true THEN '✅'
    ELSE '❌'
  END as estado
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.module = 'ventas' 
  AND p.action = 'access'
ORDER BY rp.role;

-- ===================================================================
-- PASO 3: Ver TODOS los permisos de ventas para operador_caja
-- ===================================================================
SELECT 
  '🔍 Permisos de VENTAS para operador_caja' as info,
  p.action,
  p.name,
  rp.granted
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'operador_caja'
  AND p.module = 'ventas'
ORDER BY p.action;

-- ===================================================================
-- PASO 4: Verificar permisos para gestor_unidad (Admin por Sede)
-- ===================================================================
SELECT 
  '👤 ¿Tiene gestor_unidad el permiso ventas-access?' as pregunta,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ SÍ'
    ELSE '❌ NO'
  END as respuesta
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'gestor_unidad'
  AND rp.granted = true
  AND p.module = 'ventas'
  AND p.action = 'access';
