-- ============================================
-- BUSCAR CAJERA EN LA TABLA PROFILES
-- ============================================

-- Buscar usuario lunasgm en profiles
SELECT 
    p.id,
    p.email,
    p.role,
    p.school_id,
    p.pos_number,
    p.ticket_prefix,
    s.name as nombre_escuela,
    s.code as codigo
FROM profiles p
LEFT JOIN schools s ON p.school_id = s.id
WHERE p.email = 'lunasgm@limacafe28.com';

-- Ver TODOS los operadores de caja
SELECT 
    p.id,
    p.email,
    p.role,
    p.school_id,
    p.pos_number,
    s.name as nombre_escuela
FROM profiles p
LEFT JOIN schools s ON p.school_id = s.id
WHERE p.role = 'operador_caja'
ORDER BY p.created_at DESC;
