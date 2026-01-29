-- =====================================================
-- AGREGAR COLUMNAS PARA SOPORTE DE PROFESORES
-- =====================================================

-- Agregar columna teacher_id en la tabla transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL;

-- Índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_transactions_teacher_id ON public.transactions(teacher_id);

-- Comentario
COMMENT ON COLUMN public.transactions.teacher_id IS 'ID del profesor (si la compra fue hecha por un profesor)';

-- =====================================================

-- Agregar columna teacher_id en la tabla sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL;

-- Índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_sales_teacher_id ON public.sales(teacher_id);

-- Comentario
COMMENT ON COLUMN public.sales.teacher_id IS 'ID del profesor (si la venta fue para un profesor)';

-- =====================================================
-- ✅ COLUMNAS AGREGADAS EXITOSAMENTE
-- =====================================================

COMMENT ON TABLE public.transactions IS 
'Tabla de transacciones que ahora soporta estudiantes, profesores y clientes genéricos.
- student_id: Para estudiantes
- teacher_id: Para profesores  
- Si ambos son NULL: Cliente genérico';

COMMENT ON TABLE public.sales IS 
'Tabla de ventas que ahora soporta estudiantes, profesores y clientes genéricos.
- student_id: Para estudiantes
- teacher_id: Para profesores
- Si ambos son NULL: Cliente genérico';
