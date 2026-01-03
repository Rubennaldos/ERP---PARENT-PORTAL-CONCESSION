-- ============================================================================
-- SCRIPT RÁPIDO: VER Y CORREGIR PADRES SIN SEDE
-- Lima Café 28 - 04 Enero 2026
-- ============================================================================

-- PASO 1: Ver cuántos padres no tienen sede
-- ============================================================================
SELECT 
  COUNT(*) as total_padres_sin_sede
FROM profiles
WHERE role = 'parent' 
AND school_id IS NULL;

-- PASO 2: Ver la lista de padres sin sede con sus datos
-- ============================================================================
SELECT 
  email,
  full_name,
  created_at
FROM profiles
WHERE role = 'parent'
AND school_id IS NULL
ORDER BY created_at DESC;

-- PASO 3: Ver las sedes disponibles
-- ============================================================================
SELECT 
  id,
  name,
  code
FROM schools
WHERE is_active = true
ORDER BY name;

-- PASO 4: Asignar sede automáticamente a TODOS los padres sin sede
-- ============================================================================
-- OPCIÓN RECOMENDADA: Asigna la primera sede activa (generalmente Nordic)

WITH primera_sede AS (
  SELECT id 
  FROM schools 
  WHERE is_active = true 
  ORDER BY name 
  LIMIT 1
)
UPDATE profiles
SET school_id = (SELECT id FROM primera_sede)
WHERE role = 'parent'
AND school_id IS NULL;

-- PASO 5: Crear registros en parent_profiles para los que no tienen
-- ============================================================================
INSERT INTO parent_profiles (
  user_id,
  full_name,
  school_id,
  is_active
)
SELECT 
  p.id,
  p.full_name,
  p.school_id,
  true
FROM profiles p
WHERE p.role = 'parent'
AND NOT EXISTS (
  SELECT 1 
  FROM parent_profiles pp 
  WHERE pp.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- PASO 6: Verificar que todo esté correcto
-- ============================================================================
SELECT 
  'Padres sin sede' as estado,
  COUNT(*) as cantidad
FROM profiles
WHERE role = 'parent' 
AND school_id IS NULL

UNION ALL

SELECT 
  'Padres con sede' as estado,
  COUNT(*) as cantidad
FROM profiles
WHERE role = 'parent' 
AND school_id IS NOT NULL;

-- ============================================================================
-- ¡LISTO! Todos los padres deberían tener sede asignada ahora
-- ============================================================================

