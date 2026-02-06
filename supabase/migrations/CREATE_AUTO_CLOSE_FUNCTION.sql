-- 🔄 FUNCIÓN PARA CIERRE AUTOMÁTICO DE CAJA
-- Se ejecuta automáticamente según la hora configurada

CREATE OR REPLACE FUNCTION auto_close_cash_registers()
RETURNS INTEGER AS $$
DECLARE
  v_config RECORD;
  v_closure RECORD;
  v_closed_count INTEGER := 0;
  v_current_time TIME;
BEGIN
  v_current_time := CURRENT_TIME;
  
  -- Iterar por cada sede que tiene auto-close habilitado
  FOR v_config IN
    SELECT * FROM cash_register_config
    WHERE auto_close_enabled = TRUE
      AND auto_close_time <= v_current_time
  LOOP
    -- Buscar cierres abiertos de hoy para esta sede
    FOR v_closure IN
      SELECT * FROM cash_register_closures
      WHERE school_id = v_config.school_id
        AND closure_date = CURRENT_DATE
        AND status = 'open'
    LOOP
      -- Cerrar automáticamente con el saldo esperado como saldo real
      UPDATE cash_register_closures
      SET
        status = 'auto_closed',
        closure_time = NOW(),
        actual_balance = expected_balance,
        difference = 0,
        notes = COALESCE(notes || ' ', '') || 'Cerrado automáticamente por el sistema.',
        updated_at = NOW()
      WHERE id = v_closure.id;
      
      v_closed_count := v_closed_count + 1;
      
      -- Log de auditoría
      INSERT INTO audit_logs (
        action_type,
        table_name,
        record_id,
        school_id,
        user_id,
        details,
        created_at
      ) VALUES (
        'auto_close',
        'cash_register_closures',
        v_closure.id,
        v_config.school_id,
        v_closure.closed_by, -- Usuario que abrió la caja
        json_build_object(
          'auto_close_time', v_config.auto_close_time,
          'expected_balance', v_closure.expected_balance,
          'closure_date', v_closure.closure_date
        ),
        NOW()
      );
    END LOOP;
  END LOOP;
  
  RETURN v_closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION auto_close_cash_registers() IS 
'Cierra automáticamente las cajas abiertas según la configuración de cada sede';

-- ============================================
-- FUNCIÓN PARA SINCRONIZAR VENTAS AL CIERRE
-- Actualiza los totales del cierre basándose en las ventas reales
-- ============================================
CREATE OR REPLACE FUNCTION sync_closure_with_sales(p_closure_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_closure RECORD;
  v_pos_totals RECORD;
  v_lunch_totals RECORD;
BEGIN
  -- Obtener el cierre
  SELECT * INTO v_closure
  FROM cash_register_closures
  WHERE id = p_closure_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cierre no encontrado';
  END IF;
  
  -- Calcular totales de POS
  SELECT
    COALESCE(SUM(CASE WHEN payment_method = 'cash' AND payment_type = 'single' THEN amount ELSE 0 END), 0) AS pos_cash,
    COALESCE(SUM(CASE WHEN payment_method = 'card' AND payment_type = 'single' THEN amount ELSE 0 END), 0) AS pos_card,
    COALESCE(SUM(CASE WHEN payment_method = 'yape' AND payment_type = 'single' THEN amount ELSE 0 END), 0) AS pos_yape,
    COALESCE(SUM(CASE WHEN payment_method = 'yape_qr' AND payment_type = 'single' THEN amount ELSE 0 END), 0) AS pos_yape_qr,
    COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN amount ELSE 0 END), 0) AS pos_credit,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' AND payment_type = 'mixed' THEN cash_amount ELSE 0 END), 0) AS pos_mixed_cash,
    COALESCE(SUM(CASE WHEN payment_method = 'card' AND payment_type = 'mixed' THEN card_amount ELSE 0 END), 0) AS pos_mixed_card,
    COALESCE(SUM(CASE WHEN payment_method = 'yape' AND payment_type = 'mixed' THEN yape_amount ELSE 0 END), 0) AS pos_mixed_yape
  INTO v_pos_totals
  FROM pos_sales
  WHERE school_id = v_closure.school_id
    AND DATE(created_at) = v_closure.closure_date
    AND status = 'completed';
  
  -- Calcular totales de almuerzos
  SELECT
    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN price ELSE 0 END), 0) AS lunch_cash,
    COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN price ELSE 0 END), 0) AS lunch_credit
  INTO v_lunch_totals
  FROM lunch_orders
  WHERE school_id = v_closure.school_id
    AND DATE(order_date) = v_closure.closure_date
    AND is_cancelled = FALSE;
  
  -- Actualizar el cierre
  UPDATE cash_register_closures
  SET
    pos_cash = v_pos_totals.pos_cash,
    pos_card = v_pos_totals.pos_card,
    pos_yape = v_pos_totals.pos_yape,
    pos_yape_qr = v_pos_totals.pos_yape_qr,
    pos_credit = v_pos_totals.pos_credit,
    pos_mixed_cash = v_pos_totals.pos_mixed_cash,
    pos_mixed_card = v_pos_totals.pos_mixed_card,
    pos_mixed_yape = v_pos_totals.pos_mixed_yape,
    lunch_cash = v_lunch_totals.lunch_cash,
    lunch_credit = v_lunch_totals.lunch_credit,
    updated_at = NOW()
  WHERE id = p_closure_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_closure_with_sales(UUID) IS 
'Sincroniza los totales del cierre con las ventas reales del día';

-- ============================================
-- TRIGGER PARA SINCRONIZAR AUTOMÁTICAMENTE
-- ============================================
CREATE OR REPLACE FUNCTION trg_sync_closure_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar cierre abierto del día
  PERFORM sync_closure_with_sales(id)
  FROM cash_register_closures
  WHERE school_id = NEW.school_id
    AND closure_date = CURRENT_DATE
    AND status = 'open'
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger en pos_sales
DROP TRIGGER IF EXISTS trg_sync_pos_to_closure ON pos_sales;
CREATE TRIGGER trg_sync_pos_to_closure
  AFTER INSERT OR UPDATE ON pos_sales
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION trg_sync_closure_on_sale();

-- Aplicar trigger en lunch_orders
DROP TRIGGER IF EXISTS trg_sync_lunch_to_closure ON lunch_orders;
CREATE TRIGGER trg_sync_lunch_to_closure
  AFTER INSERT OR UPDATE ON lunch_orders
  FOR EACH ROW
  WHEN (NEW.is_cancelled = FALSE)
  EXECUTE FUNCTION trg_sync_closure_on_sale();
