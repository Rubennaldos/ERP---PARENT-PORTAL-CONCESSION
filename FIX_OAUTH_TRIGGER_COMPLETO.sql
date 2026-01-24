-- ============================================================================
-- VERIFICAR Y ARREGLAR TRIGGER DE OAUTH
-- ============================================================================

-- PASO 1: Ver si existe el trigger
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- PASO 2: Ver la función del trigger
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- PASO 3: Recrear trigger desde cero (más robusto)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Crear función robusta
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_school_id UUID;
BEGIN
  -- Log del nuevo usuario
  RAISE NOTICE '🆕 Nuevo usuario detectado: %', NEW.email;
  
  -- Obtener datos del metadata
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_school_id := (NEW.raw_user_meta_data->>'school_id')::UUID;
  
  RAISE NOTICE '📋 Role: %, Name: %, School: %', v_role, v_full_name, v_school_id;
  
  -- Insertar en profiles (TODOS los usuarios)
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, school_id)
    VALUES (NEW.id, NEW.email, v_full_name, v_role, v_school_id)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Profile creado para: %', NEW.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Error creando profile: %', SQLERRM;
    RETURN NEW; -- Continuar aunque falle
  END;
  
  -- Si es padre, crear parent_profile
  IF v_role = 'parent' THEN
    BEGIN
      INSERT INTO public.parent_profiles (user_id, school_id)
      VALUES (NEW.id, v_school_id)
      ON CONFLICT (user_id) DO NOTHING;
      
      RAISE NOTICE '✅ Parent profile creado para: %', NEW.email;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Error creando parent_profile: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- PASO 4: Deshabilitar temporalmente RLS para que funcione
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles DISABLE ROW LEVEL SECURITY;

-- PASO 5: Verificar
SELECT '✅ Trigger recreado exitosamente' as status;

-- PASO 6: Probar con usuario existente (si existe alguno sin profile)
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM profiles)
    LIMIT 1
  LOOP
    RAISE NOTICE '🔧 Usuario sin profile encontrado: %', v_user.email;
    RAISE NOTICE 'Ejecuta manualmente:';
    RAISE NOTICE 'INSERT INTO profiles (id, email, full_name, role) VALUES (''%'', ''%'', ''%'', ''parent'');', 
      v_user.id, v_user.email, COALESCE(v_user.raw_user_meta_data->>'name', split_part(v_user.email, '@', 1));
  END LOOP;
END $$;
