-- =====================================================
-- FIX: RLS para school_levels y school_classrooms
-- =====================================================
-- Error: "new row violates row-level security policy"
-- Solución: Permitir a admin_general crear grados y aulas
-- =====================================================

-- 1. Verificar políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('school_levels', 'school_classrooms')
ORDER BY tablename, cmd;

-- =====================================================
-- 2. ARREGLAR POLÍTICAS DE school_levels
-- =====================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "school_levels_select" ON school_levels;
DROP POLICY IF EXISTS "school_levels_insert" ON school_levels;
DROP POLICY IF EXISTS "school_levels_update" ON school_levels;
DROP POLICY IF EXISTS "school_levels_delete" ON school_levels;

-- Política SELECT: Todos los usuarios autenticados pueden ver grados
CREATE POLICY "school_levels_select" ON school_levels
  FOR SELECT
  USING (true);

-- Política INSERT: Solo admin_general puede crear grados
CREATE POLICY "school_levels_insert" ON school_levels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin_general'
    )
  );

-- Política UPDATE: Solo admin_general puede actualizar grados
CREATE POLICY "school_levels_update" ON school_levels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin_general'
    )
  );

-- Política DELETE: Solo admin_general puede eliminar grados
CREATE POLICY "school_levels_delete" ON school_levels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin_general'
    )
  );

-- =====================================================
-- 3. ARREGLAR POLÍTICAS DE school_classrooms
-- =====================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "school_classrooms_select" ON school_classrooms;
DROP POLICY IF EXISTS "school_classrooms_insert" ON school_classrooms;
DROP POLICY IF EXISTS "school_classrooms_update" ON school_classrooms;
DROP POLICY IF EXISTS "school_classrooms_delete" ON school_classrooms;

-- Política SELECT: Todos los usuarios autenticados pueden ver aulas
CREATE POLICY "school_classrooms_select" ON school_classrooms
  FOR SELECT
  USING (true);

-- Política INSERT: Solo admin_general puede crear aulas
CREATE POLICY "school_classrooms_insert" ON school_classrooms
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin_general'
    )
  );

-- Política UPDATE: Solo admin_general puede actualizar aulas
CREATE POLICY "school_classrooms_update" ON school_classrooms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin_general'
    )
  );

-- Política DELETE: Solo admin_general puede eliminar aulas
CREATE POLICY "school_classrooms_delete" ON school_classrooms
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin_general'
    )
  );

-- =====================================================
-- 4. VERIFICAR QUE FUNCIONE
-- =====================================================

SELECT 'Políticas actualizadas correctamente' as status;

-- Verificar nuevas políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('school_levels', 'school_classrooms')
ORDER BY tablename, cmd;
