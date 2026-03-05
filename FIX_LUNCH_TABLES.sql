-- ============================================================
-- FIX: Columnas faltantes en lunch_orders + tablas faltantes
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Agregar columnas faltantes en lunch_orders
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.lunch_orders
  ADD COLUMN IF NOT EXISTS delivered_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS postponed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason   TEXT,
  ADD COLUMN IF NOT EXISTS postponement_reason   TEXT,
  ADD COLUMN IF NOT EXISTS is_no_order_delivery  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS school_id             UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS teacher_id            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS menu_id               UUID REFERENCES public.lunch_menus(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id           UUID REFERENCES public.lunch_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity              INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_cancelled          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelled_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────
-- 2. Crear tabla lunch_configuration (si no existe)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lunch_configuration (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                   UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  lunch_price                 NUMERIC(10,2) DEFAULT 7.50,
  orders_enabled              BOOLEAN DEFAULT TRUE,
  order_deadline_time         TIME DEFAULT '20:00:00',
  order_deadline_days         INTEGER DEFAULT 1,
  cancellation_deadline_time  TIME DEFAULT '07:00:00',
  cancellation_deadline_days  INTEGER DEFAULT 0,
  delivery_start_time         TIME DEFAULT '07:00:00',
  delivery_end_time           TIME DEFAULT '17:00:00',
  auto_close_day              BOOLEAN DEFAULT TRUE,
  auto_mark_as_delivered      BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id)
);

ALTER TABLE public.lunch_configuration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read lunch_configuration" ON public.lunch_configuration;
CREATE POLICY "Anyone can read lunch_configuration"
  ON public.lunch_configuration FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage lunch_configuration" ON public.lunch_configuration;
CREATE POLICY "Admins can manage lunch_configuration"
  ON public.lunch_configuration FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Crear tabla special_days (si no existe)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.special_days (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  type       VARCHAR(50),
  title      VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.special_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read special_days" ON public.special_days;
CREATE POLICY "Anyone can read special_days"
  ON public.special_days FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage special_days" ON public.special_days;
CREATE POLICY "Admins can manage special_days"
  ON public.special_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Columnas faltantes en tabla students
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_temporary              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS temporary_classroom_name  VARCHAR(255);

-- ─────────────────────────────────────────────────────────────
-- 4b. Columna faltante en tabla schools
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#10b981';

-- ─────────────────────────────────────────────────────────────
-- 5. Refrescar schema cache
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- 5. Verificar columnas de lunch_orders
-- ─────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lunch_orders'
ORDER BY ordinal_position;
