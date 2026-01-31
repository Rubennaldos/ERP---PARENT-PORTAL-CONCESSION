-- =============================================
-- SOLUCIÓN DEFINITIVA: RLS COMBOS
-- =============================================

-- 1. Ver tu rol actual (sin columnas inexistentes)
SELECT 
  auth.uid() as "Mi User ID",
  p.email as "Mi Email",
  p.role as "Mi Rol"
FROM profiles p
WHERE p.id = auth.uid();

-- 2. ELIMINAR TODAS las políticas de combos
DROP POLICY IF EXISTS "admin_can_view_all_combos" ON combos;
DROP POLICY IF EXISTS "admin_can_manage_combos" ON combos;
DROP POLICY IF EXISTS "admin_can_insert_combos" ON combos;
DROP POLICY IF EXISTS "admin_can_update_delete_combos" ON combos;
DROP POLICY IF EXISTS "admin_can_update_combos" ON combos;
DROP POLICY IF EXISTS "admin_can_delete_combos" ON combos;

DROP POLICY IF EXISTS "admin_can_view_combo_items" ON combo_items;
DROP POLICY IF EXISTS "admin_can_manage_combo_items" ON combo_items;
DROP POLICY IF EXISTS "admin_can_insert_combo_items" ON combo_items;
DROP POLICY IF EXISTS "admin_can_update_delete_combo_items" ON combo_items;
DROP POLICY IF EXISTS "admin_can_update_combo_items" ON combo_items;
DROP POLICY IF EXISTS "admin_can_delete_combo_items" ON combo_items;

-- 3. CREAR políticas correctas para COMBOS
CREATE POLICY "combos_select_policy"
ON combos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

CREATE POLICY "combos_insert_policy"
ON combos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

CREATE POLICY "combos_update_policy"
ON combos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

CREATE POLICY "combos_delete_policy"
ON combos FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

-- 4. CREAR políticas correctas para COMBO_ITEMS
CREATE POLICY "combo_items_select_policy"
ON combo_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

CREATE POLICY "combo_items_insert_policy"
ON combo_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

CREATE POLICY "combo_items_update_policy"
ON combo_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

CREATE POLICY "combo_items_delete_policy"
ON combo_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

-- 5. Verificar que todo está OK
SELECT 
  '✅ Políticas RLS creadas correctamente' as "Status",
  COUNT(*) as "Total Políticas"
FROM pg_policies
WHERE tablename IN ('combos', 'combo_items');

-- 6. Listar todas las políticas creadas
SELECT 
  tablename as "Tabla",
  policyname as "Política",
  cmd as "Comando"
FROM pg_policies
WHERE tablename IN ('combos', 'combo_items')
ORDER BY tablename, cmd;
