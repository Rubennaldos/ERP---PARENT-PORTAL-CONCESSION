-- ============================================================
-- FIX: Agregar columnas faltantes en parent_profiles
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Responsable principal (campos extra)
ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'DNI',
  ADD COLUMN IF NOT EXISTS legal_acceptance BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS legal_acceptance_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_metadata JSONB,
  ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Segundo responsable de pago
ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS responsible_2_full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsible_2_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsible_2_document_type VARCHAR(20) DEFAULT 'DNI',
  ADD COLUMN IF NOT EXISTS responsible_2_dni VARCHAR(20),
  ADD COLUMN IF NOT EXISTS responsible_2_phone_1 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS responsible_2_address TEXT;

-- ============================================================
-- Verificar que las columnas se crearon correctamente
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'parent_profiles'
ORDER BY ordinal_position;
