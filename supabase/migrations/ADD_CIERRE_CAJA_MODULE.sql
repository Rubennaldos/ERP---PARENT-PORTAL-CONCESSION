-- ✅ AGREGAR MÓDULO DE CIERRE DE CAJA AL SISTEMA
-- Este módulo aparecerá en Control de Accesos y Dashboard

-- 1. Insertar el módulo
INSERT INTO modules (code, name, description, icon, color, route, is_active, status, display_order)
VALUES (
  'cierre_caja',
  'Cierre de Caja',
  'Gestión de caja, ingresos, egresos y cierre diario',
  'DollarSign',
  'green',
  '/cash-register',
  true,
  'functional',
  8
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  route = EXCLUDED.route,
  is_active = EXCLUDED.is_active,
  status = EXCLUDED.status;

-- 2. Crear las acciones para el módulo
INSERT INTO module_actions (module_code, action_code, name, description)
VALUES 
  ('cierre_caja', 'ver_modulo', 'Ver módulo', 'Permite ver el módulo de cierre de caja'),
  ('cierre_caja', 'abrir_caja', 'Abrir caja', 'Permite abrir la caja del día'),
  ('cierre_caja', 'ver_dashboard', 'Ver dashboard', 'Ver resumen de ventas y movimientos'),
  ('cierre_caja', 'registrar_ingreso', 'Registrar ingreso', 'Registrar ingresos de efectivo'),
  ('cierre_caja', 'registrar_egreso', 'Registrar egreso', 'Registrar egresos de efectivo'),
  ('cierre_caja', 'cerrar_caja', 'Cerrar caja', 'Realizar el cierre de caja del día'),
  ('cierre_caja', 'ver_historial', 'Ver historial', 'Consultar cierres anteriores'),
  ('cierre_caja', 'imprimir', 'Imprimir reportes', 'Imprimir comprobantes y reportes'),
  ('cierre_caja', 'exportar', 'Exportar datos', 'Exportar a Excel/CSV'),
  ('cierre_caja', 'configurar', 'Configurar módulo', 'Cambiar configuración del sistema de caja')
ON CONFLICT (module_code, action_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 3. Asignar permisos al Admin General (acceso total)
INSERT INTO role_permissions (role, module_code, action_code, can_access)
SELECT 
  'admin_general',
  'cierre_caja',
  action_code,
  true
FROM module_actions
WHERE module_code = 'cierre_caja'
ON CONFLICT (role, module_code, action_code) DO UPDATE SET
  can_access = true;

-- 4. Asignar permisos básicos a Operador de Caja
INSERT INTO role_permissions (role, module_code, action_code, can_access)
VALUES 
  ('operador_caja', 'cierre_caja', 'ver_modulo', true),
  ('operador_caja', 'cierre_caja', 'abrir_caja', true),
  ('operador_caja', 'cierre_caja', 'ver_dashboard', true),
  ('operador_caja', 'cierre_caja', 'registrar_ingreso', true),
  ('operador_caja', 'cierre_caja', 'registrar_egreso', true),
  ('operador_caja', 'cierre_caja', 'cerrar_caja', true),
  ('operador_caja', 'cierre_caja', 'ver_historial', true),
  ('operador_caja', 'cierre_caja', 'imprimir', true),
  ('operador_caja', 'cierre_caja', 'exportar', true),
  ('operador_caja', 'cierre_caja', 'configurar', false) -- No puede configurar
ON CONFLICT (role, module_code, action_code) DO UPDATE SET
  can_access = EXCLUDED.can_access;

-- 5. Asignar permisos completos a Admin por Sede
INSERT INTO role_permissions (role, module_code, action_code, can_access)
SELECT 
  'admin',
  'cierre_caja',
  action_code,
  true
FROM module_actions
WHERE module_code = 'cierre_caja'
ON CONFLICT (role, module_code, action_code) DO UPDATE SET
  can_access = true;

-- Verificar que se creó correctamente
SELECT 
  m.code,
  m.name,
  m.status,
  COUNT(ma.action_code) as acciones_count,
  COUNT(rp.role) as roles_asignados
FROM modules m
LEFT JOIN module_actions ma ON m.code = ma.module_code
LEFT JOIN role_permissions rp ON m.code = rp.module_code
WHERE m.code = 'cierre_caja'
GROUP BY m.code, m.name, m.status;

-- ✅ Ahora el módulo estará visible en:
-- 1. Dashboard (para usuarios con permisos)
-- 2. Control de Accesos (para configurar permisos)
-- 3. Accesible según los permisos asignados
