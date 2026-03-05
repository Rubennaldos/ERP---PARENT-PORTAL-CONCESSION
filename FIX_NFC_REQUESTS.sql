-- ============================================================
-- CREAR TABLA DE SOLICITUDES NFC
-- ============================================================
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla nfc_requests
CREATE TABLE IF NOT EXISTS public.nfc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  
  -- Tipo de NFC solicitado
  nfc_type VARCHAR(20) NOT NULL CHECK (nfc_type IN ('sticker', 'llavero', 'tarjeta')),
  
  -- Precio según tipo
  price DECIMAL(10,2) NOT NULL,
  
  -- Estado de la solicitud
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')),
  
  -- Motivo de rechazo (opcional)
  rejection_reason TEXT,
  
  -- Quién aprobó/rechazó
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.nfc_requests ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS

-- Padres pueden ver sus propias solicitudes
DROP POLICY IF EXISTS "parents_view_own_nfc_requests" ON public.nfc_requests;
CREATE POLICY "parents_view_own_nfc_requests" ON public.nfc_requests
  FOR SELECT USING (parent_id = auth.uid());

-- Padres pueden crear solicitudes para sus hijos
DROP POLICY IF EXISTS "parents_create_nfc_requests" ON public.nfc_requests;
CREATE POLICY "parents_create_nfc_requests" ON public.nfc_requests
  FOR INSERT WITH CHECK (parent_id = auth.uid());

-- Admins pueden ver todas las solicitudes de su sede
DROP POLICY IF EXISTS "admins_view_nfc_requests" ON public.nfc_requests;
CREATE POLICY "admins_view_nfc_requests" ON public.nfc_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin_general', 'superadmin', 'supervisor_red')
        OR (p.role IN ('gestor_unidad', 'operador_caja') AND p.school_id = nfc_requests.school_id)
      )
    )
  );

-- Admins pueden actualizar solicitudes (aprobar/rechazar)
DROP POLICY IF EXISTS "admins_update_nfc_requests" ON public.nfc_requests;
CREATE POLICY "admins_update_nfc_requests" ON public.nfc_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin_general', 'superadmin', 'supervisor_red')
        OR (p.role IN ('gestor_unidad', 'operador_caja') AND p.school_id = nfc_requests.school_id)
      )
    )
  );

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_nfc_requests_student ON public.nfc_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_nfc_requests_parent ON public.nfc_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_nfc_requests_school ON public.nfc_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_nfc_requests_status ON public.nfc_requests(status);

-- 5. Recargar esquema
NOTIFY pgrst, 'reload schema';

-- ✅ Listo! Tabla de solicitudes NFC creada.
