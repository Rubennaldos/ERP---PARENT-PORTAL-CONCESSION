-- ============================================================================
-- FIX OAUTH ERROR 500 - VERSION 2 (CON LIMPIEZA AUTOMÁTICA)
-- ============================================================================
-- Este script soluciona el error 500 al registrarse con Google/OAuth
-- Elimina automáticamente las políticas existentes antes de recrearlas
-- ============================================================================

-- ============================================================================
-- PASO 1: RECREAR EL TRIGGER PARA MANEJAR NUEVOS USUARIOS
-- ============================================================================

-- Eliminar el trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Crear la función mejorada que crea el perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Obtener el email del usuario
  user_email := NEW.email;

  -- Insertar en la tabla profiles
  INSERT INTO public.profiles (
    id,
    email,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_email,
    'parent', -- Por defecto todos son padres
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Si ya existe, no hacer nada

  -- Insertar en la tabla parent_profiles
  INSERT INTO public.parent_profiles (
    user_id,
    school_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NULL, -- El padre seleccionará su sede después
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Si ya existe, no hacer nada

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PASO 2: ELIMINAR Y RECREAR POLÍTICAS RLS EN PROFILES
-- ============================================================================

-- Eliminar todas las políticas existentes en profiles
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
  END LOOP;
END $$;

-- Habilitar RLS en profiles (por si acaso)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES

-- 1. Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- 3. Usuarios pueden insertar su propio perfil (para el trigger)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 4. Administradores pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- 5. Administradores pueden actualizar cualquier perfil
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- ============================================================================
-- PASO 3: ELIMINAR Y RECREAR POLÍTICAS RLS EN PARENT_PROFILES
-- ============================================================================

-- Eliminar todas las políticas existentes en parent_profiles
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'parent_profiles' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.parent_profiles', policy_record.policyname);
  END LOOP;
END $$;

-- Habilitar RLS en parent_profiles (por si acaso)
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para PARENT_PROFILES

-- 1. Padres pueden ver su propio perfil
CREATE POLICY "Parents can view own profile"
ON public.parent_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Padres pueden actualizar su propio perfil
CREATE POLICY "Parents can update own profile"
ON public.parent_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Padres pueden insertar su propio perfil (para el trigger)
CREATE POLICY "Parents can insert own profile"
ON public.parent_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Administradores pueden ver todos los perfiles de padres
CREATE POLICY "Admins can view all parent profiles"
ON public.parent_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- 5. Administradores pueden actualizar cualquier perfil de padre
CREATE POLICY "Admins can update all parent profiles"
ON public.parent_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- 6. Administradores pueden insertar perfiles de padres
CREATE POLICY "Admins can insert parent profiles"
ON public.parent_profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que el trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Verificar políticas en profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Verificar políticas en parent_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'parent_profiles'
ORDER BY policyname;
