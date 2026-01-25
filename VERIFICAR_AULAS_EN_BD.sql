-- ====================================================================================================
-- SCRIPT PARA VERIFICAR AULAS EN LA BASE DE DATOS
--
-- Este script muestra todas las aulas que existen en la BD, incluyendo aquellas con is_active = false
-- ====================================================================================================

-- Ver todas las aulas con su información completa
SELECT 
    sc.id,
    sc.name AS aula_name,
    sc.level_id,
    sl.name AS grado_name,
    sc.school_id,
    s.name AS school_name,
    sc.is_active,
    sc.order_index,
    sc.created_at,
    sc.updated_at
FROM 
    public.school_classrooms sc
LEFT JOIN 
    public.school_levels sl ON sc.level_id = sl.id
LEFT JOIN 
    public.schools s ON sc.school_id = s.id
ORDER BY 
    s.name, sl.name, sc.order_index;

-- Contar aulas por estado
SELECT 
    CASE 
        WHEN is_active IS NULL THEN 'NULL'
        WHEN is_active = true THEN 'Activas'
        WHEN is_active = false THEN 'Inactivas'
    END AS estado,
    COUNT(*) AS total
FROM 
    public.school_classrooms
GROUP BY 
    is_active;

-- Ver aulas huérfanas (sin grado válido)
SELECT 
    sc.id,
    sc.name AS aula_name,
    sc.level_id AS level_id_invalido,
    sc.school_id,
    s.name AS school_name
FROM 
    public.school_classrooms sc
LEFT JOIN 
    public.school_levels sl ON sc.level_id = sl.id
LEFT JOIN 
    public.schools s ON sc.school_id = s.id
WHERE 
    sc.level_id IS NOT NULL 
    AND sl.id IS NULL;
