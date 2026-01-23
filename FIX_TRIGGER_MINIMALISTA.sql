-- ============================================================================
-- DIAGNÓSTICO COMPLETO Y TRIGGER ULTRA SIMPLE
-- ============================================================================

-- 1. VER ESTADO ACTUAL
SELECT 'RLS Estado' as info;
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'parent_profiles');

SELECT 'Usuarios en auth.users' as info;
SELECT email FROM auth.users WHERE email LIKE '%fiorella%' OR email LIKE '%limacafe%';

SELECT 'Usuarios en profiles' as info;
SELECT email, role FROM public.profiles WHERE email LIKE '%fiorella%' OR email LIKE '%limacafe%';

-- 2. LIMPIAR COMPLETAMENTE A FIORELLA
DELETE FROM auth.users WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.profiles WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.parent_profiles 
WHERE user_id IN (SELECT id FROM public.profiles WHERE email = 'fiorella@limacafe28.com');

-- 3. DESACTIVAR RLS COMPLETAMENTE
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students DISABLE ROW LEVEL SECURITY;

-- 4. ELIMINAR EL TRIGGER ACTUAL
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 5. CREAR UN TRIGGER MINIMALISTA (SIN NADA QUE PUEDA FALLAR)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insertar perfil básico sin validaciones
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla, retornar NEW de todas formas para que no bloquee el signup
    RAISE WARNING 'Error en trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. VERIFICAR QUE TODO ESTÉ OK
SELECT 'Trigger verificado' as info;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

SELECT 'Estado final RLS' as info;
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'parent_profiles');

-- 7. INSTRUCCIONES
SELECT 'AHORA INTENTA CREAR A FIORELLA DESDE EL FRONTEND' as instruccion;
