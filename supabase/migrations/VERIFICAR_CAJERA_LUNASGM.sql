-- ============================================
-- VERIFICAR CAJERA: lunasgm@limacafe28.com
-- ============================================

-- 1. Buscar el usuario en auth.users
SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE email = 'lunasgm@limacafe28.com';

-- 2. Buscar en teacher_profiles por email personal
SELECT 
    tp.id,
    tp.full_name,
    tp.personal_email,
    tp.school_id_1,
    tp.school_id_2,
    s1.name as escuela_1,
    s2.name as escuela_2
FROM teacher_profiles tp
LEFT JOIN schools s1 ON tp.school_id_1 = s1.id
LEFT JOIN schools s2 ON tp.school_id_2 = s2.id
WHERE tp.personal_email = 'lunasgm@limacafe28.com';

-- 3. Ver los pedidos de Miraflores del 06/02 (para confirmar que existen)
SELECT 
    lo.id,
    lo.order_date,
    lo.status,
    lo.school_id,
    s.name as nombre_escuela,
    COALESCE(st.full_name, tp.full_name, lo.manual_name) as nombre
FROM lunch_orders lo
LEFT JOIN schools s ON lo.school_id = s.id
LEFT JOIN students st ON lo.student_id = st.id
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE lo.school_id = '2a50533d-7fc1-4096-80a7-e20a41bda5a0'
  AND lo.order_date = '2026-02-06'
  AND lo.is_cancelled = false
ORDER BY lo.created_at;
