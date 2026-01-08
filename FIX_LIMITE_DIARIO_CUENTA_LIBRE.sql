-- =====================================================
-- SCRIPT: FIX LÍMITE DIARIO PARA CUENTA LIBRE
-- Fecha: 2026-01-08
-- Descripción: Corregir validación de límite diario para que NO aplique en cuenta libre
-- =====================================================

-- 1. ELIMINAR TRIGGER Y FUNCIONES ANTIGUAS (si existen)
DROP TRIGGER IF EXISTS trigger_validate_daily_limit ON transactions;
DROP TRIGGER IF EXISTS trigger_check_daily_limit ON transactions;
DROP TRIGGER IF EXISTS check_limit_trigger ON transactions;
DROP FUNCTION IF EXISTS validate_daily_limit() CASCADE;
DROP FUNCTION IF EXISTS check_daily_limit() CASCADE;

-- 2. CREAR FUNCIÓN ACTUALIZADA que respete free_account
CREATE OR REPLACE FUNCTION validate_daily_limit()
RETURNS TRIGGER AS $$
DECLARE
  student_daily_limit NUMERIC;
  student_free_account BOOLEAN;
  today_consumption NUMERIC;
  new_consumption NUMERIC;
BEGIN
  -- Solo validar si es una compra (purchase o charge)
  IF NEW.type IN ('purchase', 'charge') AND NEW.student_id IS NOT NULL THEN
    
    -- Obtener datos del estudiante
    SELECT daily_limit, free_account 
    INTO student_daily_limit, student_free_account
    FROM students
    WHERE id = NEW.student_id;
    
    -- 🔥 SI TIENE CUENTA LIBRE, NO VALIDAR LÍMITE
    IF student_free_account = true THEN
      RETURN NEW;
    END IF;
    
    -- Si no tiene cuenta libre Y tiene límite diario configurado, validar
    IF student_daily_limit IS NOT NULL AND student_daily_limit > 0 THEN
      -- Calcular consumo del día (sin contar la transacción actual)
      SELECT COALESCE(SUM(ABS(amount)), 0)
      INTO today_consumption
      FROM transactions
      WHERE student_id = NEW.student_id
        AND type IN ('purchase', 'charge')
        AND DATE(created_at) = CURRENT_DATE
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
      
      -- Consumo de esta transacción
      new_consumption := ABS(NEW.amount);
      
      -- Validar que no exceda el límite
      IF (today_consumption + new_consumption) > student_daily_limit THEN
        RAISE EXCEPTION 'LÍMITE DIARIO EXCEDIDO. El alumno tiene un tope de S/ % y ya gastó S/ % hoy.', 
          student_daily_limit, today_consumption;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CREAR TRIGGER ACTUALIZADO
CREATE TRIGGER trigger_validate_daily_limit
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_daily_limit();

-- 4. VERIFICACIÓN
SELECT 
  '✅ Trigger actualizado correctamente' as status,
  'Ahora respeta free_account = true (sin límite diario)' as nota;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

