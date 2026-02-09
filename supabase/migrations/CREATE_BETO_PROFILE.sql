-- Crear el perfil faltante para el profesor Beto

-- 1. Verificar que NO existe en profiles (debe devolver 0)
SELECT COUNT(*) as existe_en_profiles
FROM profiles
WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 2. Crear el perfil en profiles con rol 'teacher'
INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
VALUES (
  'f4a33af1-012b-4347-8056-27af58edb7bc',
  'alberto@gmail.com',
  'teacher',
  'Beto naldos prueba',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  role = 'teacher',
  email = 'alberto@gmail.com',
  full_name = 'Beto naldos prueba',
  updated_at = NOW();

-- 3. Verificar que se creó correctamente
SELECT 
  'PERFIL CREADO' as resultado,
  id,
  email,
  role,
  full_name,
  created_at
FROM profiles
WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 4. Verificar estadísticas finales
SELECT 
  'ESTADÍSTICAS FINALES' as tipo,
  COUNT(*) as total_profesores,
  COUNT(p.id) as con_profile,
  COUNT(*) - COUNT(p.id) as sin_profile,
  SUM(CASE WHEN p.role = 'teacher' THEN 1 ELSE 0 END) as con_rol_correcto
FROM teacher_profiles tp
LEFT JOIN profiles p ON tp.id = p.id;
