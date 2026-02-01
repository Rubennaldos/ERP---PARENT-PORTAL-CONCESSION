-- ============================================================================
-- AGREGAR COLUMNA custom_schools A LA TABLA profiles
-- ============================================================================
-- Esta columna permite a usuarios con alcance "Personalizado" tener acceso
-- a múltiples sedes específicas seleccionadas por el administrador.
-- ============================================================================

-- Paso 1: Agregar columna custom_schools (array de UUIDs)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS custom_schools UUID[] DEFAULT '{}';

-- Paso 2: Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_profiles_custom_schools ON public.profiles USING GIN (custom_schools);

-- Paso 3: Agregar comentario descriptivo
COMMENT ON COLUMN public.profiles.custom_schools IS 'Array de IDs de sedes para usuarios con alcance personalizado. Solo aplica cuando tienen permisos con "ver_personalizado" o similar.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Consulta para verificar que la columna se agregó correctamente:
-- SELECT id, email, role, school_id, custom_schools FROM public.profiles LIMIT 10;
