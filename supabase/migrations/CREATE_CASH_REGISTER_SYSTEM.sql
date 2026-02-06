-- 💰 SISTEMA DE CIERRE DE CAJA
-- Gestión completa de apertura, movimientos, cierre y auditoría

-- ============================================
-- TABLA: cash_register_closures
-- Registra cada cierre de caja
-- ============================================
CREATE TABLE IF NOT EXISTS cash_register_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Información del cierre
  closure_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closure_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'auto_closed')),
  
  -- Caja inicial
  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  opening_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Ventas POS (por método de pago)
  pos_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  pos_card DECIMAL(10,2) NOT NULL DEFAULT 0,
  pos_yape DECIMAL(10,2) NOT NULL DEFAULT 0,
  pos_yape_qr DECIMAL(10,2) NOT NULL DEFAULT 0,
  pos_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
  pos_mixed_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  pos_mixed_card DECIMAL(10,2) NOT NULL DEFAULT 0,
  pos_mixed_yape DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Almuerzos
  lunch_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  lunch_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Movimientos de caja
  total_income DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Caja final
  expected_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_balance DECIMAL(10,2),
  difference DECIMAL(10,2),
  
  -- División de efectivo
  petty_cash DECIMAL(10,2),
  safe_cash DECIMAL(10,2),
  
  -- Ajustes y observaciones
  adjustment_reason TEXT,
  adjustment_approved_by UUID REFERENCES auth.users(id),
  adjustment_approved_at TIMESTAMPTZ,
  
  -- Auditoría
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA: cash_movements
-- Registra ingresos y egresos durante el día
-- ============================================
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id UUID NOT NULL REFERENCES cash_register_closures(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Tipo de movimiento
  movement_type TEXT NOT NULL CHECK (movement_type IN ('income', 'expense', 'adjustment', 'opening_adjustment')),
  
  -- Detalles del movimiento
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  category TEXT, -- 'proveedores', 'servicios', 'otros', etc.
  
  -- Responsable y autorización
  registered_by UUID NOT NULL REFERENCES auth.users(id),
  authorized_by UUID REFERENCES auth.users(id),
  authorized_at TIMESTAMPTZ,
  
  -- Comprobante
  voucher_number TEXT,
  voucher_printed BOOLEAN DEFAULT FALSE,
  voucher_printed_at TIMESTAMPTZ,
  
  -- Auditoría
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA: cash_register_config
-- Configuración del sistema de caja
-- ============================================
CREATE TABLE IF NOT EXISTS cash_register_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  
  -- Configuración de cierre automático
  auto_close_enabled BOOLEAN DEFAULT TRUE,
  auto_close_time TIME DEFAULT '18:00:00',
  
  -- Configuración de alertas
  alert_on_difference BOOLEAN DEFAULT TRUE,
  alert_threshold DECIMAL(10,2) DEFAULT 10.00,
  
  -- Configuración de reportes
  whatsapp_number TEXT,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  
  -- Configuración de impresión
  print_on_close BOOLEAN DEFAULT TRUE,
  include_signatures BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_cash_closures_school ON cash_register_closures(school_id);
CREATE INDEX idx_cash_closures_date ON cash_register_closures(closure_date);
CREATE INDEX idx_cash_closures_status ON cash_register_closures(status);
CREATE INDEX idx_cash_movements_closure ON cash_movements(closure_id);
CREATE INDEX idx_cash_movements_school ON cash_movements(school_id);
CREATE INDEX idx_cash_movements_type ON cash_movements(movement_type);

-- ============================================
-- FUNCIÓN: Calcular totales automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION calculate_cash_closure_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular total esperado
  NEW.expected_balance := 
    NEW.opening_balance +
    NEW.pos_cash + NEW.pos_mixed_cash +
    NEW.lunch_cash +
    NEW.total_income -
    NEW.total_expenses;
  
  -- Calcular diferencia si hay saldo real
  IF NEW.actual_balance IS NOT NULL THEN
    NEW.difference := NEW.actual_balance - NEW.expected_balance;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_cash_closure_totals
  BEFORE INSERT OR UPDATE ON cash_register_closures
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cash_closure_totals();

-- ============================================
-- FUNCIÓN: Actualizar totales de movimientos
-- ============================================
CREATE OR REPLACE FUNCTION update_closure_movements_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_total_income DECIMAL(10,2);
  v_total_expenses DECIMAL(10,2);
BEGIN
  -- Calcular totales de ingresos y egresos
  SELECT 
    COALESCE(SUM(CASE WHEN movement_type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expenses
  FROM cash_movements
  WHERE closure_id = COALESCE(NEW.closure_id, OLD.closure_id);
  
  -- Actualizar el cierre
  UPDATE cash_register_closures
  SET 
    total_income = v_total_income,
    total_expenses = v_total_expenses,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.closure_id, OLD.closure_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_closure_movements
  AFTER INSERT OR UPDATE OR DELETE ON cash_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_closure_movements_totals();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE cash_register_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_config ENABLE ROW LEVEL SECURITY;

-- Políticas para cash_register_closures
CREATE POLICY "Usuarios pueden ver cierres de su sede"
  ON cash_register_closures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = cash_register_closures.school_id
        AND profiles.role IN ('admin', 'operador_caja', 'supervisor')
    )
  );

CREATE POLICY "Operadores y admins pueden crear cierres"
  ON cash_register_closures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = cash_register_closures.school_id
        AND profiles.role IN ('admin', 'operador_caja')
    )
  );

CREATE POLICY "Operadores y admins pueden actualizar cierres"
  ON cash_register_closures FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = cash_register_closures.school_id
        AND profiles.role IN ('admin', 'operador_caja')
    )
  );

-- Políticas para cash_movements
CREATE POLICY "Usuarios pueden ver movimientos de su sede"
  ON cash_movements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = cash_movements.school_id
        AND profiles.role IN ('admin', 'operador_caja', 'supervisor')
    )
  );

CREATE POLICY "Operadores y admins pueden registrar movimientos"
  ON cash_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = cash_movements.school_id
        AND profiles.role IN ('admin', 'operador_caja')
    )
  );

CREATE POLICY "Operadores y admins pueden actualizar movimientos"
  ON cash_movements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = cash_movements.school_id
        AND profiles.role IN ('admin', 'operador_caja')
    )
  );

-- Políticas para cash_register_config
CREATE POLICY "Usuarios pueden ver config de su sede"
  ON cash_register_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = cash_register_config.school_id
    )
  );

CREATE POLICY "Solo admins pueden modificar config"
  ON cash_register_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = cash_register_config.school_id
        AND profiles.role = 'admin'
    )
  );

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE cash_register_closures IS 'Registros de apertura y cierre de caja por día';
COMMENT ON TABLE cash_movements IS 'Movimientos de efectivo (ingresos, egresos, ajustes)';
COMMENT ON TABLE cash_register_config IS 'Configuración del sistema de caja por sede';
