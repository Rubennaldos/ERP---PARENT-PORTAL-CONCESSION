-- =====================================================
-- LIMPIEZA: Eliminar políticas duplicadas de teacher_profiles
-- =====================================================
-- Las siguientes políticas antiguas quedaron porque sus nombres
-- no coincidían con los DROP del script anterior.
-- Las nuevas políticas tp_* ya están activas y son correctas.
-- =====================================================

DROP POLICY IF EXISTS "Admins create teachers"      ON public.teacher_profiles;
DROP POLICY IF EXISTS "Admins delete teachers"      ON public.teacher_profiles;
DROP POLICY IF EXISTS "Admins view all teachers"    ON public.teacher_profiles;
DROP POLICY IF EXISTS "Teachers update own profile" ON public.teacher_profiles;
DROP POLICY IF EXISTS "Teachers view own profile"   ON public.teacher_profiles;

-- Verificar que solo queden las 4 políticas correctas:
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'teacher_profiles'
  AND schemaname = 'public'
ORDER BY policyname;

-- Resultado esperado:
-- tp_authenticated_view  → SELECT (cualquier autenticado puede ver)
-- tp_delete_admin        → DELETE (solo admins)
-- tp_insert_own_or_admin → INSERT (propio profesor + admins) ← KEY para onboarding
-- tp_update_own          → UPDATE (propio profesor + admins)

NOTIFY pgrst, 'reload schema';
