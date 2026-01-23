-- =====================================================
-- FIX: ERROR 404 EN get_monthly_lunch_menus
-- Recrear función para cargar menús mensuales
-- =====================================================

-- 1. ELIMINAR FUNCIÓN EXISTENTE (si hay conflictos)
DROP FUNCTION IF EXISTS public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]);

-- 2. RECREAR FUNCIÓN CON MANEJO DE ERRORES MEJORADO
CREATE OR REPLACE FUNCTION public.get_monthly_lunch_menus(
  target_month INTEGER,
  target_year INTEGER,
  target_school_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  school_name TEXT,
  school_color TEXT,
  date DATE,
  starter TEXT,
  main_course TEXT,
  beverage TEXT,
  dessert TEXT,
  notes TEXT,
  is_special_day BOOLEAN,
  special_day_type TEXT,
  special_day_title TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lm.id,
    lm.school_id,
    s.name AS school_name,
    COALESCE(s.color, '#10b981') AS school_color,
    lm.date,
    COALESCE(lm.starter, '') AS starter,
    COALESCE(lm.main_course, 'Sin especificar') AS main_course,
    COALESCE(lm.beverage, '') AS beverage,
    COALESCE(lm.dessert, '') AS dessert,
    COALESCE(lm.notes, '') AS notes,
    CASE WHEN sd.id IS NOT NULL THEN true ELSE false END AS is_special_day,
    COALESCE(sd.type, '') AS special_day_type,
    COALESCE(sd.title, '') AS special_day_title
  FROM public.lunch_menus lm
  INNER JOIN public.schools s ON lm.school_id = s.id
  LEFT JOIN public.special_days sd ON lm.date = sd.date 
    AND (sd.school_id IS NULL OR sd.school_id = lm.school_id)
  WHERE 
    EXTRACT(MONTH FROM lm.date) = target_month
    AND EXTRACT(YEAR FROM lm.date) = target_year
    AND (target_school_ids IS NULL OR lm.school_id = ANY(target_school_ids))
  ORDER BY lm.date, s.name;
END;
$$;

-- 3. OTORGAR PERMISOS DE EJECUCIÓN A USUARIOS AUTENTICADOS
GRANT EXECUTE ON FUNCTION public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_lunch_menus(INTEGER, INTEGER, UUID[]) TO anon;

-- 4. VERIFICAR QUE LA FUNCIÓN SE CREÓ CORRECTAMENTE
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_monthly_lunch_menus';

-- 5. PRUEBA DE EJECUCIÓN (OPCIONAL - DESCOMENTAR PARA PROBAR)
-- SELECT * FROM public.get_monthly_lunch_menus(1, 2026, NULL) LIMIT 5;

-- ✅ Script completado
-- ✅ Ahora recarga el calendario en la aplicación
