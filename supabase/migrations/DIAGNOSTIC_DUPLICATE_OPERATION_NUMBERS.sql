-- ══════════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO: Números de Operación Duplicados en Pagos
-- Ejecutar en Supabase SQL Editor (solo lectura, no modifica nada)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Buscar en la columna 'operation_number' si existe ──────────────────────
SELECT column_name, table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name ILIKE '%operation%'
ORDER BY table_name, column_name;

-- ── 2. Buscar en metadata JSONB de transactions ───────────────────────────────
-- Casos donde metadata contiene 'operation_number'
SELECT
  id,
  student_id,
  teacher_id,
  amount,
  description,
  payment_status,
  created_at,
  metadata->>'operation_number' AS operation_number
FROM public.transactions
WHERE metadata ? 'operation_number'
  AND metadata->>'operation_number' IS NOT NULL
  AND metadata->>'operation_number' <> ''
ORDER BY created_at DESC
LIMIT 100;

-- ── 3. Contar duplicados en metadata.operation_number ────────────────────────
SELECT
  metadata->>'operation_number'  AS operation_number,
  COUNT(*)                       AS veces_usado,
  MIN(created_at)                AS primera_vez,
  MAX(created_at)                AS ultima_vez,
  ARRAY_AGG(id ORDER BY created_at) AS transaction_ids
FROM public.transactions
WHERE metadata ? 'operation_number'
  AND metadata->>'operation_number' IS NOT NULL
  AND metadata->>'operation_number' <> ''
GROUP BY metadata->>'operation_number'
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ── 4. Resumen numérico ───────────────────────────────────────────────────────
SELECT
  COUNT(*) FILTER (WHERE metadata ? 'operation_number'
                    AND metadata->>'operation_number' IS NOT NULL
                    AND metadata->>'operation_number' <> '')
                         AS total_con_nro_operacion,
  COUNT(DISTINCT metadata->>'operation_number') 
    FILTER (WHERE metadata ? 'operation_number'
              AND metadata->>'operation_number' IS NOT NULL
              AND metadata->>'operation_number' <> '')
                         AS total_nros_unicos,
  COUNT(*) FILTER (WHERE metadata ? 'operation_number'
                    AND metadata->>'operation_number' IS NOT NULL
                    AND metadata->>'operation_number' <> '')
  - COUNT(DISTINCT metadata->>'operation_number')
    FILTER (WHERE metadata ? 'operation_number'
              AND metadata->>'operation_number' IS NOT NULL
              AND metadata->>'operation_number' <> '')
                         AS total_duplicados
FROM public.transactions;

-- ── 5. Buscar en tabla 'payments' si existe ──────────────────────────────────
-- (solo ejecutar si la tabla existe)
-- SELECT
--   operation_number,
--   COUNT(*) AS veces_usado
-- FROM public.payments
-- WHERE operation_number IS NOT NULL
-- GROUP BY operation_number
-- HAVING COUNT(*) > 1
-- ORDER BY COUNT(*) DESC;
