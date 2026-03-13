import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { RechargeModal } from './RechargeModal';
import {
  Wallet,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  Loader2,
  ShoppingBag,
  Clock,
} from 'lucide-react';

interface KioskAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentBalance: number;
  freeAccount: boolean;
  totalDebt: number;
  onGoToPayments: () => void;
  onAccountChanged: () => void;
  schoolId?: string;
}

interface PendingRechargeRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  request_type: string;
}

export function KioskAccountModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  currentBalance,
  freeAccount,
  totalDebt,
  onGoToPayments,
  onAccountChanged,
  schoolId,
}: KioskAccountModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<PendingRechargeRequest | null>(null);
  const [checkingPending, setCheckingPending] = useState(false);

  // Control del RechargeModal embebido
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeMode, setRechargeMode] = useState<'activation' | 'topup'>('topup');

  const isLibre = freeAccount !== false;
  const isRecarga = freeAccount === false;
  const hasDebt = totalDebt > 0;
  const debtExceedsLimit = totalDebt > 100;

  useEffect(() => {
    if (isOpen && studentId) {
      checkPendingActivationRequest();
    }
  }, [isOpen, studentId]);

  const checkPendingActivationRequest = async () => {
    setCheckingPending(true);
    try {
      const { data } = await supabase
        .from('recharge_requests')
        .select('id, amount, status, created_at, request_type')
        .eq('student_id', studentId)
        .eq('request_type', 'kiosk_mode_activation')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPendingRequest(data || null);
    } catch (err) {
      console.error('Error verificando solicitud pendiente:', err);
      setPendingRequest(null);
    } finally {
      setCheckingPending(false);
    }
  };

  // Abre el RechargeModal en modo "activación" (mínimo S/10)
  const handleActivateRecarga = () => {
    if (hasDebt) {
      toast({
        variant: 'destructive',
        title: 'No puedes activar Recarga',
        description: `Tienes una deuda de S/ ${totalDebt.toFixed(2)}. Paga la deuda primero para cambiar de modalidad.`,
      });
      return;
    }
    setRechargeMode('activation');
    setShowRechargeModal(true);
  };

  // Abre el RechargeModal en modo "recarga de saldo" normal
  const handleTopUp = () => {
    setRechargeMode('topup');
    setShowRechargeModal(true);
  };

  const handleRechargeClose = () => {
    setShowRechargeModal(false);
    // Re-verificar si ya existe solicitud pendiente (por si acaba de enviar)
    checkPendingActivationRequest();
    // Refrescar datos del alumno en el padre
    onAccountChanged();
  };

  // Volver a Libre
  const handleSwitchToLibre = async () => {
    if (pendingRequest && pendingRequest.status === 'pending') {
      toast({
        title: 'Solicitud en revisión',
        description: 'Tienes una solicitud de activación pendiente. Espera a que el admin la apruebe o rechace.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ free_account: true })
        .eq('id', studentId);

      if (error) throw error;

      toast({
        title: 'Modalidad cambiada',
        description: `${studentName} ahora está en modalidad Libre (crédito).`,
      });
      onAccountChanged();
      onClose();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'No se pudo cambiar la modalidad.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[380px] p-0 gap-0 overflow-hidden rounded-2xl">

          {/* Header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 px-5 pt-5 pb-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-white text-base font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
                Cuenta Kiosco
              </DialogTitle>
              <p className="text-slate-300 text-xs">{studentName}</p>
            </DialogHeader>

            {/* Badge del modo actual */}
            <div className="mt-3 flex items-center gap-2">
              {isRecarga ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Modo Recarga (Prepago)
                </Badge>
              ) : (
                <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                  <Zap className="h-3 w-3 mr-1.5" />
                  Modo Libre (Crédito)
                </Badge>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* ══════════ SALDO (solo en modo Recarga) ══════════ */}
            {isRecarga && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">
                    Saldo disponible
                  </p>
                  <p className="text-3xl font-light text-emerald-700">
                    S/ {currentBalance.toFixed(2)}
                  </p>
                </div>
                <div className="bg-emerald-100 rounded-xl p-3">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            )}

            {/* ══════════ DEUDA (modo Libre) ══════════ */}
            {isLibre && (
              <div className={`rounded-xl p-4 flex items-center justify-between border ${
                debtExceedsLimit
                  ? 'bg-red-50 border-red-200'
                  : hasDebt
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${
                    debtExceedsLimit ? 'text-red-600' : hasDebt ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    {hasDebt ? 'Deuda acumulada' : 'Sin deudas'}
                  </p>
                  <p className={`text-3xl font-light ${
                    debtExceedsLimit ? 'text-red-600' : hasDebt ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {hasDebt ? `S/ ${totalDebt.toFixed(2)}` : '✓ Al día'}
                  </p>
                  {debtExceedsLimit && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Deuda alta, considera pagar pronto
                    </p>
                  )}
                </div>
                <div className={`rounded-xl p-3 ${
                  debtExceedsLimit ? 'bg-red-100' : hasDebt ? 'bg-amber-100' : 'bg-slate-100'
                }`}>
                  <Wallet className={`h-6 w-6 ${
                    debtExceedsLimit ? 'text-red-600' : hasDebt ? 'text-amber-600' : 'text-slate-500'
                  }`} />
                </div>
              </div>
            )}

            {/* ══════════ DESCRIPCIÓN DEL MODO ACTUAL ══════════ */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-500" />
                ¿Cómo funciona este modo?
              </p>
              {isRecarga ? (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Prepago:</strong> {studentName} solo puede comprar en el kiosco si tiene saldo disponible.
                  Recarga el saldo con anticipación para que pueda seguir comprando.
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Crédito:</strong> {studentName} puede comprar libremente. Los consumos se registran como
                  deuda y los pagas al final del período. No hay límite de compra.
                </p>
              )}
            </div>

            {/* ══════════ ALERTA DEUDA > S/100 ══════════ */}
            {debtExceedsLimit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-red-700">Deuda superior a S/ 100</p>
                  <p className="text-[11px] text-red-600 leading-relaxed">
                    La deuda de {studentName} ha superado S/ 100. Te recomendamos regularizarla pronto.
                    El kiosco sigue funcionando con normalidad.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => { onClose(); onGoToPayments(); }}
                    className="mt-1.5 h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    Ir a Pagos para saldar deuda
                    <ArrowRight className="h-3 w-3 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ══════════ ACCIONES SEGÚN MODO ══════════ */}
            {checkingPending ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : isLibre ? (
              /* ── MODO LIBRE: activar Recarga ── */
              <div className="space-y-3">
                {pendingRequest && pendingRequest.status === 'pending' ? (
                  /* Solicitud pendiente de revisión */
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="text-xs font-semibold text-amber-700">Activación en revisión</p>
                    </div>
                    <p className="text-[11px] text-amber-600 leading-relaxed">
                      Enviaste un depósito de <strong>S/ {pendingRequest.amount.toFixed(2)}</strong> para activar
                      la modalidad Recarga. Mientras el admin no apruebe el pago, la cuenta sigue en modalidad Libre.
                    </p>
                    <div className="bg-amber-100 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-amber-700 font-medium text-center">
                        ⏳ Para activar la modalidad de Recarga, debes depositar un mínimo de S/ 10.
                        Hasta que el pago sea aprobado, tu cuenta seguirá en modalidad Libre.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Sin solicitud pendiente */
                  <div className="space-y-3">
                    {hasDebt && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-rose-600 leading-relaxed">
                          Tienes una deuda de <strong>S/ {totalDebt.toFixed(2)}</strong>. Debes pagarla antes
                          de poder activar la modalidad Recarga.
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Activar modalidad Recarga
                      </p>
                      <p className="text-[11px] text-blue-600 leading-relaxed">
                        Para activar la modalidad de Recarga, debes depositar un mínimo de{' '}
                        <strong>S/ 10</strong>. Hasta que el pago sea aprobado por el administrador,
                        tu cuenta seguirá en modalidad Libre.
                      </p>
                      <Button
                        onClick={handleActivateRecarga}
                        disabled={hasDebt}
                        className={`w-full h-10 text-xs font-semibold gap-2 ${
                          hasDebt
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {hasDebt ? 'Paga tu deuda primero' : 'Depositar S/ 10 mínimo para activar'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── MODO RECARGA: recargar saldo y opción de volver a Libre ── */
              <div className="space-y-3">
                <Button
                  onClick={handleTopUp}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  Recargar saldo
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ¿Quieres volver a modalidad Libre? El saldo restante de{' '}
                    <strong>S/ {currentBalance.toFixed(2)}</strong> se mantendrá registrado.
                  </p>
                  <button
                    onClick={handleSwitchToLibre}
                    disabled={loading}
                    className="text-[11px] text-slate-500 hover:text-blue-600 underline transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Cambiando...' : 'Cambiar a modalidad Libre'}
                  </button>
                </div>
              </div>
            )}

            {/* ══════════ LEYENDA ══════════ */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  El kiosco <strong>nunca se bloquea</strong> por falta de fondos.{' '}
                  {studentName} siempre puede comprar independientemente del modo o deuda.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── RechargeModal embebido (activación o recarga de saldo) ── */}
      <RechargeModal
        isOpen={showRechargeModal}
        onClose={handleRechargeClose}
        studentName={studentName}
        studentId={studentId}
        currentBalance={currentBalance}
        accountType={isRecarga ? 'recarga' : 'libre'}
        onRecharge={async () => {}}
        schoolId={schoolId}
        requestType={rechargeMode === 'activation' ? 'kiosk_mode_activation' : 'recharge'}
        requestDescription={
          rechargeMode === 'activation'
            ? `Activación modalidad Recarga - ${studentName} (mínimo S/ 10)`
            : `Recarga de saldo kiosco - ${studentName}`
        }
        suggestedAmount={rechargeMode === 'activation' ? 10 : undefined}
      />
    </>
  );
}
