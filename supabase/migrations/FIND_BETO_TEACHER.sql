-- Buscar profesor "Beto naldos prueba"
SELECT 
  id,
  full_name,
  email,
  balance,
  school_id,
  (SELECT name FROM schools WHERE id = teacher_profiles.school_id) as sede_nombre
FROM teacher_profiles
WHERE LOWER(full_name) LIKE '%beto%naldos%';

-- Ver todas las transacciones de este profesor
SELECT 
  t.id,
  t.ticket_code,
  t.created_at,
  t.amount,
  t.type,
  t.teacher_id,
  tp.full_name as profesor_nombre,
  tp.email as profesor_email,
  p.email as cajero_email,
  p.full_name as cajero_nombre
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE tp.full_name ILIKE '%beto%naldos%'
ORDER BY t.created_at DESC
LIMIT 10;
