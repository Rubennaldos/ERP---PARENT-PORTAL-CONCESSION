-- Verificar si el padre/usuario existe en diferentes tablas

-- 1. Buscar en auth.users (autenticación exitosa)
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Ver columnas reales de profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 3. Verificar si existe en profiles
SELECT 
  id,
  email,
  full_name,
  role,
  school_id,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- 4. Ver columnas de parent_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'parent_profiles' 
ORDER BY ordinal_position;

-- 5. Buscar en parent_profiles (tabla de padres)
SELECT 
  id,
  full_name,
  dni,
  email,
  phone_1,
  school_id,
  created_at
FROM parent_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 6. Ver usuarios en auth que NO tienen perfil en profiles
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  p.id as profile_id,
  p.role,
  pp.id as parent_profile_id
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN parent_profiles pp ON au.id = pp.id
WHERE au.created_at >= NOW() - INTERVAL '7 days'
ORDER BY au.created_at DESC
LIMIT 20;

-- 7. Ver si hay trigger para crear perfil automáticamente
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('users', 'profiles', 'parent_profiles')
ORDER BY trigger_name;
