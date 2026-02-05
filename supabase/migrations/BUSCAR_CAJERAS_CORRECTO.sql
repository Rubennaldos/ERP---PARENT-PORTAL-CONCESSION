-- ============================================
-- BUSCAR CAJERAS DE MIRAFLORES
-- ============================================

-- Ver estructura de la tabla teacher_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_profiles'
ORDER BY ordinal_position;

-- Ver TODOS los teacher_profiles de Miraflores
SELECT 
    tp.*
FROM teacher_profiles tp
WHERE tp.school_id_1 = '2a50533d-7fc1-4096-80a7-e20a41bda5a0'
ORDER BY tp.created_at DESC;
