-- =====================================================
-- LIMPIEZA DIRECTA Y DIAGNÓSTICO DE PROFESORJBL
-- =====================================================

-- PASO 1: Ver TODAS las transacciones de profesorjbl
SELECT 
    t.id,
    t.created_at,
    t.amount,
    t.payment_status,
    t.payment_method,
    t.operation_number,
    t.description,
    tp.full_name
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
ORDER BY t.description, t.created_at DESC;

-- PASO 2: Encontrar cuál es la transacción PENDING (la que aparece en "¡Cobrar!")
SELECT 
    '🔴 TRANSACCIONES PENDING DE PROFESORJBL' as titulo,
    t.id,
    t.created_at,
    t.amount,
    t.payment_status,
    t.description
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
  AND t.payment_status = 'pending';

-- PASO 3: ELIMINAR LOS 4 DUPLICADOS (dejar solo el que tiene operation_number = '1111')
-- ⚠️ Esto SÍ se va a ejecutar automáticamente
DELETE FROM public.transactions
WHERE id IN (
    '408a33ef-5961-4e1f-93cf-eea1ae001d57',  -- Transferencia sin número
    '3c3007af-7644-4006-9977-eb808e3097d1',  -- Yape
    '28116c8e-a7c6-4571-8a7a-a083c09db3d2'   -- Tarjeta
);
-- Dejamos solo: 74150a7f-3645-42e6-a1fa-2e0a4e6bcee1 (Transferencia con 1111)

-- PASO 4: Verificar que solo quede 1
SELECT 
    '✅ DESPUÉS DE ELIMINAR DUPLICADOS' as titulo,
    COUNT(*) as cantidad_restante,
    SUM(ABS(amount)) as monto_total
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
  AND t.description ILIKE '%1 de febrero%'
  AND t.payment_status = 'paid';

-- PASO 5: Si hay una transacción PENDING, actualizarla a PAID
-- ⚠️ Ejecutar SOLO si el PASO 2 mostró una transacción pending
/*
UPDATE public.transactions
SET 
    payment_status = 'paid',
    payment_method = 'transferencia',
    operation_number = '1111'
WHERE id = 'REEMPLAZA_CON_EL_ID_DEL_PASO_2'
  AND payment_status = 'pending';
*/

-- PASO 6: Verificar que no haya más transacciones pending
SELECT 
    '✅ VERIFICACIÓN FINAL' as titulo,
    COUNT(*) as transacciones_pending_restantes
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
  AND t.payment_status = 'pending';
