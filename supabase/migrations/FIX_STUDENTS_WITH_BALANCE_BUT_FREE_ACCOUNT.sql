-- ══════════════════════════════════════════════════════════════════════
-- FIX: Estudiantes con saldo pero free_account = true (o null)
-- ══════════════════════════════════════════════════════════════════════
--
-- Problema: process_manual_recharge sumaba el balance pero NO cambiaba
-- free_account = false. Resultado: niños con saldo aparecen como
-- "Cuenta Libre" en el POS en vez de mostrar su saldo.
--
-- Este script:
--   1. Muestra los estudiantes afectados (diagnóstico)
--   2. Corrige: pone free_account = false a todos los que tienen balance > 0
--
-- Ejecutar en SQL Editor de Supabase.
-- ══════════════════════════════════════════════════════════════════════

-- ── PASO 1: Ver qué estudiantes están afectados ──
SELECT
  id,
  full_name,
  balance,
  free_account,
  school_id
FROM public.students
WHERE balance > 0
  AND (free_account IS DISTINCT FROM false)
  AND is_active = true
ORDER BY full_name;

-- ── PASO 2: Corregir (descomentar para ejecutar) ──
-- UPDATE public.students
-- SET free_account = false
-- WHERE balance > 0
--   AND (free_account IS DISTINCT FROM false)
--   AND is_active = true;

-- ── PASO 3: Verificar corrección ──
-- SELECT COUNT(*) AS total_corregidos
-- FROM public.students
-- WHERE free_account = false AND balance > 0;
