-- ============================================
-- BUSCAR USUARIOS CON ROL DE CAJERA
-- ============================================

-- Ver todas las tablas que tengan "user" o "role" en el nombre
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%user%' OR table_name ILIKE '%role%')
ORDER BY table_name;

-- Buscar en la tabla auth.users (usuarios del sistema)
SELECT 
    u.id,
    u.email,
    u.created_at
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 10;
