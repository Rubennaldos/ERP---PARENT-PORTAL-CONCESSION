-- =====================================================
-- 🔧 SOLUCIÓN SIMPLE: RLS para Parent y Teacher Profiles
-- =====================================================
-- Este script simplifica las políticas RLS para que funcionen correctamente
-- con consultas desde el frontend

BEGIN;

-- ========================================
-- PASO 1: Limpiar políticas existentes
-- ========================================

-- Eliminar políticas de parent_profiles
DROP POLICY IF EXISTS "Admin general can view all parents" ON parent_profiles;
DROP POLICY IF EXISTS "Admins can insert parents" ON parent_profiles;
DROP POLICY IF EXISTS "Admins can update parents from their school" ON parent_profiles;
DROP POLICY IF EXISTS "Gestor unidad can view parents from their school" ON parent_profiles;
DROP POLICY IF EXISTS "Parents can view their own profile" ON parent_profiles;
DROP POLICY IF EXISTS "Parents can update their own profile" ON parent_profiles;

-- Eliminar políticas de teacher_profiles
DROP POLICY IF EXISTS "Admin general can view all teachers" ON teacher_profiles;
DROP POLICY IF EXISTS "Admins can insert teachers" ON teacher_profiles;
DROP POLICY IF EXISTS "Admins can update teachers" ON teacher_profiles;
DROP POLICY IF EXISTS "Cashiers can view teachers from their school" ON teacher_profiles;
DROP POLICY IF EXISTS "Gestor unidad can view teachers from their school" ON teacher_profiles;
DROP POLICY IF EXISTS "Only admins can delete teachers" ON teacher_profiles;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Teachers can view their own profile" ON teacher_profiles;

-- ========================================
-- PASO 2: Crear función auxiliar para obtener school_id del usuario
-- ========================================

CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$;

-- ========================================
-- PASO 3: Crear función auxiliar para verificar si el usuario puede ver todas las sedes
-- ========================================

CREATE OR REPLACE FUNCTION can_view_all_schools()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN role_permissions rp ON rp.role = p.role
    INNER JOIN permissions perm ON perm.id = rp.permission_id
    WHERE p.id = auth.uid()
      AND perm.module = 'config_padres'
      AND perm.action = 'view_all_schools'
      AND rp.granted = true
  );
$$;

-- ========================================
-- PASO 4: Políticas para PARENT_PROFILES
-- ========================================

-- Admin general puede ver todos los padres
CREATE POLICY "Admin general can view all parents"
  ON parent_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin_general', 'superadmin')
    )
    OR can_view_all_schools()
  );

-- Gestor unidad puede ver padres de su sede (a través de students)
CREATE POLICY "Gestor unidad can view parents from their school"
  ON parent_profiles
  FOR SELECT
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

-- Padres pueden ver su propio perfil
CREATE POLICY "Parents can view their own profile"
  ON parent_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins pueden insertar padres
CREATE POLICY "Admins can insert parents"
  ON parent_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin_general', 'gestor_unidad', 'admin_sede', 'superadmin')
    )
  );

-- Admins pueden actualizar padres de su sede
CREATE POLICY "Admins can update parents from their school"
  ON parent_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin_general', 'gestor_unidad', 'admin_sede', 'superadmin')
        AND (
          profiles.school_id = parent_profiles.school_id
          OR profiles.role IN ('admin_general', 'superadmin')
          OR can_view_all_schools()
        )
    )
  );

-- Padres pueden actualizar su propio perfil
CREATE POLICY "Parents can update their own profile"
  ON parent_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ========================================
-- PASO 5: Políticas para TEACHER_PROFILES
-- ========================================

-- Admin general puede ver todos los profesores
CREATE POLICY "Admin general can view all teachers"
  ON teacher_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin_general', 'superadmin')
    )
    OR can_view_all_schools()
  );

-- Gestor unidad puede ver profesores de su sede
CREATE POLICY "Gestor unidad can view teachers from their school"
  ON teacher_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('gestor_unidad', 'admin_sede')
        AND profiles.school_id IS NOT NULL
        AND (
          teacher_profiles.school_id_1 = profiles.school_id
          OR teacher_profiles.school_id_2 = profiles.school_id
        )
    )
  );

-- Cajeros pueden ver profesores de su sede
CREATE POLICY "Cashiers can view teachers from their school"
  ON teacher_profiles
  FOR SELECT
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

-- Profesores pueden ver su propio perfil
CREATE POLICY "Teachers can view their own profile"
  ON teacher_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'profesor'
        AND (
          profiles.email = teacher_profiles.corporate_email
          OR profiles.email = teacher_profiles.personal_email
        )
    )
  );

-- Admins pueden insertar profesores
CREATE POLICY "Admins can insert teachers"
  ON teacher_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin_general', 'gestor_unidad', 'admin_sede', 'superadmin')
    )
  );

-- Admins pueden actualizar profesores
CREATE POLICY "Admins can update teachers"
  ON teacher_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin_general', 'gestor_unidad', 'admin_sede', 'superadmin')
    )
  );

-- Profesores pueden actualizar su propio perfil
CREATE POLICY "Teachers can update their own profile"
  ON teacher_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'profesor'
        AND (
          profiles.email = teacher_profiles.corporate_email
          OR profiles.email = teacher_profiles.personal_email
        )
    )
  );

-- Solo admins pueden eliminar profesores
CREATE POLICY "Only admins can delete teachers"
  ON teacher_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin_general', 'superadmin')
    )
  );

COMMIT;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Mostrar las nuevas políticas
SELECT 
  tablename,
  policyname,
  cmd,
  LEFT(qual::text, 100) as condition_preview
FROM pg_policies
WHERE tablename IN ('parent_profiles', 'teacher_profiles')
ORDER BY tablename, policyname;

-- ========================================
-- NOTAS
-- ========================================

/*
✅ CAMBIOS REALIZADOS:

1. Se simplificaron las políticas RLS para mejorar el rendimiento
2. Se crearon funciones auxiliares para evitar repetir lógica
3. Se separaron claramente las políticas por rol y acción
4. Se aseguró que gestor_unidad pueda ver:
   - Padres cuyos hijos estudian en su sede
   - Profesores asignados a su sede (school_id_1 o school_id_2)

🔍 PARA VERIFICAR:
Ejecuta las consultas de DIAGNOSTICO_ADMIN_NO_VE_PADRES.sql
para confirmar que los datos son visibles correctamente.
*/
