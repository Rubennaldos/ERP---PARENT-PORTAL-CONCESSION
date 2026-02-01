-- =====================================================
-- ACTUALIZACIÓN: Agregar campo para corte automático
-- =====================================================

-- Agregar campo para corte automático
ALTER TABLE public.printer_configs
ADD COLUMN IF NOT EXISTS auto_cut_paper BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cut_mode VARCHAR(20) DEFAULT 'partial';

-- Comentarios
COMMENT ON COLUMN public.printer_configs.auto_cut_paper IS 
  'Activar corte automático de papel después de cada impresión';

COMMENT ON COLUMN public.printer_configs.cut_mode IS 
  'Tipo de corte: partial (corte parcial), full (corte total)';

-- Actualizar configuraciones existentes
UPDATE public.printer_configs
SET 
  auto_cut_paper = true,
  cut_mode = 'partial'
WHERE auto_cut_paper IS NULL;

-- Verificar
SELECT 
  pc.id,
  s.name AS sede,
  pc.auto_cut_paper,
  pc.cut_mode
FROM public.printer_configs pc
INNER JOIN public.schools s ON pc.school_id = s.id;
