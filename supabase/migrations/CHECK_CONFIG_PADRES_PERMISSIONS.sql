-- Verificar permisos del módulo config_padres

-- 1. Ver todos los permisos que existen para config_padres
SELECT 
  'PERMISOS DE CONFIG_PADRES' as info,
  id,
  module,
  action,
  name,
  description,
  created_at
FROM permissions
WHERE module = 'config_padres'
ORDER BY action;

-- 2. Ver qué permisos tiene el rol gestor_unidad para config_padres
SELECT 
  'PERMISOS DE GESTOR_UNIDAD' as info,
  rp.role,
  rp.granted,
  p.module,
  p.action,
  p.name
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role = 'gestor_unidad'
  AND p.module = 'config_padres'
ORDER BY p.action;

-- 3. Ver TODOS los módulos que puede ver gestor_unidad
SELECT 
  'MÓDULOS VISIBLES PARA GESTOR_UNIDAD' as info,
  p.module,
  p.action,
  rp.granted,
  p.name
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role = 'gestor_unidad'
  AND rp.granted = true
  AND p.action IN ('ver_modulo', 'access')
ORDER BY p.module;
