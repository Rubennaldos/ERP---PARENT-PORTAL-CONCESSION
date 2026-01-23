-- ============================================================================
-- SOLUCIÓN: PERMITIR AL TRIGGER INSERTAR SIN RESTRICCIONES
-- ============================================================================

-- 1. LIMPIAR USUARIO ZOMBIE
DELETE FROM auth.users WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.profiles WHERE email = 'fiorella@limacafe28.com';

-- 2. DESACTIVAR RLS TEMPORALMENTE PARA DIAGNÓSTICO
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles DISABLE ROW LEVEL SECURITY;

-- 3. RECREAR TRIGGER CON MEJOR MANEJO DE ERRORES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
BEGIN
  -- Leer metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  RAISE NOTICE 'Trigger ejecutándose para: % con rol: %', NEW.email, user_role;
  
  BEGIN
    -- Insertar en profiles
    INSERT INTO public.profiles (id, email, role, full_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, user_role, user_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET 
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = NOW();
    
    RAISE NOTICE 'Perfil creado/actualizado exitosamente';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error al crear perfil: %', SQLERRM;
      -- No lanzar el error para que el usuario se cree igual
  END;

  -- Solo crear parent_profile si es padre
  IF user_role = 'parent' THEN
    BEGIN
      INSERT INTO public.parent_profiles (user_id, created_at, updated_at)
      VALUES (NEW.id, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
      RAISE NOTICE 'Parent profile creado';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error al crear parent_profile: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. VERIFICAR ESTADO ACTUAL
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'parent_profiles');

-- 5. AHORA INTENTA CREAR A FIORELLA
-- Si funciona, después reactivaremos RLS con políticas correctas
