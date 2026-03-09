-- ================================================================
-- FIX: Políticas RLS para lunch_configuration
-- Permite a admins leer, crear y actualizar configuraciones
-- ================================================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.lunch_configuration ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que puedan estar mal
DROP POLICY IF EXISTS "Admins can manage lunch_configuration" ON public.lunch_configuration;
DROP POLICY IF EXISTS "Admins can read lunch_configuration" ON public.lunch_configuration;
DROP POLICY IF EXISTS "Admins can insert lunch_configuration" ON public.lunch_configuration;
DROP POLICY IF EXISTS "Admins can update lunch_configuration" ON public.lunch_configuration;
DROP POLICY IF EXISTS "Anyone can read lunch_configuration" ON public.lunch_configuration;
DROP POLICY IF EXISTS "Users can read lunch_configuration" ON public.lunch_configuration;

-- 1) LECTURA: cualquier usuario autenticado puede leer configuraciones
CREATE POLICY "Anyone authenticated can read lunch_configuration"
  ON public.lunch_configuration
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) INSERT: admins pueden crear configuraciones
CREATE POLICY "Admins can insert lunch_configuration"
  ON public.lunch_configuration
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general', 'supervisor_red', 'admin_sede')
    )
  );

-- 3) UPDATE: admins pueden actualizar configuraciones
CREATE POLICY "Admins can update lunch_configuration"
  ON public.lunch_configuration
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general', 'supervisor_red', 'admin_sede')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general', 'supervisor_red', 'admin_sede')
    )
  );

-- 4) DELETE: solo superadmin (por seguridad)
CREATE POLICY "Superadmin can delete lunch_configuration"
  ON public.lunch_configuration
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general')
    )
  );

-- Verificar que la constraint UNIQUE en school_id existe (para upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lunch_configuration_school_id_key'
    AND conrelid = 'public.lunch_configuration'::regclass
  ) THEN
    ALTER TABLE public.lunch_configuration
      ADD CONSTRAINT lunch_configuration_school_id_key UNIQUE (school_id);
  END IF;
END $$;
