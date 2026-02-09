-- Buscar profesor "Beto naldos prueba"
SELECT 
  id,
  full_name,
  dni,
  corporate_email,
  personal_email,
  phone_1,
  corporate_phone,
  balance,
  school_id_1,
  (SELECT name FROM schools WHERE id = teacher_profiles.school_id_1) as sede_1,
  school_id_2,
  (SELECT name FROM schools WHERE id = teacher_profiles.school_id_2) as sede_2,
  is_active,
  created_at
FROM teacher_profiles
WHERE LOWER(full_name) LIKE '%beto%naldos%';

-- Ver todas las transacciones de este profesor
SELECT 
  t.id,
  t.ticket_code,
  t.created_at,
  DATE(t.created_at) as fecha,
  TO_CHAR(t.created_at, 'HH24:MI:SS') as hora,
  t.amount,
  t.type,
  t.teacher_id,
  tp.full_name as profesor_nombre,
  tp.corporate_email as profesor_email_corporativo,
  tp.personal_email as profesor_email_personal,
  tp.balance as balance_profesor,
  p.email as cajero_email,
  p.full_name as cajero_nombre,
  s.name as sede_nombre
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools s ON t.school_id = s.id
WHERE tp.full_name ILIKE '%beto%naldos%'
ORDER BY t.created_at DESC
LIMIT 20;

-- Ver balance actual del profesor
SELECT 
  full_name,
  corporate_email,
  personal_email,
  balance,
  (SELECT name FROM schools WHERE id = teacher_profiles.school_id_1) as sede_principal,
  (SELECT name FROM schools WHERE id = teacher_profiles.school_id_2) as sede_secundaria,
  (SELECT COUNT(*) FROM transactions WHERE teacher_id = teacher_profiles.id) as total_transacciones,
  (SELECT SUM(amount) FROM transactions WHERE teacher_id = teacher_profiles.id AND type = 'purchase') as total_comprado
FROM teacher_profiles
WHERE LOWER(full_name) LIKE '%beto%naldos%';
