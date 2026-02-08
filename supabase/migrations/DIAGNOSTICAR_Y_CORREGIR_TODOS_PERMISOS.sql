-- 🔍 DIAGNÓSTICO Y CORRECCIÓN DE PERMISOS PARA TODOS LOS MÓDULOS
-- Este script identifica módulos sin permiso 'access' y los crea

-- ===================================================================
-- PASO 1: Ver qué módulos NO tienen permiso 'access'
-- ===================================================================
SELECT DISTINCT
  '⚠️ MÓDULOS SIN PERMISO ACCESS' as diagnostico,
  p.module
FROM permissions p
WHERE NOT EXISTS (
  SELECT 1 
  FROM permissions p2 
  WHERE p2.module = p.module 
    AND p2.action = 'access'
)
ORDER BY p.module;

-- ===================================================================
-- PASO 2: Ver permisos de GESTOR_UNIDAD para VENTAS (el que está fallando)
-- ===================================================================
SELECT 
  '🔍 Permisos de gestor_unidad para VENTAS' as info,
  p.module,
  p.action,
  p.name,
  rp.granted,
  CASE 
    WHEN rp.granted = true THEN '✅'
    WHEN rp.granted = false THEN '❌'
    ELSE '⚠️ NO ASIGNADO'
  END as estado
FROM permissions p
LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role = 'gestor_unidad'
WHERE p.module = 'ventas'
ORDER BY p.action;

-- ===================================================================
-- PASO 3: CREAR permiso 'access' para VENTAS si no existe
-- ===================================================================
DO $$
DECLARE
  v_ventas_access_perm_id UUID;
BEGIN
  -- Verificar si ya existe
  SELECT id INTO v_ventas_access_perm_id
  FROM permissions
  WHERE module = 'ventas' AND action = 'access';
  
  -- Si no existe, crearlo
  IF v_ventas_access_perm_id IS NULL THEN
    INSERT INTO permissions (module, action, name, description, created_at)
    VALUES (
      'ventas',
      'access',
      'Acceso al módulo de ventas',
      'Permite acceder al módulo de ventas',
      NOW()
    )
    RETURNING id INTO v_ventas_access_perm_id;
    
    RAISE NOTICE '✅ Permiso access para ventas CREADO con ID: %', v_ventas_access_perm_id;
  ELSE
    RAISE NOTICE '✅ Permiso access para ventas ya existe con ID: %', v_ventas_access_perm_id;
  END IF;
  
  -- Asignarlo a gestor_unidad, admin_general, admin, supervisor_red
  INSERT INTO role_permissions (role, permission_id, granted, created_at)
  VALUES 
    ('gestor_unidad', v_ventas_access_perm_id, true, NOW()),
    ('admin_general', v_ventas_access_perm_id, true, NOW()),
    ('admin', v_ventas_access_perm_id, true, NOW()),
    ('supervisor_red', v_ventas_access_perm_id, true, NOW())
  ON CONFLICT (role, permission_id) 
  DO UPDATE SET granted = true;
  
  RAISE NOTICE '✅ Permiso access asignado a gestor_unidad, admin_general, admin, supervisor_red';
END $$;

-- ===================================================================
-- PASO 4: CREAR permiso 'access' para TODOS los módulos que no lo tengan
-- ===================================================================
DO $$
DECLARE
  v_module TEXT;
  v_new_perm_id UUID;
BEGIN
  -- Iterar sobre cada módulo único que no tiene 'access'
  FOR v_module IN 
    SELECT DISTINCT p.module
    FROM permissions p
    WHERE NOT EXISTS (
      SELECT 1 
      FROM permissions p2 
      WHERE p2.module = p.module 
        AND p2.action = 'access'
    )
    ORDER BY p.module
  LOOP
    -- Crear el permiso 'access' para este módulo
    INSERT INTO permissions (module, action, name, description, created_at)
    VALUES (
      v_module,
      'access',
      'Acceso al módulo de ' || v_module,
      'Permite acceder al módulo de ' || v_module,
      NOW()
    )
    ON CONFLICT (module, action) DO NOTHING
    RETURNING id INTO v_new_perm_id;
    
    IF v_new_perm_id IS NOT NULL THEN
      RAISE NOTICE '✅ Permiso access creado para módulo: % (ID: %)', v_module, v_new_perm_id;
      
      -- Asignarlo automáticamente a admin_general
      INSERT INTO role_permissions (role, permission_id, granted, created_at)
      VALUES ('admin_general', v_new_perm_id, true, NOW())
      ON CONFLICT (role, permission_id) DO UPDATE SET granted = true;
      
      RAISE NOTICE '  ↳ Asignado a admin_general';
    END IF;
  END LOOP;
END $$;

-- ===================================================================
-- PASO 5: VERIFICACIÓN FINAL - Ver permisos de gestor_unidad para ventas
-- ===================================================================
SELECT 
  '✅ VERIFICACIÓN FINAL: Permisos de gestor_unidad para VENTAS' as resultado,
  p.module,
  p.action,
  rp.granted,
  CASE 
    WHEN rp.granted = true THEN '✅ ACTIVO'
    ELSE '❌ INACTIVO'
  END as estado
FROM permissions p
LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role = 'gestor_unidad'
WHERE p.module = 'ventas'
ORDER BY p.action;
