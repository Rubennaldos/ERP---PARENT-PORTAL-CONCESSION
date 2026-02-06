-- 💰 AGREGAR PERMISO DE CIERRE DE CAJA (Estructura Real)
-- Basado en: permissions (id, module, action, name, description)

DO $$
DECLARE
  v_permission_id UUID;
BEGIN
  -- Buscar si ya existe el permiso
  SELECT id INTO v_permission_id
  FROM permissions
  WHERE module = 'cash_register' AND action = 'access';

  -- Si no existe, crearlo
  IF v_permission_id IS NULL THEN
    INSERT INTO permissions (module, action, name, description, created_at)
    VALUES (
      'cash_register',
      'access',
      'Cierre de Caja',
      'Acceso completo al módulo de Cierre de Caja',
      NOW()
    )
    RETURNING id INTO v_permission_id;
    
    RAISE NOTICE '✅ Permiso creado: %', v_permission_id;
  ELSE
    RAISE NOTICE 'ℹ️ Permiso ya existe: %', v_permission_id;
  END IF;

  -- Asignar a Admin General
  IF NOT EXISTS (
    SELECT 1 FROM role_permissions 
    WHERE role = 'admin_general' AND permission_id = v_permission_id
  ) THEN
    INSERT INTO role_permissions (role, permission_id, granted, created_at)
    VALUES ('admin_general', v_permission_id, true, NOW());
    RAISE NOTICE '✅ Permiso asignado a admin_general';
  END IF;

  -- Asignar a Admin por Sede
  IF NOT EXISTS (
    SELECT 1 FROM role_permissions 
    WHERE role = 'admin' AND permission_id = v_permission_id
  ) THEN
    INSERT INTO role_permissions (role, permission_id, granted, created_at)
    VALUES ('admin', v_permission_id, true, NOW());
    RAISE NOTICE '✅ Permiso asignado a admin';
  END IF;

  -- Asignar a Operador de Caja
  IF NOT EXISTS (
    SELECT 1 FROM role_permissions 
    WHERE role = 'operador_caja' AND permission_id = v_permission_id
  ) THEN
    INSERT INTO role_permissions (role, permission_id, granted, created_at)
    VALUES ('operador_caja', v_permission_id, true, NOW());
    RAISE NOTICE '✅ Permiso asignado a operador_caja';
  END IF;

  RAISE NOTICE '🎉 Configuración completada exitosamente';

END $$;

-- Verificar resultado
SELECT 
  rp.role,
  p.module,
  p.action,
  p.name,
  p.description,
  rp.granted
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.module = 'cash_register'
ORDER BY rp.role;

-- Mensaje final
SELECT '✅ Módulo de Cierre de Caja configurado correctamente' as message;
