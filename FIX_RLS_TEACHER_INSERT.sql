-- =====================================================
-- FIX URGENTE: RLS que bloquea INSERT en teacher_profiles
-- =====================================================
-- Error: "new row violates row-level security policy for table teacher_profiles"
-- Causa: El profesor no tiene permiso para crear su propio perfil durante el onboarding.
-- =====================================================

-- 1. Eliminar todas las políticas conflictivas anteriores
DROP POLICY IF EXISTS "Admin general can view all teachers"                         ON public.teacher_profiles;
DROP POLICY IF EXISTS "Gestor unidad can view teachers from their school"            ON public.teacher_profiles;
DROP POLICY IF EXISTS "Cashiers can view teachers from their school"                 ON public.teacher_profiles;
DROP POLICY IF EXISTS "Teachers can view their own profile"                          ON public.teacher_profiles;
DROP POLICY IF EXISTS "Admins can insert teachers"                                   ON public.teacher_profiles;
DROP POLICY IF EXISTS "Admins can update teachers"                                   ON public.teacher_profiles;
DROP POLICY IF EXISTS "Teachers can update their own profile"                        ON public.teacher_profiles;
DROP POLICY IF EXISTS "Only admins can delete teachers"                              ON public.teacher_profiles;
DROP POLICY IF EXISTS "Authenticated users can view teachers"                        ON public.teacher_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert teachers"                      ON public.teacher_profiles;
DROP POLICY IF EXISTS "Authenticated users can update teachers"                      ON public.teacher_profiles;
DROP POLICY IF EXISTS "Authenticated users can delete teachers"                      ON public.teacher_profiles;
DROP POLICY IF EXISTS "Teachers can insert their own profile, admins can insert any" ON public.teacher_profiles;
DROP POLICY IF EXISTS "Only admins can create teachers"                              ON public.teacher_profiles;
DROP POLICY IF EXISTS "Admins and cashiers can view all teachers"                    ON public.teacher_profiles;
DROP POLICY IF EXISTS "tp_admin_view_all"                                            ON public.teacher_profiles;
DROP POLICY IF EXISTS "tp_staff_view_by_school"                                      ON public.teacher_profiles;
DROP POLICY IF EXISTS "tp_teacher_view_own"                                          ON public.teacher_profiles;
DROP POLICY IF EXISTS "tp_insert_own_or_admin"                                       ON public.teacher_profiles;
DROP POLICY IF EXISTS "tp_teacher_update_own"                                        ON public.teacher_profiles;
DROP POLICY IF EXISTS "tp_admin_update_all"                                          ON public.teacher_profiles;
DROP POLICY IF EXISTS "tp_admin_delete"                                              ON public.teacher_profiles;

-- 2. Asegurar que RLS está habilitado
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- 3. SELECT: Cada usuario autenticado puede ver perfiles de profesores
--    (necesario para el POS al buscar profesores)
CREATE POLICY "tp_authenticated_view"
  ON public.teacher_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. INSERT: El propio profesor puede crear SU perfil (onboarding)
--    Los admins también pueden crear perfiles
CREATE POLICY "tp_insert_own_or_admin"
  ON public.teacher_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('superadmin', 'admin_general', 'gestor_unidad')
    )
  );

-- 5. UPDATE: El propio profesor puede actualizar SU perfil
CREATE POLICY "tp_update_own"
  ON public.teacher_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('superadmin', 'admin_general', 'gestor_unidad')
    )
  );

-- 6. DELETE: Solo admins
CREATE POLICY "tp_delete_admin"
  ON public.teacher_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('superadmin', 'admin_general')
    )
  );

-- 7. Verificar las políticas creadas
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'teacher_profiles' AND schemaname = 'public'
ORDER BY policyname;

NOTIFY pgrst, 'reload schema';
