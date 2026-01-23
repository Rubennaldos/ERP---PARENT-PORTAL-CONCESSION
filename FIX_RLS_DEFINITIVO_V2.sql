-- ============================================================================
-- SOLUCIÓN DEFINITIVA: POLÍTICAS RLS CORRECTAS (SIN SCHEMA AUTH)
-- ============================================================================

-- 1. LIMPIAR TODO DE FIORELLA
DELETE FROM auth.users WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.profiles WHERE email = 'fiorella@limacafe28.com';

-- 2. ELIMINAR TODAS LAS POLÍTICAS ACTUALES DE PROFILES
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- 3. CREAR FUNCIÓN HELPER EN PUBLIC (NO EN AUTH)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. POLÍTICAS SIMPLES Y EFECTIVAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- a) Cada usuario ve su propio perfil
CREATE POLICY "profiles_select_own" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

-- b) SuperAdmin y Admin General ven TODOS los perfiles
CREATE POLICY "profiles_select_admin" 
ON public.profiles FOR SELECT 
USING (public.get_my_role() IN ('superadmin', 'admin_general'));

-- c) SuperAdmin y Admin General pueden INSERTAR perfiles
CREATE POLICY "profiles_insert_admin" 
ON public.profiles FOR INSERT 
WITH CHECK (public.get_my_role() IN ('superadmin', 'admin_general'));

-- d) SuperAdmin y Admin General pueden ACTUALIZAR cualquier perfil
CREATE POLICY "profiles_update_admin" 
ON public.profiles FOR UPDATE 
USING (public.get_my_role() IN ('superadmin', 'admin_general'));

-- e) Permitir INSERT durante el signup (para el trigger)
CREATE POLICY "profiles_insert_signup" 
ON public.profiles FOR INSERT 
WITH CHECK (id = auth.uid());

-- f) SuperAdmin y Admin General pueden BORRAR
CREATE POLICY "profiles_delete_admin" 
ON public.profiles FOR DELETE 
USING (public.get_my_role() IN ('superadmin', 'admin_general'));

-- 5. ASEGURAR QUE EL TRIGGER FUNCIONE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
BEGIN
  -- Leer metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  -- Insertar en profiles
  INSERT INTO public.profiles (id, email, role, full_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, user_role, user_name, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE 
  SET 
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  -- Solo crear parent_profile si es padre
  IF user_role = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. ASEGURAR TU ROL DE SUPERADMIN
UPDATE public.profiles 
SET role = 'superadmin' 
WHERE email = 'superadmin@limacafe28.com';

-- 7. VERIFICAR POLÍTICAS
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 8. VERIFICAR QUE PUEDES VER PERFILES
SELECT email, role FROM public.profiles;
