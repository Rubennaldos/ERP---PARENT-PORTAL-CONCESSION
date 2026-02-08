-- 🔒 CREAR POLÍTICAS RLS PARA TODAS LAS TABLAS DEL SISTEMA DE CAJA

-- ===================================================================
-- 1. CASH_REGISTERS - Registros de apertura/cierre de caja
-- ===================================================================

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_registers_admin_all" ON cash_registers;
DROP POLICY IF EXISTS "cash_registers_operador_all" ON cash_registers;
DROP POLICY IF EXISTS "cash_registers_gestor_all" ON cash_registers;

-- Admin General: acceso total
CREATE POLICY "Admin general - acceso total a registros"
ON cash_registers FOR ALL TO authenticated
USING (
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
);

-- ===================================================================
-- 2. CASH_MOVEMENTS - Movimientos de caja (ingresos/egresos)
-- ===================================================================

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_movements_admin_all" ON cash_movements;
DROP POLICY IF EXISTS "cash_movements_operador_all" ON cash_movements;
DROP POLICY IF EXISTS "cash_movements_gestor_all" ON cash_movements;

-- Admin General: acceso total
CREATE POLICY "Admin general - acceso total a movimientos"
ON cash_movements FOR ALL TO authenticated
USING (
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
);

-- ===================================================================
-- 3. CASH_CLOSURES - Cierres de caja
-- ===================================================================

ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_closures_admin_all" ON cash_closures;
DROP POLICY IF EXISTS "cash_closures_operador_all" ON cash_closures;
DROP POLICY IF EXISTS "cash_closures_gestor_all" ON cash_closures;

-- Admin General: acceso total
CREATE POLICY "Admin general - acceso total a cierres"
ON cash_closures FOR ALL TO authenticated
USING (
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
);

-- ===================================================================
-- VERIFICACIÓN FINAL
-- ===================================================================
SELECT 
  '✅ Políticas creadas para todas las tablas' as resultado,
  tablename,
  COUNT(*) as cantidad_politicas
FROM pg_policies
WHERE tablename IN ('cash_registers', 'cash_movements', 'cash_closures', 'cash_register_config')
GROUP BY tablename
ORDER BY tablename;
