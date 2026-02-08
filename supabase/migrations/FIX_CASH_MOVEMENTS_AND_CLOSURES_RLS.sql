-- 🔧 CORREGIR POLÍTICAS RLS PARA CASH_MOVEMENTS CON WITH CHECK

-- ===================================================================
-- CASH_MOVEMENTS - Políticas corregidas con WITH CHECK
-- ===================================================================

DROP POLICY IF EXISTS "Admin general - acceso total a movimientos" ON cash_movements;
DROP POLICY IF EXISTS "Operador caja - acceso total a movimientos de su caja" ON cash_movements;
DROP POLICY IF EXISTS "Gestor unidad - acceso total a movimientos de su sede" ON cash_movements;

-- Admin General: acceso total
CREATE POLICY "Admin general - acceso total a movimientos"
ON cash_movements FOR ALL TO authenticated
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

-- Operador Caja: acceso total a movimientos de su caja
CREATE POLICY "Operador caja - acceso total a movimientos de su caja"
ON cash_movements FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN cash_registers cr ON cr.school_id = p.school_id
    WHERE p.id = auth.uid()
      AND p.role = 'operador_caja'
      AND cr.id = cash_movements.cash_register_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN cash_registers cr ON cr.school_id = p.school_id
    WHERE p.id = auth.uid()
      AND p.role = 'operador_caja'
      AND cr.id = cash_register_id
  )
);

-- Gestor Unidad: acceso total a movimientos de su sede
CREATE POLICY "Gestor unidad - acceso total a movimientos de su sede"
ON cash_movements FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN cash_registers cr ON cr.school_id = p.school_id
    WHERE p.id = auth.uid()
      AND p.role = 'gestor_unidad'
      AND cr.id = cash_movements.cash_register_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN cash_registers cr ON cr.school_id = p.school_id
    WHERE p.id = auth.uid()
      AND p.role = 'gestor_unidad'
      AND cr.id = cash_register_id
  )
);

-- ===================================================================
-- CASH_CLOSURES - Políticas corregidas con WITH CHECK
-- ===================================================================

DROP POLICY IF EXISTS "Admin general - acceso total a cierres" ON cash_closures;
DROP POLICY IF EXISTS "Operador caja - acceso total a cierres de su sede" ON cash_closures;
DROP POLICY IF EXISTS "Gestor unidad - acceso total a cierres de su sede" ON cash_closures;

-- Admin General: acceso total
CREATE POLICY "Admin general - acceso total a cierres"
ON cash_closures FOR ALL TO authenticated
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

-- Operador Caja: acceso total a cierres de su sede
CREATE POLICY "Operador caja - acceso total a cierres de su sede"
ON cash_closures FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'operador_caja'
      AND p.school_id = cash_closures.school_id
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

-- Gestor Unidad: acceso total a cierres de su sede
CREATE POLICY "Gestor unidad - acceso total a cierres de su sede"
ON cash_closures FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'gestor_unidad'
      AND p.school_id = cash_closures.school_id
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
-- Verificar políticas
-- ===================================================================
SELECT 
  '✅ Políticas creadas' as resultado,
  tablename,
  COUNT(*) as cantidad
FROM pg_policies
WHERE tablename IN ('cash_movements', 'cash_closures')
GROUP BY tablename;
