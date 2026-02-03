-- ============================================
-- FIX: Permitir que los administradores vean pedidos con manual_name
-- ============================================

-- 1. Eliminar políticas existentes de SELECT para lunch_orders
DROP POLICY IF EXISTS "Admin general puede ver todos los pedidos" ON lunch_orders;
DROP POLICY IF EXISTS "Gestor puede ver pedidos de su sede" ON lunch_orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON lunch_orders;

-- 2. Crear nueva política para admin_general
CREATE POLICY "Admin general puede ver todos los pedidos de almuerzo"
ON lunch_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin_general'
  )
);

-- 3. Crear nueva política para gestor_unidad
CREATE POLICY "Gestor puede ver pedidos de su sede incluyendo manuales"
ON lunch_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'gestor_unidad'
    AND (
      -- Pedidos de estudiantes de su sede
      (lunch_orders.student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM students
        WHERE students.id = lunch_orders.student_id
        AND students.school_id = profiles.school_id
      ))
      OR
      -- Pedidos de profesores de su sede
      (lunch_orders.teacher_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM teacher_profiles
        WHERE teacher_profiles.id = lunch_orders.teacher_id
        AND teacher_profiles.school_id_1 = profiles.school_id
      ))
      OR
      -- Pedidos manuales (sin crédito) - permitir ver todos los de la fecha actual
      -- TODO: Agregar school_id a lunch_orders para filtrar mejor
      (lunch_orders.manual_name IS NOT NULL)
    )
  )
);

-- 4. Crear política para que padres vean sus propios pedidos
CREATE POLICY "Padres pueden ver pedidos de sus hijos"
ON lunch_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'parent'
    AND lunch_orders.student_id IN (
      SELECT id FROM students
      WHERE parent_id = auth.uid()
    )
  )
);

-- 5. Crear política para que profesores vean sus propios pedidos
CREATE POLICY "Profesores pueden ver sus propios pedidos"
ON lunch_orders
FOR SELECT
TO authenticated
USING (
  lunch_orders.teacher_id = auth.uid()
);

-- ============================================
-- RESULTADO ESPERADO:
-- - admin_general: Ve TODOS los pedidos
-- - gestor_unidad: Ve pedidos de estudiantes/profesores de su sede + TODOS los pedidos manuales
-- - parent: Ve pedidos de sus hijos
-- - teacher: Ve sus propios pedidos
-- ============================================
