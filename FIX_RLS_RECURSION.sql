-- ============================================================================
-- FIX RLS RECURSION & ROLE RECOVERY
-- ============================================================================
-- 1. CREAR FUNCIONES DE SEGURIDAD (SECURITY DEFINER)
-- Estas funciones saltan el RLS para evitar el bucle infinito.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. LIMPIAR POLÍTICAS DE PROFILES
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- 3. CREAR NUEVAS POLÍTICAS SIN RECURSIÓN
-- ============================================================================

-- El usuario siempre puede ver y editar SU PROPIO perfil (sin consultar a nadie más)
CREATE POLICY "profiles_self_select" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Los administradores pueden ver todos usando la función "SECURITY DEFINER"
CREATE POLICY "profiles_admin_select" ON public.profiles
FOR SELECT USING (public.check_is_admin());

CREATE POLICY "profiles_admin_all" ON public.profiles
FOR ALL USING (public.check_is_admin());

-- Permitir inserción inicial (necesario para el registro)
CREATE POLICY "profiles_insert_init" ON public.profiles
FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 4. ASEGURAR QUE TU USUARIO SEA ADMIN
-- Reemplaza el email por el tuyo si es necesario, pero esto buscará tu sesión actual
-- ============================================================================

UPDATE public.profiles 
SET role = 'superadmin' 
WHERE id = auth.uid();

-- Si conoces tu email de admin, ejecútalo también así por seguridad:
UPDATE public.profiles 
SET role = 'superadmin' 
WHERE email = 'fiorella@limacafe28.com'; -- El email que veo en tu consola

-- ============================================================================
-- 5. REPARAR PARENT_PROFILES
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'parent_profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.parent_profiles', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "parents_self_all" ON public.parent_profiles
FOR ALL USING (auth.uid() = user_id OR public.check_is_admin());

CREATE POLICY "parents_admin_select" ON public.parent_profiles
FOR SELECT USING (public.check_is_admin());

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT email, role FROM public.profiles WHERE id = auth.uid();
