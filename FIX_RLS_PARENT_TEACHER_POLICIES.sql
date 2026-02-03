-- =====================================================
-- 🔧 FIX: RLS Policies para parent_profiles y teacher_profiles
-- Permitir que admins de sede vean solo sus datos
-- =====================================================

-- ==================== LIMPIAR POLICIES EXISTENTES ====================

-- Eliminar TODAS las policies de parent_profiles
DROP POLICY IF EXISTS "allow_all_authenticated" ON parent_profiles;
DROP POLICY IF EXISTS "Admin general can view all parents" ON parent_profiles;
DROP POLICY IF EXISTS "Gestor unidad can view parents from their school" ON parent_profiles;
DROP POLICY IF EXISTS "Parents can view their own profile" ON parent_profiles;
DROP POLICY IF EXISTS "Admins can insert parents" ON parent_profiles;
DROP POLICY IF EXISTS "Admins can update parents from their school" ON parent_profiles;
DROP POLICY IF EXISTS "Parents can update their own profile" ON parent_profiles;

-- Eliminar TODAS las policies de teacher_profiles
DROP POLICY IF EXISTS "Admins and cashiers can view all teachers" ON teacher_profiles;
DROP POLICY IF EXISTS "Teachers can view their own profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Only admins can delete teachers" ON teacher_profiles;
DROP POLICY IF EXISTS "Teachers can insert their own profile, admins can insert any" ON teacher_profiles;
DROP POLICY IF EXISTS "Admin general can view all teachers" ON teacher_profiles;
DROP POLICY IF EXISTS "Gestor unidad can view teachers from their school" ON teacher_profiles;
DROP POLICY IF EXISTS "Cashiers can view teachers from their school" ON teacher_profiles;
DROP POLICY IF EXISTS "Admins can insert teachers" ON teacher_profiles;
DROP POLICY IF EXISTS "Admins can update teachers" ON teacher_profiles;

-- ==================== PARENT_PROFILES ====================

-- 1. Admin General ve todos los padres
CREATE POLICY "Admin general can view all parents"
ON parent_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin_general'
  )
);

-- 2. Gestor de Unidad ve padres de SU sede (a través de students)
CREATE POLICY "Gestor unidad can view parents from their school"
ON parent_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'gestor_unidad'
      AND profiles.school_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM students
        WHERE students.parent_id = parent_profiles.user_id
          AND students.school_id = profiles.school_id
      )
  )
);

-- 3. Padres pueden ver su propio perfil
CREATE POLICY "Parents can view their own profile"
ON parent_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Admins pueden insertar padres
CREATE POLICY "Admins can insert parents"
ON parent_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin_general', 'gestor_unidad')
  )
);

-- 5. Admins pueden actualizar padres de su sede
CREATE POLICY "Admins can update parents from their school"
ON parent_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin_general'
        OR (
          profiles.role = 'gestor_unidad'
          AND EXISTS (
            SELECT 1 FROM students
            WHERE students.parent_id = parent_profiles.user_id
              AND students.school_id = profiles.school_id
          )
        )
      )
  )
);

-- 6. Padres pueden actualizar su propio perfil
CREATE POLICY "Parents can update their own profile"
ON parent_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ==================== TEACHER_PROFILES ====================

-- 1. Admin General ve todos los profesores
CREATE POLICY "Admin general can view all teachers"
ON teacher_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin_general'
  )
);

-- 2. Gestor de Unidad ve profesores de SU sede
CREATE POLICY "Gestor unidad can view teachers from their school"
ON teacher_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'gestor_unidad'
      AND profiles.school_id IS NOT NULL
      AND (
        teacher_profiles.school_id_1 = profiles.school_id
        OR teacher_profiles.school_id_2 = profiles.school_id
      )
  )
);

-- 3. Cajeros ven profesores de su sede
CREATE POLICY "Cashiers can view teachers from their school"
ON teacher_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'cajero'
      AND profiles.school_id IS NOT NULL
      AND (
        teacher_profiles.school_id_1 = profiles.school_id
        OR teacher_profiles.school_id_2 = profiles.school_id
      )
  )
);

-- 4. Profesores pueden ver su propio perfil
CREATE POLICY "Teachers can view their own profile"
ON teacher_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'profesor'
      AND profiles.id = teacher_profiles.id
  )
);

-- 5. Admins pueden insertar profesores
CREATE POLICY "Admins can insert teachers"
ON teacher_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin_general', 'gestor_unidad')
  )
);

-- 6. Admins pueden actualizar profesores
CREATE POLICY "Admins can update teachers"
ON teacher_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin_general', 'gestor_unidad')
  )
);

-- 7. Profesores pueden actualizar su propio perfil
CREATE POLICY "Teachers can update their own profile"
ON teacher_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'profesor'
      AND profiles.id = teacher_profiles.id
  )
);

-- 8. Solo admin general puede eliminar profesores
CREATE POLICY "Only admins can delete teachers"
ON teacher_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin_general'
  )
);

-- =====================================================
-- ✅ VERIFICACIÓN
-- =====================================================

-- Ver las nuevas policies
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('parent_profiles', 'teacher_profiles')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

COMMENT ON TABLE parent_profiles IS 'RLS Policies actualizadas - Filtrado por sede implementado';
COMMENT ON TABLE teacher_profiles IS 'RLS Policies actualizadas - Filtrado por sede implementado';
