-- ============================================
-- 🚨 FIX URGENTE: AGREGAR COLUMNA school_id
-- ============================================
-- ERROR: column "school_id" does not exist
-- SOLUCIÓN: Agregar la columna a la tabla profiles
-- ============================================

-- 1. Agregar columna school_id a profiles (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'school_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Columna school_id agregada a profiles';
    ELSE
        RAISE NOTICE '⚠️ La columna school_id ya existe';
    END IF;
END $$;

-- 2. Agregar columna pos_number (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'pos_number'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN pos_number INTEGER;
        
        RAISE NOTICE '✅ Columna pos_number agregada a profiles';
    ELSE
        RAISE NOTICE '⚠️ La columna pos_number ya existe';
    END IF;
END $$;

-- 3. Agregar columna ticket_prefix (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'ticket_prefix'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN ticket_prefix TEXT;
        
        RAISE NOTICE '✅ Columna ticket_prefix agregada a profiles';
    ELSE
        RAISE NOTICE '⚠️ La columna ticket_prefix ya existe';
    END IF;
END $$;

-- ============================================
-- 4. VERIFICAR ESTRUCTURA DE TABLA profiles
-- ============================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================
-- 5. VERIFICAR QUE EXISTAN LAS TABLAS NECESARIAS
-- ============================================

-- Verificar ticket_sequences
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ticket_sequences'
) AS ticket_sequences_existe;

-- Verificar school_prefixes
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'school_prefixes'
) AS school_prefixes_existe;

-- ============================================
-- 6. SI LAS TABLAS NO EXISTEN, CREARLAS
-- ============================================

-- Crear ticket_sequences si no existe
CREATE TABLE IF NOT EXISTS public.ticket_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    pos_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prefix TEXT NOT NULL,
    current_number INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pos_user_id)
);

-- Crear school_prefixes si no existe
CREATE TABLE IF NOT EXISTS public.school_prefixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE UNIQUE,
    prefix_base TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. INSERTAR PREFIJOS DE LAS 7 SEDES
-- ============================================

INSERT INTO public.school_prefixes (school_id, prefix_base)
SELECT id, 
    CASE code
        WHEN 'NRD' THEN 'FN'
        WHEN 'SGV' THEN 'FSG'
        WHEN 'SGM' THEN 'FSGM'
        WHEN 'LSG' THEN 'FLSG'
        WHEN 'JLB' THEN 'FJL'
        WHEN 'MC1' THEN 'FMC1'
        WHEN 'MC2' THEN 'FMC2'
    END AS prefix_base
FROM public.schools
WHERE code IN ('NRD', 'SGV', 'SGM', 'LSG', 'JLB', 'MC1', 'MC2')
ON CONFLICT (school_id) DO UPDATE 
SET prefix_base = EXCLUDED.prefix_base;

-- ============================================
-- ✅ VERIFICACIÓN FINAL
-- ============================================

-- Mostrar sedes con sus prefijos
SELECT 
    s.name,
    s.code,
    sp.prefix_base
FROM schools s
LEFT JOIN school_prefixes sp ON sp.school_id = s.id
WHERE s.is_active = true
ORDER BY s.name;

-- ============================================
-- 📝 INSTRUCCIONES
-- ============================================

/*
COPIA Y PEGA TODO ESTE CÓDIGO EN SUPABASE SQL EDITOR

1. Ve a: https://supabase.com/dashboard/project/duxqzozoahvrvqseinji/sql/new
2. Pega TODO este código
3. Presiona "Run"
4. Verifica que veas los mensajes: ✅
5. Verifica que veas la lista de sedes con prefijos

Si ves errores, cópialos y dímelos.
*/

