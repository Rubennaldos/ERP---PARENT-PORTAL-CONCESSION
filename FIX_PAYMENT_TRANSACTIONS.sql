-- ============================================
-- FIX: Crear tabla payment_transactions
-- Ejecutar en: Supabase SQL Editor
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

-- Los usuarios pueden ver sus propias transacciones
DROP POLICY IF EXISTS "payment_tx_own_read" ON public.payment_transactions;
CREATE POLICY "payment_tx_own_read" ON public.payment_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias transacciones
DROP POLICY IF EXISTS "payment_tx_own_insert" ON public.payment_transactions;
CREATE POLICY "payment_tx_own_insert" ON public.payment_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins pueden ver todas
DROP POLICY IF EXISTS "payment_tx_admin_read" ON public.payment_transactions;
CREATE POLICY "payment_tx_admin_read" ON public.payment_transactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin_general', 'operador_caja')
    )
  );

CREATE INDEX IF NOT EXISTS idx_payment_tx_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON public.payment_transactions(status);

SELECT '✅ Tabla payment_transactions creada' as resultado;
