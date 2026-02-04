-- ============================================
-- Agregar política RLS para operador_caja en transactions
-- ============================================

-- 1. Eliminar política existente si existe
DROP POLICY IF EXISTS "Operadores de caja pueden ver transacciones de su sede" ON transactions;

-- 2. Crear política para operador_caja (solo SU sede)
CREATE POLICY "Operadores de caja pueden ver transacciones de su sede"
ON transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'operador_caja'
    AND transactions.school_id = profiles.school_id
  )
);

-- ============================================
-- Verificar que las políticas estén correctas
-- ============================================
SELECT 
  policyname,
  roles,
  cmd,
  CASE 
    WHEN policyname LIKE '%admin%' THEN '✅ Ve TODAS las sedes'
    WHEN policyname LIKE '%gestor%' OR policyname LIKE '%cajero%' OR policyname LIKE '%operador%' THEN '✅ Solo SU sede'
    WHEN policyname LIKE '%padre%' OR policyname LIKE '%profesor%' THEN '✅ Solo SUS transacciones'
    ELSE '⚠️ Revisar'
  END as alcance
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- ============================================
-- RESULTADO ESPERADO:
-- - admin_general: Ve TODAS las ventas (todas las sedes)
-- - gestor_unidad: Ve solo ventas de SU sede
-- - cajero: Ve solo ventas de SU sede
-- - operador_caja: Ve solo ventas de SU sede ✅ NUEVO
-- - parent: Ve solo sus propias transacciones
-- - teacher: Ve solo sus propias transacciones
-- ============================================
