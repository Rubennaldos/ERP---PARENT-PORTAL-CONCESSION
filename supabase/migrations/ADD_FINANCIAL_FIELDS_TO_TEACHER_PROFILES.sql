-- =====================================================
-- AGREGAR CAMPOS FINANCIEROS A TEACHER_PROFILES
-- Para que los profesores tengan balance y límites como los estudiantes
-- =====================================================

-- 1. Ver estructura actual de teacher_profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'teacher_profiles'
ORDER BY ordinal_position;

-- 2. Agregar campos financieros si no existen
DO $$
BEGIN
  -- Agregar balance (saldo disponible)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teacher_profiles' AND column_name = 'balance'
  ) THEN
    ALTER TABLE teacher_profiles ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL;
    RAISE NOTICE 'Columna balance agregada';
  ELSE
    RAISE NOTICE 'Columna balance ya existe';
  END IF;

  -- Agregar daily_limit (límite de gasto diario, opcional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teacher_profiles' AND column_name = 'daily_limit'
  ) THEN
    ALTER TABLE teacher_profiles ADD COLUMN daily_limit DECIMAL(10, 2);
    RAISE NOTICE 'Columna daily_limit agregada';
  ELSE
    RAISE NOTICE 'Columna daily_limit ya existe';
  END IF;

  -- Agregar is_active (estado activo/inactivo)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teacher_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE teacher_profiles ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
    RAISE NOTICE 'Columna is_active agregada';
  ELSE
    RAISE NOTICE 'Columna is_active ya existe';
  END IF;
END $$;

-- 3. Actualizar todos los profesores existentes con balance 0
UPDATE teacher_profiles 
SET balance = 0.00 
WHERE balance IS NULL;

-- 4. Actualizar todos los profesores existentes como activos
UPDATE teacher_profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- 5. Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'teacher_profiles'
  AND column_name IN ('balance', 'daily_limit', 'is_active', 'school_id_1', 'full_name')
ORDER BY ordinal_position;

-- 6. Ver algunos datos de ejemplo
SELECT 
  id,
  full_name,
  balance,
  daily_limit,
  is_active,
  school_id_1
FROM teacher_profiles
LIMIT 5;

-- 7. IMPORTANTE: Verificar que las políticas RLS permitan actualizar balance
-- Si no existen, crearlas

-- Ver políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'teacher_profiles';
