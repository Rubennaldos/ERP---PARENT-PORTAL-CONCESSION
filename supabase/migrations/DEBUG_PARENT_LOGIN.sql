-- Verificar si el padre/usuario existe en diferentes tablas

-- 1. Buscar en auth.users (autenticación exitosa)
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at,
  raw_user_meta_data
FROM auth.users
WHERE email ILIKE '%4a33af1%' OR email ILIKE '%padre%'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verificar si existe en profiles
SELECT 
  id,
  email,
  full_name,
  role,
  school_id,
  onboarding_completed,
  created_at
FROM profiles
WHERE email ILIKE '%4a33af1%' OR email ILIKE '%padre%'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Buscar en parent_profiles (tabla de padres)
SELECT 
  id,
  full_name,
  dni,
  email,
  phone_1,
  school_id,
  onboarding_completed,
  created_at
FROM parent_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 4. Ver usuarios recientes en auth que NO tienen perfil
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  p.id as profile_id,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND au.created_at >= NOW() - INTERVAL '7 days'
ORDER BY au.created_at DESC;

-- 5. Ver si hay trigger para crear perfil automáticamente
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name ILIKE '%profile%' OR trigger_name ILIKE '%user%';
