-- ============================================================
-- RESUMEN ALMUERZOS MARZO – Entrada, Almuerzo, Postre por día
-- Ejecutar en: Supabase > SQL Editor
-- Año: 2026 (cambiar si necesitas otro)
-- ============================================================
--
-- Si sale "relation lunch_menus does not exist":
--   La tabla de menús no existe en esta base. Aplica las migraciones.
--
-- Si sale "Success. No rows returned":
--   No hay menús cargados para ese mes/año. Ejecuta primero el
--   DIAGNÓSTICO de abajo para ver qué meses tienen datos.
-- ============================================================

-- ========== 1) DIAGNÓSTICO: ¿Qué meses tienen menús? ==========
-- Ejecuta esto primero para ver en qué fechas hay datos.
SELECT
  EXTRACT(YEAR FROM date)::int AS año,
  EXTRACT(MONTH FROM date)::int AS mes,
  COUNT(*) AS cantidad_menus,
  MIN(date) AS primera_fecha,
  MAX(date) AS ultima_fecha
FROM public.lunch_menus
GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
ORDER BY año DESC, mes DESC;
-- Si esto devuelve 0 filas: no hay menús cargados; créalos desde la app (Calendario de Almuerzos).
-- Si ves otros meses (ej. 2026): usa ese año en la consulta de abajo.

-- ========== 2) RESUMEN MARZO 2026 – Entrada, Almuerzo, Postre ==========
-- Consulta directa a la tabla (la RPC con NULL no devuelve filas en tu BD).
SELECT
  TO_CHAR(lm.date, 'DD') AS dia,
  TO_CHAR(lm.date, 'DD') || ' ' || TRIM(TO_CHAR(lm.date, 'Day')) AS fecha_legible,
  lm.date AS fecha,
  COALESCE(s.name, '—') AS sede,
  COALESCE(lc.name, '—') AS categoria,
  COALESCE(lm.starter, '—') AS entrada,
  COALESCE(lm.main_course, '—') AS almuerzo,
  COALESCE(lm.dessert, '—') AS postre
FROM public.lunch_menus lm
LEFT JOIN public.schools s ON lm.school_id = s.id
LEFT JOIN public.lunch_categories lc ON lm.category_id = lc.id
WHERE EXTRACT(MONTH FROM lm.date) = 3
  AND EXTRACT(YEAR FROM lm.date) = 2026
ORDER BY lm.date, s.name, lc.name;


-- ============================================================
-- Ver qué tablas existen (por si el nombre es distinto)
-- ============================================================
-- SELECT table_schema, table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE '%lunch%'
-- ORDER BY table_name;
