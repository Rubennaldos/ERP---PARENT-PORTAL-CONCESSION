-- =====================================================
-- 🔍 DIAGNÓSTICO: Admin no ve padres ni profesores
-- =====================================================

-- PASO 1: Verificar usuario y su sede
-- Reemplaza 'adminjbl@limacafe28.com' con el email del admin que tiene el problema
SELECT 
  p.id as user_id,
  p.email,
  p.role,
  p.school_id,
  s.name as school_name,
  s.code as school_code
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.email = 'adminjbl@limacafe28.com';

-- PASO 2: Verificar permisos del rol
SELECT 
  rp.role,
  perm.module,
  perm.action,
  perm.name,
  rp.granted
FROM role_permissions rp
INNER JOIN permissions perm ON perm.id = rp.permission_id
WHERE rp.role = 'gestor_unidad'  -- o el rol que tenga el admin
  AND perm.module = 'config_padres'
ORDER BY perm.action;

-- PASO 3: Verificar estudiantes en la sede
-- Reemplaza el school_id con el de Jean LeBouch
SELECT 
  COUNT(*) as total_students,
  s.school_id,
  sc.name as school_name
FROM students s
INNER JOIN schools sc ON sc.id = s.school_id
WHERE s.school_id = (
  SELECT school_id 
  FROM profiles 
  WHERE email = 'adminjbl@limacafe28.com'
)
GROUP BY s.school_id, sc.name;

-- PASO 4: Verificar padres vinculados a estudiantes de la sede
SELECT 
  COUNT(DISTINCT s.parent_id) as total_parent_ids,
  s.school_id,
  sc.name as school_name
FROM students s
INNER JOIN schools sc ON sc.id = s.school_id
WHERE s.school_id = (
  SELECT school_id 
  FROM profiles 
  WHERE email = 'adminjbl@limacafe28.com'
)
  AND s.parent_id IS NOT NULL
GROUP BY s.school_id, sc.name;

-- PASO 5: Verificar parent_profiles que deberían verse
SELECT 
  pp.id,
  pp.full_name,
  pp.dni,
  pp.user_id,
  pp.school_id as parent_school_id,
  pp.created_at
FROM parent_profiles pp
WHERE pp.user_id IN (
  SELECT DISTINCT s.parent_id
  FROM students s
  WHERE s.school_id = (
    SELECT school_id 
    FROM profiles 
    WHERE email = 'adminjbl@limacafe28.com'
  )
  AND s.parent_id IS NOT NULL
)
ORDER BY pp.full_name;

-- PASO 6: Verificar teacher_profiles en la sede
SELECT 
  tp.id,
  tp.full_name,
  tp.dni,
  tp.school_id_1,
  s1.name as school_1_name,
  tp.school_id_2,
  s2.name as school_2_name,
  tp.created_at
FROM teacher_profiles tp
LEFT JOIN schools s1 ON s1.id = tp.school_id_1
LEFT JOIN schools s2 ON s2.id = tp.school_id_2
WHERE tp.school_id_1 = (
  SELECT school_id 
  FROM profiles 
  WHERE email = 'adminjbl@limacafe28.com'
)
OR tp.school_id_2 = (
  SELECT school_id 
  FROM profiles 
  WHERE email = 'adminjbl@limacafe28.com'
)
ORDER BY tp.full_name;

-- PASO 7: Verificar RLS policies activas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('parent_profiles', 'teacher_profiles', 'students')
ORDER BY tablename, policyname;

-- PASO 8: Prueba de consulta como si fuera el admin
-- Esta query simula lo que hace el frontend
DO $$
DECLARE
  admin_school_id uuid;
  student_count int;
  parent_ids_count int;
  rec RECORD;
BEGIN
  -- Obtener school_id del admin
  SELECT school_id INTO admin_school_id
  FROM profiles
  WHERE email = 'adminjbl@limacafe28.com';
  
  RAISE NOTICE 'School ID del admin: %', admin_school_id;
  
  -- Contar estudiantes en esa sede
  SELECT COUNT(*) INTO student_count
  FROM students
  WHERE school_id = admin_school_id;
  
  RAISE NOTICE 'Estudiantes en la sede: %', student_count;
  
  -- Contar parent_ids únicos
  SELECT COUNT(DISTINCT parent_id) INTO parent_ids_count
  FROM students
  WHERE school_id = admin_school_id
    AND parent_id IS NOT NULL;
  
  RAISE NOTICE 'Parent IDs únicos: %', parent_ids_count;
  
  -- Mostrar los parent_profiles que deberían verse
  RAISE NOTICE 'Padres que deberían verse:';
  FOR rec IN (
    SELECT pp.full_name, pp.dni
    FROM parent_profiles pp
    WHERE pp.user_id IN (
      SELECT DISTINCT parent_id
      FROM students
      WHERE school_id = admin_school_id
        AND parent_id IS NOT NULL
    )
    LIMIT 10
  ) LOOP
    RAISE NOTICE '  - %: %', rec.full_name, rec.dni;
  END LOOP;
END $$;

-- =====================================================
-- 💡 INTERPRETACIÓN DE RESULTADOS
-- =====================================================

/*
PASO 1: Debe mostrar el admin con su school_id correcto
  ✅ Si aparece con school_id → Bien
  ❌ Si school_id es NULL → PROBLEMA: Asignar sede al admin

PASO 2: Debe mostrar permisos de config_padres
  ✅ Si aparecen permisos → Bien
  ❌ Si no hay permisos → PROBLEMA: Falta configurar permisos

PASO 3: Debe mostrar estudiantes en la sede
  ✅ Si hay estudiantes → Bien
  ❌ Si no hay estudiantes → PROBLEMA: No hay estudiantes en esa sede

PASO 4: Debe mostrar parent_ids
  ✅ Si hay parent_ids → Bien
  ❌ Si no hay parent_ids → PROBLEMA: Estudiantes no tienen parent_id asignado

PASO 5: Debe mostrar los parent_profiles
  ✅ Si aparecen padres → Bien
  ❌ Si no aparecen → PROBLEMA: Verifica RLS policies

PASO 6: Debe mostrar profesores de la sede
  ✅ Si aparecen profesores → Bien
  ❌ Si no aparecen → PROBLEMA: Profesores no tienen school_id_1 o school_id_2

PASO 7: Muestra las RLS policies
  Verifica que las policies permitan SELECT para el rol del admin

PASO 8: Simulación completa
  Los mensajes NOTICE mostrarán lo que debería ver el admin
*/
