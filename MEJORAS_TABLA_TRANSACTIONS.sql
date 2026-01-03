-- =====================================================
-- MEJORAS TABLA TRANSACTIONS - MÓDULO DE VENTAS
-- Desarrollado por ARQUISIA para Lima Café 28
-- =====================================================

-- 1. Agregar columnas para control de ventas anuladas
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- 2. Agregar columnas para datos del cliente (tickets/boletas/facturas)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_dni TEXT,
ADD COLUMN IF NOT EXISTS client_ruc TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'ticket' CHECK (document_type IN ('ticket', 'boleta', 'factura'));

-- 3. Agregar columnas para integración futura con SUNAT
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS sunat_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sunat_response JSONB,
ADD COLUMN IF NOT EXISTS sunat_sent_at TIMESTAMPTZ;

-- 4. Agregar índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_transactions_document_type ON transactions(document_type);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- 5. Comentarios de documentación
COMMENT ON COLUMN transactions.is_deleted IS 'Indica si la venta fue anulada. Las ventas anuladas se muestran en pestaña "Borradas"';
COMMENT ON COLUMN transactions.client_name IS 'Nombre del cliente para boletas/facturas (se edita desde módulo de ventas)';
COMMENT ON COLUMN transactions.client_dni IS 'DNI del cliente para boletas (8 dígitos)';
COMMENT ON COLUMN transactions.client_ruc IS 'RUC del cliente para facturas (11 dígitos)';
COMMENT ON COLUMN transactions.document_type IS 'Tipo de comprobante: ticket (interno), boleta (SUNAT), factura (SUNAT)';
COMMENT ON COLUMN transactions.sunat_sent IS 'Indica si el comprobante fue enviado a SUNAT (para boletas/facturas)';

-- =====================================================
-- ✅ SCRIPT COMPLETADO
-- Ejecuta este script en Supabase SQL Editor
-- =====================================================

