-- ============================================================
-- FIX: Crear función RPC get_monthly_lunch_menus
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_monthly_lunch_menus(
  target_month   INTEGER,
  target_year    INTEGER,
  target_school_ids UUID[]
)
RETURNS TABLE (
  id              UUID,
  school_id       UUID,
  school_name     TEXT,
  school_color    TEXT,
  category_id     UUID,
  category_name   TEXT,
  category_icon   TEXT,
  category_color  TEXT,
  target_type     TEXT,
  date            DATE,
  starter         TEXT,
  main_course     TEXT,
  beverage        TEXT,
  dessert         TEXT,
  notes           TEXT,
  is_special_day  BOOLEAN,
  special_day_type  TEXT,
  special_day_title TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    m.id,
    m.school_id,
    s.name           AS school_name,
    s.color          AS school_color,
    m.category_id,
    c.name           AS category_name,
    c.icon           AS category_icon,
    c.color          AS category_color,
    m.target_type,
    m.date,
    m.starter,
    m.main_course,
    m.beverage,
    m.dessert,
    m.notes,
    CASE WHEN sd.id IS NOT NULL THEN TRUE ELSE FALSE END  AS is_special_day,
    sd.type          AS special_day_type,
    sd.title         AS special_day_title
  FROM public.lunch_menus m
  JOIN public.schools s ON s.id = m.school_id
  LEFT JOIN public.lunch_categories c ON c.id = m.category_id
  LEFT JOIN public.special_days sd
         ON sd.school_id = m.school_id
        AND sd.date = m.date
  WHERE m.school_id = ANY(target_school_ids)
    AND EXTRACT(MONTH FROM m.date) = target_month
    AND EXTRACT(YEAR  FROM m.date) = target_year
  ORDER BY m.date, s.name;
$$;

-- Refrescar schema cache
NOTIFY pgrst, 'reload schema';

-- Verificar que la función existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_monthly_lunch_menus';
