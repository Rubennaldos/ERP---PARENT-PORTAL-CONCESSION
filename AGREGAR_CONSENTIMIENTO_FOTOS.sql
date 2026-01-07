-- =====================================================
-- SCRIPT: AGREGAR CAMPO CONSENTIMIENTO FOTOS
-- Fecha: 2026-01-07
-- Descripción: Agrega campo para guardar consentimiento de fotos
-- =====================================================

-- Agregar columnas para consentimiento de fotos
ALTER TABLE parent_profiles 
ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN DEFAULT false;

ALTER TABLE parent_profiles 
ADD COLUMN IF NOT EXISTS photo_consent_date TIMESTAMPTZ;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_parent_profiles_photo_consent 
ON parent_profiles(photo_consent);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

