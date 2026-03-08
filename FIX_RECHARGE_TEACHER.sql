-- =====================================================
-- SOPORTE DE PAGOS PARA PROFESORES en recharge_requests
-- =====================================================
-- Permite que profesores envíen comprobantes de pago
-- igual que los padres (Yape, Plin, Transferencia).
-- =====================================================

-- 1. Añadir columna teacher_id (nullable) a recharge_requests
ALTER TABLE public.recharge_requests
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES auth.users(id);

-- 2. Hacer student_id nullable (para que funcione sin estudiante)
ALTER TABLE public.recharge_requests
  ALTER COLUMN student_id DROP NOT NULL;

-- 3. RLS: Permitir que profesores inserten sus propias solicitudes
DROP POLICY IF EXISTS "Teachers can insert own recharge requests" ON public.recharge_requests;
CREATE POLICY "Teachers can insert own recharge requests"
  ON public.recharge_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    OR auth.uid() = teacher_id
  );

-- 4. RLS: Permitir que profesores vean sus propias solicitudes
DROP POLICY IF EXISTS "Teachers can view own recharge requests" ON public.recharge_requests;
CREATE POLICY "Teachers can view own recharge requests"
  ON public.recharge_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = teacher_id
  );

-- 5. Verificar que admins pueden ver todas las solicitudes (ya debería existir)
-- Solo crear si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recharge_requests'
      AND schemaname = 'public'
      AND policyname ILIKE '%admin%view%'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all recharge requests"
      ON public.recharge_requests FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN (''superadmin'', ''admin_general'', ''gestor_unidad'', ''operador_caja'')
        )
      )';
  END IF;
END $$;

-- 6. Verificar
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recharge_requests'
  AND column_name IN ('student_id', 'teacher_id')
ORDER BY column_name;

NOTIFY pgrst, 'reload schema';
