-- ============================================
-- FIX: ERROR 500 EN OAUTH GOOGLE
-- Arreglar triggers y políticas para registro OAuth
-- ============================================

-- 1. VERIFICAR Y RECREAR TRIGGER DE PERFILES
-- Este trigger crea automáticamente un registro en 'profiles' cuando se crea un usuario en auth.users

-- Eliminar trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Crear función mejorada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'parent', -- Por defecto todos los nuevos usuarios son padres
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. POLÍTICAS RLS PARA PROFILES (PERMITIR INSERTS DE AUTH)

-- Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow auth trigger to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Política para permitir que el trigger inserte
CREATE POLICY "Allow auth trigger to insert profiles"
ON profiles FOR INSERT
WITH CHECK (true);

-- Política para que usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Política para que usuarios puedan ver su propio perfil
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Admin General puede ver todos los perfiles
CREATE POLICY "Admin General can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin_general'
  )
);

-- 3. HABILITAR RLS EN PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS PARA PARENT_PROFILES (PERMITIR INSERTS AUTOMÁTICOS)

-- Eliminar políticas que puedan estar bloqueando
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON parent_profiles;
DROP POLICY IF EXISTS "Parents can create own profile" ON parent_profiles;

-- Permitir que usuarios autenticados creen su perfil de padre
CREATE POLICY "Parents can create own profile"
ON parent_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 5. VERIFICAR CONFIGURACIÓN DE REDIRECT URLs EN SUPABASE

-- Este es un recordatorio, no SQL ejecutable:
-- Ve a: Supabase Dashboard > Authentication > URL Configuration
-- Asegúrate que estas URLs estén en "Redirect URLs":
--   - http://localhost:8081
--   - http://localhost:8080
--   - http://localhost:5173
--   - https://parent-portal-connect.vercel.app
--   - https://parent-portal-connect.vercel.app/

-- 6. VERIFICAR QUE LA TABLA PROFILES TENGA TODOS LOS CAMPOS

-- Verificar estructura de profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. VERIFICAR POLÍTICAS CREADAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'parent_profiles')
ORDER BY tablename, policyname;

-- 8. PROBAR INSERCIÓN MANUAL (SIMULANDO OAUTH)
-- Esto NO se ejecuta automáticamente, es solo para prueba:
/*
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_email text := 'test_oauth@gmail.com';
BEGIN
  -- Simular inserción en profiles
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (test_user_id, test_email, 'Usuario de Prueba OAuth', 'parent')
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Perfil de prueba creado: %', test_user_id;
  
  -- Limpiar prueba
  DELETE FROM public.profiles WHERE id = test_user_id;
  RAISE NOTICE '✅ Perfil de prueba eliminado';
END $$;
*/

-- ✅ Script completado
-- ✅ Ahora intenta registrarte con Google nuevamente
