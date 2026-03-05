-- ============================================================
-- NFC SCRIPT #2 — Corregir RLS (VERSIÓN SIMPLE)
-- Ejecutar en: Supabase > SQL Editor (SEGUNDO)
-- ============================================================

-- ⚠️ IMPORTANTE: Si da error "policy already exists", ejecuta primero estos 3 comandos:
-- (Copia y pega cada uno en el SQL Editor y ejecuta por separado)

-- 1. DROP POLICY "nfc_superadmin_all" ON nfc_cards;
-- 2. DROP POLICY "nfc_admin_manage" ON nfc_cards;
-- 3. DROP POLICY "nfc_cajero_read" ON nfc_cards;

-- Luego ejecuta este script completo:

-- Superadmin: acceso total
CREATE POLICY "nfc_superadmin_all" ON nfc_cards FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin'));

-- Admin General: acceso total a TODAS las sedes (sin filtro school_id)
-- Gestor de Unidad: solo a SU sede
CREATE POLICY "nfc_admin_manage" ON nfc_cards FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND (
      p.role = 'admin_general'
      OR (p.role = 'gestor_unidad' AND p.school_id = nfc_cards.school_id)
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND (
      p.role = 'admin_general'
      OR (p.role = 'gestor_unidad' AND p.school_id = nfc_cards.school_id)
    )
  ));

-- Cajero: solo lectura de tarjetas de su sede (para buscar en el POS)
CREATE POLICY "nfc_cajero_read" ON nfc_cards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role = 'operador_caja' AND p.school_id = nfc_cards.school_id
  ));

NOTIFY pgrst, 'reload schema';
