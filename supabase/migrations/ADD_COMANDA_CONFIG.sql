-- =====================================================
-- ACTUALIZACIÓN: Agregar campos para Comanda y QR único
-- =====================================================

-- Agregar nuevos campos a printer_configs
ALTER TABLE public.printer_configs
ADD COLUMN IF NOT EXISTS print_comanda BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS comanda_header TEXT DEFAULT 'COMANDA DE COCINA',
ADD COLUMN IF NOT EXISTS comanda_copies INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS auto_generate_qr BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS qr_prefix VARCHAR(20) DEFAULT 'ORD',
ADD COLUMN IF NOT EXISTS print_separate_comanda BOOLEAN DEFAULT true;

-- Comentarios para los nuevos campos
COMMENT ON COLUMN public.printer_configs.print_comanda IS 
  'Si debe imprimir comanda además del ticket';

COMMENT ON COLUMN public.printer_configs.comanda_header IS 
  'Encabezado de la comanda (ej: COMANDA DE COCINA)';

COMMENT ON COLUMN public.printer_configs.comanda_copies IS 
  'Número de copias de la comanda (para cocina, bar, etc)';

COMMENT ON COLUMN public.printer_configs.auto_generate_qr IS 
  'Generar código QR único automáticamente para cada pedido';

COMMENT ON COLUMN public.printer_configs.qr_prefix IS 
  'Prefijo para el código QR (ej: ORD, PED, TKT)';

COMMENT ON COLUMN public.printer_configs.print_separate_comanda IS 
  'Imprimir comanda como documento separado del ticket';

-- Actualizar configuraciones existentes
UPDATE public.printer_configs
SET 
  print_comanda = true,
  comanda_header = 'COMANDA DE COCINA',
  comanda_copies = 1,
  auto_generate_qr = true,
  qr_prefix = 'ORD',
  print_separate_comanda = true
WHERE print_comanda IS NULL;

-- Verificar cambios
SELECT 
  pc.id,
  s.name AS sede,
  pc.printer_name,
  pc.print_comanda,
  pc.comanda_copies,
  pc.auto_generate_qr,
  pc.qr_prefix
FROM public.printer_configs pc
INNER JOIN public.schools s ON pc.school_id = s.id
ORDER BY s.name;
