-- ============================================================
-- TABLA: school_comunicados
-- Comunicados que los administradores envían a los padres
-- ============================================================

CREATE TABLE IF NOT EXISTS school_comunicados (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id       uuid          REFERENCES schools(id) ON DELETE CASCADE,  -- NULL = global (todas las sedes)
  type            text          NOT NULL DEFAULT 'informativo'
                                CHECK (type IN ('informativo', 'recordatorio', 'alerta', 'cobranza')),
  target_type     text          NOT NULL DEFAULT 'all'
                                CHECK (target_type IN ('all', 'specific')),
  target_parent_id uuid         REFERENCES parent_profiles(id) ON DELETE SET NULL,
  subject         text          NOT NULL,
  message         text          NOT NULL,
  expiration_date timestamptz,                      -- NULL = nunca expira
  created_by      uuid          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz   DEFAULT now(),
  updated_at      timestamptz   DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comunicados_school_id   ON school_comunicados(school_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_created_at  ON school_comunicados(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comunicados_expiration  ON school_comunicados(expiration_date);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE school_comunicados ENABLE ROW LEVEL SECURITY;

-- Admins (profiles) ven todos los comunicados de su sede (o globales)
CREATE POLICY "comunicados_admin_all"
  ON school_comunicados
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
    )
  );

-- Padres: solo lectura de comunicados vigentes de su sede (o globales)
CREATE POLICY "comunicados_parent_read"
  ON school_comunicados
  FOR SELECT
  USING (
    (expiration_date IS NULL OR expiration_date > now())
    AND EXISTS (
      SELECT 1
      FROM parent_profiles pp
      JOIN students s ON s.parent_id = pp.id
      WHERE pp.user_id = auth.uid()
        AND (
          school_comunicados.school_id IS NULL
          OR s.school_id = school_comunicados.school_id
        )
        AND (
          school_comunicados.target_type = 'all'
          OR school_comunicados.target_parent_id = pp.id
        )
    )
  );

-- Profesores: solo lectura de comunicados vigentes de su sede (o globales)
CREATE POLICY "comunicados_teacher_read"
  ON school_comunicados
  FOR SELECT
  USING (
    (expiration_date IS NULL OR expiration_date > now())
    AND EXISTS (
      SELECT 1
      FROM teacher_profiles tp
      WHERE tp.user_id = auth.uid()
        AND (
          school_comunicados.school_id IS NULL
          OR tp.school_1_id = school_comunicados.school_id
          OR tp.school_2_id = school_comunicados.school_id
        )
    )
  );
