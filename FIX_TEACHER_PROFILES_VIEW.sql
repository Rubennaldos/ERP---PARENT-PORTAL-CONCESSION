-- =====================================================
-- FIX: RECREAR VISTA teacher_profiles_with_schools
-- =====================================================
-- La vista se usa en Teacher.tsx y POS.tsx para obtener
-- el perfil del profesor junto con los nombres de sus sedes.
-- =====================================================

-- Eliminar la vista si existe con versión anterior
DROP VIEW IF EXISTS public.teacher_profiles_with_schools CASCADE;

-- Recrear la vista con las columnas correctas
-- NOTA: La tabla teacher_profiles usa school_id_1 y school_id_2
--       La vista expone school_1_id y school_2_id (sin el id_ al final)

CREATE OR REPLACE VIEW public.teacher_profiles_with_schools AS
SELECT 
  tp.id,
  tp.full_name,
  tp.dni,
  tp.corporate_email,
  tp.personal_email,
  tp.phone_1,
  tp.corporate_phone,
  tp.area,
  tp.free_account,
  tp.onboarding_completed,
  tp.created_at,
  tp.updated_at,
  -- Campos originales (para compatibilidad)
  tp.school_id_1,
  tp.school_id_2,
  -- Alias usados por el frontend
  s1.id   AS school_1_id,
  s1.name AS school_1_name,
  s1.code AS school_1_code,
  s2.id   AS school_2_id,
  s2.name AS school_2_name,
  s2.code AS school_2_code
FROM public.teacher_profiles tp
LEFT JOIN public.schools s1 ON tp.school_id_1 = s1.id
LEFT JOIN public.schools s2 ON tp.school_id_2 = s2.id;

-- RLS: la vista hereda la seguridad de las tablas base
ALTER VIEW public.teacher_profiles_with_schools SET (security_invoker = true);

-- Permisos
GRANT SELECT ON public.teacher_profiles_with_schools TO authenticated;
GRANT SELECT ON public.teacher_profiles_with_schools TO anon;

-- Verificar que funciona
SELECT 
  id,
  full_name,
  school_1_id,
  school_1_name,
  school_2_id,
  school_2_name,
  onboarding_completed
FROM public.teacher_profiles_with_schools
LIMIT 5;

NOTIFY pgrst, 'reload schema';
