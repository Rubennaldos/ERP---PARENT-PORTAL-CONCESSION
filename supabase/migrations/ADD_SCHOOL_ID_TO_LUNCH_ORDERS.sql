-- ============================================
-- Agregar school_id a lunch_orders para filtrar por sede correctamente
-- ============================================

-- 1. Agregar columna school_id
ALTER TABLE lunch_orders 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- 2. Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_lunch_orders_school_id ON lunch_orders(school_id);

-- 3. Actualizar los pedidos existentes con school_id basado en student o teacher
UPDATE lunch_orders
SET school_id = (
  CASE
    -- Si tiene student_id, obtener school_id del estudiante
    WHEN student_id IS NOT NULL THEN (
      SELECT school_id FROM students WHERE id = lunch_orders.student_id
    )
    -- Si tiene teacher_id, obtener school_id del profesor
    WHEN teacher_id IS NOT NULL THEN (
      SELECT school_id_1 FROM teacher_profiles WHERE id = lunch_orders.teacher_id
    )
    ELSE NULL
  END
)
WHERE school_id IS NULL;

-- 4. Actualizar la política RLS para gestor_unidad usando school_id
DROP POLICY IF EXISTS "Gestor puede ver pedidos de su sede incluyendo manuales" ON lunch_orders;

CREATE POLICY "Gestor puede ver pedidos de su sede usando school_id"
ON lunch_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'gestor_unidad'
    AND (
      -- Si el pedido tiene school_id directamente, usarlo
      lunch_orders.school_id = profiles.school_id
      OR
      -- Si no tiene school_id, verificar por estudiante o profesor (fallback)
      (
        lunch_orders.school_id IS NULL AND (
          (lunch_orders.student_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM students
            WHERE students.id = lunch_orders.student_id
            AND students.school_id = profiles.school_id
          ))
          OR
          (lunch_orders.teacher_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM teacher_profiles
            WHERE teacher_profiles.id = lunch_orders.teacher_id
            AND teacher_profiles.school_id_1 = profiles.school_id
          ))
        )
      )
    )
  )
);

-- ============================================
-- RESULTADO:
-- - Ahora lunch_orders tiene school_id
-- - Los pedidos existentes se actualizaron con school_id
-- - Los gestores solo ven pedidos de SU sede (incluyendo pagos físicos)
-- ============================================
