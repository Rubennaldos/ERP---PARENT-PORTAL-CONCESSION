-- ============================================================
-- 🔍 DIAGNÓSTICO: Estudiantes con topes o cuentas prepago
-- ============================================================

-- CONSULTA 1: Resumen general
SELECT 
  'TOTAL ESTUDIANTES ACTIVOS' AS categoria,
  COUNT(*) AS cantidad
FROM students WHERE is_active = true

UNION ALL

SELECT 
  'Cuenta Libre (free_account=true o NULL)' AS categoria,
  COUNT(*) AS cantidad
FROM students WHERE is_active = true AND (free_account = true OR free_account IS NULL)

UNION ALL

SELECT 
  'Cuenta Prepago (free_account=false)' AS categoria,
  COUNT(*) AS cantidad
FROM students WHERE is_active = true AND free_account = false

UNION ALL

SELECT 
  'Con tope diario configurado' AS categoria,
  COUNT(*) AS cantidad
FROM students WHERE is_active = true AND limit_type = 'daily' AND daily_limit > 0

UNION ALL

SELECT 
  'Con tope semanal configurado' AS categoria,
  COUNT(*) AS cantidad
FROM students WHERE is_active = true AND limit_type = 'weekly' AND weekly_limit > 0

UNION ALL

SELECT 
  'Con tope mensual configurado' AS categoria,
  COUNT(*) AS cantidad
FROM students WHERE is_active = true AND limit_type = 'monthly' AND monthly_limit > 0;

-- CONSULTA 2: Detalle de estudiantes con configuraciones no-estándar
SELECT 
  s.full_name AS estudiante,
  s.free_account,
  s.limit_type,
  s.daily_limit,
  s.weekly_limit,
  s.monthly_limit,
  s.balance,
  sch.name AS sede
FROM students s
LEFT JOIN schools sch ON s.school_id = sch.id
WHERE s.is_active = true
  AND (
    s.free_account = false 
    OR (s.limit_type IS NOT NULL AND s.limit_type != 'none')
    OR s.daily_limit > 0
    OR s.weekly_limit > 0
    OR s.monthly_limit > 0
  )
ORDER BY s.full_name;

-- ============================================================
-- 🔧 RESET: Poner TODOS los estudiantes en Cuenta Libre sin topes
-- ⚠️ EJECUTAR SOLO DESPUÉS DE REVISAR EL DIAGNÓSTICO
-- ============================================================
/*
UPDATE students
SET 
  free_account = true,
  limit_type = 'none',
  daily_limit = 0,
  weekly_limit = 0,
  monthly_limit = 0
WHERE is_active = true
  AND (
    free_account = false 
    OR (limit_type IS NOT NULL AND limit_type != 'none')
    OR daily_limit > 0
    OR weekly_limit > 0
    OR monthly_limit > 0
  );
*/
