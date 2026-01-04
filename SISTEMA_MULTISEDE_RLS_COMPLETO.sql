-- =====================================================
-- SISTEMA MULTISEDE CON RLS Y PERMISOS GRANULARES
-- =====================================================
-- Este script configura el aislamiento total por sede
-- y crea el sistema de permisos granulares
-- =====================================================

-- =====================================================
-- PASO 1: ACTUALIZAR ROLES EN LA BASE DE DATOS
-- =====================================================

-- Agregar comentario a la tabla profiles explicando los nuevos roles
COMMENT ON COLUMN profiles.role IS 'Roles del sistema:
- superadmin: Programador (acceso total)
- admin_general: Dueño del negocio (acceso total, puede "ver como")
- supervisor_red: Auditor multi-sede (permisos configurables)
- gestor_unidad: Administrador de una sede específica
- operador_caja: Cajero de una sede (antes "pos")
- operador_cocina: Personal de cocina de una sede (antes "comedor")
- parent: Padre de familia';

-- =====================================================
-- PASO 2: CREAR TABLA DE PERMISOS GRANULARES
-- =====================================================

-- Tabla: permissions (permisos disponibles en el sistema)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL, -- ej: 'ventas', 'productos', 'estudiantes'
  action VARCHAR(50) NOT NULL, -- ej: 'eliminar', 'modificar', 'ver_precios'
  name VARCHAR(100) NOT NULL, -- ej: 'ventas.eliminar'
  description TEXT, -- ej: 'Permite eliminar ventas del sistema'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, action)
);

-- Tabla: role_permissions (permisos asignados a roles por defecto)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Tabla: user_permissions (permisos personalizados por usuario)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true, -- true = otorgado, false = revocado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- =====================================================
-- PASO 3: INSERTAR PERMISOS BASE DEL SISTEMA
-- =====================================================

-- Módulo: VENTAS
INSERT INTO permissions (module, action, name, description) VALUES
('ventas', 'ver', 'ventas.ver', 'Ver lista de ventas'),
('ventas', 'crear', 'ventas.crear', 'Realizar ventas en el POS'),
('ventas', 'modificar', 'ventas.modificar', 'Modificar datos de una venta'),
('ventas', 'eliminar', 'ventas.eliminar', 'Eliminar ventas del sistema'),
('ventas', 'anular', 'ventas.anular', 'Anular ventas'),
('ventas', 'ver_precios', 'ventas.ver_precios', 'Ver precios de productos'),
('ventas', 'aplicar_descuento', 'ventas.aplicar_descuento', 'Aplicar descuentos en ventas'),
('ventas', 'exportar', 'ventas.exportar', 'Exportar reportes de ventas')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: PRODUCTOS
INSERT INTO permissions (module, action, name, description) VALUES
('productos', 'ver', 'productos.ver', 'Ver catálogo de productos'),
('productos', 'crear', 'productos.crear', 'Crear nuevos productos'),
('productos', 'modificar', 'productos.modificar', 'Modificar productos existentes'),
('productos', 'eliminar', 'productos.eliminar', 'Eliminar productos'),
('productos', 'gestionar_stock', 'productos.gestionar_stock', 'Gestionar inventario y stock')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: ESTUDIANTES
INSERT INTO permissions (module, action, name, description) VALUES
('estudiantes', 'ver', 'estudiantes.ver', 'Ver lista de estudiantes'),
('estudiantes', 'crear', 'estudiantes.crear', 'Registrar nuevos estudiantes'),
('estudiantes', 'modificar', 'estudiantes.modificar', 'Modificar datos de estudiantes'),
('estudiantes', 'eliminar', 'estudiantes.eliminar', 'Eliminar estudiantes'),
('estudiantes', 'recargar_saldo', 'estudiantes.recargar_saldo', 'Recargar saldo de estudiantes'),
('estudiantes', 'ver_saldo', 'estudiantes.ver_saldo', 'Ver saldo de estudiantes'),
('estudiantes', 'modificar_limite', 'estudiantes.modificar_limite', 'Modificar límite diario')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: REPORTES
INSERT INTO permissions (module, action, name, description) VALUES
('reportes', 'ver', 'reportes.ver', 'Ver reportes y estadísticas'),
('reportes', 'exportar', 'reportes.exportar', 'Exportar reportes a Excel/PDF'),
('reportes', 'ver_finanzas', 'reportes.ver_finanzas', 'Ver reportes financieros detallados')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: USUARIOS
INSERT INTO permissions (module, action, name, description) VALUES
('usuarios', 'ver', 'usuarios.ver', 'Ver lista de usuarios'),
('usuarios', 'crear', 'usuarios.crear', 'Crear nuevos usuarios'),
('usuarios', 'modificar', 'usuarios.modificar', 'Modificar datos de usuarios'),
('usuarios', 'eliminar', 'usuarios.eliminar', 'Eliminar usuarios'),
('usuarios', 'cambiar_sede', 'usuarios.cambiar_sede', 'Mover usuarios entre sedes (CRÍTICO)'),
('usuarios', 'gestionar_permisos', 'usuarios.gestionar_permisos', 'Configurar permisos de usuarios')
ON CONFLICT (module, action) DO NOTHING;

-- =====================================================
-- PASO 4: ASIGNAR PERMISOS POR DEFECTO A ROLES
-- =====================================================

-- OPERADOR_CAJA (Cajero) - Permisos básicos de venta
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'operador_caja', id, true FROM permissions 
WHERE name IN (
  'ventas.ver', 'ventas.crear', 'ventas.ver_precios',
  'productos.ver',
  'estudiantes.ver', 'estudiantes.ver_saldo', 'estudiantes.recargar_saldo'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- OPERADOR_COCINA (Cocina) - Permisos de visualización
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'operador_cocina', id, true FROM permissions 
WHERE name IN (
  'ventas.ver',
  'productos.ver',
  'estudiantes.ver'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- GESTOR_UNIDAD (Administrador de Sede) - Permisos amplios de su sede
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'gestor_unidad', id, true FROM permissions 
WHERE name IN (
  'ventas.ver', 'ventas.crear', 'ventas.modificar', 'ventas.anular', 'ventas.ver_precios', 'ventas.aplicar_descuento', 'ventas.exportar',
  'productos.ver', 'productos.crear', 'productos.modificar', 'productos.gestionar_stock',
  'estudiantes.ver', 'estudiantes.crear', 'estudiantes.modificar', 'estudiantes.recargar_saldo', 'estudiantes.ver_saldo', 'estudiantes.modificar_limite',
  'reportes.ver', 'reportes.exportar',
  'usuarios.ver', 'usuarios.crear', 'usuarios.modificar'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- SUPERVISOR_RED (Auditor) - Ve todo, permisos configurables por Admin General
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'supervisor_red', id, true FROM permissions 
WHERE name IN (
  'ventas.ver', 'ventas.exportar',
  'productos.ver',
  'estudiantes.ver', 'estudiantes.ver_saldo',
  'reportes.ver', 'reportes.exportar', 'reportes.ver_finanzas',
  'usuarios.ver'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ADMIN_GENERAL - Todos los permisos (incluyendo los críticos)
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 'admin_general', id, true FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- =====================================================
-- PASO 5: HABILITAR RLS EN TODAS LAS TABLAS CRÍTICAS
-- =====================================================

-- Habilitar RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 6: POLÍTICAS RLS - AISLAMIENTO MULTISEDE
-- =====================================================

-- ELIMINAR políticas antiguas si existen
DROP POLICY IF EXISTS "students_select_policy" ON students;
DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- =====================================================
-- POLÍTICAS PARA STUDENTS (Estudiantes)
-- =====================================================

-- 1. SUPERADMIN ve todo
CREATE POLICY "superadmin_all_students"
ON students FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 2. ADMIN_GENERAL ve todo
CREATE POLICY "admin_general_all_students"
ON students FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_general');

-- 3. SUPERVISOR_RED ve todas las sedes (solo lectura)
CREATE POLICY "supervisor_red_view_all_students"
ON students FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor_red');

-- 4. GESTOR_UNIDAD ve solo su sede
CREATE POLICY "gestor_unidad_own_school_students"
ON students FOR ALL
TO authenticated
USING (
  school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'gestor_unidad'
);

-- 5. OPERADOR_CAJA ve solo su sede
CREATE POLICY "operador_caja_own_school_students"
ON students FOR SELECT
TO authenticated
USING (
  school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'operador_caja'
);

-- 6. OPERADOR_COCINA ve solo su sede
CREATE POLICY "operador_cocina_own_school_students"
ON students FOR SELECT
TO authenticated
USING (
  school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'operador_cocina'
);

-- 7. PADRES ven solo sus hijos
CREATE POLICY "parents_own_children"
ON students FOR ALL
TO authenticated
USING (
  parent_id = auth.uid()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'parent'
);

-- =====================================================
-- POLÍTICAS PARA TRANSACTIONS (Transacciones)
-- =====================================================

-- 1. SUPERADMIN ve todo
CREATE POLICY "superadmin_all_transactions"
ON transactions FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 2. ADMIN_GENERAL ve todo
CREATE POLICY "admin_general_all_transactions"
ON transactions FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_general');

-- 3. SUPERVISOR_RED ve todas las sedes
CREATE POLICY "supervisor_red_view_all_transactions"
ON transactions FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor_red');

-- 4. GESTOR_UNIDAD ve solo transacciones de su sede
CREATE POLICY "gestor_unidad_own_school_transactions"
ON transactions FOR ALL
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students 
    WHERE school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'gestor_unidad'
);

-- 5. OPERADOR_CAJA ve solo transacciones de su sede
CREATE POLICY "operador_caja_own_school_transactions"
ON transactions FOR ALL
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students 
    WHERE school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'operador_caja'
);

-- 6. OPERADOR_COCINA ve solo transacciones de su sede
CREATE POLICY "operador_cocina_own_school_transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students 
    WHERE school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'operador_cocina'
);

-- 7. PADRES ven solo transacciones de sus hijos
CREATE POLICY "parents_own_children_transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students WHERE parent_id = auth.uid()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'parent'
);

-- =====================================================
-- POLÍTICAS PARA PRODUCTS (Productos - Compartidos)
-- =====================================================
-- Por ahora los productos son compartidos entre todas las sedes

-- Todos los usuarios autenticados pueden ver productos
CREATE POLICY "authenticated_view_products"
ON products FOR SELECT
TO authenticated
USING (true);

-- Solo Admin General y Gestor Unidad pueden modificar productos
CREATE POLICY "admin_gestor_manage_products"
ON products FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin_general', 'gestor_unidad')
);

-- =====================================================
-- POLÍTICAS PARA PROFILES (Usuarios)
-- =====================================================

-- 1. SUPERADMIN ve todo
CREATE POLICY "superadmin_all_profiles"
ON profiles FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 2. ADMIN_GENERAL ve todo
CREATE POLICY "admin_general_all_profiles"
ON profiles FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_general');

-- 3. SUPERVISOR_RED ve todos los perfiles
CREATE POLICY "supervisor_red_view_all_profiles"
ON profiles FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor_red');

-- 4. GESTOR_UNIDAD ve solo perfiles de su sede
CREATE POLICY "gestor_unidad_own_school_profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'gestor_unidad'
);

-- 5. Todos pueden ver su propio perfil
CREATE POLICY "users_view_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 6. Todos pueden actualizar su propio perfil
CREATE POLICY "users_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- =====================================================
-- PASO 7: CREAR ÍNDICES PARA OPTIMIZAR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- =====================================================
-- PASO 8: FUNCIÓN PARA VERIFICAR PERMISOS
-- =====================================================

CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_permission_name VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR;
  v_has_permission BOOLEAN;
  v_permission_id UUID;
BEGIN
  -- Obtener el rol del usuario
  SELECT role INTO v_role FROM profiles WHERE id = p_user_id;
  
  -- SuperAdmin y Admin General tienen todos los permisos
  IF v_role IN ('superadmin', 'admin_general') THEN
    RETURN TRUE;
  END IF;
  
  -- Obtener el ID del permiso
  SELECT id INTO v_permission_id FROM permissions WHERE name = p_permission_name;
  
  IF v_permission_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si hay un override específico del usuario
  SELECT granted INTO v_has_permission 
  FROM user_permissions 
  WHERE user_id = p_user_id AND permission_id = v_permission_id;
  
  IF FOUND THEN
    RETURN v_has_permission;
  END IF;
  
  -- Si no hay override, verificar permisos del rol
  SELECT granted INTO v_has_permission 
  FROM role_permissions 
  WHERE role = v_role AND permission_id = v_permission_id;
  
  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver todos los permisos creados
SELECT 
  module,
  COUNT(*) as total_permisos
FROM permissions
GROUP BY module
ORDER BY module;

-- Ver permisos asignados por rol
SELECT 
  rp.role,
  COUNT(*) as total_permisos
FROM role_permissions rp
GROUP BY rp.role
ORDER BY rp.role;

-- ✅ SISTEMA MULTISEDE CON RLS COMPLETADO
SELECT 'Sistema Multisede y Permisos Granulares instalado correctamente' as status;

