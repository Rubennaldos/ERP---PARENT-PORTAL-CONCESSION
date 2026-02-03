-- =====================================================
-- 🔒 REACTIVAR RLS CON POLÍTICAS SIMPLES
-- =====================================================
-- Este script reactiva RLS y crea políticas ULTRA SIMPLES que funcionan

BEGIN;

-- ========================================
-- PASO 1: Reactivar RLS
-- ========================================

ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PASO 2: Crear políticas ULTRA SIMPLES
-- ========================================

-- PARENT_PROFILES: Todos los autenticados pueden ver y modificar
CREATE POLICY "Authenticated users can view parents"
  ON parent_profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert parents"
  ON parent_profiles
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update parents"
  ON parent_profiles
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- TEACHER_PROFILES: Todos los autenticados pueden ver y modificar
CREATE POLICY "Authenticated users can view teachers"
  ON teacher_profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert teachers"
  ON teacher_profiles
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update teachers"
  ON teacher_profiles
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete teachers"
  ON teacher_profiles
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

COMMIT;

-- ========================================
-- VERIFICACIÓN
-- ========================================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('parent_profiles', 'teacher_profiles')
ORDER BY tablename, policyname;

-- ========================================
-- NOTA IMPORTANTE
-- ========================================

/*
✅ Estas políticas son ULTRA SIMPLES y permiten a cualquier usuario
   autenticado ver/modificar padres y profesores.

⚠️ MEJORA FUTURA: Implementar filtrado por school_id en el frontend
   en lugar de depender de RLS complejo.

🔒 SEGURIDAD: Los usuarios no autenticados NO pueden acceder.
   Solo usuarios logueados en el sistema pueden ver datos.
*/
