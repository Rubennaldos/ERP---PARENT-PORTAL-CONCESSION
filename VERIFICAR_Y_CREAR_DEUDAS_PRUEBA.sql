-- ============================================
-- VERIFICAR Y CREAR DEUDAS DE PRUEBA
-- ============================================

-- 1. Ver transacciones pendientes actuales
SELECT 
  s.full_name,
  s.free_account,
  COUNT(t.id) as deudas_pendientes,
  SUM(ABS(t.amount)) as total_deuda
FROM students s
LEFT JOIN transactions t ON t.student_id = s.id 
  AND t.payment_status = 'pending' 
  AND t.type = 'purchase'
GROUP BY s.id, s.full_name, s.free_account
ORDER BY s.full_name;

-- 2. Crear transacciones de prueba para estudiantes sin deudas
-- (Ejecuta esto solo si quieres agregar deudas de prueba)

DO $$
DECLARE
  student_record RECORD;
BEGIN
  -- Para cada estudiante activo
  FOR student_record IN 
    SELECT id, full_name, school_id 
    FROM students 
    WHERE is_active = true
    LIMIT 3  -- Solo los primeros 3 estudiantes
  LOOP
    -- Insertar 2-3 transacciones de compra pendientes
    INSERT INTO transactions (
      student_id,
      school_id,
      type,
      amount,
      description,
      payment_status,
      balance_after,
      created_at
    ) VALUES 
    (
      student_record.id,
      student_record.school_id,
      'purchase',
      -5.50,
      'Almuerzo del día',
      'pending',
      0,
      NOW() - INTERVAL '3 days'
    ),
    (
      student_record.id,
      student_record.school_id,
      'purchase',
      -3.00,
      'Snack - Galletas y jugo',
      'pending',
      0,
      NOW() - INTERVAL '1 day'
    ),
    (
      student_record.id,
      student_record.school_id,
      'purchase',
      -4.50,
      'Almuerzo completo',
      'pending',
      0,
      NOW() - INTERVAL '5 hours'
    );

    RAISE NOTICE 'Creadas 3 deudas para: %', student_record.full_name;
  END LOOP;
END $$;

-- 3. Verificar nuevamente
SELECT 
  s.full_name,
  s.free_account,
  COUNT(t.id) as deudas_pendientes,
  SUM(ABS(t.amount)) as total_deuda
FROM students s
LEFT JOIN transactions t ON t.student_id = s.id 
  AND t.payment_status = 'pending' 
  AND t.type = 'purchase'
GROUP BY s.id, s.full_name, s.free_account
ORDER BY s.full_name;
