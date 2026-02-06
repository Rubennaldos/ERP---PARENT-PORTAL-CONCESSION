-- 🔧 FIX FINAL: Acceso al módulo de Cierre de Caja
-- Este script garantiza que los permisos estén correctamente asignados

-- 1️⃣ Verificar y crear el permiso si no existe
INSERT INTO permissions (module, action, name, description, created_at)
VALUES (
  'cash_register',
  'access',
  'Cierre de Caja',
  'Acceso completo al módulo de Cierre de Caja',
  NOW()
)
ON CONFLICT (module, action) 
DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2️⃣ Asignar a Admin General
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'admin_general',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' AND p.action = 'access'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- 3️⃣ Asignar a Admin por Sede
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'admin',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' AND p.action = 'access'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- 4️⃣ Asignar a Operador de Caja
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'operador_caja',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' AND p.action = 'access'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- 5️⃣ Asignar a Gestor de Unidad (admin por sede alternativo)
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'gestor_unidad',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' AND p.action = 'access'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- 6️⃣ Crear permiso adicional para ver el módulo en el control de acceso
INSERT INTO permissions (module, action, name, description, created_at)
VALUES (
  'cash_register',
  'ver_modulo',
  'Ver módulo de Cierre de Caja',
  'Permite acceder al módulo de cierre de caja',
  NOW()
)
ON CONFLICT (module, action) 
DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 7️⃣ Asignar el permiso ver_modulo a los roles
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'admin_general',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' AND p.action = 'ver_modulo'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'admin',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' AND p.action = 'ver_modulo'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'operador_caja',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' AND p.action = 'ver_modulo'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'gestor_unidad',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' AND p.action = 'ver_modulo'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- ✅ Verificación final
SELECT 
  '✅ Configuración completada' as status,
  COUNT(*) as permisos_asignados
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.module = 'cash_register';

-- 📊 Mostrar todos los permisos de Cierre de Caja
SELECT 
  rp.role,
  p.module,
  p.action,
  p.name,
  rp.granted
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.module = 'cash_register'
ORDER BY rp.role, p.action;
