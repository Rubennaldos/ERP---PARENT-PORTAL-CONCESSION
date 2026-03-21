-- ══════════════════════════════════════════════════════════════════════════════
-- UNIQUE CONSTRAINT: Número de Operación
-- Previene pagos duplicados con el mismo número de operación
-- ══════════════════════════════════════════════════════════════════════════════
-- Resultado del diagnóstico previo:
--   ✅ columna operation_number existe en transactions
--   ✅ 0 duplicados — base de datos limpia
--   ✅ 0 registros con valor — todos son NULL
-- Por tanto se puede crear el constraint de forma segura.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. UNIQUE parcial en transactions.operation_number ────────────────────────
-- Se usa índice parcial (WHERE NOT NULL) porque PostgreSQL trata NULL como único
-- por defecto, pero esto lo hace explícito y más eficiente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_operation_number_unique
  ON public.transactions (operation_number)
  WHERE operation_number IS NOT NULL;

-- ── 2. UNIQUE en recharge_requests.reference_code ────────────────────────────
-- Los pagos de padres/profesores se registran con reference_code en esta tabla.
-- El frontend ya valida duplicados, pero la BD es la última línea de defensa.
CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_requests_reference_code_unique
  ON public.recharge_requests (reference_code)
  WHERE reference_code IS NOT NULL
    AND reference_code <> ''
    AND status <> 'rejected';

-- ── 3. Verificar que los índices se crearon ───────────────────────────────────
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_transactions_operation_number_unique',
    'idx_recharge_requests_reference_code_unique'
  );
