-- Investigar cuenta del profesor Beto Naldos Prueba

-- 1. Verificar si existe en auth.users
SELECT 
  'AUTH USERS' as tabla,
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'alberto@gmail.com';

-- 2. Verificar su perfil en profiles
SELECT 
  'PROFILES' as tabla,
  id,
  email,
  role,
  full_name,
  school_id,
  created_at
FROM profiles
WHERE email = 'alberto@gmail.com';

-- 3. Verificar si tiene parent_profile (NO DEBERÍA)
SELECT 
  'PARENT_PROFILES' as tabla,
  pp.id,
  pp.user_id,
  pp.full_name,
  pp.dni,
  p.email,
  p.role
FROM parent_profiles pp
JOIN profiles p ON pp.user_id = p.id
WHERE p.email = 'alberto@gmail.com';

-- 4. Verificar si tiene teacher_profile (DEBERÍA TENER)
SELECT 
  'TEACHER_PROFILES' as tabla,
  tp.id,
  tp.full_name,
  tp.dni,
  tp.area,
  tp.corporate_email,
  tp.personal_email,
  tp.school_id_1,
  tp.school_id_2
FROM teacher_profiles tp
WHERE tp.corporate_email = 'alberto@gmail.com' 
   OR tp.personal_email = 'alberto@gmail.com';

-- 5. Buscar por nombre completo en teacher_profiles
SELECT 
  'TEACHER_BY_NAME' as tabla,
  tp.id,
  tp.full_name,
  tp.dni,
  tp.corporate_email,
  tp.personal_email,
  tp.school_id_1,
  tp.school_id_2
FROM teacher_profiles tp
WHERE tp.full_name ILIKE '%beto%naldos%'
   OR tp.full_name ILIKE '%naldos%';

-- 6. Ver todos los roles disponibles
SELECT DISTINCT role FROM profiles ORDER BY role;
