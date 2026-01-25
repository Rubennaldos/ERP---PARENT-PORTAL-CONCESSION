-- ====================================================================================================
-- SCRIPT PARA ELIMINAR EL GRADO "GEORI" PROBLEMÁTICO
--
-- Este script elimina el grado "GEORI" que se creó sin is_active=true y está causando problemas
-- ====================================================================================================

-- PASO 1: Ver el grado problemático antes de borrarlo
SELECT 
    id,
    name,
    school_id,
    is_active,
    order_index,
    created_at
FROM 
    public.school_levels
WHERE 
    name ILIKE '%geori%';

-- PASO 2: Eliminar todas las aulas asociadas a GEORI (si las hay)
DELETE FROM public.school_classrooms
WHERE level_id IN (
    SELECT id FROM public.school_levels WHERE name ILIKE '%geori%'
);

-- PASO 3: Eliminar el grado GEORI
DELETE FROM public.school_levels
WHERE name ILIKE '%geori%';

-- PASO 4: Verificar que se eliminó correctamente
SELECT 
    id,
    name,
    is_active
FROM 
    public.school_levels
WHERE 
    school_id IN (SELECT id FROM public.schools WHERE name = 'Little Saint George')
ORDER BY 
    order_index;

-- ✅ Si todo salió bien, solo deberías ver "little" en los resultados
