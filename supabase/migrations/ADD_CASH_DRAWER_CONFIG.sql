-- =====================================================
-- Agregar configuración de cajón de dinero
-- =====================================================

-- 1. Agregar columna para habilitar apertura de cajón
ALTER TABLE printer_configs
ADD COLUMN IF NOT EXISTS open_cash_drawer boolean DEFAULT true;

-- 2. Agregar columna para seleccionar qué cajón (pin 2 o pin 5)
ALTER TABLE printer_configs
ADD COLUMN IF NOT EXISTS cash_drawer_pin integer DEFAULT 2 CHECK (cash_drawer_pin IN (2, 5));

-- 3. Agregar columna para configurar en qué tipos de venta abrir el cajón
ALTER TABLE printer_configs
ADD COLUMN IF NOT EXISTS open_drawer_on_general boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS open_drawer_on_credit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS open_drawer_on_teacher boolean DEFAULT false;

-- 4. Comentarios explicativos
COMMENT ON COLUMN printer_configs.open_cash_drawer IS 'Habilita la apertura automática del cajón de dinero al imprimir';
COMMENT ON COLUMN printer_configs.cash_drawer_pin IS 'Pin del cajón: 2 (conector estándar) o 5 (conector alternativo)';
COMMENT ON COLUMN printer_configs.open_drawer_on_general IS 'Abrir cajón en ventas generales (efectivo/tarjeta)';
COMMENT ON COLUMN printer_configs.open_drawer_on_credit IS 'Abrir cajón en ventas a crédito';
COMMENT ON COLUMN printer_configs.open_drawer_on_teacher IS 'Abrir cajón en ventas de profesores';
