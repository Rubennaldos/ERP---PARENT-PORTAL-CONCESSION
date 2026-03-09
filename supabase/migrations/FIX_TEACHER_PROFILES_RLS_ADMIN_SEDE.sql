-- =====================================================
-- FIX: admin_sede y admin_escuela pueden ver profesores en POS
-- =====================================================
-- Los roles admin_sede y admin_escuela no estaban en las políticas
-- de teacher_profiles, por eso no veían profesores al buscar en el módulo de ventas.
-- =====================================================

-- Eliminar política existente de staff por escuela
DROP POLICY IF EXISTS "tp_staff_view_by_school" ON public.teacher_profiles;

-- Recrear incluyendo admin_sede y admin_escuela
CREATE POLICY "tp_staff_view_by_school"
  ON public.teacher_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('gestor_unidad', 'operador_caja', 'admin_sede', 'admin_escuela')
        AND profiles.school_id IS NOT NULL
        AND (
          teacher_profiles.school_id_1 = profiles.school_id
          OR teacher_profiles.school_id_2 = profiles.school_id
        )
    )
  );

-- NOTA: tp_admin_view_all se mantiene para admin_general, superadmin, supervisor_red
