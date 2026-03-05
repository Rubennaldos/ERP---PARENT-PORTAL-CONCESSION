-- ============================================================
-- VER TODOS LOS MENÚS DEL SISTEMA
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

SELECT 
  lm.id,
  lm.date AS fecha,
  s.name AS sede,
  lc.name AS categoria,
  lm.target_type AS tipo_destinatario, -- 'students', 'teachers', 'both'
  
  -- PLATOS
  lm.starter AS entrada,
  lm.main_course AS segundo_plato_principal,
  lm.beverage AS refresco,
  lm.dessert AS postre,
  
  -- METADATOS
  lm.notes AS notas,
  
  -- FECHAS
  lm.created_at AS creado_en,
  lm.updated_at AS actualizado_en

FROM public.lunch_menus lm
LEFT JOIN public.schools s ON lm.school_id = s.id
LEFT JOIN public.lunch_categories lc ON lm.category_id = lc.id

ORDER BY lm.date DESC, s.name, lc.name;

-- ============================================================
-- VERSIÓN SIMPLIFICADA (solo los platos principales)
-- ============================================================

SELECT 
  lm.date AS fecha,
  s.name AS sede,
  lc.name AS categoria,
  lm.starter AS entrada,
  lm.main_course AS segundo,
  lm.beverage AS refresco,
  lm.dessert AS postre,
  lm.notes AS notas

FROM public.lunch_menus lm
LEFT JOIN public.schools s ON lm.school_id = s.id
LEFT JOIN public.lunch_categories lc ON lm.category_id = lc.id

ORDER BY lm.date DESC, s.name;

-- ============================================================
-- CONTAR MENÚS POR SEDE
-- ============================================================

SELECT 
  s.name AS sede,
  COUNT(*) AS total_menus,
  MIN(lm.date) AS primer_menu,
  MAX(lm.date) AS ultimo_menu
FROM public.lunch_menus lm
LEFT JOIN public.schools s ON lm.school_id = s.id
GROUP BY s.id, s.name
ORDER BY s.name;

-- ============================================================
-- CONTAR MENÚS POR CATEGORÍA
-- ============================================================

SELECT 
  COALESCE(lc.name, 'Sin categoría') AS categoria,
  COUNT(*) AS total_menus
FROM public.lunch_menus lm
LEFT JOIN public.lunch_categories lc ON lm.category_id = lc.id
GROUP BY lc.id, lc.name
ORDER BY total_menus DESC;
