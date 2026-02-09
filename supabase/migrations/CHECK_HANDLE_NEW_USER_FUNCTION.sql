-- Ver la función que crea perfiles automáticamente
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  OR routine_name LIKE '%new_user%';

-- Ver detalles de la función
\df+ handle_new_user

-- Ver el código completo de la función
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user';
