-- =========================================
-- FIX: Eliminar restricción UNIQUE del DNI
-- Para permitir pruebas con DNIs repetidos
-- =========================================

-- Eliminar el constraint UNIQUE del DNI
ALTER TABLE parent_profiles 
DROP CONSTRAINT IF EXISTS parent_profiles_dni_key;

-- Verificar que se eliminó
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'parent_profiles'
AND constraint_type = 'UNIQUE';

-- ⚠️ NOTA: Esto permite DNIs duplicados en la base de datos.
-- Si en producción necesitas DNIs únicos, vuelve a agregarlo con:
-- ALTER TABLE parent_profiles ADD CONSTRAINT parent_profiles_dni_key UNIQUE (dni);

