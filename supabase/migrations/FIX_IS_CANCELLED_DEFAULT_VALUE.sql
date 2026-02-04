-- ============================================
-- FIX: Establecer valor por defecto para is_cancelled
-- ============================================

-- 1. Actualizar todos los pedidos que tienen is_cancelled = NULL a false
UPDATE lunch_orders
SET is_cancelled = false
WHERE is_cancelled IS NULL;

-- 2. Establecer valor por defecto para nuevos registros
ALTER TABLE lunch_orders
ALTER COLUMN is_cancelled SET DEFAULT false;

-- 3. Hacer que la columna NO acepte NULL
ALTER TABLE lunch_orders
ALTER COLUMN is_cancelled SET NOT NULL;

-- 4. Verificar el resultado
SELECT 
  CASE 
    WHEN is_cancelled = true THEN 'ANULADO'
    ELSE 'ACTIVO'
  END as estado,
  COUNT(*) as cantidad
FROM lunch_orders
WHERE order_date >= '2026-02-03'
GROUP BY is_cancelled
ORDER BY is_cancelled;

-- ============================================
-- RESULTADO ESPERADO:
-- - Todos los pedidos existentes con NULL ahora tienen false
-- - Nuevos pedidos tendrán is_cancelled = false por defecto
-- - La columna ya no acepta NULL
-- ============================================
