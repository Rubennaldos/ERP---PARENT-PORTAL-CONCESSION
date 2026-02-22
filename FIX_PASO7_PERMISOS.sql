-- ============================================
-- FIX PASO 7: Recrear role_permissions con estructura correcta
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- 1. Eliminar la tabla vieja (tiene estructura incorrecta con module_code/action_code)
DROP TABLE IF EXISTS public.role_permissions CASCADE;

-- 2. Recrear con estructura correcta (permission_id → FK a permissions)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_read" ON public.role_permissions;
CREATE POLICY "role_permissions_read" ON public.role_permissions 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "role_permissions_manage" ON public.role_permissions;
CREATE POLICY "role_permissions_manage" ON public.role_permissions 
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin_general')
    )
  );

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);

-- 3. ADMIN GENERAL → Todos los permisos
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'admin_general', id, true FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- 4. OPERADOR DE CAJA → Permisos de ventas, productos (ver), caja
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'operador_caja', id, true FROM public.permissions 
WHERE name IN (
  'ventas.ver', 'ventas.crear', 'ventas.anular',
  'productos.ver',
  'caja.ver', 'caja.gestionar',
  'reportes.ver'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 5. GESTOR DE UNIDAD → Permisos de gestión de sede
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

-- 6. SUPERVISOR RED → Todos los permisos
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'supervisor_red', id, true FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- 7. Verificación
SELECT '✅ PERMISOS' as resultado, COUNT(*) as total FROM public.permissions
UNION ALL
SELECT '✅ ROL-PERMISOS', COUNT(*) FROM public.role_permissions
UNION ALL
SELECT '✅ USER-PERMISOS', COUNT(*) FROM public.user_permissions;
