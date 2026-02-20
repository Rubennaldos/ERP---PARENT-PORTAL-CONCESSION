-- ==========================================
-- FIX: Menús heredan target_type de su categoría
-- + Actualizar RPC para incluir target_type
-- ==========================================

-- 1️⃣ CORREGIR target_type de menús existentes
UPDATE lunch_menus lm
SET target_type = lc.target_type
FROM lunch_categories lc
WHERE lm.category_id = lc.id
  AND lm.target_type != lc.target_type;

-- 2️⃣ Menús sin categoría → 'both' (visibles para todos)
UPDATE lunch_menus
SET target_type = 'both'
WHERE category_id IS NULL AND (target_type IS NULL OR target_type != 'both');

-- 3️⃣ RECREAR RPC con target_type incluido
DROP FUNCTION IF EXISTS public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]);

CREATE OR REPLACE FUNCTION public.get_monthly_lunch_menus(
  target_month INTEGER,
  target_year INTEGER,
  target_school_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  school_name VARCHAR,
  school_color VARCHAR,
  category_id UUID,
  category_name VARCHAR,
  category_icon VARCHAR,
  category_color VARCHAR,
  target_type VARCHAR,
  date DATE,
  starter VARCHAR,
  main_course VARCHAR,
  beverage VARCHAR,
  dessert VARCHAR,
  notes TEXT,
  is_special_day BOOLEAN,
  special_day_type VARCHAR,
  special_day_title VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lm.id,
    lm.school_id,
    CAST(s.name AS VARCHAR) AS school_name,
    CAST(COALESCE(s.color, '#10b981') AS VARCHAR) AS school_color,
    lm.category_id,
    CAST(COALESCE(lc.name, 'Sin categoría') AS VARCHAR) AS category_name,
    CAST(COALESCE(lc.icon, '🍽️') AS VARCHAR) AS category_icon,
    CAST(COALESCE(lc.color, '#10b981') AS VARCHAR) AS category_color,
    CAST(COALESCE(lm.target_type, 'both') AS VARCHAR) AS target_type,
    lm.date,
    CAST(COALESCE(lm.starter, '') AS VARCHAR) AS starter,
    CAST(COALESCE(lm.main_course, 'Sin especificar') AS VARCHAR) AS main_course,
    CAST(COALESCE(lm.beverage, '') AS VARCHAR) AS beverage,
    CAST(COALESCE(lm.dessert, '') AS VARCHAR) AS dessert,
    COALESCE(lm.notes, '') AS notes,
    CASE WHEN sd.id IS NOT NULL THEN true ELSE false END AS is_special_day,
    CAST(COALESCE(sd.type, '') AS VARCHAR) AS special_day_type,
    CAST(COALESCE(sd.title, '') AS VARCHAR) AS special_day_title
  FROM public.lunch_menus lm
  INNER JOIN public.schools s ON lm.school_id = s.id
  LEFT JOIN public.lunch_categories lc ON lm.category_id = lc.id
  LEFT JOIN public.special_days sd ON lm.date = sd.date 
    AND (sd.school_id IS NULL OR sd.school_id = lm.school_id)
  WHERE 
    EXTRACT(MONTH FROM lm.date) = target_month
    AND EXTRACT(YEAR FROM lm.date) = target_year
    AND (target_school_ids IS NULL OR lm.school_id = ANY(target_school_ids))
  ORDER BY lm.date, s.name, lm.target_type, lc.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]) TO anon;

-- 4️⃣ Verificación
SELECT 
    COUNT(*) AS total_menus,
    COUNT(*) FILTER (WHERE target_type = 'students') AS para_alumnos,
    COUNT(*) FILTER (WHERE target_type = 'teachers') AS para_profesores,
    COUNT(*) FILTER (WHERE target_type = 'both') AS para_ambos
FROM lunch_menus
WHERE school_id = '9963c14c-22ff-4fcb-b5cc-599596896daa'
  AND date >= '2026-02-01' AND date <= '2026-02-28';
