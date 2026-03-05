-- ============================================================
-- NFC SCRIPT #1 — Crear tabla nfc_cards
-- Ejecutar en: Supabase > SQL Editor (PRIMERO)
-- ============================================================

CREATE TABLE IF NOT EXISTS nfc_cards (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_uid      TEXT        UNIQUE NOT NULL,
  card_number   TEXT,
  holder_type   TEXT        CHECK (holder_type IN ('student', 'teacher')),
  student_id    UUID        REFERENCES students(id)  ON DELETE SET NULL,
  teacher_id    UUID        REFERENCES profiles(id)  ON DELETE SET NULL,
  school_id     UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  notes         TEXT,
  assigned_at   TIMESTAMPTZ,
  assigned_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_holder_consistency CHECK (
    (holder_type = 'student'  AND student_id IS NOT NULL AND teacher_id IS NULL) OR
    (holder_type = 'teacher'  AND teacher_id IS NOT NULL AND student_id IS NULL) OR
    (holder_type IS NULL      AND student_id IS NULL     AND teacher_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_nfc_cards_card_uid   ON nfc_cards(card_uid);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_student_id ON nfc_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_teacher_id ON nfc_cards(teacher_id);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_school_id  ON nfc_cards(school_id);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_is_active  ON nfc_cards(is_active);

CREATE OR REPLACE FUNCTION update_nfc_cards_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nfc_cards_updated_at ON nfc_cards;
CREATE TRIGGER trg_nfc_cards_updated_at
  BEFORE UPDATE ON nfc_cards
  FOR EACH ROW EXECUTE FUNCTION update_nfc_cards_updated_at();

ALTER TABLE nfc_cards ENABLE ROW LEVEL SECURITY;

-- Politicas RLS iniciales (se reemplazan en Script #2)
CREATE POLICY "nfc_superadmin_all" ON nfc_cards FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin'));

CREATE POLICY "nfc_admin_manage" ON nfc_cards FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('admin_general', 'gestor_unidad') AND p.school_id = nfc_cards.school_id));

CREATE POLICY "nfc_cajero_read" ON nfc_cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role = 'operador_caja' AND p.school_id = nfc_cards.school_id));

NOTIFY pgrst, 'reload schema';

-- Verificar
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'nfc_cards'
ORDER BY ordinal_position;
