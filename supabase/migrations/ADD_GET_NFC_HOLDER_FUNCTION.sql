-- ============================================================
-- Crear función RPC get_nfc_holder para lectura de tarjetas NFC
-- Usada por el POS al acercar tarjeta para identificar alumno/profesor
-- NOTA: Requiere que la tabla nfc_cards exista.
--       Si no existe, ejecutar antes: NFC_SCRIPT_1_CREAR_TABLA.sql
-- ============================================================

DROP FUNCTION IF EXISTS public.get_nfc_holder(TEXT);

CREATE OR REPLACE FUNCTION public.get_nfc_holder(p_card_uid TEXT)
RETURNS TABLE (
  holder_type            TEXT,
  student_id             UUID,
  student_name           TEXT,
  student_grade          TEXT,
  student_section        TEXT,
  student_balance        FLOAT8,
  student_free_account   BOOLEAN,
  student_kiosk_disabled BOOLEAN,
  student_limit_type     TEXT,
  student_daily_limit    FLOAT8,
  student_weekly_limit   FLOAT8,
  student_monthly_limit  FLOAT8,
  student_school_id      UUID,
  teacher_id             UUID,
  teacher_name           TEXT,
  card_number            TEXT,
  is_active              BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    nc.holder_type::TEXT,
    nc.student_id,
    s.full_name::TEXT           AS student_name,
    s.grade::TEXT               AS student_grade,
    s.section::TEXT             AS student_section,
    COALESCE(s.balance, 0)::FLOAT8           AS student_balance,
    COALESCE(s.free_account, true)::BOOLEAN  AS student_free_account,
    COALESCE(s.kiosk_disabled, false)::BOOLEAN AS student_kiosk_disabled,
    s.limit_type::TEXT          AS student_limit_type,
    COALESCE(s.daily_limit, 0)::FLOAT8      AS student_daily_limit,
    COALESCE(s.weekly_limit, 0)::FLOAT8     AS student_weekly_limit,
    COALESCE(s.monthly_limit, 0)::FLOAT8    AS student_monthly_limit,
    s.school_id                 AS student_school_id,
    nc.teacher_id,
    COALESCE(tp.full_name, p.full_name)::TEXT AS teacher_name,
    nc.card_number::TEXT,
    COALESCE(nc.is_active, true)
  FROM nfc_cards nc
  LEFT JOIN students  s ON s.id = nc.student_id
  LEFT JOIN teacher_profiles tp ON tp.id = nc.teacher_id
  LEFT JOIN profiles  p ON p.id = nc.teacher_id
  WHERE nc.card_uid = p_card_uid
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_nfc_holder(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nfc_holder(TEXT) TO service_role;
