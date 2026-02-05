-- 🔧 AGREGAR POLÍTICA RLS PARA QUE OPERADORES DE CAJA VEAN PEDIDOS DE SU SEDE
-- El problema: La política actual busca 'cajero' pero el rol real es 'operador_caja'

-- 1. Eliminar la política antigua de 'cajero' si existe
DROP POLICY IF EXISTS "Cajero can view lunch orders from their school" ON lunch_orders;

-- 2. Crear la política correcta para 'operador_caja'
CREATE POLICY "Operadores de caja pueden ver pedidos de su sede"
ON lunch_orders
FOR SELECT
TO authenticated
USING (
  -- El operador de caja puede ver pedidos donde el school_id del pedido coincide con su school_id
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'operador_caja'
      AND p.school_id = lunch_orders.school_id
  )
);

-- 3. Verificar que se creó correctamente
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'lunch_orders'
  AND policyname LIKE '%operador%';
