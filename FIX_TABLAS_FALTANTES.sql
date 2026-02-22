-- ============================================
-- FIX: Tablas y FKs faltantes (billing + lunch_orders)
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Crear tabla BILLING_PERIODS
-- ============================================
CREATE TABLE IF NOT EXISTS public.billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  visible_to_parents BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bp_read" ON public.billing_periods;
CREATE POLICY "bp_read" ON public.billing_periods
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bp_manage" ON public.billing_periods;
CREATE POLICY "bp_manage" ON public.billing_periods
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin_general', 'gestor_unidad')
    )
  );

CREATE INDEX IF NOT EXISTS idx_billing_periods_school ON public.billing_periods(school_id);
CREATE INDEX IF NOT EXISTS idx_billing_periods_status ON public.billing_periods(status);

-- ============================================
-- 2. Crear tabla PAYMENT_TRANSACTIONS (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'PEN',
  payment_gateway TEXT NOT NULL DEFAULT 'manual',
  transaction_reference TEXT,
  authorization_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'approved', 'rejected', 'cancelled', 'refunded', 'expired')
  ),
  payment_method TEXT,
  card_brand TEXT,
  card_last_four TEXT,
  expired_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ptx_own_read" ON public.payment_transactions;
CREATE POLICY "ptx_own_read" ON public.payment_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ptx_own_insert" ON public.payment_transactions;
CREATE POLICY "ptx_own_insert" ON public.payment_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ptx_admin_all" ON public.payment_transactions;
CREATE POLICY "ptx_admin_all" ON public.payment_transactions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin_general', 'operador_caja')
    )
  );

-- ============================================
-- 3. FK: lunch_orders.teacher_id → teacher_profiles
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lunch_orders_teacher_id_fkey'
    AND table_name = 'lunch_orders'
  ) THEN
    ALTER TABLE public.lunch_orders 
      ADD CONSTRAINT lunch_orders_teacher_id_fkey 
      FOREIGN KEY (teacher_id) REFERENCES public.teacher_profiles(id);
  END IF;
END $$;

-- ============================================
-- 4. Verificación
-- ============================================
SELECT '✅ billing_periods' as tabla, COUNT(*) as filas FROM public.billing_periods
UNION ALL
SELECT '✅ payment_transactions', COUNT(*) FROM public.payment_transactions
UNION ALL
SELECT '✅ lunch_orders (FK teacher)', 
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE constraint_name = 'lunch_orders_teacher_id_fkey')::bigint;
