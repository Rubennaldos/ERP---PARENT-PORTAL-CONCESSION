-- =============================================
-- DEBUG: VERIFICAR PERMISOS PARA COMBOS
-- =============================================

-- 1. Ver tu usuario y rol actual
SELECT 
  auth.uid() as "Mi User ID",
  p.email as "Mi Email",
  p.role as "Mi Rol",
  p.assigned_schools as "Mis Sedes"
FROM profiles p
WHERE p.id = auth.uid();

-- 2. Ver todas las políticas activas en combos
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('combos', 'combo_items')
ORDER BY tablename, policyname;

-- 3. Probar si puedes insertar (esto mostrará el error específico)
-- SELECT 'Si ves este mensaje, tienes permiso de SELECT' as test_select;

-- =============================================
-- SOLUCIÓN: AGREGAR MÁS ROLES PERMITIDOS
-- =============================================

-- Si tu rol NO es 'admin_general' o 'supervisor_red',
-- necesitamos agregar tu rol a las políticas.

-- Eliminar políticas actuales
DROP POLICY IF EXISTS "admin_can_insert_combos" ON combos;
DROP POLICY IF EXISTS "admin_can_update_delete_combos" ON combos;
DROP POLICY IF EXISTS "admin_can_delete_combos" ON combos;
DROP POLICY IF EXISTS "admin_can_insert_combo_items" ON combo_items;
DROP POLICY IF EXISTS "admin_can_update_delete_combo_items" ON combo_items;
DROP POLICY IF EXISTS "admin_can_delete_combo_items" ON combo_items;

-- Crear políticas AMPLIADAS incluyendo 'gestor_unidad'
-- COMBOS: INSERT
CREATE POLICY "admin_can_insert_combos"
ON combos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

-- COMBOS: UPDATE
CREATE POLICY "admin_can_update_combos"
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

-- COMBOS: DELETE
CREATE POLICY "admin_can_delete_combos"
ON combos FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

-- COMBO_ITEMS: INSERT
CREATE POLICY "admin_can_insert_combo_items"
ON combo_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

-- COMBO_ITEMS: UPDATE
CREATE POLICY "admin_can_update_combo_items"
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

-- COMBO_ITEMS: DELETE
CREATE POLICY "admin_can_delete_combo_items"
ON combo_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin_general', 'supervisor_red', 'gestor_unidad')
  )
);

-- Verificar que se crearon correctamente
SELECT 
  'Políticas actualizadas correctamente - Ahora incluyen gestor_unidad' as status,
  COUNT(*) as "Políticas Creadas"
FROM pg_policies
WHERE tablename IN ('combos', 'combo_items')
  AND policyname LIKE 'admin_can_%';
