-- ============================================================
-- DIAGNÓSTICO: Cajeros sin school_id y precios que ven
-- ============================================================

-- 1. Ver todos los cajeros/gestores de caja y si tienen school_id
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.school_id,
  s.name AS sede_asignada,
  CASE 
    WHEN p.school_id IS NULL THEN '❌ SIN SEDE → usa precios base (incorrectos)'
    ELSE '✅ CON SEDE → usa precios por sede'
  END AS estado_precios
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.role IN ('gestor_unidad', 'cajero', 'admin_escuela', 'admin')
ORDER BY p.role, s.name;

-- 2. Cuántos productos tienen precio diferente por sede vs precio base
-- (para entender el impacto si se usa precio base)
SELECT 
  s.name AS sede,
  COUNT(*) AS productos_con_precio_custom,
  AVG(psp.price_sale) AS precio_promedio_sede,
  AVG(pr.price_sale) AS precio_promedio_base,
  AVG(psp.price_sale - pr.price_sale) AS diferencia_promedio
FROM product_school_prices psp
JOIN schools s ON s.id = psp.school_id
JOIN products pr ON pr.id = psp.product_id
GROUP BY s.name
ORDER BY s.name;

-- 3. Productos donde el precio base y precio por sede son DIFERENTES
-- (estos son los afectados si se usan precios base)
SELECT 
  pr.name AS producto,
  s.name AS sede,
  pr.price_sale AS precio_base,
  psp.price_sale AS precio_sede,
  (psp.price_sale - pr.price_sale) AS diferencia
FROM product_school_prices psp
JOIN schools s ON s.id = psp.school_id
JOIN products pr ON pr.id = psp.product_id
WHERE psp.price_sale != pr.price_sale
ORDER BY ABS(psp.price_sale - pr.price_sale) DESC
LIMIT 30;
