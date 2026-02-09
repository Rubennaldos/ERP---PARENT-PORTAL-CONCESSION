-- PASO 1: Ver el rol ACTUAL (ANTES de cambiar)
SELECT 
  id,
  email,
  role as rol_actual,
  full_name
FROM profiles
WHERE email = 'alberto@gmail.com';

-- PASO 2: CAMBIAR el rol a 'teacher'
UPDATE profiles
SET role = 'teacher'
WHERE email = 'alberto@gmail.com';

-- PASO 3: Ver el rol DESPUÉS del cambio
SELECT 
  id,
  email,
  role as rol_nuevo,
  full_name
FROM profiles
WHERE email = 'alberto@gmail.com';
