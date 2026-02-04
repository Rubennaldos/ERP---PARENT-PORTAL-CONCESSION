-- ============================================
-- RECREAR TODAS LAS POLÍTICAS RLS DE TRANSACTIONS
-- (Incluyendo operador_caja)
-- ============================================

-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Admin general puede ver todas las transacciones" ON transactions;
DROP POLICY IF EXISTS "Gestor puede ver transacciones de su sede" ON transactions;
DROP POLICY IF EXISTS "Cajeros pueden ver transacciones de su sede" ON transactions;
DROP POLICY IF EXISTS "Operadores de caja pueden ver transacciones de su sede" ON transactions;
DROP POLICY IF EXISTS "Padres pueden ver sus propias transacciones" ON transactions;
DROP POLICY IF EXISTS "Profesores pueden ver sus propias transacciones" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Public can view transactions" ON transactions;

-- 2. CREAR POLÍTICA PARA ADMIN_GENERAL (ve TODO)
CREATE POLICY "Admin general puede ver todas las transacciones"
ON transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin_general'
  )
);

-- 3. CREAR POLÍTICA PARA GESTOR_UNIDAD (solo SU sede)
CREATE POLICY "Gestor puede ver transacciones de su sede"
ON transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'gestor_unidad'
    AND transactions.school_id = profiles.school_id
  )
);

-- 4. CREAR POLÍTICA PARA CAJERO (solo SU sede)
CREATE POLICY "Cajeros pueden ver transacciones de su sede"
ON transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cajero'
    AND transactions.school_id = profiles.school_id
  )
);

-- 5. CREAR POLÍTICA PARA OPERADOR_CAJA (solo SU sede) ✅ NUEVO
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

-- 6. CREAR POLÍTICA PARA PADRES (solo SUS transacciones)
CREATE POLICY "Padres pueden ver sus propias transacciones"
ON transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'parent'
    AND transactions.student_id IN (
      SELECT id FROM students
      WHERE parent_id = auth.uid()
    )
  )
);

-- 7. CREAR POLÍTICA PARA PROFESORES (solo SUS transacciones)
CREATE POLICY "Profesores pueden ver sus propias transacciones"
ON transactions
FOR SELECT
TO authenticated
USING (
  transactions.teacher_id = auth.uid()
);

-- ============================================
-- VERIFICAR POLÍTICAS CREADAS
-- ============================================
SELECT 
  policyname as politica,
  CASE 
    WHEN policyname LIKE '%admin%' THEN '👑 Ve TODAS las sedes'
    WHEN policyname LIKE '%gestor%' THEN '🏢 Solo SU sede'
    WHEN policyname LIKE '%cajero%' THEN '🏢 Solo SU sede'
    WHEN policyname LIKE '%operador%' THEN '🏢 Solo SU sede ✅ NUEVO'
    WHEN policyname LIKE '%padre%' THEN '👤 Solo SUS propias'
    WHEN policyname LIKE '%profesor%' THEN '👤 Solo SUS propias'
    ELSE '❓ Verificar'
  END as alcance
FROM pg_policies
WHERE tablename = 'transactions'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- ============================================
-- RESULTADO:
-- ✅ admin_general: Ve TODAS las ventas (todas las sedes)
-- ✅ gestor_unidad: Ve solo ventas de SU sede
-- ✅ cajero: Ve solo ventas de SU sede
-- ✅ operador_caja: Ve solo ventas de SU sede (NUEVO)
-- ✅ parent: Ve solo sus propias transacciones
-- ✅ teacher: Ve solo sus propias transacciones
-- ============================================
