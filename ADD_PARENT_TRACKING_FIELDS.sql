-- ================================================
-- AGREGAR CAMPOS PARA DATOS DEL PADRE Y TRACKING
-- ================================================

-- Agregar columnas nuevas a parent_profiles
ALTER TABLE parent_profiles
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'dni',
ADD COLUMN IF NOT EXISTS registration_metadata JSONB,
ADD COLUMN IF NOT EXISTS registration_ip TEXT;

-- Comentarios para documentación interna
COMMENT ON COLUMN parent_profiles.document_type IS 'Tipo de documento: dni, pasaporte, carnet_extranjeria, otro';
COMMENT ON COLUMN parent_profiles.registration_metadata IS 'Datos técnicos del navegador y dispositivo usado en el registro';
COMMENT ON COLUMN parent_profiles.registration_ip IS 'Datos de conexión (solo para uso interno del sistema)';

-- Verificar que se crearon correctamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'parent_profiles' 
AND column_name IN ('document_type', 'registration_metadata', 'registration_ip');
