-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 1: Ver todos los duplicados en transactions.operation_number
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  operation_number,
  COUNT(*)                        AS veces,
  MIN(created_at)                 AS primera,
  MAX(created_at)                 AS ultima,
  ARRAY_AGG(id ORDER BY created_at) AS ids
FROM public.transactions
WHERE operation_number IS NOT NULL
  AND operation_number <> ''
GROUP BY operation_number
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 2: Limpiar — poner NULL en los DUPLICADOS (conserva el registro más antiguo)
-- Solo ejecutar después de revisar el PASO 1
-- ══════════════════════════════════════════════════════════════════════════════
UPDATE public.transactions t
SET operation_number = NULL
WHERE t.id IN (
  -- Selecciona todas las filas duplicadas EXCEPTO la más antigua de cada grupo
  SELECT id FROM (
    SELECT
      id,
      operation_number,
      ROW_NUMBER() OVER (
        PARTITION BY operation_number
        ORDER BY created_at ASC  -- conserva la más antigua
      ) AS rn
    FROM public.transactions
    WHERE operation_number IS NOT NULL
      AND operation_number <> ''
  ) ranked
  WHERE rn > 1  -- las copias (no la original)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 3: Verificar que ya no hay duplicados
-- ══════════════════════════════════════════════════════════════════════════════
SELECT COUNT(*) AS duplicados_restantes
FROM (
  SELECT operation_number
  FROM public.transactions
  WHERE operation_number IS NOT NULL AND operation_number <> ''
  GROUP BY operation_number
  HAVING COUNT(*) > 1
) sub;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 4: Crear el índice UNIQUE (ejecutar solo si PASO 3 devuelve 0)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_operation_number_unique
  ON public.transactions (operation_number)
  WHERE operation_number IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 5 (independiente): UNIQUE en recharge_requests.reference_code
-- ══════════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_requests_reference_code_unique
  ON public.recharge_requests (reference_code)
  WHERE reference_code IS NOT NULL
    AND reference_code <> ''
    AND status <> 'rejected';

-- Confirmación final
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname IN (
  'idx_transactions_operation_number_unique',
  'idx_recharge_requests_reference_code_unique'
);
