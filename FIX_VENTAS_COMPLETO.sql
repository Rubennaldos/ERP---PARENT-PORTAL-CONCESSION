-- ============================================
-- FIX COMPLETO PARA MÓDULO DE VENTAS
-- Ejecutar en: Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/bezduattsdrepvpwjqgv/sql/new
-- ============================================

-- ============================================
-- PASO 1: Agregar columnas faltantes a TRANSACTIONS
-- ============================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS operation_number VARCHAR(100);

-- ============================================
-- PASO 2: Agregar FK de transactions.teacher_id → teacher_profiles
-- (esto permite hacer JOINs tipo teacher:teacher_profiles(id, full_name))
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_teacher_id_fkey'
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE public.transactions 
      ADD CONSTRAINT transactions_teacher_id_fkey 
      FOREIGN KEY (teacher_id) REFERENCES public.teacher_profiles(id);
  END IF;
END $$;

-- ============================================
-- PASO 3: Crear tabla PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, action)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer permisos
DROP POLICY IF EXISTS "permissions_read" ON public.permissions;
CREATE POLICY "permissions_read" ON public.permissions 
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- PASO 4: Crear tabla ROLE_PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer permisos de roles
DROP POLICY IF EXISTS "role_permissions_read" ON public.role_permissions;
CREATE POLICY "role_permissions_read" ON public.role_permissions 
  FOR SELECT TO authenticated USING (true);

-- Admins pueden gestionar
DROP POLICY IF EXISTS "role_permissions_manage" ON public.role_permissions;
CREATE POLICY "role_permissions_manage" ON public.role_permissions 
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin_general')
    )
  );

-- ============================================
-- PASO 5: Crear tabla USER_PERMISSIONS (overrides por usuario)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_permissions_read" ON public.user_permissions;
CREATE POLICY "user_permissions_read" ON public.user_permissions 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_permissions_manage" ON public.user_permissions;
CREATE POLICY "user_permissions_manage" ON public.user_permissions 
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin_general')
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);

-- ============================================
-- PASO 6: Insertar PERMISOS BASE del sistema
-- ============================================

-- Módulo: VENTAS
INSERT INTO public.permissions (module, action, name, description) VALUES
('ventas', 'ver', 'ventas.ver', 'Ver lista de ventas'),
('ventas', 'crear', 'ventas.crear', 'Realizar ventas en el POS'),
('ventas', 'modificar', 'ventas.modificar', 'Modificar datos de una venta'),
('ventas', 'anular', 'ventas.anular', 'Anular ventas'),
('ventas', 'exportar', 'ventas.exportar', 'Exportar reportes de ventas'),
('ventas', 'ver_dashboard', 'ventas.ver_dashboard', 'Ver dashboard de ventas')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: PRODUCTOS
INSERT INTO public.permissions (module, action, name, description) VALUES
('productos', 'ver', 'productos.ver', 'Ver catálogo de productos'),
('productos', 'crear', 'productos.crear', 'Crear nuevos productos'),
('productos', 'modificar', 'productos.modificar', 'Editar productos existentes'),
('productos', 'eliminar', 'productos.eliminar', 'Eliminar productos')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: REPORTES
INSERT INTO public.permissions (module, action, name, description) VALUES
('reportes', 'ver', 'reportes.ver', 'Ver reportes'),
('reportes', 'generar', 'reportes.generar', 'Generar reportes'),
('reportes', 'exportar', 'reportes.exportar', 'Exportar reportes a PDF/Excel')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: USUARIOS
INSERT INTO public.permissions (module, action, name, description) VALUES
('usuarios', 'ver', 'usuarios.ver', 'Ver lista de usuarios'),
('usuarios', 'crear', 'usuarios.crear', 'Crear nuevos usuarios'),
('usuarios', 'modificar', 'usuarios.modificar', 'Modificar usuarios'),
('usuarios', 'eliminar', 'usuarios.eliminar', 'Eliminar usuarios'),
('usuarios', 'cambiar_sede', 'usuarios.cambiar_sede', 'Cambiar sede de un usuario')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: CONFIGURACIÓN
INSERT INTO public.permissions (module, action, name, description) VALUES
('configuracion', 'ver', 'configuracion.ver', 'Ver configuración del sistema'),
('configuracion', 'modificar', 'configuracion.modificar', 'Modificar configuración')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: PERMISOS
INSERT INTO public.permissions (module, action, name, description) VALUES
('permisos', 'ver', 'permisos.ver', 'Ver control de acceso'),
('permisos', 'modificar', 'permisos.modificar', 'Modificar permisos de roles')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: COBRANZAS
INSERT INTO public.permissions (module, action, name, description) VALUES
('cobranzas', 'ver', 'cobranzas.ver', 'Ver módulo de cobranzas'),
('cobranzas', 'gestionar', 'cobranzas.gestionar', 'Gestionar cobros y pagos')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: INVENTARIO
INSERT INTO public.permissions (module, action, name, description) VALUES
('inventario', 'ver', 'inventario.ver', 'Ver inventario'),
('inventario', 'modificar', 'inventario.modificar', 'Modificar stock e inventario')
ON CONFLICT (module, action) DO NOTHING;

-- Módulo: CAJA
INSERT INTO public.permissions (module, action, name, description) VALUES
('caja', 'ver', 'caja.ver', 'Ver cierre de caja'),
('caja', 'gestionar', 'caja.gestionar', 'Gestionar apertura/cierre de caja')
ON CONFLICT (module, action) DO NOTHING;

-- ============================================
-- PASO 7: Asignar permisos a ROLES
-- ============================================

-- ADMIN GENERAL → Todos los permisos
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'admin_general', id, true FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- OPERADOR DE CAJA → Permisos de ventas, productos (ver), caja
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'operador_caja', id, true FROM public.permissions 
WHERE name IN (
  'ventas.ver', 'ventas.crear', 'ventas.anular',
  'productos.ver',
  'caja.ver', 'caja.gestionar',
  'reportes.ver'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- GESTOR DE UNIDAD → Permisos de gestión de sede
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'gestor_unidad', id, true FROM public.permissions 
WHERE name IN (
  'ventas.ver', 'ventas.crear', 'ventas.modificar', 'ventas.anular', 'ventas.exportar', 'ventas.ver_dashboard',
  'productos.ver', 'productos.crear', 'productos.modificar',
  'reportes.ver', 'reportes.generar', 'reportes.exportar',
  'usuarios.ver',
  'cobranzas.ver', 'cobranzas.gestionar',
  'inventario.ver', 'inventario.modificar',
  'caja.ver', 'caja.gestionar'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- SUPERVISOR RED → Permisos amplios
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'supervisor_red', id, true FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================
-- PASO 8: Verificación final
-- ============================================
SELECT '✅ PERMISOS' as resultado, COUNT(*) as total FROM public.permissions
UNION ALL
SELECT '✅ ROL-PERMISOS', COUNT(*) FROM public.role_permissions
UNION ALL
SELECT '✅ USER-PERMISOS', COUNT(*) FROM public.user_permissions;

-- Verificar FK de transactions
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'transactions' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'teacher_id';
