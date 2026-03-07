import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { YapeLogo } from '@/components/ui/YapeLogo';
import { PlinLogo } from '@/components/ui/PlinLogo';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Clock,
  Image as ImageIcon,
  X,
  Send,
  Wallet,
  Copy,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentId: string;
  currentBalance: number;
  accountType: string;
  onRecharge: (amount: number, method: string) => Promise<void>;
  /** Si viene con monto pre-definido, salta el paso de monto */
  suggestedAmount?: number;
  /** Tipo de solicitud: 'recharge', 'lunch_payment' o 'debt_payment' */
  requestType?: 'recharge' | 'lunch_payment' | 'debt_payment';
  /** Descripción del pago (ej: "Almuerzo - Menú Niños - 20 de febrero") */
  requestDescription?: string;
  /** IDs de lunch_orders asociados (solo para lunch_payment) */
  lunchOrderIds?: string[];
  /** IDs de transacciones que se están pagando (para debt_payment) */
  paidTransactionIds?: string[];
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
}: RechargeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitFileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const skipAmountStep = !!suggestedAmount && suggestedAmount > 0;

  const [step, setStep] = useState<'amount' | 'method' | 'voucher' | 'success'>('amount');
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

  // ── Split Payments ──
  const [splitVouchers, setSplitVouchers] = useState<SplitVoucher[]>([]);

  const quickAmounts = [10, 20, 50, 100, 150, 200];

  useEffect(() => {
    if (isOpen && studentId) {
      fetchPaymentConfig();
      // Reset estado al abrir
      setReferenceCode('');
      setVoucherFile(null);
      setVoucherPreview(null);
      setNotes('');
      setSplitVouchers([]);

      if (skipAmountStep) {
        // Pre-llenar monto y saltar al paso de método
        setAmount(String(suggestedAmount));
        setStep('method');
      } else {
        setStep('amount');
        setAmount('');
      }
    }
  }, [isOpen, studentId]);

  const fetchPaymentConfig = async () => {
    setLoadingConfig(true);
    try {
      const { data: student } = await supabase
        .from('students')
        .select('school_id')
        .eq('id', studentId)
        .single();

      if (!student?.school_id) return;

      const { data: config } = await supabase
        .from('billing_config')
        .select('yape_number, yape_holder, yape_enabled, plin_number, plin_holder, plin_enabled, bank_account_info, bank_account_holder, transferencia_enabled, bank_name, bank_account_number, bank_cci, show_payment_info')
        .eq('school_id', student.school_id)
        .single();

      setPaymentConfig(config || null);
    } catch (err) {
      console.error('Error al cargar config de pagos:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'Máximo 5 MB', variant: 'destructive' });
      return;
    }

    setVoucherFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setVoucherPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Split voucher file handler ──
  const handleSplitFileChange = (splitId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'Máximo 5 MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setSplitVouchers(prev => prev.map(sv =>
        sv.id === splitId ? { ...sv, voucherFile: file, voucherPreview: ev.target?.result as string } : sv
      ));
    };
    reader.readAsDataURL(file);
  };

  // ── Anti-duplicado de código de operación en BD ──
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
    setSplitVouchers(prev => [...prev, {
      id: `split_${Date.now()}`,
      amount: '',
      referenceCode: '',
      voucherFile: null,
      voucherPreview: null,
    }]);
  };

  const removeSplitVoucher = (id: string) => {
    setSplitVouchers(prev => prev.filter(sv => sv.id !== id));
  };

  const updateSplitVoucher = (id: string, field: keyof SplitVoucher, value: any) => {
    setSplitVouchers(prev => prev.map(sv =>
      sv.id === id ? { ...sv, [field]: value } : sv
    ));
  };

  const handleSubmit = async () => {
    if (!user) return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: 'Monto inválido', description: 'Ingresa un monto mayor a S/ 0', variant: 'destructive' });
      return;
    }

    // ── Validar voucher principal: código OBLIGATORIO + foto OBLIGATORIA ──
    if (!referenceCode.trim()) {
      toast({
        title: 'Código de operación obligatorio',
        description: 'Ingresa el número de operación de tu transferencia.',
        variant: 'destructive',
      });
      return;
    }

    if (!voucherFile) {
      toast({
        title: 'Foto del comprobante obligatoria',
        description: 'Adjunta la captura de pantalla de tu comprobante de pago.',
        variant: 'destructive',
      });
      return;
    }

    // ── Validar splits (si hay) ──
    const totalVouchers = 1 + splitVouchers.length;
    for (let i = 0; i < splitVouchers.length; i++) {
      const sv = splitVouchers[i];
      if (!sv.referenceCode.trim()) {
        toast({
          variant: 'destructive',
          title: `Pago ${i + 2} de ${totalVouchers}: falta código`,
          description: 'Cada comprobante necesita su número de operación.',
        });
        return;
      }
      if (!sv.voucherFile) {
        toast({
          variant: 'destructive',
          title: `Pago ${i + 2} de ${totalVouchers}: falta foto`,
          description: 'Cada comprobante necesita su captura.',
        });
        return;
      }
      if (!sv.amount || parseFloat(sv.amount) <= 0) {
        toast({
          variant: 'destructive',
          title: `Pago ${i + 2} de ${totalVouchers}: falta monto`,
          description: 'Cada comprobante necesita su monto.',
        });
        return;
      }
    }

    // ── Anti-duplicado LOCAL: códigos entre vouchers del mismo envío ──
    const allCodes = [referenceCode.trim(), ...splitVouchers.map(sv => sv.referenceCode.trim())];
    const uniqueCodes = new Set(allCodes);
    if (uniqueCodes.size !== allCodes.length) {
      toast({
        variant: 'destructive',
        title: '⚠️ Códigos repetidos',
        description: 'Los números de operación de cada comprobante deben ser diferentes.',
      });
      return;
    }

    setLoading(true);
    try {
      // ── Anti-duplicado de código en BD ──
      for (const code of allCodes) {
        const isDuplicate = await checkDuplicateCode(code);
        if (isDuplicate) {
          toast({
            variant: 'destructive',
            title: '⚠️ Voucher ya emitido o usado',
            description: `El código "${code}" ya fue enviado anteriormente. Usa un código diferente.`,
          });
          setLoading(false);
          return;
        }
      }

      // ── Prevenir doble envío de voucher para los mismos pedidos ──
      if ((requestType === 'lunch_payment' || requestType === 'debt_payment') && lunchOrderIds && lunchOrderIds.length > 0) {
        const { data: existingReq } = await supabase
          .from('recharge_requests')
          .select('id, status')
          .eq('parent_id', user.id)
          .in('request_type', ['lunch_payment', 'debt_payment'])
          .eq('status', 'pending')
          .contains('lunch_order_ids', lunchOrderIds);

        if (existingReq && existingReq.length > 0) {
          toast({
            variant: 'destructive',
            title: '⚠️ Comprobante ya enviado',
            description: 'Ya enviaste un comprobante para estos pedidos. Espera la revisión del administrador.',
          });
          setLoading(false);
          return;
        }
      }

      // Prevenir doble envío para debt_payment con transaction IDs
      if (requestType === 'debt_payment' && paidTransactionIds && paidTransactionIds.length > 0) {
        const { data: existingDebt } = await supabase
          .from('recharge_requests')
          .select('id, status')
          .eq('parent_id', user.id)
          .eq('request_type', 'debt_payment')
          .eq('status', 'pending')
          .eq('student_id', studentId);

        if (existingDebt && existingDebt.length > 0) {
          toast({
            variant: 'destructive',
            title: '⚠️ Comprobante ya enviado',
            description: 'Ya tienes un comprobante pendiente de revisión para este alumno.',
          });
          setLoading(false);
          return;
        }
      }

      // ── Obtener school_id ──
      const { data: student } = await supabase
        .from('students')
        .select('school_id')
        .eq('id', studentId)
        .single();

      const schoolId = student?.school_id || null;

      // ── Función auxiliar: subir imagen ──
      const uploadVoucher = async (file: File): Promise<string | null> => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeName = `voucher_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const fileName = `${user.id}/${safeName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vouchers')
          .upload(fileName, file, { upsert: false });

        if (uploadError) {
          throw new Error(`Error al subir imagen: ${uploadError.message}`);
        }
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('vouchers').getPublicUrl(uploadData.path);
          return publicUrl;
        }
        return null;
      };

      // ── Subir y crear solicitudes ──
      if (splitVouchers.length === 0) {
        // === ENVÍO ÚNICO (sin split) ===
        const voucherUrl = await uploadVoucher(voucherFile);

        const { error: insertError } = await supabase.from('recharge_requests').insert({
          student_id: studentId,
          parent_id: user.id,
          school_id: schoolId,
          amount: numAmount,
          payment_method: selectedMethod,
          reference_code: referenceCode.trim(),
          voucher_url: voucherUrl,
          notes: notes.trim() || null,
          status: 'pending',
          request_type: requestType,
          description: requestDescription || (
            requestType === 'lunch_payment' ? 'Pago de almuerzo' :
            requestType === 'debt_payment' ? 'Pago de deuda pendiente' :
            'Recarga de saldo'
          ),
          lunch_order_ids: lunchOrderIds || null,
          paid_transaction_ids: paidTransactionIds || null,
        });

        if (insertError) throw insertError;
      } else {
        // === SPLIT PAYMENTS (múltiples vouchers) ===
        // Calcular montos: si el usuario no especificó monto en el principal, usar el total menos los splits
        const splitTotal = splitVouchers.reduce((sum, sv) => sum + (parseFloat(sv.amount) || 0), 0);
        const mainAmount = numAmount - splitTotal;

        if (mainAmount <= 0) {
          toast({
            variant: 'destructive',
            title: 'Montos inválidos',
            description: 'La suma de los comprobantes adicionales supera el monto total.',
          });
          setLoading(false);
          return;
        }

        const baseDesc = requestType === 'lunch_payment' ? 'Pago almuerzo' :
          requestType === 'debt_payment' ? 'Pago de deuda' : 'Recarga de saldo';

        // Voucher principal (1 de N)
        const mainVoucherUrl = await uploadVoucher(voucherFile);
        const { error: mainInsertError } = await supabase.from('recharge_requests').insert({
          student_id: studentId,
          parent_id: user.id,
          school_id: schoolId,
          amount: mainAmount,
          payment_method: selectedMethod,
          reference_code: referenceCode.trim(),
          voucher_url: mainVoucherUrl,
          notes: notes.trim() || null,
          status: 'pending',
          request_type: requestType,
          description: `${requestDescription || baseDesc} (Pago 1 de ${totalVouchers})`,
          lunch_order_ids: lunchOrderIds || null,
          paid_transaction_ids: paidTransactionIds || null,
        });
        if (mainInsertError) throw mainInsertError;

        // Vouchers adicionales (2 de N, 3 de N, etc.)
        for (let i = 0; i < splitVouchers.length; i++) {
          const sv = splitVouchers[i];
          const svUrl = await uploadVoucher(sv.voucherFile!);
          const { error: svInsertError } = await supabase.from('recharge_requests').insert({
            student_id: studentId,
            parent_id: user.id,
            school_id: schoolId,
            amount: parseFloat(sv.amount),
            payment_method: selectedMethod,
            reference_code: sv.referenceCode.trim(),
            voucher_url: svUrl,
            notes: notes.trim() || null,
            status: 'pending',
            request_type: requestType,
            description: `${requestDescription || baseDesc} (Pago ${i + 2} de ${totalVouchers})`,
            lunch_order_ids: lunchOrderIds || null,
            paid_transaction_ids: paidTransactionIds || null,
          });
          if (svInsertError) throw svInsertError;
        }
      }

      setStep('success');
    } catch (err: any) {
      console.error('Error al enviar solicitud:', err);
      toast({
        title: 'Error al enviar',
        description: err.message || 'Ocurrió un error. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Copiar al portapapeles con feedback visual ──
  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      // fallback para navegadores sin clipboard API
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

  const methodInfo: Record<PaymentMethod, {
    label: string;
    icon: React.ReactNode;
    color: string;
    number: string | null;
    holder: string | null;
    hint: string;
    enabled: boolean;
    bankName?: string | null;
    accountNumber?: string | null;
    cci?: string | null;
  }> = {
    yape: {
      label: 'Yape',
      icon: <YapeLogo className="w-8 h-8" />,
      color: 'purple',
      enabled: paymentConfig?.yape_enabled ?? true,
      number: paymentConfig?.yape_number || null,
      holder: paymentConfig?.yape_holder || null,
      hint: 'Abre tu app de Yape y transfiere al número indicado.',
    },
    plin: {
      label: 'Plin',
      icon: <PlinLogo className="w-8 h-8" />,
      color: 'green',
      enabled: paymentConfig?.plin_enabled ?? true,
      number: paymentConfig?.plin_number || null,
      holder: paymentConfig?.plin_holder || null,
      hint: 'Abre tu app de Plin y transfiere al número indicado.',
    },
    transferencia: {
      label: 'Transferencia',
      icon: <Building2 className="h-7 w-7 text-orange-600" />,
      color: 'orange',
      enabled: paymentConfig?.transferencia_enabled ?? true,
      // number se usa para saber si está disponible
      number: (paymentConfig?.bank_account_number || paymentConfig?.bank_cci || paymentConfig?.bank_account_info) ? 'available' : null,
      holder: paymentConfig?.bank_account_holder || null,
      hint: 'Realiza una transferencia bancaria con los datos indicados.',
      bankName: paymentConfig?.bank_name || null,
      accountNumber: paymentConfig?.bank_account_number || null,
      cci: paymentConfig?.bank_cci || null,
    },
  };

  const currentMethodInfo = methodInfo[selectedMethod];

  // Determinar pasos visibles
  const visibleSteps = skipAmountStep 
    ? ['method', 'voucher'] as const
    : ['amount', 'method', 'voucher'] as const;
  const currentStepIndex = visibleSteps.indexOf(step as any);

  // ─────────────────────── PASO 1: Monto ───────────────────────
  const renderStepAmount = () => (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Saldo actual de {studentName}</p>
          <p className="text-2xl font-bold text-blue-700">S/ {currentBalance.toFixed(2)}</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 text-xs">Con Recargas</Badge>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">¿Cuánto deseas recargar?</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">S/</span>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-2xl h-14 text-center font-bold pl-10"
            min="1"
            step="1"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          {quickAmounts.map((q) => (
            <Button
              key={q}
              variant={amount === q.toString() ? 'default' : 'outline'}
              onClick={() => setAmount(q.toString())}
              className="h-11 font-semibold"
            >
              S/ {q}
            </Button>
          ))}
        </div>
      </div>

      {amount && parseFloat(amount) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between text-sm">
          <span className="text-gray-600">Saldo después de recarga:</span>
          <span className="font-bold text-green-700">S/ {(currentBalance + parseFloat(amount)).toFixed(2)}</span>
        </div>
      )}

      <Button
        onClick={() => setStep('method')}
        disabled={!amount || parseFloat(amount) <= 0}
        className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
      >
        Continuar →
      </Button>
    </div>
  );

  // ─────────────────────── PASO 2: Método + instrucciones ───────────────────────
  const renderStepMethod = () => {
    const hasAnyMethod = !!(
      (paymentConfig?.yape_enabled !== false && paymentConfig?.yape_number) ||
      (paymentConfig?.plin_enabled !== false && paymentConfig?.plin_number) ||
      (paymentConfig?.transferencia_enabled !== false && (paymentConfig?.bank_account_number || paymentConfig?.bank_cci || paymentConfig?.bank_account_info))
    );

    return (
      <div className="space-y-4">
        {/* Resumen de recarga */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{requestType === 'lunch_payment' ? `Pago almuerzo — ${studentName}` : requestType === 'debt_payment' ? `Pago deuda — ${studentName}` : `Recarga para ${studentName}`}</p>
            <p className="text-xl font-bold text-blue-700">S/ {parseFloat(amount || '0').toFixed(2)}</p>
          </div>
          {!skipAmountStep && (
            <button onClick={() => setStep('amount')} className="text-xs text-blue-600 hover:underline">
              Cambiar
            </button>
          )}
        </div>

        {!hasAnyMethod ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
            <p className="text-sm font-medium text-amber-800">Medios de pago no configurados</p>
            <p className="text-xs text-amber-600">
              El colegio aún no ha configurado números de Yape, Plin o cuenta bancaria. 
              Contacta a la administración del colegio.
            </p>
          </div>
        ) : (
          <>
            {/* Selector de método */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Elige cómo vas a pagar</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(methodInfo) as PaymentMethod[]).map((m) => {
                  const info = methodInfo[m];
                  const isAvailable = !!info.number && info.enabled;
                  const isSelected = selectedMethod === m;
                  return (
                    <button
                      key={m}
                      onClick={() => isAvailable && setSelectedMethod(m)}
                      disabled={!isAvailable}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all
                        ${isSelected && isAvailable ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white'}
                        ${!isAvailable ? 'opacity-30 cursor-not-allowed' : 'hover:border-gray-300 cursor-pointer'}
                      `}
                    >
                      <div className="h-10 w-10 flex items-center justify-center">{info.icon}</div>
                      <span className="text-xs font-semibold text-gray-800">{info.label}</span>
                      {!isAvailable && <span className="text-[10px] text-gray-400">No disponible</span>}
                    </button>
                  );
                })}
              </div>
            </div>

                {/* Instrucciones de pago */}
                {currentMethodInfo.number && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      📋 Pasos a seguir
                    </p>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                        <span>{currentMethodInfo.hint}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                        <span>Transfiere exactamente <strong>S/ {parseFloat(amount).toFixed(2)}</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                        <span>Toma captura del comprobante y envíalo en el siguiente paso</span>
                      </div>
                    </div>

                    {/* ── Datos de pago con botones COPIAR ── */}
                    <div className="bg-white border-2 border-dashed border-blue-300 rounded-xl overflow-hidden">
                      <div className="bg-blue-50 px-3 py-1.5 border-b border-blue-200">
                        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                          {selectedMethod === 'transferencia' ? '🏦 Datos bancarios — copia los números' : `📱 Número de ${currentMethodInfo.label}`}
                        </p>
                      </div>

                      <div className="p-3 space-y-2">
                        {selectedMethod === 'transferencia' ? (
                          <>
                            {/* Banco — solo display */}
                            {methodInfo.transferencia.bankName && (
                              <div className="pb-1.5 border-b border-gray-100">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Banco</p>
                                <p className="text-sm font-semibold text-gray-800">{methodInfo.transferencia.bankName}</p>
                              </div>
                            )}
                            {/* Titular — solo display, sin botón copiar */}
                            {currentMethodInfo.holder && (
                              <div className="pb-1.5 border-b border-gray-100">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Titular</p>
                                <p className="text-sm font-semibold text-gray-800">{currentMethodInfo.holder}</p>
                              </div>
                            )}
                            {/* Cuenta Corriente — con botón copiar */}
                            {methodInfo.transferencia.accountNumber && (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cuenta Corriente</p>
                                  <p className="text-base font-bold font-mono text-gray-900 break-all">{methodInfo.transferencia.accountNumber}</p>
                                </div>
                                <button
                                  onClick={() => handleCopy(methodInfo.transferencia.accountNumber!, 'account')}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all shrink-0 active:scale-95 ${
                                    copiedField === 'account'
                                      ? 'bg-green-100 text-green-700 border-green-300'
                                      : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                  }`}
                                >
                                  {copiedField === 'account' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  {copiedField === 'account' ? '¡Copiado!' : 'Copiar'}
                                </button>
                              </div>
                            )}
                            {/* CCI — con botón copiar */}
                            {methodInfo.transferencia.cci && (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">CCI</p>
                                  <p className="text-base font-bold font-mono text-gray-900 break-all">{methodInfo.transferencia.cci}</p>
                                </div>
                                <button
                                  onClick={() => handleCopy(methodInfo.transferencia.cci!, 'cci')}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all shrink-0 active:scale-95 ${
                                    copiedField === 'cci'
                                      ? 'bg-green-100 text-green-700 border-green-300'
                                      : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                  }`}
                                >
                                  {copiedField === 'cci' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  {copiedField === 'cci' ? '¡Copiado!' : 'Copiar'}
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Titular Yape/Plin — solo display, sin botón copiar */}
                            {currentMethodInfo.holder && (
                              <div className="pb-1.5 border-b border-gray-100">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Titular</p>
                                <p className="text-sm font-semibold text-gray-800">{currentMethodInfo.holder}</p>
                              </div>
                            )}
                            {/* Número — con botón copiar */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Número</p>
                                <p className="text-2xl font-bold text-gray-900 tracking-widest">{currentMethodInfo.number}</p>
                              </div>
                              <button
                                onClick={() => handleCopy(currentMethodInfo.number!, 'number')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all shrink-0 active:scale-95 ${
                                  copiedField === 'number'
                                    ? 'bg-green-100 text-green-700 border-green-300'
                                    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                {copiedField === 'number' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copiedField === 'number' ? '¡Copiado!' : 'Copiar'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 text-xs text-blue-800">
                      <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>Verificaremos tu pago y <strong>acreditaremos el saldo en menos de 24 horas</strong>.</span>
                    </div>
                  </div>
                )}
          </>
        )}

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => setStep('voucher')}
            disabled={!currentMethodInfo.number}
            className="h-11 bg-blue-600 hover:bg-blue-700 font-semibold w-full"
          >
            Ya pagué → Enviar comprobante
          </Button>
          <div className="flex gap-2">
            {!skipAmountStep && (
              <Button variant="outline" onClick={() => setStep('amount')} className="flex-1 h-10">
                ← Atrás
              </Button>
            )}
            {(requestType === 'lunch_payment' || requestType === 'debt_payment') && (
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-10 text-gray-500 hover:text-gray-700"
              >
                Pagar después
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────── PASO 3: Subir voucher ───────────────────────
  const renderStepVoucher = () => (
    <div className="space-y-5">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between text-sm">
        <span className="text-gray-600">{requestType === 'lunch_payment' ? 'Pago almuerzo:' : requestType === 'debt_payment' ? 'Pago deuda:' : 'Recarga solicitada:'}</span>
        <span className="font-bold text-blue-700">S/ {parseFloat(amount).toFixed(2)} vía {currentMethodInfo.label}</span>
      </div>

      {/* Número de operación — OBLIGATORIO */}
      <div className="space-y-1">
        <Label className="font-semibold">
          Número de operación <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder="Ej: 123456789"
          value={referenceCode}
          onChange={(e) => setReferenceCode(e.target.value)}
          className="font-mono"
        />
        <p className="text-xs text-gray-400">Lo encuentras en tu app de Yape/Plin/banco después de realizar el pago.</p>
      </div>

      {/* Subir imagen — OBLIGATORIA */}
      <div className="space-y-2">
        <Label className="font-semibold">Captura del comprobante <span className="text-red-500">*</span></Label>

        {voucherPreview ? (
          <div className="relative">
            <img src={voucherPreview} alt="Voucher" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
            <button
              onClick={() => { setVoucherFile(null); setVoucherPreview(null); }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-28 border-2 border-dashed border-red-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-500"
          >
            <Upload className="h-6 w-6" />
            <span className="text-sm">Toca para adjuntar captura de pantalla</span>
            <span className="text-xs text-red-400">Obligatorio — JPG, PNG — máx. 5 MB</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* ── SPLIT PAYMENTS: Comprobantes adicionales ── */}
      {splitVouchers.length > 0 && (
        <div className="space-y-3">
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Comprobantes adicionales</p>
          </div>
          {splitVouchers.map((sv, idx) => (
            <div key={sv.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Pago {idx + 2} de {1 + splitVouchers.length}</span>
                <button onClick={() => removeSplitVoucher(sv.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Monto <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    placeholder="S/ 0.00"
                    value={sv.amount}
                    onChange={(e) => updateSplitVoucher(sv.id, 'amount', e.target.value)}
                    className="text-sm h-9"
                    min="1"
                  />
                </div>
                <div>
                  <Label className="text-xs">N° Operación <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="123456789"
                    value={sv.referenceCode}
                    onChange={(e) => updateSplitVoucher(sv.id, 'referenceCode', e.target.value)}
                    className="text-sm h-9 font-mono"
                  />
                </div>
              </div>
              {/* Foto del split */}
              {sv.voucherPreview ? (
                <div className="relative">
                  <img src={sv.voucherPreview} alt="Voucher split" className="w-full max-h-24 object-contain rounded-lg border border-gray-200" />
                  <button
                    onClick={() => updateSplitVoucher(sv.id, 'voucherFile', null) || updateSplitVoucher(sv.id, 'voucherPreview', null)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="h-2.5 w-2.5" />
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
                  className="w-full h-16 border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-400 transition-all text-gray-400 text-xs"
                >
                  <Upload className="h-4 w-4" />
                  <span>Adjuntar captura <span className="text-red-400">*</span></span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botón para agregar split */}
      <button
        onClick={addSplitVoucher}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
      >
        <Plus className="h-4 w-4" />
        Agregar comprobante adicional (pago dividido)
      </button>

      {/* Nota adicional */}
      <div className="space-y-1">
        <Label className="text-sm">Nota adicional <span className="text-gray-400">(opcional)</span></Label>
        <Input
          placeholder={requestType === 'debt_payment' ? 'Ej: Pago de deudas pendientes' : requestType === 'lunch_payment' ? 'Ej: Pago de almuerzo del 20/02' : 'Ej: Recarga para la semana del 20/02'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('method')} className="flex-1 h-11">← Atrás</Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !referenceCode.trim() || !voucherFile}
          className="flex-grow h-11 bg-green-600 hover:bg-green-700 font-semibold gap-2"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
          ) : (
            <><Send className="h-4 w-4" /> {splitVouchers.length > 0 ? `Enviar ${1 + splitVouchers.length} comprobantes` : 'Enviar comprobante'}</>
          )}
        </Button>
      </div>
    </div>
  );

  // ─────────────────────── PASO 4: Éxito ───────────────────────
  const renderStepSuccess = () => (
    <div className="text-center space-y-5 py-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900">¡Comprobante enviado!</h3>
        <p className="text-gray-500 mt-2 text-sm">
          {requestType === 'lunch_payment'
            ? <>Recibimos tu pago de almuerzo de <strong>S/ {parseFloat(amount).toFixed(2)}</strong> para <strong>{studentName}</strong>.</>
            : requestType === 'debt_payment'
            ? <>Recibimos tu pago de deuda de <strong>S/ {parseFloat(amount).toFixed(2)}</strong> para <strong>{studentName}</strong>.</>
            : <>Recibimos tu solicitud de recarga de <strong>S/ {parseFloat(amount).toFixed(2)}</strong> para <strong>{studentName}</strong>.</>
          }
        </p>
        {splitVouchers.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Se enviaron {1 + splitVouchers.length} comprobantes (pago dividido).
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left space-y-2">
        <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          <Clock className="h-4 w-4" /> ¿Qué pasa ahora?
        </p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Un administrador verificará tu comprobante</li>
          {requestType === 'lunch_payment' ? (
            <>
              <li>Tu pedido de almuerzo quedará <strong>confirmado</strong> al aprobarse</li>
              <li>Recibirás la confirmación en la app</li>
            </>
          ) : requestType === 'debt_payment' ? (
            <>
              <li>Tus compras pendientes se marcarán como <strong>pagadas</strong></li>
              <li>La deuda desaparecerá de tu cuenta al aprobarse</li>
            </>
          ) : (
            <>
              <li>El saldo se acreditará en menos de 24 horas</li>
              <li>Podrás ver el saldo actualizado en la app</li>
            </>
          )}
        </ul>
      </div>

      <Button onClick={onClose} className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-semibold">
        Entendido
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            {step === 'success' ? '¡Listo!' : requestType === 'lunch_payment' ? 'Pagar Almuerzo' : requestType === 'debt_payment' ? 'Pagar Deuda' : 'Recargar Saldo'}
          </DialogTitle>
          {step !== 'success' && (
            <DialogDescription>
              Para <strong>{studentName}</strong>
              {step !== 'amount' && <> — <strong>S/ {parseFloat(amount || '0').toFixed(2)}</strong></>}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Indicador de pasos */}
        {step !== 'success' && (
          <div className="flex items-center gap-1 mb-1">
            {visibleSteps.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`h-2 rounded-full flex-1 transition-colors ${
                  step === s ? 'bg-blue-500' :
                  currentStepIndex > i ? 'bg-green-400' : 'bg-gray-200'
                }`} />
              </div>
            ))}
          </div>
        )}

        {loadingConfig ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {step === 'amount' && renderStepAmount()}
            {step === 'method' && renderStepMethod()}
            {step === 'voucher' && renderStepVoucher()}
            {step === 'success' && renderStepSuccess()}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
