-- =====================================================
-- SISTEMA DE PERMISOS POR MÓDULOS V2
-- =====================================================
-- Este script crea la estructura completa de permisos
-- basada en módulos con switches de activación

-- =====================================================
-- PASO 1: LIMPIAR PERMISOS ANTIGUOS
-- =====================================================
TRUNCATE TABLE user_permissions CASCADE;
TRUNCATE TABLE role_permissions CASCADE;
TRUNCATE TABLE permissions CASCADE;

-- =====================================================
-- PASO 2: CREAR PERMISOS POR MÓDULO
-- =====================================================

-- ============ MÓDULO: PUNTO DE VENTA ============
INSERT INTO permissions (module, action, name, description) VALUES
('pos', 'ver_modulo', 'Ver Punto de Venta', 'Permite acceder al módulo de POS y realizar ventas')
ON CONFLICT (module, action) DO NOTHING;

-- ============ MÓDULO: LISTA DE VENTAS ============
INSERT INTO permissions (module, action, name, description) VALUES
('ventas', 'ver_modulo', 'Ver Lista de Ventas', 'Permite acceder al módulo de ventas'),
('ventas', 'ver_su_sede', 'Ver Ventas de Su Sede', 'Ver solo ventas de su sede'),
('ventas', 'ver_todas_sedes', 'Ver Ventas de Todas las Sedes', 'Ver ventas de todas las sedes'),
('ventas', 'ver_personalizado', 'Ver Ventas Personalizado', 'Ver ventas según configuración personalizada'),
('ventas', 'editar', 'Editar Venta', 'Permite modificar datos de una venta'),
('ventas', 'anular', 'Anular Venta', 'Permite anular una venta'),
('ventas', 'eliminar', 'Eliminar Venta', 'Permite eliminar una venta del sistema'),
('ventas', 'filtros', 'Usar Filtros', 'Permite usar filtros avanzados'),
('ventas', 'imprimir_ticket', 'Imprimir Ticket', 'Permite reimprimir tickets'),
('ventas', 'sacar_reportes', 'Sacar Reportes', 'Permite generar reportes de ventas'),
('ventas', 'ver_dashboard', 'Ver Dashboard de Ventas', 'Ver estadísticas y dashboard')
ON CONFLICT (module, action) DO NOTHING;

-- ============ MÓDULO: COBRANZAS ============
INSERT INTO permissions (module, action, name, description) VALUES
('cobranzas', 'ver_modulo', 'Ver Cobranzas', 'Permite acceder al módulo de cobranzas'),
('cobranzas', 'ver_dashboard', 'Ver Dashboard de Cobranzas', 'Ver estadísticas de cobranzas'),
('cobranzas', 'editar_periodos', 'Editar Períodos', 'Permite editar períodos de facturación'),
('cobranzas', 'cobrar_su_sede', 'Cobrar Su Sede', 'Registrar pagos solo de su sede'),
('cobranzas', 'cobrar_todas_sedes', 'Cobrar Todas las Sedes', 'Registrar pagos de todas las sedes'),
('cobranzas', 'cobrar_personalizado', 'Cobrar Personalizado', 'Registrar pagos según configuración personalizada'),
('cobranzas', 'sacar_reportes', 'Sacar Reportes', 'Generar reportes de cobranzas'),
('cobranzas', 'configuracion', 'Configuración', 'Acceder a configuración de cobranzas')
ON CONFLICT (module, action) DO NOTHING;

-- ============ MÓDULO: PRODUCTOS ============
INSERT INTO permissions (module, action, name, description) VALUES
('productos', 'ver_modulo', 'Ver Productos', 'Permite acceder al módulo de productos'),
('productos', 'ver_dashboard', 'Ver Dashboard de Productos', 'Ver estadísticas de productos'),
('productos', 'sacar_reportes', 'Sacar Reportes', 'Generar reportes de productos'),
('productos', 'crear', 'Crear Productos', 'Crear nuevos productos'),
('productos', 'ver_su_sede', 'Ver Productos de Su Sede', 'Ver solo productos de su sede'),
('productos', 'ver_todas_sedes', 'Ver Productos de Todas las Sedes', 'Ver productos de todas las sedes'),
('productos', 'ver_personalizado', 'Ver Productos Personalizado', 'Ver productos según configuración personalizada'),
('productos', 'promociones_su_sede', 'Activar Promociones Su Sede', 'Activar promociones para su sede'),
('productos', 'promociones_todas_sedes', 'Activar Promociones Todas las Sedes', 'Activar promociones para todas las sedes'),
('productos', 'promociones_personalizado', 'Activar Promociones Personalizado', 'Activar promociones según configuración personalizada'),
('productos', 'menus_su_sede', 'Agregar Menús Su Sede', 'Agregar menús para su sede'),
('productos', 'menus_todas_sedes', 'Agregar Menús Todas las Sedes', 'Agregar menús para todas las sedes'),
('productos', 'menus_personalizado', 'Agregar Menús Personalizado', 'Agregar menús según configuración personalizada')
ON CONFLICT (module, action) DO NOTHING;

-- ============ MÓDULO: CONFIGURACIÓN PADRES ============
INSERT INTO permissions (module, action, name, description) VALUES
('config_padres', 'ver_modulo', 'Ver Configuración Padres', 'Permite acceder al módulo de padres y estudiantes'),
('config_padres', 'ver_dashboard', 'Ver Dashboard', 'Ver estadísticas de padres y estudiantes'),
('config_padres', 'crear_padre', 'Crear Padre', 'Registrar nuevos padres'),
('config_padres', 'editar_padre', 'Editar Padre', 'Modificar datos de padres'),
('config_padres', 'eliminar_padre', 'Eliminar Padre', 'Eliminar padres del sistema'),
('config_padres', 'crear_estudiante', 'Crear Estudiante', 'Registrar nuevos estudiantes'),
('config_padres', 'editar_estudiante', 'Editar Estudiante', 'Modificar datos de estudiantes'),
('config_padres', 'eliminar_estudiante', 'Eliminar Estudiante', 'Eliminar estudiantes del sistema')
ON CONFLICT (module, action) DO NOTHING;

-- ============ MÓDULO: CONTROL DE ACCESO ============
-- Este módulo SOLO es visible para admin_general
INSERT INTO permissions (module, action, name, description) VALUES
('control_acceso', 'ver_modulo', 'Ver Control de Acceso', 'Permite acceder al módulo de control de acceso (SOLO ADMIN GENERAL)'),
('control_acceso', 'gestionar_permisos', 'Gestionar Permisos', 'Administrar permisos de usuarios y roles'),
('control_acceso', 'crear_usuarios', 'Crear Usuarios', 'Crear nuevos usuarios del sistema'),
('control_acceso', 'editar_usuarios', 'Editar Usuarios', 'Modificar usuarios existentes'),
('control_acceso', 'eliminar_usuarios', 'Eliminar Usuarios', 'Eliminar usuarios del sistema')
ON CONFLICT (module, action) DO NOTHING;

-- =====================================================
-- PASO 3: ASIGNAR PERMISOS A ROLES
-- =====================================================

-- ============ ADMIN GENERAL: ACCESO TOTAL ============
-- El admin_general tiene TODOS los permisos
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'admin_general', id, true
FROM permissions
ON CONFLICT (role, permission_id) DO UPDATE
SET granted = true;

-- ============ SUPERVISOR DE RED ============
-- Puede ver todos los módulos pero con restricciones
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'supervisor_red', id, true
FROM permissions
WHERE module IN ('pos', 'ventas', 'cobranzas', 'productos', 'config_padres')
  AND (
    action LIKE 'ver_%' 
    OR action LIKE '%todas_sedes' 
    OR action = 'sacar_reportes'
    OR action = 'imprimir_ticket'
    OR action = 'filtros'
  )
ON CONFLICT (role, permission_id) DO UPDATE
SET granted = true;

-- ============ GESTOR DE UNIDAD ============
-- Gestiona su sede específica
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'gestor_unidad', id, true
FROM permissions
WHERE module IN ('pos', 'ventas', 'cobranzas', 'productos', 'config_padres')
  AND (
    action = 'ver_modulo'
    OR action = 'ver_dashboard'
    OR action LIKE '%su_sede'
    OR action = 'sacar_reportes'
    OR action = 'crear'
    OR action = 'crear_padre'
    OR action = 'crear_estudiante'
    OR action = 'editar_padre'
    OR action = 'editar_estudiante'
    OR action = 'imprimir_ticket'
    OR action = 'filtros'
  )
ON CONFLICT (role, permission_id) DO UPDATE
SET granted = true;

-- ============ OPERADOR DE CAJA ============
-- Solo POS y ver sus ventas
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'operador_caja', id, true
FROM permissions
WHERE (module = 'pos' AND action = 'ver_modulo')
   OR (module = 'ventas' AND action IN ('ver_modulo', 'ver_su_sede', 'ver_dashboard', 'imprimir_ticket', 'filtros'))
ON CONFLICT (role, permission_id) DO UPDATE
SET granted = true;

-- ============ OPERADOR DE COCINA ============
-- No tiene acceso a estos módulos administrativos (solo comedor)
-- Dejamos sin permisos por ahora

-- =====================================================
-- PASO 4: CREAR ÍNDICES PARA RENDIMIENTO
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- =====================================================
-- PASO 5: CREAR FUNCIÓN PARA VERIFICAR PERMISOS
-- =====================================================
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_module VARCHAR(50),
  p_action VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role VARCHAR(50);
  permission_uuid UUID;
  has_permission BOOLEAN;
  user_override BOOLEAN;
BEGIN
  -- Obtener el rol del usuario
  SELECT role INTO user_role
  FROM profiles
  WHERE id = p_user_id;

  -- Si no tiene rol, denegar
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin General siempre tiene acceso
  IF user_role = 'admin_general' THEN
    RETURN TRUE;
  END IF;

  -- Obtener el ID del permiso
  SELECT id INTO permission_uuid
  FROM permissions
  WHERE module = p_module AND action = p_action;

  -- Si el permiso no existe, denegar
  IF permission_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar si hay un override de usuario (prioridad)
  SELECT granted INTO user_override
  FROM user_permissions
  WHERE user_id = p_user_id AND permission_id = permission_uuid;

  -- Si hay override de usuario, usarlo
  IF user_override IS NOT NULL THEN
    RETURN user_override;
  END IF;

  -- Si no hay override, usar el permiso del rol
  SELECT granted INTO has_permission
  FROM role_permissions
  WHERE role = user_role AND permission_id = permission_uuid;

  -- Retornar el resultado (NULL = FALSE)
  RETURN COALESCE(has_permission, FALSE);
END;
$$;

-- =====================================================
-- PASO 6: VERIFICACIÓN
-- =====================================================
SELECT 
  '✅ Permisos creados exitosamente' as status,
  COUNT(*) as total_permisos
FROM permissions;

SELECT 
  '✅ Permisos de roles configurados' as status,
  role,
  COUNT(*) as permisos_asignados
FROM role_permissions
GROUP BY role
ORDER BY role;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. El módulo 'control_acceso' SOLO es visible para admin_general
-- 2. Los permisos son jerárquicos: usuario > rol
-- 3. Usa la función check_user_permission() para validar acceso
-- 4. Los módulos "Finanzas" y "Logística" no están incluidos (en desarrollo)


