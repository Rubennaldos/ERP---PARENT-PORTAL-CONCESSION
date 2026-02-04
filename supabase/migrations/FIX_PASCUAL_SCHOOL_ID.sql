-- =====================================================
-- VERIFICAR school_id DE LA TRANSACCIÓN DE PASCUAL VIVANCO
-- =====================================================

-- 1. Ver la transacción completa de Pascual
SELECT 
  t.id,
  t.type,
  t.payment_status,
  t.amount,
  t.description,
  t.school_id,
  s.name as school_name,
  t.teacher_id,
  tp.full_name as teacher_name,
  tp.school_id_1 as teacher_school_id,
  t.created_at
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name ILIKE '%Pascual%'
  AND t.created_at >= '2026-02-03';

-- 2. Ver el school_id del usuario admin que está viendo Cobranzas
-- (Ejecuta esto en tu sesión)
SELECT 
  id,
  email,
  school_id
FROM profiles
WHERE email = 'adminjbl@limacafe28.com'; -- Cambia por el email del admin actual

-- 3. ARREGLAR: Actualizar school_id de la transacción si está NULL
UPDATE transactions t
SET school_id = tp.school_id_1
FROM teacher_profiles tp
WHERE t.teacher_id = tp.id
  AND t.school_id IS NULL
  AND t.type = 'purchase'
  AND tp.school_id_1 IS NOT NULL;

-- 4. Verificar después del fix
SELECT 
  t.id,
  t.school_id,
  s.name as school_name,
  tp.full_name as teacher_name,
  t.amount,
  t.payment_status
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name ILIKE '%Pascual%'
  AND t.created_at >= '2026-02-03';
