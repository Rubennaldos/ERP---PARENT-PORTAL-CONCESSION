-- =====================================================
-- FIX: Políticas RLS para printer_configs
-- Descripción: Corregir políticas para permitir a SuperAdmin
--              insertar y actualizar configuraciones
-- =====================================================

-- PASO 1: Eliminar políticas existentes (si hay alguna con error)
DROP POLICY IF EXISTS "superadmin_view_printer_configs" ON public.printer_configs;
DROP POLICY IF EXISTS "superadmin_insert_printer_configs" ON public.printer_configs;
DROP POLICY IF EXISTS "superadmin_update_printer_configs" ON public.printer_configs;
DROP POLICY IF EXISTS "admin_general_view_printer_configs" ON public.printer_configs;
DROP POLICY IF EXISTS "cajero_view_printer_configs" ON public.printer_configs;

-- PASO 2: Verificar que RLS está habilitado
ALTER TABLE public.printer_configs ENABLE ROW LEVEL SECURITY;

-- PASO 3: Crear políticas correctas

-- Policy 1: SuperAdmin puede VER todas las configuraciones
CREATE POLICY "superadmin_view_printer_configs"
  ON public.printer_configs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Policy 2: SuperAdmin puede INSERTAR configuraciones
CREATE POLICY "superadmin_insert_printer_configs"
  ON public.printer_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Policy 3: SuperAdmin puede ACTUALIZAR configuraciones
CREATE POLICY "superadmin_update_printer_configs"
  ON public.printer_configs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Policy 4: SuperAdmin puede ELIMINAR configuraciones
CREATE POLICY "superadmin_delete_printer_configs"
  ON public.printer_configs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Policy 5: Admin General puede VER configuraciones de su sede
CREATE POLICY "admin_general_view_printer_configs"
  ON public.printer_configs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin_general'
      AND profiles.school_id = printer_configs.school_id
    )
  );

-- Policy 6: Cajeros pueden VER configuraciones de su sede (para imprimir)
CREATE POLICY "cajero_view_printer_configs"
  ON public.printer_configs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('cajero', 'gestor_unidad')
      AND profiles.school_id = printer_configs.school_id
    )
  );

-- PASO 4: Verificar que tu usuario es SuperAdmin
SELECT 
  id,
  email,
  role,
  CASE 
    WHEN role = 'superadmin' THEN '✅ SuperAdmin'
    ELSE '❌ NO es SuperAdmin'
  END as status
FROM public.profiles
WHERE id = auth.uid();

-- PASO 5: Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'printer_configs'
ORDER BY policyname;

-- PASO 6: Test de permisos
-- Si eres superadmin, este SELECT debería devolver datos:
SELECT 
  id,
  school_id,
  printer_name,
  is_active
FROM public.printer_configs
LIMIT 5;
