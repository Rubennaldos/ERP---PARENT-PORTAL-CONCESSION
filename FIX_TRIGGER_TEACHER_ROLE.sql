-- =====================================================
-- 🚨 FIX URGENTE: El trigger IGNORA el rol del metadata
-- Los profesores se registran como 'teacher' pero el
-- trigger siempre les pone 'parent'
-- =====================================================

-- ═══════════════════════════════════════════════════
-- PASO 1: DIAGNÓSTICO — Ver profesores afectados
-- ═══════════════════════════════════════════════════

-- Ver usuarios cuyo metadata dice 'teacher' pero profiles dice 'parent'
SELECT 
  p.id,
  p.email,
  p.role as rol_actual,
  au.raw_user_meta_data->>'role' as rol_intencionado,
  pp.user_id IS NOT NULL as tiene_parent_profile,
  p.created_at
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN public.parent_profiles pp ON pp.user_id = p.id
WHERE au.raw_user_meta_data->>'role' = 'teacher'
  AND p.role = 'parent'
ORDER BY p.created_at DESC;

-- ═══════════════════════════════════════════════════
-- PASO 2: ARREGLAR PROFESORES EXISTENTES
-- ═══════════════════════════════════════════════════

-- 2a. Cambiar rol a 'teacher' en profiles
UPDATE public.profiles 
SET role = 'teacher', updated_at = NOW()
WHERE id IN (
  SELECT p.id 
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE au.raw_user_meta_data->>'role' = 'teacher'
    AND p.role = 'parent'
);

-- 2b. Eliminar parent_profiles que se crearon por error para profesores
DELETE FROM public.parent_profiles
WHERE user_id IN (
  SELECT p.id 
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE au.raw_user_meta_data->>'role' = 'teacher'
);

-- ═══════════════════════════════════════════════════
-- PASO 3: ARREGLAR EL TRIGGER
-- ═══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
BEGIN
  -- 🔥 LEER el rol desde raw_user_meta_data (antes se ignoraba!)
  user_role := COALESCE(
    NULLIF(TRIM((NEW.raw_user_meta_data->>'role')::TEXT), ''),
    'parent'
  );
  
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );

  RAISE LOG 'handle_new_user: Email=% Role=% Name=%', NEW.email, user_role, user_full_name;

  -- Crear/actualizar perfil con el ROL CORRECTO
  BEGIN
    INSERT INTO public.profiles (id, email, role, full_name, created_at)
    VALUES (NEW.id, NEW.email, user_role, user_full_name, NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);
    
    RAISE LOG 'handle_new_user: Profile OK para % con rol %', NEW.email, user_role;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: Error en profiles: %', SQLERRM;
  END;

  -- Solo crear parent_profiles para PADRES (NO para profesores)
  IF user_role = 'parent' THEN
    BEGIN
      INSERT INTO public.parent_profiles (user_id, onboarding_completed, created_at)
      VALUES (NEW.id, false, NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
      RAISE LOG 'handle_new_user: parent_profiles creado para %', NEW.email;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: Error en parent_profiles: %', SQLERRM;
    END;
  ELSE
    RAISE LOG 'handle_new_user: Rol=% — NO se crea parent_profiles para %', user_role, NEW.email;
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user FATAL para %: % %', NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- PASO 4: VERIFICAR
-- ═══════════════════════════════════════════════════

-- Verificar que el trigger existe
SELECT 
  'Trigger actualizado ✅' as status,
  trigger_name, 
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Verificar que ya no hay profesores con rol incorrecto
SELECT 
  p.email,
  p.role as rol_actual,
  au.raw_user_meta_data->>'role' as rol_metadata
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.raw_user_meta_data->>'role' = 'teacher'
ORDER BY p.created_at DESC;

NOTIFY pgrst, 'reload schema';
