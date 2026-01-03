-- ============================================================================
-- AGREGAR SOBRENOMBRE A PADRES
-- Lima Café 28 - 04 Enero 2026
-- ============================================================================

-- Agregar columna de sobrenombre (nickname) a parent_profiles
ALTER TABLE parent_profiles
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Crear índice para búsquedas rápidas por sobrenombre
CREATE INDEX IF NOT EXISTS idx_parent_profiles_nickname 
ON parent_profiles(nickname);

-- Verificar que se agregó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'parent_profiles' 
AND column_name = 'nickname';

-- Ejemplos de sobrenombres que se pueden usar:
-- UPDATE parent_profiles SET nickname = 'Papá de Juan' WHERE user_id = '...';
-- UPDATE parent_profiles SET nickname = 'Mamá de María' WHERE user_id = '...';
-- UPDATE parent_profiles SET nickname = 'Familia García' WHERE user_id = '...';

-- ============================================================================
-- ¡LISTO! Ahora los padres pueden tener sobrenombres personalizados
-- ============================================================================

