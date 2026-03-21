import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { YapeLogo } from '@/components/ui/YapeLogo';
import { PlinLogo } from '@/components/ui/PlinLogo';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Clock,
  X,
  Send,
  Wallet,
  Copy,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Camera,
} from 'lucide-react';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentId: string;
  currentBalance: number;
  accountType: string;
  onRecharge: (amount: number, method: string) => Promise<void>;
  suggestedAmount?: number;
  requestType?: 'recharge' | 'lunch_payment' | 'debt_payment' | 'kiosk_mode_activation';
  requestDescription?: string;
  lunchOrderIds?: string[];
  paidTransactionIds?: string[];
  /** Si se proporciona, se usa directamente en vez de buscar school_id desde students */
  schoolId?: string;
  /** Si true, el student_id se omite (para pagos de profesores) */
  isTeacherPayment?: boolean;
}

interface PaymentConfig {
  yape_number: string | null;
  yape_holder: string | null;
  yape_enabled: boolean;
  plin_number: string | null;
  plin_holder: string | null;
  plin_enabled: boolean;
  bank_account_info: string | null;
  bank_account_holder: string | null;
  transferencia_enabled: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_cci: string | null;
  show_payment_info: boolean;
}

type PaymentMethod = 'yape' | 'plin' | 'transferencia';

interface SplitVoucher {
  id: string;
  amount: string;
  referenceCode: string;
  voucherFile: File | null;
  voucherPreview: string | null;
  collapsed: boolean;
}

export function RechargeModal({
  isOpen,
  onClose,
  studentName,
  studentId,
  currentBalance,
  accountType,
  onRecharge,
  suggestedAmount,
  requestType = 'recharge',
  requestDescription,
  lunchOrderIds,
  paidTransactionIds,
  schoolId: propSchoolId,
  isTeacherPayment = false,
}: RechargeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPresetAmount = !!suggestedAmount && suggestedAmount > 0;

  const [view, setView] = useState<'form' | 'success'>('form');
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('yape');
  const [referenceCode, setReferenceCode] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Split Payments
  const [splitVouchers, setSplitVouchers] = useState<SplitVoucher[]>([]);

  const quickAmounts = [10, 20, 50, 100];

  // ── Reset al abrir ──
  useEffect(() => {
    if (isOpen && studentId) {
      fetchPaymentConfig();
      setReferenceCode('');
      setVoucherFile(null);
      setVoucherPreview(null);
      setNotes('');
      setSplitVouchers([]);
      setView('form');
      setAmount(hasPresetAmount ? String(suggestedAmount) : '');
    }
  }, [isOpen, studentId]);

  // ── Auto-select first available method ──
  useEffect(() => {
    if (!paymentConfig) return;
    const methods: PaymentMethod[] = ['yape', 'plin', 'transferencia'];
    for (const m of methods) {
      if (isMethodAvailable(m)) {
        setSelectedMethod(m);
        return;
      }
    }
  }, [paymentConfig]);

  const isMethodAvailable = (m: PaymentMethod): boolean => {
    if (!paymentConfig) return false;
    if (m === 'yape') return !!(paymentConfig.yape_enabled && paymentConfig.yape_number);
    if (m === 'plin') return !!(paymentConfig.plin_enabled && paymentConfig.plin_number);
    if (m === 'transferencia') return !!(paymentConfig.transferencia_enabled && (paymentConfig.bank_account_number || paymentConfig.bank_cci || paymentConfig.bank_account_info));
    return false;
  };

  const fetchPaymentConfig = async () => {
    setLoadingConfig(true);
    try {
      let resolvedSchoolId = propSchoolId || null;
      // Si no se pasó schoolId directamente, buscarlo desde la tabla students
      if (!resolvedSchoolId) {
        const { data: student } = await supabase
          .from('students').select('school_id').eq('id', studentId).single();
        resolvedSchoolId = student?.school_id || null;
      }
      if (!resolvedSchoolId) return;
      const { data: config } = await supabase
        .from('billing_config')
        .select('yape_number, yape_holder, yape_enabled, plin_number, plin_holder, plin_enabled, bank_account_info, bank_account_holder, transferencia_enabled, bank_name, bank_account_number, bank_cci, show_payment_info')
        .eq('school_id', resolvedSchoolId)
        .single();
      setPaymentConfig(config || null);
    } catch (err) {
      console.error('Error al cargar config de pagos:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Comprime imagen antes de subir — mantiene legibilidad del voucher
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const MAX_SIDE = 1400;  // px — suficiente para leer números del voucher
      const QUALITY  = 0.75;  // 75% calidad JPEG — buen balance tamaño/nitidez
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { width, height } = img;
        const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
        const w = Math.round(width  * scale);
        const h = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        // Fondo blanco — evita que PNG con transparencia quede con fondo negro en JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file); // Si la compresión no reduce, usar original
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', QUALITY);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('no_image')); };
      img.src = url;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validar que sea una imagen antes de intentar comprimir
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Archivo no válido', description: 'Solo se aceptan fotos (JPG, PNG, HEIC). Toma una foto del comprobante.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'Máximo 15 MB antes de comprimir', variant: 'destructive' });
      return;
    }
    try {
      const compressed = await compressImage(file);
      setVoucherFile(compressed);
      const reader = new FileReader();
      reader.onload = (ev) => setVoucherPreview(ev.target?.result as string);
      reader.readAsDataURL(compressed);
    } catch {
      // Fallback: si compressImage falla (ej. archivo corrupto) usar original
      setVoucherFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setVoucherPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSplitFileChange = async (splitId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Archivo no válido', description: 'Solo se aceptan fotos (JPG, PNG, HEIC).', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'Máximo 15 MB antes de comprimir', variant: 'destructive' });
      return;
    }
    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSplitVouchers(prev => prev.map(sv =>
          sv.id === splitId ? { ...sv, voucherFile: compressed, voucherPreview: ev.target?.result as string } : sv
        ));
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSplitVouchers(prev => prev.map(sv =>
          sv.id === splitId ? { ...sv, voucherFile: file, voucherPreview: ev.target?.result as string } : sv
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const checkDuplicateCode = async (code: string): Promise<boolean> => {
    if (!code.trim()) return false;
    const { data } = await supabase
      .from('recharge_requests')
      .select('id, status')
      .eq('reference_code', code.trim())
      .neq('status', 'rejected')
      .limit(1);
    return !!(data && data.length > 0);
  };

  const addSplitVoucher = () => {
    // Colapsar todos los anteriores que tengan datos completos
    setSplitVouchers(prev => {
      const updated = prev.map(sv => ({
        ...sv,
        collapsed: !!(sv.referenceCode.trim() && sv.voucherFile),
      }));
      return [...updated, {
        id: `split_${Date.now()}`,
        amount: '',
        referenceCode: '',
        voucherFile: null,
        voucherPreview: null,
        collapsed: false,
      }];
    });
  };

  const removeSplitVoucher = (id: string) => {
    setSplitVouchers(prev => prev.filter(sv => sv.id !== id));
  };

  const updateSplitVoucher = (id: string, field: keyof SplitVoucher, value: any) => {
    setSplitVouchers(prev => prev.map(sv =>
      sv.id === id ? { ...sv, [field]: value } : sv
    ));
  };

  const toggleSplitCollapse = (id: string) => {
    setSplitVouchers(prev => prev.map(sv =>
      sv.id === id ? { ...sv, collapsed: !sv.collapsed } : sv
    ));
  };

  // ── Copiar al portapapeles ──
  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!user) return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: 'Monto inválido', description: 'Ingresa un monto mayor a S/ 0', variant: 'destructive' });
      return;
    }
    if (!referenceCode.trim()) {
      toast({ title: 'Falta N° operación', description: 'Ingresa el número de operación.', variant: 'destructive' });
      return;
    }
    if (!voucherFile) {
      toast({ title: 'Falta comprobante', description: 'Adjunta la foto del comprobante.', variant: 'destructive' });
      return;
    }

    // Validar splits
    const totalVouchers = 1 + splitVouchers.length;
    for (let i = 0; i < splitVouchers.length; i++) {
      const sv = splitVouchers[i];
      if (!sv.referenceCode.trim()) {
        toast({ variant: 'destructive', title: `Pago ${i + 2}: falta código` });
        return;
      }
      if (!sv.voucherFile) {
        toast({ variant: 'destructive', title: `Pago ${i + 2}: falta foto` });
        return;
      }
      if (!sv.amount || parseFloat(sv.amount) <= 0) {
        toast({ variant: 'destructive', title: `Pago ${i + 2}: falta monto` });
        return;
      }
    }

    // Anti-duplicado local
    const allCodes = [referenceCode.trim(), ...splitVouchers.map(sv => sv.referenceCode.trim())];
    const uniqueCodes = new Set(allCodes);
    if (uniqueCodes.size !== allCodes.length) {
      toast({ variant: 'destructive', title: '⚠️ Códigos repetidos', description: 'Cada comprobante necesita un código diferente.' });
      return;
    }

    setLoading(true);
    try {
      // Anti-duplicado BD
      for (const code of allCodes) {
        const isDuplicate = await checkDuplicateCode(code);
        if (isDuplicate) {
          toast({ variant: 'destructive', title: '⚠️ Código ya usado', description: `"${code}" ya fue enviado.` });
          setLoading(false);
          return;
        }
      }

      // Prevenir doble envío
      if ((requestType === 'lunch_payment' || requestType === 'debt_payment') && lunchOrderIds && lunchOrderIds.length > 0) {
        const { data: existingReq } = await supabase
          .from('recharge_requests').select('id').eq('parent_id', user.id)
          .in('request_type', ['lunch_payment', 'debt_payment']).eq('status', 'pending')
          .contains('lunch_order_ids', lunchOrderIds);
        if (existingReq && existingReq.length > 0) {
          toast({ variant: 'destructive', title: '⚠️ Ya enviado', description: 'Ya enviaste un comprobante para estos pedidos.' });
          setLoading(false);
          return;
        }
      }
      if (requestType === 'debt_payment' && paidTransactionIds && paidTransactionIds.length > 0) {
        const { data: existingDebt } = await supabase
          .from('recharge_requests').select('id').eq('parent_id', user.id)
          .eq('request_type', 'debt_payment').eq('status', 'pending').eq('student_id', studentId);
        if (existingDebt && existingDebt.length > 0) {
          toast({ variant: 'destructive', title: '⚠️ Ya enviado', description: 'Ya tienes un comprobante pendiente.' });
          setLoading(false);
          return;
        }
      }

      // school_id — usar el prop si fue proporcionado, sino buscar de students
      let schoolId = propSchoolId || null;
      if (!schoolId) {
        const { data: student } = await supabase.from('students').select('school_id').eq('id', studentId).single();
        schoolId = student?.school_id || null;
      }

      // Upload helper — guarda el path para poder generar signed URLs
      const uploadVoucher = async (file: File): Promise<string | null> => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeName = `voucher_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = `${user.id}/${safeName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vouchers').upload(filePath, file, { upsert: false });
        if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`);
        // Guardar el path relativo (no la URL pública) para generar signed URLs
        return uploadData?.path || filePath;
      };

      const basePayload = {
        student_id: isTeacherPayment ? null : studentId,
        parent_id: user.id,
        school_id: schoolId,
        teacher_id: isTeacherPayment ? studentId : null,
        payment_method: selectedMethod,
        notes: notes.trim() || null,
        status: 'pending' as const,
        request_type: requestType,
        description: requestDescription || (
          requestType === 'lunch_payment' ? 'Pago de almuerzo' :
          requestType === 'debt_payment' ? 'Pago de deuda pendiente' :
          requestType === 'kiosk_mode_activation' ? 'Activación modalidad Recarga kiosco' :
          'Recarga de saldo'
        ),
        lunch_order_ids: lunchOrderIds || null,
        paid_transaction_ids: paidTransactionIds || null,
      };

      if (splitVouchers.length === 0) {
        const voucherUrl = await uploadVoucher(voucherFile);
        const { error } = await supabase.from('recharge_requests').insert({
          ...basePayload,
          amount: numAmount,
          reference_code: referenceCode.trim(),
          voucher_url: voucherUrl,
        });
        if (error) throw error;
      } else {
        const splitTotal = splitVouchers.reduce((sum, sv) => sum + (parseFloat(sv.amount) || 0), 0);
        const mainAmount = numAmount - splitTotal;
        if (mainAmount <= 0) {
          toast({ variant: 'destructive', title: 'Montos inválidos', description: 'Los splits superan el monto total.' });
          setLoading(false);
          return;
        }
        const baseDesc = requestDescription || basePayload.description;
        // Main voucher
        const mainUrl = await uploadVoucher(voucherFile);
        const { error: e1 } = await supabase.from('recharge_requests').insert({
          ...basePayload,
          amount: mainAmount,
          reference_code: referenceCode.trim(),
          voucher_url: mainUrl,
          description: `${baseDesc} (Pago 1/${totalVouchers})`,
        });
        if (e1) throw e1;
        // Splits
        for (let i = 0; i < splitVouchers.length; i++) {
          const sv = splitVouchers[i];
          const svUrl = await uploadVoucher(sv.voucherFile!);
          const { error: e2 } = await supabase.from('recharge_requests').insert({
            ...basePayload,
            amount: parseFloat(sv.amount),
            reference_code: sv.referenceCode.trim(),
            voucher_url: svUrl,
            description: `${baseDesc} (Pago ${i + 2}/${totalVouchers})`,
          });
          if (e2) throw e2;
        }
      }

      setView('success');
    } catch (err: any) {
      console.error('Error al enviar solicitud:', err);
      toast({ title: 'Error al enviar', description: err.message || 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers de render ──
  const getMethodIcon = (m: PaymentMethod, size: string = 'w-5 h-5') => {
    if (m === 'yape') return <YapeLogo className={size} />;
    if (m === 'plin') return <PlinLogo className={size} />;
    return <Building2 className={`${size} text-orange-600`} />;
  };

  const getMethodLabel = (m: PaymentMethod) => {
    if (m === 'yape') return 'Yape';
    if (m === 'plin') return 'Plin';
    return 'Banco';
  };

  const getPaymentNumber = (m: PaymentMethod): string | null => {
    if (!paymentConfig) return null;
    if (m === 'yape') return paymentConfig.yape_number;
    if (m === 'plin') return paymentConfig.plin_number;
    return null; // transferencia no tiene "número" simple
  };

  const getPaymentHolder = (m: PaymentMethod): string | null => {
    if (!paymentConfig) return null;
    if (m === 'yape') return paymentConfig.yape_holder;
    if (m === 'plin') return paymentConfig.plin_holder;
    return paymentConfig.bank_account_holder;
  };

  const numAmount = parseFloat(amount || '0');
  const titleLabel = requestType === 'lunch_payment' ? 'Pagar Almuerzo' : requestType === 'debt_payment' ? 'Pagar Deuda' : requestType === 'kiosk_mode_activation' ? 'Activar Recarga Kiosco' : 'Recargar Saldo';
  const availableMethods = (['yape', 'plin', 'transferencia'] as PaymentMethod[]).filter(m => isMethodAvailable(m));
  const hasAnyMethod = availableMethods.length > 0;
  const isMainVoucherComplete = !!(referenceCode.trim() && voucherFile);

  // ════════════════════════════════════════════════════════════
  //  RENDER: Success
  // ════════════════════════════════════════════════════════════
  if (view === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[360px] p-5">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">¡Enviado!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Recibimos tu comprobante de <strong>S/ {numAmount.toFixed(2)}</strong> para <strong>{studentName}</strong>.
                {splitVouchers.length > 0 && <> ({1 + splitVouchers.length} comprobantes)</>}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
              <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> ¿Qué sigue?
              </p>
              <ul className="text-[11px] text-blue-700 mt-1.5 space-y-0.5 list-disc list-inside">
                <li>Un admin verificará tu comprobante</li>
                {requestType === 'lunch_payment' && <li>Tu pedido se confirmará al aprobarse</li>}
                {requestType === 'debt_payment' && <li>La deuda se saldará al aprobarse</li>}
                {requestType === 'recharge' && <li>Saldo acreditado en menos de 24h</li>}
                {requestType === 'kiosk_mode_activation' && <li>Cuenta cambiada a modalidad Recarga al aprobarse</li>}
              </ul>
            </div>
            <Button onClick={onClose} className="w-full h-10 bg-blue-600 hover:bg-blue-700 font-semibold text-sm">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  RENDER: Form (una sola pantalla)
  // ════════════════════════════════════════════════════════════
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[380px] p-0 gap-0 overflow-hidden">
        {/* ── HEADER compacto ── */}
        <div className="px-4 pt-4 pb-2">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              {titleLabel}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {studentName}
              {hasPresetAmount && <> — <strong className="text-blue-700">S/ {numAmount.toFixed(2)}</strong></>}
            </DialogDescription>
          </DialogHeader>
        </div>

        {loadingConfig ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !hasAnyMethod ? (
          <div className="px-4 pb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center space-y-1">
              <AlertCircle className="h-6 w-6 text-amber-500 mx-auto" />
              <p className="text-xs font-medium text-amber-800">Medios de pago no configurados</p>
              <p className="text-[10px] text-amber-600">Contacta a la administración del colegio.</p>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-3">

            {/* ── MONTO (solo para recargas sin monto pre-set) ── */}
            {!hasPresetAmount && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">S/</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg h-10 text-center font-bold pl-8"
                      min="1"
                    />
                  </div>
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmount(q.toString())}
                      className={`h-10 px-2.5 rounded-lg border text-xs font-bold transition-all shrink-0
                        ${amount === q.toString()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                {numAmount > 0 && (
                  <p className="text-[10px] text-green-600 text-right">
                    Saldo final: S/ {(currentBalance + numAmount).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* ── MÉTODO DE PAGO (tabs) ── */}
            <div className="flex gap-1.5">
              {availableMethods.map((m) => {
                const isSelected = selectedMethod === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMethod(m)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-bold transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                  >
                    {getMethodIcon(m, 'w-4 h-4')}
                    {getMethodLabel(m)}
                  </button>
                );
              })}
            </div>

            {/* ── DATOS DE PAGO (número/cuenta + copiar) ── */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-1.5">
              {selectedMethod === 'transferencia' ? (
                <>
                  {/* Banco + Titular */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      {paymentConfig?.bank_name && (
                        <p className="text-[10px] text-gray-400">{paymentConfig.bank_name}</p>
                      )}
                      {getPaymentHolder('transferencia') && (
                        <p className="text-[11px] font-medium text-gray-600">{getPaymentHolder('transferencia')}</p>
                      )}
                    </div>
                  </div>
                  {/* Cuenta Corriente */}
                  {paymentConfig?.bank_account_number && (
                    <div className="flex items-center justify-between gap-1.5 bg-white rounded-md px-2.5 py-1.5 border border-gray-100">
                      <div className="min-w-0">
                        <p className="text-[9px] text-gray-400 uppercase">Cta. Corriente</p>
                        <p className="text-sm font-bold font-mono text-gray-900 truncate">{paymentConfig.bank_account_number}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(paymentConfig.bank_account_number!, 'account')}
                        className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold transition-all active:scale-95 ${
                          copiedField === 'account' ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {copiedField === 'account' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  )}
                  {/* CCI */}
                  {paymentConfig?.bank_cci && (
                    <div className="flex items-center justify-between gap-1.5 bg-white rounded-md px-2.5 py-1.5 border border-gray-100">
                      <div className="min-w-0">
                        <p className="text-[9px] text-gray-400 uppercase">CCI</p>
                        <p className="text-sm font-bold font-mono text-gray-900 truncate">{paymentConfig.bank_cci}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(paymentConfig.bank_cci!, 'cci')}
                        className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold transition-all active:scale-95 ${
                          copiedField === 'cci' ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {copiedField === 'cci' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Yape / Plin: número + titular */}
                  {getPaymentHolder(selectedMethod) && (
                    <p className="text-[10px] text-gray-400">{getPaymentHolder(selectedMethod)}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 bg-white rounded-md px-2.5 py-1.5 border border-gray-100">
                    <p className="text-lg font-bold text-gray-900 tracking-wider font-mono">
                      {getPaymentNumber(selectedMethod)}
                    </p>
                    <button
                      onClick={() => handleCopy(getPaymentNumber(selectedMethod) || '', 'number')}
                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                        copiedField === 'number' ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {copiedField === 'number' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedField === 'number' ? '✓' : 'Copiar'}
                    </button>
                  </div>
                </>
              )}
              <p className="text-[10px] text-blue-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Transfiere <strong>S/ {numAmount.toFixed(2)}</strong> y luego completa abajo
              </p>
            </div>

            {/* ── VOUCHER PRINCIPAL: N° Operación + Foto ── */}
            <div className="space-y-2">
              <div className="flex gap-2">
                {/* Input código */}
                <div className="flex-1 relative">
                  <Input
                    placeholder="N° operación *"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    className="h-10 text-sm font-mono pr-2"
                  />
                </div>
                {/* Botón foto */}
                {voucherPreview ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-green-400 shrink-0">
                    <img src={voucherPreview} alt="✓" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setVoucherFile(null); setVoucherPreview(null); }}
                      className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 shrink-0 border-2 border-dashed border-red-300 rounded-lg flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    <Camera className="h-5 w-5 text-gray-400" />
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              {!referenceCode.trim() && !voucherFile && (
                <p className="text-[10px] text-gray-400">Código de operación + foto del comprobante (obligatorios)</p>
              )}
            </div>

            {/* ── SPLIT VOUCHERS ── */}
            {splitVouchers.map((sv, idx) => (
              <div key={sv.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Header del split (siempre visible) */}
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer ${
                    sv.collapsed ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                  onClick={() => toggleSplitCollapse(sv.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {sv.referenceCode && sv.voucherFile ? (
                      <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 shrink-0">#{idx + 2}</span>
                    )}
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {sv.referenceCode && sv.voucherFile
                        ? `Pago ${idx + 2}: S/${sv.amount || '?'} — Ref: ${sv.referenceCode}`
                        : `Comprobante ${idx + 2}`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSplitVoucher(sv.id); }}
                      className="text-red-400 hover:text-red-600 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    {sv.collapsed ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronUp className="h-3 w-3 text-gray-400" />}
                  </div>
                </div>
                {/* Contenido expandido */}
                {!sv.collapsed && (
                  <div className="p-2.5 space-y-2 border-t border-gray-100">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Monto *"
                        value={sv.amount}
                        onChange={(e) => updateSplitVoucher(sv.id, 'amount', e.target.value)}
                        className="h-9 text-xs w-24"
                        min="1"
                      />
                      <Input
                        placeholder="N° operación *"
                        value={sv.referenceCode}
                        onChange={(e) => updateSplitVoucher(sv.id, 'referenceCode', e.target.value)}
                        className="h-9 text-xs font-mono flex-1"
                      />
                      {sv.voucherPreview ? (
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden border-2 border-green-400 shrink-0">
                          <img src={sv.voucherPreview} alt="✓" className="w-full h-full object-cover" />
                          <button
                            onClick={() => { updateSplitVoucher(sv.id, 'voucherFile', null); updateSplitVoucher(sv.id, 'voucherPreview', null); }}
                            className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full p-0.5"
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => handleSplitFileChange(sv.id, e as any);
                            input.click();
                          }}
                          className="w-9 h-9 shrink-0 border-2 border-dashed border-red-300 rounded-lg flex items-center justify-center hover:border-blue-400 transition-all"
                        >
                          <Camera className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Botón agregar split (compacto) */}
            <button
              onClick={addSplitVoucher}
              className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all"
            >
              <Plus className="h-3 w-3" />
              Otro comprobante (pago dividido)
            </button>

            {/* Nota (colapsada por defecto, un link que la muestra) */}
            {notes ? (
              <Input
                placeholder="Nota adicional (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 text-xs"
              />
            ) : (
              <button
                onClick={() => setNotes(' ')}
                className="text-[10px] text-gray-400 hover:text-blue-500 transition-colors text-left"
              >
                + Agregar nota (opcional)
              </button>
            )}

            {/* ── BOTÓN ENVIAR ── */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !referenceCode.trim() || !voucherFile || numAmount <= 0}
              className="w-full h-11 bg-green-600 hover:bg-green-700 font-bold text-sm gap-2 shadow-lg"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4" /> {splitVouchers.length > 0 ? `Enviar ${1 + splitVouchers.length} comprobantes` : 'Enviar comprobante'}</>
              )}
            </Button>

            {/* Link "Pagar después" para pagos */}
            {(requestType === 'lunch_payment' || requestType === 'debt_payment') && (
              <button
                onClick={onClose}
                className="w-full text-[11px] text-gray-400 hover:text-gray-600 py-1"
              >
                Pagar después
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
