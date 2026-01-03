-- ============================================================================
-- SISTEMA DE PERMISOS GRANULARES + AISLAMIENTO MULTI-SEDE
-- Lima Café 28 - ERP Profesional por ARQUISIA
-- ============================================================================

-- 1. TABLA: permissions (Catálogo de permisos del sistema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- Ej: "ventas.anular", "productos.eliminar"
  description TEXT,
  module TEXT, -- Ej: "ventas", "productos", "inventario"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: role_permissions (Permisos asignados a roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL, -- 'admin_general', 'pos', 'comedor', 'parent'
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- 3. TABLA: user_permissions (Permisos individuales por usuario)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT TRUE, -- TRUE = otorgado, FALSE = revocado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, permission_id)
);

-- 4. AGREGAR school_id a profiles (si no existe)
-- ============================================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- 5. ÍNDICES para optimización
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_transactions_school ON transactions(school_id);

-- 6. INSERTAR PERMISOS BASE DEL SISTEMA
-- ============================================================================
INSERT INTO permissions (name, description, module) VALUES
-- Módulo: Ventas
('ventas.ver', 'Ver lista de ventas', 'ventas'),
('ventas.crear', 'Realizar ventas en POS', 'ventas'),
('ventas.editar', 'Editar datos del cliente en ventas', 'ventas'),
('ventas.anular', 'Anular ventas realizadas', 'ventas'),
('ventas.imprimir', 'Reimprimir tickets', 'ventas'),
('ventas.exportar', 'Exportar ventas a Excel/PDF', 'ventas'),

-- Módulo: Productos
('productos.ver', 'Ver catálogo de productos', 'productos'),
('productos.crear', 'Crear nuevos productos', 'productos'),
('productos.editar', 'Editar productos existentes', 'productos'),
('productos.eliminar', 'Eliminar productos', 'productos'),
('productos.precios', 'Modificar precios de productos', 'productos'),

-- Módulo: Inventario
('inventario.ver', 'Ver inventario', 'inventario'),
('inventario.ajustar', 'Ajustar stock', 'inventario'),
('inventario.transferir', 'Transferir entre sedes', 'inventario'),

-- Módulo: Estudiantes
('estudiantes.ver', 'Ver lista de estudiantes', 'estudiantes'),
('estudiantes.crear', 'Registrar nuevos estudiantes', 'estudiantes'),
('estudiantes.editar', 'Editar datos de estudiantes', 'estudiantes'),
('estudiantes.desactivar', 'Desactivar/activar estudiantes', 'estudiantes'),
('estudiantes.recargar', 'Realizar recargas de saldo', 'estudiantes'),

-- Módulo: Padres
('padres.ver', 'Ver lista de padres', 'padres'),
('padres.crear', 'Crear perfiles de padres', 'padres'),
('padres.editar', 'Editar datos de padres', 'padres'),
('padres.eliminar', 'Eliminar perfiles de padres', 'padres'),

-- Módulo: Reportes
('reportes.ventas', 'Ver reportes de ventas', 'reportes'),
('reportes.inventario', 'Ver reportes de inventario', 'reportes'),
('reportes.financiero', 'Ver reportes financieros', 'reportes'),

-- Módulo: Sistema
('sistema.usuarios', 'Gestionar usuarios del sistema', 'sistema'),
('sistema.permisos', 'Gestionar permisos', 'sistema'),
('sistema.sedes', 'Gestionar sedes', 'sistema'),
('sistema.config', 'Configuración del sistema', 'sistema')
ON CONFLICT (name) DO NOTHING;

-- 7. ASIGNAR PERMISOS POR ROL (Configuración inicial)
-- ============================================================================

-- ROL: admin_general (Acceso total)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin_general', id FROM permissions
ON CONFLICT DO NOTHING;

-- ROL: pos (Cajero - Permisos básicos)
INSERT INTO role_permissions (role, permission_id)
SELECT 'pos', id FROM permissions WHERE name IN (
  'ventas.ver',
  'ventas.crear',
  'ventas.imprimir',
  'productos.ver',
  'estudiantes.ver',
  'estudiantes.recargar'
)
ON CONFLICT DO NOTHING;

-- ROL: comedor (Solo ver pedidos)
INSERT INTO role_permissions (role, permission_id)
SELECT 'comedor', id FROM permissions WHERE name IN (
  'ventas.ver',
  'productos.ver'
)
ON CONFLICT DO NOTHING;

-- ROL: parent (Padres - Solo ver sus datos)
INSERT INTO role_permissions (role, permission_id)
SELECT 'parent', id FROM permissions WHERE name IN (
  'estudiantes.ver',
  'estudiantes.recargar',
  'productos.ver'
)
ON CONFLICT DO NOTHING;

-- 8. RLS POLICIES: Aislamiento por Sede
-- ============================================================================

-- Policy para transactions (solo ve su sede)
DROP POLICY IF EXISTS "aislamiento_transactions_por_sede" ON transactions;
CREATE POLICY "aislamiento_transactions_por_sede" ON transactions
FOR SELECT USING (
  -- Admin General puede ver todas las sedes
  auth.jwt() ->> 'role' = 'admin_general'
  OR
  auth.jwt() ->> 'role' = 'superadmin'
  OR
  -- Otros roles solo ven su sede
  school_id = (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy para products (solo ve su sede)
DROP POLICY IF EXISTS "aislamiento_products_por_sede" ON products;
CREATE POLICY "aislamiento_products_por_sede" ON products
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin_general'
  OR
  auth.jwt() ->> 'role' = 'superadmin'
  OR
  school_id = (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy para students (solo ve su sede)
DROP POLICY IF EXISTS "aislamiento_students_por_sede" ON students;
CREATE POLICY "aislamiento_students_por_sede" ON students
FOR SELECT USING (
  -- Padres solo ven sus propios hijos
  parent_id = auth.uid()
  OR
  -- Staff ve estudiantes de su sede
  (
    auth.jwt() ->> 'role' IN ('admin_general', 'pos', 'comedor', 'superadmin')
    AND school_id = (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- 9. FUNCIÓN: Verificar si un usuario tiene un permiso
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO v_role FROM profiles WHERE id = p_user_id;
  
  -- SuperAdmin tiene todos los permisos
  IF v_role = 'superadmin' THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si tiene permiso revocado individualmente
  SELECT granted INTO v_has_permission
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id 
  AND p.name = p_permission_name;
  
  -- Si tiene permiso individual explícito, retornar ese valor
  IF v_has_permission IS NOT NULL THEN
    RETURN v_has_permission;
  END IF;
  
  -- Verificar si su rol tiene el permiso
  SELECT EXISTS(
    SELECT 1 
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = v_role 
    AND p.name = p_permission_name
  ) INTO v_has_permission;
  
  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. HABILITAR RLS EN NUEVAS TABLAS
-- ============================================================================
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (todos pueden leer, solo admin puede modificar)
CREATE POLICY "Todos pueden leer permisos" ON permissions
FOR SELECT USING (true);

CREATE POLICY "Todos pueden leer permisos de roles" ON role_permissions
FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden ver sus permisos" ON user_permissions
FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin_general', 'superadmin'));

CREATE POLICY "Solo admin puede modificar permisos" ON role_permissions
FOR ALL USING (auth.jwt() ->> 'role' IN ('admin_general', 'superadmin'));

CREATE POLICY "Solo admin puede modificar permisos de usuarios" ON user_permissions
FOR ALL USING (auth.jwt() ->> 'role' IN ('admin_general', 'superadmin'));

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Para aplicar: Copiar y pegar todo en el SQL Editor de Supabase
-- ============================================================================

