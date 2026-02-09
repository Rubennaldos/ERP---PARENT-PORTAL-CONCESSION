-- Buscar al profesor Beto por diferentes métodos

-- 1. Buscar en profiles por email (sin importar mayúsculas/minúsculas)
SELECT 
  'PROFILES - Buscar por email' as metodo,
  id,
  email,
  role,
  full_name
FROM profiles
WHERE LOWER(email) LIKE '%alberto%gmail%';

-- 2. Buscar en profiles por nombre
SELECT 
  'PROFILES - Buscar por nombre' as metodo,
  id,
  email,
  role,
  full_name
FROM profiles
WHERE LOWER(full_name) LIKE '%beto%';

-- 3. Obtener el user_id desde teacher_profiles
SELECT 
  'TEACHER_PROFILES - Info del profesor' as metodo,
  id as teacher_id,
  full_name,
  dni,
  personal_email,
  corporate_email
FROM teacher_profiles
WHERE dni = '48437658'
   OR LOWER(full_name) LIKE '%beto%naldos%';

-- 4. Buscar en profiles usando el DNI 48437658
SELECT 
  'PROFILES - Buscar por DNI en full_name' as metodo,
  id,
  email,
  role,
  full_name
FROM profiles
WHERE full_name LIKE '%48437658%'
   OR LOWER(full_name) LIKE '%beto%';
