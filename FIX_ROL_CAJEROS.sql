-- FIX: Verificar y corregir trigger de creación de perfiles
-- ========================================================

-- 1. Ver si existe un trigger que crea perfiles automáticamente
SELECT tgname, tgtype, tgrelid::regclass
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;

-- 2. Ver la definición del trigger (si existe)
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname LIKE '%handle_new_user%';

-- 3. Si los cajeros se crearon como 'parent', corrígelos manualmente
-- (Ejecuta esto después de crear los cajeros desde la UI)

-- Listar cajeros creados incorrectamente
SELECT id, email, role, school_id
FROM profiles
WHERE role = 'parent' 
AND email LIKE '%limacafe28.com%'
AND email NOT LIKE 'user-%';

-- 4. Corregir roles manualmente (SOLO SI CONFIRMAS QUE SON CAJEROS)
-- REEMPLAZA LOS EMAILS CON LOS CORRECTOS

-- Ejemplo:
-- UPDATE profiles 
-- SET role = 'pos', 
--     school_id = (SELECT id FROM schools WHERE code = 'NRD'), 
--     pos_number = 1,
--     ticket_prefix = 'FN1'
-- WHERE email = 'cajero1@limacafe28.com';

-- 5. Verificar que las políticas RLS permitan UPDATE
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
AND cmd = 'UPDATE';

