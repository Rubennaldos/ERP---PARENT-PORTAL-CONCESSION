-- Ver la estructura de teacher_profiles y su relación con profiles

-- 1. Ver las columnas de teacher_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_profiles'
ORDER BY ordinal_position;

-- 2. Buscar si teacher_profiles tiene user_id o profile_id
SELECT *
FROM teacher_profiles
WHERE dni = '48437658'
LIMIT 1;

-- 3. Verificar si hay algún profile que pueda estar relacionado
-- Buscar en auth.users primero
SELECT 
  'AUTH.USERS' as tabla,
  id,
  email,
  created_at
FROM auth.users
WHERE email ILIKE '%alberto%'
   OR email ILIKE '%beto%';
