-- 💰 AGREGAR PERMISOS DE CIERRE DE CAJA (Versión Simple)
-- Este script asume que existe una tabla 'permissions' con los permisos base

-- ============================================
-- PASO 1: Verificar que existan las tablas base
-- ============================================
DO $$
BEGIN
  -- Verificar role_permissions existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    RAISE EXCEPTION 'La tabla role_permissions no existe';
  END IF;
  
  RAISE NOTICE '✅ Tabla role_permissions encontrada';
END $$;

-- ============================================
-- PASO 2: Crear permisos para Cierre de Caja
-- ============================================

-- Si existe tabla 'permissions', insertar los permisos ahí
DO $$
DECLARE
  v_permission_id UUID;
BEGIN
  -- Verificar si existe tabla permissions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    RAISE NOTICE 'Insertando en tabla permissions...';
    
    -- Insertar permiso base de cierre de caja
    INSERT INTO permissions (name, description, created_at)
    VALUES ('cash_register', 'Acceso al módulo de Cierre de Caja', NOW())
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_permission_id;
    
    -- Asignar a roles
    INSERT INTO role_permissions (role, permission_id, granted, created_at)
    VALUES 
      ('admin_general', v_permission_id, true, NOW()),
      ('admin', v_permission_id, true, NOW()),
      ('operador_caja', v_permission_id, true, NOW())
    ON CONFLICT (role, permission_id) DO UPDATE SET granted = true;
    
    RAISE NOTICE '✅ Permisos insertados exitosamente';
    
  ELSE
    -- Si no existe tabla permissions, agregar directamente a role_permissions
    RAISE NOTICE 'Tabla permissions no existe, creando estructura alternativa...';
    
    -- Crear tabla temporal de permisos si no existe
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Insertar permiso
    INSERT INTO permissions (name, description)
    VALUES ('cash_register', 'Acceso al módulo de Cierre de Caja')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_permission_id;
    
    -- Asignar a roles
    INSERT INTO role_permissions (role, permission_id, granted, created_at)
    VALUES 
      ('admin_general', v_permission_id, true, NOW()),
      ('admin', v_permission_id, true, NOW()),
      ('operador_caja', v_permission_id, true, NOW())
    ON CONFLICT (role, permission_id) DO UPDATE SET granted = true;
    
    RAISE NOTICE '✅ Estructura creada y permisos asignados';
  END IF;
END $$;

-- ============================================
-- PASO 3: Verificar permisos creados
-- ============================================
SELECT 
  rp.role,
  p.name as permission_name,
  p.description,
  rp.granted
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.name = 'cash_register'
ORDER BY rp.role;

-- ============================================
-- PASO 4: Actualizar el Dashboard para mostrar el módulo
-- ============================================

-- Si existe una tabla de 'modules' o 'menu_items', actualizar ahí
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
    INSERT INTO menu_items (name, route, icon, permission_required, display_order)
    VALUES ('Cierre de Caja', '/cash-register', 'DollarSign', 'cash_register', 8)
    ON CONFLICT (route) DO UPDATE SET name = EXCLUDED.name;
    RAISE NOTICE '✅ Módulo agregado al menú';
  END IF;
END $$;

-- Mensaje final
SELECT '✅ Permisos de Cierre de Caja configurados exitosamente' as message;
