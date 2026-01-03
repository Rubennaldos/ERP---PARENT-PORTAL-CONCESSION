-- ============================================================================
-- SCRIPT ULTRA SIMPLE: CORREGIR PADRES (SIN ERRORES)
-- Lima Café 28 - 04 Enero 2026
-- ============================================================================

-- PASO 1: Ver cuántos padres no tienen sede
-- ============================================================================
SELECT 
  COUNT(*) as padres_sin_sede
FROM profiles
WHERE role = 'parent' 
AND school_id IS NULL;

-- PASO 2: Asignar la primera sede activa a TODOS los padres sin sede
-- ============================================================================
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

-- PASO 3: Crear registros básicos en parent_profiles
-- ============================================================================
INSERT INTO parent_profiles (
  user_id,
  full_name,
  school_id,
  dni,
  phone_1,
  address
)
SELECT 
  p.id,
  COALESCE(p.full_name, 'Sin nombre'),
  p.school_id,
  '00000000',  -- DNI por defecto (8 ceros)
  '',          -- Teléfono vacío
  ''           -- Dirección vacía
FROM profiles p
WHERE p.role = 'parent'
AND p.school_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 
  FROM parent_profiles pp 
  WHERE pp.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- PASO 4: Verificar resultados
-- ============================================================================
SELECT 
  COUNT(*) as total_padres,
  COUNT(school_id) as padres_con_sede,
  COUNT(*) - COUNT(school_id) as padres_sin_sede
FROM profiles
WHERE role = 'parent';

-- ============================================================================
-- ¡LISTO! Ahora todos los padres deberían tener sede asignada
-- ============================================================================

