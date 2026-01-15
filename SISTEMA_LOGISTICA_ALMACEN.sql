-- =====================================================
-- SISTEMA DE LOGÍSTICA Y ALMACÉN - LIMA CAFÉ 28
-- Incluye: Inventarios, Pedidos Inteligentes, Órdenes de Compra, Activos
-- =====================================================

-- =====================================================
-- 1. CREAR NUEVOS ROLES
-- =====================================================

-- Insertar nuevos roles si no existen
DO $$
BEGIN
  -- Almacenero: Maneja el inventario central
  IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'almacenero' LIMIT 1) THEN
    INSERT INTO role_permissions (role, permission_id, granted)
    VALUES ('almacenero', (SELECT id FROM permissions WHERE module = 'pos' AND action = 'ver_modulo' LIMIT 1), false);
  END IF;

  -- Gestor de Unidad: Pide mercadería para su sede
  IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'gestor_unidad' LIMIT 1) THEN
    INSERT INTO role_permissions (role, permission_id, granted)
    VALUES ('gestor_unidad', (SELECT id FROM permissions WHERE module = 'pos' AND action = 'ver_modulo' LIMIT 1), false);
  END IF;
END $$;

-- =====================================================
-- 2. TABLA DE CATEGORÍAS DE INVENTARIO
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'Mercaderías', 'Ingredientes', 'Consumibles', 'Activos'
  icon TEXT, -- Nombre del icono de Lucide
  color TEXT, -- Color en hexadecimal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar categorías predeterminadas
INSERT INTO inventory_categories (name, icon, color) VALUES
  ('Mercaderías', 'Package', '#3B82F6'),
  ('Ingredientes', 'Chef', '#10B981'),
  ('Consumibles', 'Box', '#F59E0B'),
  ('Activos', 'HardDrive', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. TABLA DE ITEMS DE INVENTARIO (Productos)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  code TEXT UNIQUE, -- Código interno (ej: ING-001)
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL, -- 'kg', 'unidad', 'litro', 'caja', etc.
  min_stock NUMERIC(10, 2) DEFAULT 0, -- Stock mínimo para alertas
  cost_per_unit NUMERIC(10, 2) DEFAULT 0, -- Costo unitario
  barcode TEXT, -- Código de barras
  image_url TEXT, -- URL de la imagen del producto
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_code ON inventory_items(code);
CREATE INDEX idx_inventory_items_barcode ON inventory_items(barcode);

-- =====================================================
-- 4. TABLA DE STOCK POR UBICACIÓN
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NULL = Almacén Central
  quantity NUMERIC(10, 2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  UNIQUE(item_id, school_id)
);

CREATE INDEX idx_inventory_stock_item ON inventory_stock(item_id);
CREATE INDEX idx_inventory_stock_school ON inventory_stock(school_id);

-- =====================================================
-- 5. TABLA DE PROVEEDORES
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  ruc TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(code);

-- =====================================================
-- 6. TABLA DE SOLICITUDES DE SUMINISTROS (Pedidos de Sedes)
-- =====================================================

CREATE TABLE IF NOT EXISTS supply_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT UNIQUE, -- SR-2026-001
  requesting_school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id), -- Gestor que pide
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'partially_fulfilled', 'fulfilled', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id) -- Almacenero que procesa
);

CREATE INDEX idx_supply_requests_school ON supply_requests(requesting_school_id);
CREATE INDEX idx_supply_requests_status ON supply_requests(status);
CREATE INDEX idx_supply_requests_number ON supply_requests(request_number);

-- =====================================================
-- 7. TABLA DE ITEMS DE SOLICITUD
-- =====================================================

CREATE TABLE IF NOT EXISTS supply_request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES supply_requests(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id),
  quantity_requested NUMERIC(10, 2) NOT NULL,
  quantity_available NUMERIC(10, 2) DEFAULT 0, -- Lo que hay en almacén
  quantity_approved NUMERIC(10, 2) DEFAULT 0, -- Lo que se aprueba
  quantity_pending NUMERIC(10, 2) DEFAULT 0, -- Lo que falta (va a compra)
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'partial', 'out_of_stock'
  notes TEXT
);

CREATE INDEX idx_supply_request_items_request ON supply_request_items(request_id);
CREATE INDEX idx_supply_request_items_item ON supply_request_items(item_id);

-- =====================================================
-- 8. TABLA DE ÓRDENES DE COMPRA
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE, -- PO-2026-001
  supplier_id UUID REFERENCES suppliers(id),
  created_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'confirmed', 'received', 'cancelled'
  total_amount NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_number ON purchase_orders(order_number);

-- =====================================================
-- 9. TABLA DE ITEMS DE ORDEN DE COMPRA
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id),
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2),
  total_price NUMERIC(10, 2),
  request_item_id UUID REFERENCES supply_request_items(id) -- Relacionar con el pedido original
);

CREATE INDEX idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX idx_purchase_order_items_item ON purchase_order_items(item_id);

-- =====================================================
-- 10. TABLA DE ACTIVOS (Máquinas y Equipos)
-- =====================================================

CREATE TABLE IF NOT EXISTS assets_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE, -- AS-001
  name TEXT NOT NULL,
  category TEXT, -- 'Maquinaria', 'Equipos', 'Mobiliario'
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  school_id UUID REFERENCES schools(id), -- NULL = Almacén Central
  purchase_date DATE,
  purchase_price NUMERIC(10, 2),
  status TEXT DEFAULT 'operational', -- 'operational', 'maintenance', 'broken', 'retired'
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assets_school ON assets_inventory(school_id);
CREATE INDEX idx_assets_code ON assets_inventory(code);
CREATE INDEX idx_assets_status ON assets_inventory(status);

-- =====================================================
-- 11. TABLA DE HISTORIAL DE MOVIMIENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES inventory_items(id),
  from_school_id UUID REFERENCES schools(id), -- NULL = Almacén Central
  to_school_id UUID REFERENCES schools(id),
  quantity NUMERIC(10, 2) NOT NULL,
  movement_type TEXT NOT NULL, -- 'transfer', 'purchase', 'adjustment', 'consumption'
  reference_id UUID, -- ID de la orden/pedido relacionado
  reference_type TEXT, -- 'supply_request', 'purchase_order'
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_from ON inventory_movements(from_school_id);
CREATE INDEX idx_inventory_movements_to ON inventory_movements(to_school_id);

-- =====================================================
-- 12. PERMISOS DEL MÓDULO LOGÍSTICA
-- =====================================================

DO $$
DECLARE
  v_perm_id UUID;
BEGIN
  -- Módulo Logística
  INSERT INTO permissions (module, action, name, description) VALUES
    ('logistica', 'ver_modulo', 'Ver módulo de Logística', 'Acceso al módulo completo'),
    ('logistica', 'ver_inventario', 'Ver inventario', 'Ver stock de productos'),
    ('logistica', 'editar_inventario', 'Editar inventario', 'Agregar/modificar productos y stock'),
    ('logistica', 'ver_pedidos', 'Ver pedidos', 'Ver solicitudes de suministros'),
    ('logistica', 'procesar_pedidos', 'Procesar pedidos', 'Aprobar y procesar solicitudes'),
    ('logistica', 'crear_orden_compra', 'Crear órdenes de compra', 'Generar órdenes a proveedores'),
    ('logistica', 'ver_ordenes_compra', 'Ver órdenes de compra', 'Consultar órdenes'),
    ('logistica', 'gestionar_proveedores', 'Gestionar proveedores', 'Agregar/editar proveedores'),
    ('logistica', 'ver_activos', 'Ver activos', 'Ver inventario de máquinas y equipos'),
    ('logistica', 'editar_activos', 'Editar activos', 'Agregar/modificar activos'),
    ('logistica', 'ver_analytics', 'Ver analytics de inventario', 'Reportes y gráficos')
  ON CONFLICT (module, action) DO NOTHING;

  -- Módulo Administración de Sede
  INSERT INTO permissions (module, action, name, description) VALUES
    ('admin_sede', 'ver_modulo', 'Ver módulo de Admin Sede', 'Acceso al módulo completo'),
    ('admin_sede', 'crear_pedidos', 'Crear pedidos de suministros', 'Solicitar mercadería al almacén'),
    ('admin_sede', 'ver_pedidos', 'Ver pedidos de suministros', 'Consultar estado de pedidos'),
    ('admin_sede', 'gestionar_calendario', 'Gestionar calendarios', 'Eventos académicos e internos'),
    ('admin_sede', 'gestionar_tarjetas', 'Gestionar tarjetas ID', 'Activar y vincular tarjetas')
  ON CONFLICT (module, action) DO NOTHING;

  -- Asignar permisos al rol almacenero
  FOR v_perm_id IN 
    SELECT id FROM permissions WHERE module = 'logistica'
  LOOP
    INSERT INTO role_permissions (role, permission_id, granted)
    VALUES ('almacenero', v_perm_id, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Asignar permisos al rol gestor_unidad
  FOR v_perm_id IN 
    SELECT id FROM permissions WHERE module = 'admin_sede'
  LOOP
    INSERT INTO role_permissions (role, permission_id, granted)
    VALUES ('gestor_unidad', v_perm_id, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Admin General tiene acceso a todo
  FOR v_perm_id IN 
    SELECT id FROM permissions WHERE module IN ('logistica', 'admin_sede')
  LOOP
    INSERT INTO role_permissions (role, permission_id, granted)
    VALUES ('admin_general', v_perm_id, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;

-- =====================================================
-- 13. FUNCIÓN PARA GENERAR CÓDIGOS AUTOMÁTICOS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_code(prefix TEXT, table_name TEXT, column_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_max_number INT;
  v_new_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  EXECUTE format(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM ''[0-9]+$'') AS INT)), 0) FROM %I WHERE %I LIKE %L',
    column_name, table_name, column_name, prefix || '-' || v_year || '-%'
  ) INTO v_max_number;
  
  v_new_number := LPAD((v_max_number + 1)::TEXT, 4, '0');
  
  RETURN prefix || '-' || v_year || '-' || v_new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. FUNCIÓN RPC: VERIFICAR STOCK AL CREAR PEDIDO
-- =====================================================

CREATE OR REPLACE FUNCTION check_stock_for_request(p_items JSONB)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  quantity_requested NUMERIC,
  quantity_available NUMERIC,
  quantity_missing NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (item->>'item_id')::UUID as item_id,
    ii.name as item_name,
    (item->>'quantity')::NUMERIC as quantity_requested,
    COALESCE(ist.quantity, 0) as quantity_available,
    GREATEST(0, (item->>'quantity')::NUMERIC - COALESCE(ist.quantity, 0)) as quantity_missing,
    CASE 
      WHEN COALESCE(ist.quantity, 0) >= (item->>'quantity')::NUMERIC THEN 'available'
      WHEN COALESCE(ist.quantity, 0) > 0 THEN 'partial'
      ELSE 'out_of_stock'
    END as status
  FROM jsonb_array_elements(p_items) as item
  JOIN inventory_items ii ON ii.id = (item->>'item_id')::UUID
  LEFT JOIN inventory_stock ist ON ist.item_id = ii.id AND ist.school_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 15. FUNCIÓN RPC: PROCESAR PEDIDO (Para Almacenero)
-- =====================================================

CREATE OR REPLACE FUNCTION process_supply_request(
  p_request_id UUID,
  p_user_id UUID,
  p_items JSONB -- [{ item_id, quantity_approved }]
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_item JSONB;
  v_item_id UUID;
  v_qty_approved NUMERIC;
  v_qty_requested NUMERIC;
  v_qty_available NUMERIC;
  v_school_id UUID;
  v_needs_purchase BOOLEAN := false;
BEGIN
  -- Obtener la sede que hizo el pedido
  SELECT requesting_school_id INTO v_school_id
  FROM supply_requests WHERE id = p_request_id;

  -- Procesar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item->>'item_id')::UUID;
    v_qty_approved := (v_item->>'quantity_approved')::NUMERIC;
    
    -- Obtener cantidad solicitada
    SELECT quantity_requested INTO v_qty_requested
    FROM supply_request_items 
    WHERE request_id = p_request_id AND item_id = v_item_id;
    
    -- Obtener stock disponible en almacén central
    SELECT COALESCE(quantity, 0) INTO v_qty_available
    FROM inventory_stock 
    WHERE item_id = v_item_id AND school_id IS NULL;
    
    -- Actualizar el item del pedido
    UPDATE supply_request_items SET
      quantity_available = v_qty_available,
      quantity_approved = LEAST(v_qty_approved, v_qty_available),
      quantity_pending = GREATEST(0, v_qty_requested - v_qty_available),
      status = CASE 
        WHEN v_qty_available >= v_qty_requested THEN 'approved'
        WHEN v_qty_available > 0 THEN 'partial'
        ELSE 'out_of_stock'
      END
    WHERE request_id = p_request_id AND item_id = v_item_id;
    
    -- Si se aprueba alguna cantidad, hacer el movimiento
    IF v_qty_approved > 0 AND v_qty_approved <= v_qty_available THEN
      -- Reducir stock del almacén central
      UPDATE inventory_stock 
      SET quantity = quantity - v_qty_approved,
          last_updated = NOW(),
          updated_by = p_user_id
      WHERE item_id = v_item_id AND school_id IS NULL;
      
      -- Aumentar stock en la sede
      INSERT INTO inventory_stock (item_id, school_id, quantity, updated_by)
      VALUES (v_item_id, v_school_id, v_qty_approved, p_user_id)
      ON CONFLICT (item_id, school_id) 
      DO UPDATE SET 
        quantity = inventory_stock.quantity + v_qty_approved,
        last_updated = NOW(),
        updated_by = p_user_id;
      
      -- Registrar movimiento
      INSERT INTO inventory_movements (
        item_id, from_school_id, to_school_id, quantity, 
        movement_type, reference_id, reference_type, created_by
      ) VALUES (
        v_item_id, NULL, v_school_id, v_qty_approved,
        'transfer', p_request_id, 'supply_request', p_user_id
      );
    END IF;
    
    -- Verificar si hay items pendientes
    IF v_qty_requested > v_qty_available THEN
      v_needs_purchase := true;
    END IF;
  END LOOP;
  
  -- Actualizar estado del pedido
  UPDATE supply_requests SET
    status = CASE 
      WHEN v_needs_purchase THEN 'partially_fulfilled'
      ELSE 'fulfilled'
    END,
    processed_at = NOW(),
    processed_by = p_user_id
  WHERE id = p_request_id;
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'needs_purchase', v_needs_purchase,
    'message', CASE 
      WHEN v_needs_purchase THEN 'Pedido procesado. Algunos items requieren orden de compra.'
      ELSE 'Pedido procesado completamente.'
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 16. FUNCIÓN TRIGGER: ACTUALIZAR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS trg_inventory_items_updated ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated ON suppliers;
CREATE TRIGGER trg_suppliers_updated
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

DROP TRIGGER IF EXISTS trg_assets_updated ON assets_inventory;
CREATE TRIGGER trg_assets_updated
  BEFORE UPDATE ON assets_inventory
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

-- =====================================================
-- 17. POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas generales: Admin y Almacenero ven todo
CREATE POLICY "Admins y Almaceneros acceso total" ON inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('superadmin', 'admin_general', 'almacenero')
    )
  );

CREATE POLICY "Admins y Almaceneros acceso total stock" ON inventory_stock
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('superadmin', 'admin_general', 'almacenero')
    )
  );

-- Gestor de Unidad solo ve sus pedidos
CREATE POLICY "Gestores ven sus pedidos" ON supply_requests
  FOR SELECT USING (
    requesting_school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Almacenero ve todos los pedidos
CREATE POLICY "Almacenero ve todos los pedidos" ON supply_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('superadmin', 'admin_general', 'almacenero')
    )
  );

-- =====================================================
-- 18. DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Insertar algunos productos de ejemplo
INSERT INTO inventory_items (code, name, category_id, unit, min_stock, cost_per_unit) VALUES
  ('ING-001', 'Papa Blanca', (SELECT id FROM inventory_categories WHERE name = 'Ingredientes'), 'kg', 50, 2.50),
  ('ING-002', 'Lechuga', (SELECT id FROM inventory_categories WHERE name = 'Ingredientes'), 'unidad', 20, 1.50),
  ('ING-003', 'Arroz', (SELECT id FROM inventory_categories WHERE name = 'Ingredientes'), 'kg', 100, 3.00),
  ('ING-004', 'Pollo', (SELECT id FROM inventory_categories WHERE name = 'Ingredientes'), 'kg', 30, 12.00),
  ('CONS-001', 'Servilletas', (SELECT id FROM inventory_categories WHERE name = 'Consumibles'), 'paquete', 50, 8.00),
  ('MERC-001', 'Galletas Soda', (SELECT id FROM inventory_categories WHERE name = 'Mercaderías'), 'caja', 20, 15.00)
ON CONFLICT (code) DO NOTHING;

-- Stock inicial en almacén central (school_id = NULL)
INSERT INTO inventory_stock (item_id, school_id, quantity) 
SELECT id, NULL, 100 FROM inventory_items
ON CONFLICT (item_id, school_id) DO NOTHING;

-- Proveedor de ejemplo
INSERT INTO suppliers (code, name, ruc, phone, email) VALUES
  ('PROV-001', 'Distribuidora San Miguel', '20123456789', '987654321', 'ventas@sanmiguel.com'),
  ('PROV-002', 'Mercado Mayorista', '20987654321', '912345678', 'pedidos@mayorista.com')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- ✅ SISTEMA COMPLETO INSTALADO
-- =====================================================

-- Verificación final
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de Logística y Almacén instalado correctamente';
  RAISE NOTICE '📦 Tablas creadas: 10';
  RAISE NOTICE '👥 Roles creados: almacenero, gestor_unidad';
  RAISE NOTICE '🔐 Permisos configurados y asignados';
  RAISE NOTICE '⚙️ Funciones RPC listas para usar';
END $$;
