-- 🎯 AGREGAR TODOS LOS PERMISOS DEL MÓDULO CIERRE DE CAJA
-- Este script crea todos los permisos necesarios para que aparezcan en Control de Acceso

-- 1️⃣ Crear todos los permisos del módulo cash_register
INSERT INTO permissions (module, action, name, description, created_at)
VALUES 
  ('cash_register', 'access', 'Acceder al módulo', 'Permite ver y usar el módulo de cierre de caja', NOW()),
  ('cash_register', 'ver_modulo', 'Ver módulo', 'Acceder al módulo de cierre de caja', NOW()),
  ('cash_register', 'ver_dashboard', 'Ver dashboard', 'Ver resumen ejecutivo y estadísticas', NOW()),
  ('cash_register', 'abrir_caja', 'Abrir caja', 'Iniciar turno con monto inicial', NOW()),
  ('cash_register', 'cerrar_caja', 'Cerrar caja', 'Finalizar turno y generar cierre', NOW()),
  ('cash_register', 'registrar_ingreso', 'Registrar ingreso', 'Agregar ingresos de efectivo', NOW()),
  ('cash_register', 'registrar_egreso', 'Registrar egreso', 'Registrar salidas de efectivo', NOW()),
  ('cash_register', 'ver_historial', 'Ver historial', 'Consultar cierres anteriores', NOW()),
  ('cash_register', 'imprimir_reporte', 'Imprimir reportes', 'Imprimir tickets de cierre', NOW()),
  ('cash_register', 'exportar_datos', 'Exportar datos', 'Exportar a Excel/PDF', NOW()),
  ('cash_register', 'enviar_whatsapp', 'Enviar por WhatsApp', 'Compartir reportes por WhatsApp', NOW()),
  ('cash_register', 'configurar_modulo', 'Configuración', 'Ajustar hora de cierre automático y WhatsApp', NOW()),
  ('cash_register', 'ver_su_sede', 'Solo su sede', 'Ver únicamente caja de su sede asignada', NOW()),
  ('cash_register', 'ver_todas_sedes', 'Todas las sedes', 'Ver cajas de todas las sedes del sistema', NOW())
ON CONFLICT (module, action) 
DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2️⃣ Asignar permisos completos a Admin General
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'admin_general',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- 3️⃣ Asignar permisos a Admin por Sede (gestor_unidad)
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'gestor_unidad',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- 4️⃣ Asignar permisos a Admin por Sede (admin)
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'admin',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register'
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- 5️⃣ Asignar permisos básicos a Operador de Caja
-- El operador de caja tendrá permisos limitados (no puede configurar ni ver todas las sedes)
INSERT INTO role_permissions (role, permission_id, granted, created_at)
SELECT 
  'operador_caja',
  p.id,
  true,
  NOW()
FROM permissions p
WHERE p.module = 'cash_register' 
  AND p.action IN (
    'access',
    'ver_modulo',
    'ver_dashboard',
    'abrir_caja',
    'cerrar_caja',
    'registrar_ingreso',
    'registrar_egreso',
    'ver_historial',
    'imprimir_reporte',
    'exportar_datos',
    'enviar_whatsapp',
    'ver_su_sede'
  )
ON CONFLICT (role, permission_id) 
DO UPDATE SET granted = true;

-- ✅ Verificación final - Contar permisos
SELECT 
  '✅ PERMISOS CREADOS' as status,
  COUNT(*) as total_permisos
FROM permissions
WHERE module = 'cash_register';

-- 📊 Mostrar todos los permisos por rol
SELECT 
  rp.role as "Rol",
  p.action as "Acción",
  p.name as "Nombre",
  rp.granted as "Activo"
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.module = 'cash_register'
ORDER BY 
  CASE rp.role
    WHEN 'admin_general' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'gestor_unidad' THEN 3
    WHEN 'operador_caja' THEN 4
    ELSE 5
  END,
  p.action;

-- 📈 Resumen por rol
SELECT 
  rp.role as "Rol",
  COUNT(*) as "Total Permisos Activos"
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.module = 'cash_register' AND rp.granted = true
GROUP BY rp.role
ORDER BY COUNT(*) DESC;
