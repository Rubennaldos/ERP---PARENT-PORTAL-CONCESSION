-- 🔧 CORREGIR POLÍTICAS RLS - AGREGAR WITH CHECK (VERSIÓN CORREGIDA)

-- ===================================================================
-- CASH_REGISTERS - Políticas corregidas con WITH CHECK
-- ===================================================================

DROP POLICY IF EXISTS "Admin general - acceso total a registros" ON cash_registers;
DROP POLICY IF EXISTS "Operador caja - acceso total a registros de su sede" ON cash_registers;
DROP POLICY IF EXISTS "Gestor unidad - acceso total a registros de su sede" ON cash_registers;

-- Admin General: acceso total
CREATE POLICY "Admin general - acceso total a registros"
ON cash_registers FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin_general'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin_general'
  )
);

-- Operador Caja: acceso total a su sede
CREATE POLICY "Operador caja - acceso total a registros de su sede"
ON cash_registers FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'operador_caja'
      AND p.school_id = cash_registers.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'operador_caja'
      AND p.school_id = school_id
  )
);

-- Gestor Unidad: acceso total a su sede
CREATE POLICY "Gestor unidad - acceso total a registros de su sede"
ON cash_registers FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'gestor_unidad'
      AND p.school_id = cash_registers.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'gestor_unidad'
      AND p.school_id = school_id
  )
);

-- ===================================================================
-- TEST: Verificar que el operador puede ver registros
-- ===================================================================
SELECT 
  '🧪 Test de acceso' as test,
  cr.id,
  cr.school_id,
  s.name as sede,
  cr.status,
  cr.opened_at
FROM cash_registers cr
JOIN schools s ON s.id = cr.school_id
WHERE cr.school_id = '8a0dbd73-0571-4db1-af5c-65f4948c4c98'  -- Jean LeBouch
ORDER BY cr.opened_at DESC
LIMIT 5;

-- ===================================================================
-- Verificar políticas
-- ===================================================================
SELECT 
  '✅ Políticas de cash_registers' as info,
  policyname,
  cmd as operacion,
  permissive as tipo_politica
FROM pg_policies
WHERE tablename = 'cash_registers'
ORDER BY policyname;
