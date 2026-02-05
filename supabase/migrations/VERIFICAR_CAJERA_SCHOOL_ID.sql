-- ============================================
-- VERIFICAR EL SCHOOL_ID DE LA CAJERA
-- ============================================

-- Ver todos los profesores de Miraflores (para identificar a la cajera)
SELECT 
    tp.id,
    tp.full_name,
    tp.school_id_1,
    s.name as nombre_escuela,
    s.code as codigo
FROM teacher_profiles tp
LEFT JOIN schools s ON tp.school_id_1 = s.id
WHERE tp.school_id_1 = '2a50533d-7fc1-4096-80a7-e20a41bda5a0'
ORDER BY tp.created_at DESC
LIMIT 10;
