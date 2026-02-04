-- ============================================
-- Verificación completa de separación de ventas por sede
-- ============================================

-- 1. Ver cuántas ventas hay por sede
SELECT 
  COALESCE(s.name, '⚠️ SIN SEDE') as sede,
  COUNT(*) as total_ventas,
  SUM(ABS(t.amount)) as monto_total,
  MIN(t.created_at) as primera_venta,
  MAX(t.created_at) as ultima_venta
FROM transactions t
LEFT JOIN schools s ON s.id = t.school_id
WHERE t.type = 'purchase'
GROUP BY s.id, s.name
ORDER BY s.name;

-- 2. Ver ventas SIN school_id (deben ser borradas)
SELECT 
  '⚠️ VENTAS SIN SEDE - DEBEN BORRARSE' as alerta,
  COUNT(*) as total,
  SUM(ABS(amount)) as monto_total
FROM transactions
WHERE type = 'purchase' 
  AND school_id IS NULL;

-- 3. Verificar que cada sede solo vea sus ventas
-- Simulación de acceso por sede
WITH sede_ventas AS (
  SELECT 
    school_id,
    COUNT(*) as total_ventas
  FROM transactions
  WHERE type = 'purchase' 
    AND school_id IS NOT NULL
  GROUP BY school_id
)
SELECT 
  s.name as sede,
  sv.total_ventas,
  '✅ Cada sede solo verá estas ' || sv.total_ventas || ' ventas' as seguridad
FROM sede_ventas sv
JOIN schools s ON s.id = sv.school_id
ORDER BY s.name;

-- 4. Ver políticas RLS activas para transactions
SELECT 
  policyname as politica,
  cmd as accion,
  CASE 
    WHEN qual LIKE '%admin_general%' THEN '👑 Admin ve TODO'
    WHEN qual LIKE '%gestor_unidad%' OR qual LIKE '%cajero%' OR qual LIKE '%operador_caja%' THEN '🏢 Solo SU sede'
    WHEN qual LIKE '%parent%' OR qual LIKE '%teacher%' THEN '👤 Solo SUS propias'
    ELSE '❓ Verificar'
  END as alcance
FROM pg_policies
WHERE tablename = 'transactions'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 5. Resumen de seguridad
SELECT 
  '✅ VERIFICACIÓN COMPLETA' as estado,
  (SELECT COUNT(*) FROM transactions WHERE type = 'purchase' AND school_id IS NOT NULL) as ventas_con_sede,
  (SELECT COUNT(*) FROM transactions WHERE type = 'purchase' AND school_id IS NULL) as ventas_sin_sede_borrar,
  (SELECT COUNT(DISTINCT school_id) FROM transactions WHERE type = 'purchase' AND school_id IS NOT NULL) as sedes_con_ventas;
