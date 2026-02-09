-- Corregir el rol del profesor Beto Naldos Prueba

-- 1. Verificar el rol actual en profiles
SELECT 
  'ANTES - ROL EN PROFILES' as etapa,
  p.id,
  p.email,
  p.role,
  p.full_name,
  p.created_at
FROM profiles p
WHERE p.email = 'alberto@gmail.com';

-- 2. Verificar si tiene teacher_profile (para confirmar que es profesor)
SELECT 
  'VERIFICAR SI ES PROFESOR' as etapa,
  tp.id as teacher_id,
  tp.full_name,
  tp.dni,
  tp.area,
  tp.personal_email,
  tp.corporate_email
FROM teacher_profiles tp
WHERE tp.personal_email = 'alberto@gmail.com' 
   OR tp.corporate_email = 'alberto@gmail.com'
   OR tp.full_name ILIKE '%beto%naldos%';

-- 3. CORREGIR: Actualizar el rol a 'teacher' si tiene teacher_profile
UPDATE profiles
SET role = 'teacher'
WHERE email = 'alberto@gmail.com'
  AND EXISTS (
    SELECT 1 
    FROM teacher_profiles tp 
    WHERE tp.personal_email = 'alberto@gmail.com' 
       OR tp.corporate_email = 'alberto@gmail.com'
  );

-- 4. Verificar el cambio
SELECT 
  'DESPUÉS - ROL CORREGIDO' as etapa,
  p.id,
  p.email,
  p.role,
  p.full_name,
  p.created_at
FROM profiles p
WHERE p.email = 'alberto@gmail.com';

-- 5. OPCIONAL: Eliminar parent_profile si existe (porque es profesor, no padre)
-- IMPORTANTE: Solo ejecutar si estás seguro que no debe tener perfil de padre
/*
DELETE FROM parent_profiles
WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'alberto@gmail.com'
);
*/

SELECT 
  'VERIFICAR PARENT_PROFILE (debería estar vacío)' as etapa,
  pp.*
FROM parent_profiles pp
JOIN profiles p ON pp.user_id = p.id
WHERE p.email = 'alberto@gmail.com';
