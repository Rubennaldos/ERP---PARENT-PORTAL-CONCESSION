-- Investigar el problema con TODOS los profesores

-- 1. Ver el perfil en profiles del profesor (usando su ID de auth.users)
SELECT 
  'PROFILES del profesor Beto' as info,
  id,
  email,
  role,
  full_name,
  created_at
FROM profiles
WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 2. Verificar TODOS los profesores y su estado en profiles
SELECT 
  'RESUMEN - Profesores y sus roles' as info,
  tp.id as teacher_id,
  tp.full_name as nombre_profesor,
  tp.personal_email,
  p.id as profile_id,
  p.role as rol_en_profiles,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO tiene profile'
    WHEN p.role = 'teacher' THEN '✅ Rol correcto'
    ELSE '⚠️ Rol incorrecto: ' || p.role
  END as estado
FROM teacher_profiles tp
LEFT JOIN profiles p ON tp.id = p.id
ORDER BY tp.full_name;

-- 3. Contar cuántos profesores tienen problemas
SELECT 
  'ESTADÍSTICAS' as tipo,
  COUNT(*) as total_profesores,
  COUNT(p.id) as con_profile,
  COUNT(*) - COUNT(p.id) as sin_profile,
  SUM(CASE WHEN p.role = 'teacher' THEN 1 ELSE 0 END) as con_rol_correcto,
  SUM(CASE WHEN p.role IS NOT NULL AND p.role != 'teacher' THEN 1 ELSE 0 END) as con_rol_incorrecto
FROM teacher_profiles tp
LEFT JOIN profiles p ON tp.id = p.id;

-- 4. Si hay profesores con rol incorrecto, listarlos
SELECT 
  'PROFESORES CON ROL INCORRECTO' as problema,
  tp.full_name,
  tp.personal_email,
  p.role as rol_actual,
  tp.id
FROM teacher_profiles tp
JOIN profiles p ON tp.id = p.id
WHERE p.role != 'teacher';

-- 5. SOLUCIÓN: Corregir el rol del profesor Beto específicamente
UPDATE profiles
SET role = 'teacher'
WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 6. Verificar el cambio
SELECT 
  'DESPUÉS DE CORREGIR - Beto' as info,
  id,
  email,
  role,
  full_name
FROM profiles
WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc';
