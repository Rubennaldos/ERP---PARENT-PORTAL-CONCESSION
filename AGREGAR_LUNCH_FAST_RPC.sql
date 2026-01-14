-- =====================================================
-- RPC PARA OBTENER EL MENÚ DE HOY PARA UN COLEGIO
-- =====================================================

CREATE OR REPLACE FUNCTION get_today_lunch_menu(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  starter TEXT,
  main_course TEXT,
  beverage TEXT,
  dessert TEXT,
  price DECIMAL(10,2),
  is_special_day BOOLEAN,
  special_day_title TEXT
) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  SELECT 
    lm.id,
    lm.starter,
    lm.main_course,
    lm.beverage,
    lm.dessert,
    15.00::DECIMAL(10,2) as price, -- Precio fijo por ahora
    CASE WHEN sd.id IS NOT NULL THEN true ELSE false END as is_special_day,
    sd.title as special_day_title
  FROM (SELECT v_today as d) d
  LEFT JOIN lunch_menus lm ON lm.date = d.d AND lm.school_id = p_school_id
  LEFT JOIN special_days sd ON sd.date = d.d 
    AND (sd.school_id IS NULL OR sd.school_id = p_school_id)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_today_lunch_menu TO authenticated;
