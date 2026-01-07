-- =====================================================
-- SCRIPT: AGREGAR CUENTA LIBRE Y SISTEMA DE DEUDAS
-- Fecha: 2026-01-07
-- Descripción: Agrega soporte para cuenta libre (consumo sin saldo previo)
-- =====================================================

-- 1. Agregar columna free_account a students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS free_account BOOLEAN DEFAULT true;

-- 2. Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_students_free_account ON students(free_account);

-- 3. Actualizar estudiantes existentes a cuenta libre por defecto
UPDATE students 
SET free_account = true 
WHERE free_account IS NULL;

-- 4. Agregar columna para identificar transacciones pendientes de pago
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partial'));

-- 5. Crear índice para filtrar deudas pendientes
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);

-- 6. Función para obtener deuda total de un estudiante
CREATE OR REPLACE FUNCTION get_student_debt(p_student_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_debt NUMERIC;
BEGIN
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO total_debt
  FROM transactions
  WHERE student_id = p_student_id
    AND type = 'purchase'
    AND payment_status = 'pending';
  
  RETURN total_debt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para obtener todas las deudas pendientes de los hijos de un padre
CREATE OR REPLACE FUNCTION get_parent_total_debt(p_parent_user_id UUID)
RETURNS TABLE(
  student_id UUID,
  student_name TEXT,
  total_debt NUMERIC,
  pending_transactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.full_name,
    COALESCE(SUM(ABS(t.amount)), 0) as total_debt,
    COUNT(t.id) as pending_transactions
  FROM students s
  LEFT JOIN transactions t ON t.student_id = s.id 
    AND t.type = 'purchase' 
    AND t.payment_status = 'pending'
  WHERE s.parent_id = p_parent_user_id
    AND s.free_account = true
  GROUP BY s.id, s.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger para validar compras en cuenta libre
CREATE OR REPLACE FUNCTION validate_free_account_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es una compra (purchase) y el estudiante tiene cuenta libre
  -- marcar la transacción como pendiente
  IF NEW.type = 'purchase' THEN
    DECLARE
      is_free_account BOOLEAN;
    BEGIN
      SELECT free_account INTO is_free_account
      FROM students
      WHERE id = NEW.student_id;
      
      IF is_free_account = true THEN
        NEW.payment_status = 'pending';
      ELSE
        NEW.payment_status = 'paid';
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_free_account ON transactions;
CREATE TRIGGER trigger_validate_free_account
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_free_account_purchase();

-- 9. RLS Policies para las nuevas funciones
GRANT EXECUTE ON FUNCTION get_student_debt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_parent_total_debt(UUID) TO authenticated;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

