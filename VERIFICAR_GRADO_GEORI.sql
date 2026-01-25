-- Verificar el grado GEORI
SELECT 
    id,
    name,
    school_id,
    is_active,
    order_index,
    created_at,
    updated_at
FROM 
    public.school_levels
WHERE 
    name ILIKE '%geori%'
    OR name ILIKE '%georgi%';

-- Ver todos los grados de Little Saint George
SELECT 
    sl.id,
    sl.name,
    sl.is_active,
    sl.order_index,
    s.name AS school_name,
    (SELECT COUNT(*) FROM school_classrooms sc WHERE sc.level_id = sl.id) AS num_aulas
FROM 
    public.school_levels sl
LEFT JOIN 
    public.schools s ON sl.school_id = s.id
WHERE 
    s.name = 'Little Saint George'
ORDER BY 
    sl.order_index;
