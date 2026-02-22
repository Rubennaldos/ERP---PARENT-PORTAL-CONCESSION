-- ============================================
-- FIX: purchase_visibility_delay + billing_config columns
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Crear tabla PURCHASE_VISIBILITY_DELAY
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchase_visibility_delay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  delay_days INTEGER NOT NULL DEFAULT 2,
  applies_to TEXT NOT NULL DEFAULT 'purchases',
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id)
);

ALTER TABLE public.purchase_visibility_delay ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pvd_read" ON public.purchase_visibility_delay;
CREATE POLICY "pvd_read" ON public.purchase_visibility_delay
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pvd_manage" ON public.purchase_visibility_delay;
CREATE POLICY "pvd_manage" ON public.purchase_visibility_delay
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin_general', 'gestor_unidad')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pvd_school ON public.purchase_visibility_delay(school_id);

-- ============================================
-- 2. Asegurar que billing_config tenga todas las columnas
-- ============================================
ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS yape_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS yape_holder VARCHAR(200),
  ADD COLUMN IF NOT EXISTS plin_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS plin_holder VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_info TEXT,
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_cci VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_holder VARCHAR(200),
  ADD COLUMN IF NOT EXISTS message_template TEXT,
  ADD COLUMN IF NOT EXISTS business_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS business_ruc VARCHAR(20);

-- ============================================
-- 3. Verificación
-- ============================================
SELECT '✅ purchase_visibility_delay' as tabla, COUNT(*) as filas FROM public.purchase_visibility_delay
UNION ALL
SELECT '✅ billing_config', COUNT(*) FROM public.billing_config;
