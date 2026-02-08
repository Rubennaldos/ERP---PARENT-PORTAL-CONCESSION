-- ================================================
-- FIX: Políticas RLS para cash_movements (Ingresos/Egresos)
-- ================================================
-- Permite a los usuarios registrar ingresos y egresos en su sede

-- 1. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view cash movements from their school" ON cash_movements;
DROP POLICY IF EXISTS "Users can create cash movements in their school" ON cash_movements;
DROP POLICY IF EXISTS "cash_movements_select_policy" ON cash_movements;
DROP POLICY IF EXISTS "cash_movements_insert_policy" ON cash_movements;

-- 2. Crear política para SELECT (ver movimientos)
CREATE POLICY "cash_movements_select_policy"
ON cash_movements
FOR SELECT
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 3. Crear política para INSERT (crear movimientos)
CREATE POLICY "cash_movements_insert_policy"
ON cash_movements
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 4. Crear política para UPDATE (actualizar movimientos - opcional)
DROP POLICY IF EXISTS "cash_movements_update_policy" ON cash_movements;

CREATE POLICY "cash_movements_update_policy"
ON cash_movements
FOR UPDATE
USING (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 5. Verificar que RLS está habilitado
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- 6. Verificar las políticas creadas
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
WHERE tablename = 'cash_movements'
ORDER BY policyname;
