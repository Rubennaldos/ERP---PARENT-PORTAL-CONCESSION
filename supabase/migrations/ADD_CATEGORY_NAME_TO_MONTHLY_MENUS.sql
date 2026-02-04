-- =====================================================
-- Agregar category_name, category_icon y category_color a get_monthly_lunch_menus
-- =====================================================

-- 1. ELIMINAR FUNCIÓN EXISTENTE
DROP FUNCTION IF EXISTS public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]);

-- 2. RECREAR FUNCIÓN CON CATEGORÍA (tipos con CAST)
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
  ORDER BY lm.date, s.name, lc.name;
END;
$$;

-- 3. OTORGAR PERMISOS
GRANT EXECUTE ON FUNCTION public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]) TO anon;

-- ✅ Tipos forzados con CAST para evitar conflictos
