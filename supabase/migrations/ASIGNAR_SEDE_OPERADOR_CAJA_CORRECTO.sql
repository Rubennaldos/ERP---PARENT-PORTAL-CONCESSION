-- 🔍 BUSCAR Y ASIGNAR SEDE AL OPERADOR DE CAJA CORRECTO

-- ===================================================================
-- PASO 1: Buscar TODOS los usuarios con rol operador_caja
-- ===================================================================
SELECT 
  '👤 Operadores de caja en el sistema' as info,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.school_id,
  s.name as sede_actual
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.role = 'operador_caja'
ORDER BY p.email;

-- ===================================================================
-- PASO 2: Asignar Saint George Miraflores a TODOS los operadores de caja sin sede
-- ===================================================================
UPDATE profiles
SET school_id = (
  SELECT id 
  FROM schools 
  WHERE code = 'SGM'  -- Saint George Miraflores
  LIMIT 1
)
WHERE role = 'operador_caja'
  AND school_id IS NULL;

-- ===================================================================
-- PASO 3: Verificación final
-- ===================================================================
SELECT 
  '✅ Operadores de caja después de actualizar' as resultado,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.school_id,
  s.name as sede_asignada,
  s.code as codigo_sede,
  CASE 
    WHEN p.school_id IS NOT NULL THEN '✅ TIENE SEDE'
    ELSE '❌ SIN SEDE'
  END as estado
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.role = 'operador_caja';
