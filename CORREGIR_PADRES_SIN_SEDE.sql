-- ============================================================================
-- SCRIPT: CORREGIR PADRES ANTIGUOS SIN SEDE
-- Lima Café 28 - 04 Enero 2026
-- ============================================================================
-- Este script asigna una sede por defecto a todos los padres que no tienen
-- school_id asignado, y crea sus registros en parent_profiles si no existen
-- ============================================================================

-- 1. Ver cuántos padres no tienen school_id asignado
SELECT 
  COUNT(*) as padres_sin_sede,
  STRING_AGG(email, ', ') as emails
FROM profiles
WHERE role = 'parent' 
AND school_id IS NULL;

-- 2. Listar todos los padres sin sede
SELECT 
  id,
  email,
  full_name,
  school_id,
  created_at
FROM profiles
WHERE role = 'parent'
AND school_id IS NULL
ORDER BY created_at;

-- 3. Ver las sedes disponibles para asignar
SELECT id, name, code, is_active
FROM schools
WHERE is_active = true
ORDER BY name;

-- ============================================================================
-- OPCIÓN 1: Asignar MANUALMENTE una sede específica
-- ============================================================================
-- Copia el ID de la sede que quieras asignar por defecto
-- Ejemplo: Si Nordic tiene ID 'abc-123-nordic', usa ese ID

-- Asignar sede por defecto a padres sin sede
UPDATE profiles
SET school_id = 'PEGA_AQUI_EL_ID_DE_LA_SEDE'  -- ⚠️ REEMPLAZAR con el ID real
WHERE role = 'parent'
AND school_id IS NULL;

-- ============================================================================
-- OPCIÓN 2: Asignar automáticamente la PRIMERA sede activa
-- ============================================================================
-- Este script asigna automáticamente la primera sede activa que encuentre

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

-- ============================================================================
-- 4. CREAR REGISTROS EN parent_profiles SI NO EXISTEN
-- ============================================================================
-- Este script crea un registro en parent_profiles para cada padre que no lo tenga

INSERT INTO parent_profiles (
  user_id,
  full_name,
  school_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  p.id,
  p.full_name,
  p.school_id,
  true,
  NOW(),
  NOW()
FROM profiles p
WHERE p.role = 'parent'
AND NOT EXISTS (
  SELECT 1 
  FROM parent_profiles pp 
  WHERE pp.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 5. SINCRONIZAR school_id entre profiles y parent_profiles
-- ============================================================================
-- Si un padre tiene school_id en profiles pero no en parent_profiles, copiarlo

UPDATE parent_profiles pp
SET school_id = p.school_id,
    updated_at = NOW()
FROM profiles p
WHERE pp.user_id = p.id
AND p.role = 'parent'
AND p.school_id IS NOT NULL
AND pp.school_id IS NULL;

-- Si un padre tiene school_id en parent_profiles pero no en profiles, copiarlo
UPDATE profiles p
SET school_id = pp.school_id
FROM parent_profiles pp
WHERE p.id = pp.user_id
AND p.role = 'parent'
AND pp.school_id IS NOT NULL
AND p.school_id IS NULL;

-- ============================================================================
-- 6. VERIFICAR RESULTADOS
-- ============================================================================

-- Ver cuántos padres hay ahora con sede asignada
SELECT 
  COUNT(*) as total_padres,
  COUNT(school_id) as padres_con_sede,
  COUNT(*) - COUNT(school_id) as padres_sin_sede
FROM profiles
WHERE role = 'parent';

-- Ver distribución de padres por sede
SELECT 
  s.name as sede,
  s.code,
  COUNT(p.id) as cantidad_padres
FROM schools s
LEFT JOIN profiles p ON p.school_id = s.id AND p.role = 'parent'
WHERE s.is_active = true
GROUP BY s.id, s.name, s.code
ORDER BY cantidad_padres DESC;

-- Verificar que todos los padres tienen registro en parent_profiles
SELECT 
  COUNT(DISTINCT p.id) as total_padres,
  COUNT(DISTINCT pp.user_id) as padres_con_perfil,
  COUNT(DISTINCT p.id) - COUNT(DISTINCT pp.user_id) as padres_sin_perfil
FROM profiles p
LEFT JOIN parent_profiles pp ON p.id = pp.user_id
WHERE p.role = 'parent';

-- ============================================================================
-- 7. LIMPIEZA OPCIONAL: Eliminar padres duplicados o huérfanos
-- ============================================================================

-- Ver si hay registros huérfanos en parent_profiles (padres que ya no existen)
SELECT pp.*
FROM parent_profiles pp
LEFT JOIN profiles p ON pp.user_id = p.id
WHERE p.id IS NULL;

-- CUIDADO: Esto eliminará registros huérfanos si existen
-- DELETE FROM parent_profiles
-- WHERE user_id NOT IN (SELECT id FROM profiles WHERE role = 'parent');

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- 📝 NOTAS IMPORTANTES:
-- 1. Ejecuta primero las consultas SELECT para ver el estado actual
-- 2. Elige OPCIÓN 1 o OPCIÓN 2 para asignar sedes (no ambas)
-- 3. Verifica los resultados con las consultas de la sección 6
-- 4. Si necesitas asignar sedes diferentes a padres específicos, hazlo manualmente:
--    UPDATE profiles SET school_id = 'ID_SEDE' WHERE email = 'padre@email.com';

