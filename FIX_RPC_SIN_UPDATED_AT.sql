-- ============================================================================
-- FIX: VERIFICAR ESTRUCTURA DE PROFILES Y CORREGIR FUNCIÓN RPC
-- ============================================================================

-- 1. Ver qué columnas tiene realmente la tabla profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Borrar la función anterior
DROP FUNCTION IF EXISTS public.create_admin_user(TEXT, TEXT, TEXT, TEXT);

-- 3. Crear función RPC CORREGIDA (sin updated_at si no existe)
CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'admin_general'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  encrypted_password TEXT;
BEGIN
  -- Generar ID único
  new_user_id := gen_random_uuid();
  
  -- Encriptar contraseña
  encrypted_password := crypt(p_password, gen_salt('bf'));
  
  -- Insertar en auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    p_email,
    encrypted_password,
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Insertar en profiles (SIN updated_at, solo las columnas que existen)
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    created_at
  ) VALUES (
    new_user_id,
    p_email,
    p_role,
    p_full_name,
    NOW()
  );

  -- Retornar éxito
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', p_email,
    'role', p_role,
    'full_name', p_full_name
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.create_admin_user TO authenticated;

-- Verificar
SELECT '✅ FUNCIÓN RPC CORREGIDA - Sin columna updated_at' as status;
