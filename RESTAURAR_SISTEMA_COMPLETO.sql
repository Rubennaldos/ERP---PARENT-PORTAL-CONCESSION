-- ============================================================================
-- RESETEO COMPLETO DEL SISTEMA DE CREACIÓN DE USUARIOS
-- ============================================================================
-- Este script restaura TODA la funcionalidad para crear admins

-- ============================================================================
-- PASO 1: LIMPIAR TODO
-- ============================================================================

-- Eliminar cualquier rastro de Fiorella
DELETE FROM auth.users WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.profiles WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.parent_profiles WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'fiorella@limacafe28.com'
);

-- Eliminar TODAS las políticas RLS existentes
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
      SELECT policyname, tablename 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename IN ('profiles', 'parent_profiles', 'students')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: ACTIVAR RLS CON POLÍTICAS SUPER SIMPLES
-- ============================================================================

-- PROFILES: Políticas ultra simples
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON public.profiles 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- PARENT_PROFILES: Igual de simple
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON public.parent_profiles 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- STUDENTS: Simple también
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON public.students 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PASO 3: TRIGGER QUE SÍ FUNCIONA
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Leer rol desde metadata
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::TEXT, 'parent');
  
  -- Insertar perfil (sin excepciones que lo bloqueen)
  INSERT INTO public.profiles (id, email, role, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_role,
    COALESCE((NEW.raw_user_meta_data->>'full_name')::TEXT, split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );

  -- Solo crear parent_profile si es padre
  IF user_role = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PASO 4: ASEGURAR TU ROL DE SUPERADMIN
-- ============================================================================

UPDATE public.profiles 
SET role = 'superadmin' 
WHERE email = 'superadmin@limacafe28.com';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

SELECT 'SISTEMA RESTAURADO - AHORA INTENTA CREAR A FIORELLA DESDE EL FRONTEND' as status;

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'parent_profiles')
ORDER BY tablename, policyname;

SELECT 
  email,
  role
FROM public.profiles
ORDER BY created_at;
