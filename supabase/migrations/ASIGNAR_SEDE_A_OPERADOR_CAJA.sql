-- 🔍 VERIFICAR Y ASIGNAR SCHOOL_ID AL OPERADOR DE CAJA

-- ===================================================================
-- PASO 1: Ver el perfil del operador de caja
-- ===================================================================
SELECT 
  '👤 Perfil del operador de caja' as info,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.school_id,
  s.name as sede_nombre
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.email = 'cajero1@limacafe28.com';

-- ===================================================================
-- PASO 2: Ver todas las sedes disponibles
-- ===================================================================
SELECT 
  '🏫 Sedes disponibles' as info,
  id,
  name,
  code
FROM schools
ORDER BY name;

-- ===================================================================
-- PASO 3: Asignar sede al operador de caja (Saint George Miraflores)
-- ===================================================================
-- NOTA: Ajusta el nombre de la sede si es necesario

UPDATE profiles
SET school_id = (
  SELECT id 
  FROM schools 
  WHERE name ILIKE '%miraflores%' 
  LIMIT 1
)
WHERE email = 'cajero1@limacafe28.com'
  AND school_id IS NULL;

-- ===================================================================
-- PASO 4: Verificar que se asignó correctamente
-- ===================================================================
SELECT 
  '✅ Verificación final' as resultado,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.school_id,
  s.name as sede_asignada,
  CASE 
    WHEN p.school_id IS NOT NULL THEN '✅ TIENE SEDE'
    ELSE '❌ SIN SEDE'
  END as estado
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.email = 'cajero1@limacafe28.com';
