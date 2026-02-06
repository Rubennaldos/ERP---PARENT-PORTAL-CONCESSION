-- 🔧 AGREGAR MÓDULO DE CIERRE DE CAJA (Versión Compatible)
-- Este script detecta automáticamente la estructura de las tablas

DO $$
DECLARE
  v_has_module_code BOOLEAN;
  v_module_id UUID;
BEGIN
  -- Verificar si existe la columna module_code o module_id
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'modules' 
      AND column_name = 'code'
  ) INTO v_has_module_code;

  IF v_has_module_code THEN
    -- ============================================
    -- OPCIÓN 1: Estructura con CODE (VARCHAR)
    -- ============================================
    RAISE NOTICE 'Usando estructura con module_code (VARCHAR)';
    
    -- Insertar módulo
    INSERT INTO modules (code, name, description, icon, color, route, is_active, status, display_order)
    VALUES ('cierre_caja', 'Cierre de Caja', 'Gestión de caja, ingresos, egresos y cierre diario', 
            'DollarSign', 'green', '/cash-register', true, 'functional', 8)
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = NOW();

    -- Insertar acciones
    INSERT INTO module_actions (module_code, action_code, name, description) VALUES
      ('cierre_caja', 'ver_modulo', 'Ver módulo', 'Permite ver el módulo de cierre de caja'),
      ('cierre_caja', 'abrir_caja', 'Abrir caja', 'Permite abrir la caja del día'),
      ('cierre_caja', 'ver_dashboard', 'Ver dashboard', 'Ver resumen de ventas y movimientos'),
      ('cierre_caja', 'registrar_ingreso', 'Registrar ingreso', 'Registrar ingresos de efectivo'),
      ('cierre_caja', 'registrar_egreso', 'Registrar egreso', 'Registrar egresos de efectivo'),
      ('cierre_caja', 'cerrar_caja', 'Cerrar caja', 'Realizar el cierre de caja del día'),
      ('cierre_caja', 'ver_historial', 'Ver historial', 'Consultar cierres anteriores'),
      ('cierre_caja', 'imprimir', 'Imprimir reportes', 'Imprimir comprobantes y reportes'),
      ('cierre_caja', 'exportar', 'Exportar datos', 'Exportar a Excel/CSV'),
      ('cierre_caja', 'configurar', 'Configurar módulo', 'Cambiar configuración del sistema de caja')
    ON CONFLICT (module_code, action_code) DO NOTHING;

    -- Permisos Admin General
    INSERT INTO role_permissions (role, module_code, action_code, can_access)
    SELECT 'admin_general', 'cierre_caja', action_code, true
    FROM module_actions
    WHERE module_code = 'cierre_caja'
    ON CONFLICT (role, module_code, action_code) DO UPDATE SET can_access = true;

    -- Permisos Admin por Sede
    INSERT INTO role_permissions (role, module_code, action_code, can_access)
    SELECT 'admin', 'cierre_caja', action_code, true
    FROM module_actions
    WHERE module_code = 'cierre_caja'
    ON CONFLICT (role, module_code, action_code) DO UPDATE SET can_access = true;

    -- Permisos Operador de Caja
    INSERT INTO role_permissions (role, module_code, action_code, can_access)
    VALUES 
      ('operador_caja', 'cierre_caja', 'ver_modulo', true),
      ('operador_caja', 'cierre_caja', 'abrir_caja', true),
      ('operador_caja', 'cierre_caja', 'ver_dashboard', true),
      ('operador_caja', 'cierre_caja', 'registrar_ingreso', true),
      ('operador_caja', 'cierre_caja', 'registrar_egreso', true),
      ('operador_caja', 'cierre_caja', 'cerrar_caja', true),
      ('operador_caja', 'cierre_caja', 'ver_historial', true),
      ('operador_caja', 'cierre_caja', 'imprimir', true),
      ('operador_caja', 'cierre_caja', 'exportar', true),
      ('operador_caja', 'cierre_caja', 'configurar', false)
    ON CONFLICT (role, module_code, action_code) DO UPDATE SET can_access = EXCLUDED.can_access;

  ELSE
    -- ============================================
    -- OPCIÓN 2: Estructura con ID (UUID)
    -- ============================================
    RAISE NOTICE 'Usando estructura con module_id (UUID)';
    
    -- Insertar módulo y obtener su ID
    INSERT INTO modules (name, description, icon, color, route, is_active, status, display_order)
    VALUES ('Cierre de Caja', 'Gestión de caja, ingresos, egresos y cierre diario', 
            'DollarSign', 'green', '/cash-register', true, 'functional', 8)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_module_id;

    -- Si ya existía, obtener el ID
    IF v_module_id IS NULL THEN
      SELECT id INTO v_module_id 
      FROM modules 
      WHERE name = 'Cierre de Caja' 
      LIMIT 1;
    END IF;

    -- Insertar acciones (asumiendo que tiene module_id)
    INSERT INTO module_actions (module_id, name, description, action_key) VALUES
      (v_module_id, 'Ver módulo', 'Permite ver el módulo de cierre de caja', 'ver_modulo'),
      (v_module_id, 'Abrir caja', 'Permite abrir la caja del día', 'abrir_caja'),
      (v_module_id, 'Ver dashboard', 'Ver resumen de ventas y movimientos', 'ver_dashboard'),
      (v_module_id, 'Registrar ingreso', 'Registrar ingresos de efectivo', 'registrar_ingreso'),
      (v_module_id, 'Registrar egreso', 'Registrar egresos de efectivo', 'registrar_egreso'),
      (v_module_id, 'Cerrar caja', 'Realizar el cierre de caja del día', 'cerrar_caja'),
      (v_module_id, 'Ver historial', 'Consultar cierres anteriores', 'ver_historial'),
      (v_module_id, 'Imprimir reportes', 'Imprimir comprobantes y reportes', 'imprimir'),
      (v_module_id, 'Exportar datos', 'Exportar a Excel/CSV', 'exportar'),
      (v_module_id, 'Configurar módulo', 'Cambiar configuración del sistema de caja', 'configurar')
    ON CONFLICT DO NOTHING;

    -- Permisos (asumiendo estructura con module_id)
    INSERT INTO role_permissions (role, module_id, action_id, can_access)
    SELECT 'admin_general', v_module_id, ma.id, true
    FROM module_actions ma
    WHERE ma.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role, module_id, action_id, can_access)
    SELECT 'admin', v_module_id, ma.id, true
    FROM module_actions ma
    WHERE ma.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role, module_id, action_id, can_access)
    SELECT 
      'operador_caja', 
      v_module_id, 
      ma.id, 
      CASE WHEN ma.action_key = 'configurar' THEN false ELSE true END
    FROM module_actions ma
    WHERE ma.module_id = v_module_id
    ON CONFLICT DO NOTHING;

  END IF;

  RAISE NOTICE '✅ Módulo de Cierre de Caja agregado exitosamente';

END $$;

-- Verificar resultado
SELECT 
  m.name as modulo,
  COUNT(ma.id) as acciones,
  COUNT(DISTINCT rp.role) as roles_asignados
FROM modules m
LEFT JOIN module_actions ma ON (
  (m.code IS NOT NULL AND ma.module_code = m.code) OR
  (m.id IS NOT NULL AND ma.module_id = m.id)
)
LEFT JOIN role_permissions rp ON (
  (m.code IS NOT NULL AND rp.module_code = m.code) OR
  (m.id IS NOT NULL AND rp.module_id = m.id)
)
WHERE m.name = 'Cierre de Caja' OR (m.code IS NOT NULL AND m.code = 'cierre_caja')
GROUP BY m.name;
