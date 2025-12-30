-- ========================================================
-- ELIMINAR USUARIOS COMPLETO (auth.users + profiles)
-- ========================================================
-- Usa este script cuando el botón de eliminar no funcione
-- completamente o cuando veas "User already registered"
-- ========================================================

-- PASO 1: VER USUARIOS HUÉRFANOS
-- (Usuarios que existen en auth.users pero NO en profiles)
-- ========================================================

SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    'HUÉRFANO (no tiene profile)' AS status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- ========================================================
-- PASO 2: ELIMINAR USUARIO ESPECÍFICO
-- ========================================================
-- REEMPLAZA 'cajero1@limacafe28.com' con el email del usuario

-- Opción A: Por email (recomendado)
DELETE FROM auth.users
WHERE email = 'cajero1@limacafe28.com';

-- Opción B: Por ID
-- DELETE FROM auth.users
-- WHERE id = 'usuario-id-aqui';

-- ========================================================
-- PASO 3: ELIMINAR MÚLTIPLES USUARIOS DE UNA VEZ
-- ========================================================

DELETE FROM auth.users
WHERE email IN (
    'cajero1@limacafe28.com',
    'cajero2@limacafe28.com',
    'usuario3@limacafe28.com'
);

-- ========================================================
-- PASO 4: VERIFICAR QUE SE ELIMINARON
-- ========================================================

SELECT COUNT(*) as usuarios_huerfanos
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
AND au.email LIKE '%limacafe28.com%';

-- Si muestra 0, ¡perfecto! Ya puedes crear los usuarios de nuevo

-- ========================================================
-- LIMPIEZA MASIVA (¡CUIDADO!)
-- ========================================================
-- Elimina TODOS los usuarios huérfanos (sin profile)
-- Solo ejecuta esto si estás SEGURO

/*
DELETE FROM auth.users
WHERE id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
    AND au.email LIKE '%limacafe28.com%'
);
*/

-- ========================================================
-- SOLUCIÓN AL ERROR "User already registered"
-- ========================================================
-- Si al crear un usuario te sale ese error:
-- 1. Copia el email que intentas crear
-- 2. Ejecuta:

-- DELETE FROM auth.users WHERE email = 'email-del-error@limacafe28.com';

-- 3. Intenta crear el usuario de nuevo

-- ========================================================
-- NOTAS IMPORTANTES
-- ========================================================
/*
⚠️ ADVERTENCIAS:
- Esta eliminación es PERMANENTE
- No se puede recuperar
- Asegúrate de eliminar los emails correctos

✅ CUÁNDO USAR ESTE SCRIPT:
- Error "User already registered"
- Usuarios que no aparecen en "Gestión de Usuarios"
- Usuarios eliminados con 🗑️ que siguen existiendo

💡 ALTERNATIVA:
- En lugar de eliminar y recrear
- Usa el botón ✏️ (Editar Rol) para cambiar el rol
*/

