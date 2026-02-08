-- 🔧 ACTUALIZAR FUNCIÓN calculate_daily_totals CON NOMBRES CORRECTOS

-- ============================================
-- FUNCIÓN: Calcular totales del día
-- ============================================
CREATE OR REPLACE FUNCTION calculate_daily_totals(p_school_id UUID, p_date DATE)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pos', (
      SELECT json_build_object(
        'cash', COALESCE(SUM(CASE WHEN payment_method = 'efectivo' AND (paid_with_mixed = false OR paid_with_mixed IS NULL) THEN amount ELSE 0 END), 0),
        'card', COALESCE(SUM(CASE WHEN payment_method = 'tarjeta' AND (paid_with_mixed = false OR paid_with_mixed IS NULL) THEN amount ELSE 0 END), 0),
        'yape', COALESCE(SUM(CASE WHEN payment_method = 'yape' AND (paid_with_mixed = false OR paid_with_mixed IS NULL) THEN amount ELSE 0 END), 0),
        'yape_qr', COALESCE(SUM(CASE WHEN payment_method = 'yape_qr' AND (paid_with_mixed = false OR paid_with_mixed IS NULL) THEN amount ELSE 0 END), 0),
        'credit', COALESCE(SUM(CASE WHEN payment_status = 'credito' THEN amount ELSE 0 END), 0),
        'mixed_cash', COALESCE(SUM(CASE WHEN paid_with_mixed = true THEN cash_amount ELSE 0 END), 0),
        'mixed_card', COALESCE(SUM(CASE WHEN paid_with_mixed = true THEN card_amount ELSE 0 END), 0),
        'mixed_yape', COALESCE(SUM(CASE WHEN paid_with_mixed = true THEN yape_amount ELSE 0 END), 0),
        'total', COALESCE(SUM(amount), 0)
      )
      FROM transactions
      WHERE school_id = p_school_id
        AND DATE(created_at) = p_date
        AND (is_deleted = false OR is_deleted IS NULL)
    ),
    'lunch', (
      SELECT json_build_object(
        'cash', COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN amount ELSE 0 END), 0),
        'card', COALESCE(SUM(CASE WHEN payment_method = 'tarjeta' THEN amount ELSE 0 END), 0),
        'yape', COALESCE(SUM(CASE WHEN payment_method = 'yape' THEN amount ELSE 0 END), 0),
        'credit', COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0),
        'total', COALESCE(SUM(amount), 0)
      )
      FROM lunch_transactions
      WHERE school_id = p_school_id
        AND DATE(transaction_date) = p_date
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- VERIFICACIÓN: Probar la función
-- ===================================================================
SELECT 
  '✅ Función actualizada. Probando con la sede de Jean LeBouch...' as test,
  calculate_daily_totals(
    '8a0dbd73-0571-4db1-af5c-65f4948c4c98'::uuid,  -- Jean LeBouch
    CURRENT_DATE
  ) as resultado;
