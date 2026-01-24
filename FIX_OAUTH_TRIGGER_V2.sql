-- ================================================
-- FIX OAUTH TRIGGER V2 - CREAR PARENT_PROFILES SIN ONBOARDING
-- ================================================
-- Este script corrige el trigger para que funcione con el nuevo flujo:
-- 1. OAuth/Manual → Email confirmation → Onboarding → Estudiantes → Portal
-- 2. parent_profiles se crea VACÍO (sin school_id, sin onboarding_completed)
-- 3. Onboarding completa estos datos después
-- ================================================

-- 1. ELIMINAR TRIGGER Y FUNCIÓN EXISTENTE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. RECREAR LA FUNCIÓN handle_new_user con nuevo flujo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT := 'parent'; -- Por defecto, todos los nuevos usuarios son padres
  user_full_name TEXT := '';
BEGIN
  -- Log del evento
  RAISE LOG 'handle_new_user: Procesando usuario %', NEW.email;

  -- Extraer full_name de raw_user_meta_data si existe
  BEGIN
    IF NEW.raw_user_meta_data IS NOT NULL THEN
      user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
      RAISE LOG 'handle_new_user: Nombre detectado: %', user_full_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error extrayendo metadata: %', SQLERRM;
    user_full_name := '';
  END;

  -- Insertar o actualizar en profiles
  BEGIN
    INSERT INTO public.profiles (id, email, role, full_name, created_at)
    VALUES (NEW.id, NEW.email, user_role, user_full_name, NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    
    RAISE LOG 'handle_new_user: Profile creado/actualizado para %', NEW.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: Error creando profile: %', SQLERRM;
  END;

  -- Si es padre, crear parent_profiles VACÍO (sin school_id, sin onboarding)
  IF user_role = 'parent' THEN
    BEGIN
      INSERT INTO public.parent_profiles (
        user_id, 
        onboarding_completed,
        created_at
      )
      VALUES (
        NEW.id,
        false, -- Onboarding NO completado
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;
      
      RAISE LOG 'handle_new_user: parent_profiles creado para %', NEW.email;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: Error creando parent_profile: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. RECREAR EL TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. COMENTARIO EXPLICATIVO
COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger para crear profiles y parent_profiles al registrarse. 
parent_profiles se crea VACÍO (sin school_id).
El flujo completo es: Registro → Confirmación Email → Onboarding (sede+términos) → Estudiantes → Portal';

-- ================================================
-- DIAGNÓSTICO: Verificar que funcione
-- ================================================
SELECT 
  'Trigger Configurado' as status,
  'handle_new_user creado correctamente' as message;

-- Ver usuarios recientes sin onboarding completado
SELECT 
  p.email,
  p.role,
  pp.onboarding_completed,
  pp.school_id,
  p.created_at
FROM profiles p
LEFT JOIN parent_profiles pp ON pp.user_id = p.id
WHERE p.role = 'parent'
ORDER BY p.created_at DESC
LIMIT 10;
