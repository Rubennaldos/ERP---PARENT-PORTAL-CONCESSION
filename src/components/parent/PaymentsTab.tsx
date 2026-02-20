import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CreditCard, Check, Clock, Receipt, XCircle, Loader2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingTransaction {
  id: string;
  student_id: string;
  student_name: string;
  amount: number;
  description: string;
  created_at: string;
  ticket_code?: string;
  metadata?: any;
}

interface VoucherStatus {
  transaction_id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at?: string;
}

interface StudentDebt {
  student_id: string;
  student_name: string;
  student_photo: string | null;
  total_debt: number;
  pending_transactions: PendingTransaction[];
}

interface PaymentsTabProps {
  userId: string;
}

export const PaymentsTab = ({ userId }: PaymentsTabProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<StudentDebt[]>([]);
  const [voucherStatuses, setVoucherStatuses] = useState<Map<string, VoucherStatus>>(new Map());

  useEffect(() => {
    fetchDebts();
  }, [userId]);

  const fetchDebts = async () => {
    try {
      setLoading(true);

      // Obtener todos los estudiantes activos del padre
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, photo_url, free_account, school_id')
        .eq('parent_id', userId)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setDebts([]);
        return;
      }

      const debtsData: StudentDebt[] = [];

      for (const student of students) {
        const { data: delayData } = await supabase
          .from('purchase_visibility_delay')
          .select('delay_days')
          .eq('school_id', student.school_id)
          .maybeSingle();

        const delayDays = delayData?.delay_days ?? 2;
        
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('student_id', student.id)
          .eq('type', 'purchase')
          .eq('payment_status', 'pending');

        if (delayDays > 0) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - delayDays);
          query = query.lte('created_at', cutoffDate.toISOString());
        }

        const { data: transactions, error: transError } = await query
          .order('created_at', { ascending: false });

        if (transError) throw transError;

        if (transactions && transactions.length > 0) {
          const totalDebt = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

          debtsData.push({
            student_id: student.id,
            student_name: student.full_name,
            student_photo: student.photo_url,
            total_debt: totalDebt,
            pending_transactions: transactions.map(t => ({
              id: t.id,
              student_id: t.student_id,
              student_name: student.full_name,
              amount: Math.abs(t.amount),
              description: t.description,
              created_at: t.created_at,
              ticket_code: t.ticket_code,
              metadata: t.metadata,
            })),
          });
        }
      }

      setDebts(debtsData);

      // ── Obtener estados de vouchers enviados por este padre ──
      if (debtsData.length > 0) {
        const studentIds = debtsData.map(d => d.student_id);
        const { data: rechargeRequests } = await supabase
          .from('recharge_requests')
          .select('id, student_id, status, rejection_reason, created_at, lunch_order_ids, request_type')
          .eq('parent_id', userId)
          .eq('request_type', 'lunch_payment')
          .in('student_id', studentIds)
          .in('status', ['pending', 'rejected'])
          .order('created_at', { ascending: false });

        if (rechargeRequests && rechargeRequests.length > 0) {
          const statusMap = new Map<string, VoucherStatus>();

          // Recoger todos los lunch_order_ids
          const allOrderIds = rechargeRequests.flatMap(r => r.lunch_order_ids || []);

          // Obtener transacciones que corresponden a estas orders
          if (allOrderIds.length > 0) {
            const { data: relatedTx } = await supabase
              .from('transactions')
              .select('id, metadata')
              .eq('type', 'purchase')
              .eq('payment_status', 'pending')
              .not('metadata', 'is', null);

            if (relatedTx) {
              // Para cada request, asociar sus transacciones
              rechargeRequests.forEach(req => {
                (req.lunch_order_ids || []).forEach((orderId: string) => {
                  const matchingTx = relatedTx.find(
                    (tx: any) => tx.metadata?.lunch_order_id === orderId
                  );
                  if (matchingTx) {
                    // Solo guardar el estado más reciente para cada transacción
                    const existing = statusMap.get(matchingTx.id);
                    if (!existing || new Date(req.created_at) > new Date(existing.created_at || '')) {
                      statusMap.set(matchingTx.id, {
                        transaction_id: matchingTx.id,
                        status: req.status as any,
                        rejection_reason: req.rejection_reason || undefined,
                        created_at: req.created_at,
                      });
                    }
                  }
                });
              });
            }
          }

          setVoucherStatuses(statusMap);
        }
      }
    } catch (error: any) {
      console.error('Error fetching debts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las deudas pendientes',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.total_debt, 0);

  /**
   * Renderiza un badge de estado del voucher para la transacción
   */
  const renderVoucherStatus = (transaction: PendingTransaction) => {
    const vStatus = voucherStatuses.get(transaction.id);
    // También chequear la metadata de la transacción para rechazo
    const wasRejected = transaction.metadata?.last_payment_rejected;

    if (vStatus?.status === 'pending') {
      return (
        <div className="mt-1.5 bg-blue-50 border border-blue-200 rounded px-2 py-1">
          <div className="flex items-center gap-1.5 text-blue-700">
            <Send className="h-3 w-3" />
            <span className="text-[10px] sm:text-xs font-semibold">Comprobante enviado — en revisión</span>
          </div>
        </div>
      );
    }

    if (vStatus?.status === 'rejected' || wasRejected) {
      const reason = vStatus?.rejection_reason || transaction.metadata?.rejection_reason || 'Comprobante no válido';
      return (
        <div className="mt-1.5 bg-red-50 border border-red-200 rounded px-2 py-1">
          <div className="flex items-center gap-1.5 text-red-700">
            <XCircle className="h-3 w-3" />
            <span className="text-[10px] sm:text-xs font-semibold">Pago rechazado</span>
          </div>
          <p className="text-[10px] text-red-600 mt-0.5 ml-[18px]">
            Motivo: {reason}. Puedes enviar un nuevo comprobante.
          </p>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando deudas...</p>
        </div>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Check className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Todo al día!</h3>
            <p className="text-gray-500">
              No tienes deudas pendientes con el kiosco escolar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔒 AVISO: Pagos presenciales */}
      <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-full flex-shrink-0">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">💳 Los pagos se realizan presencialmente en caja</p>
              <p className="text-xs text-blue-600 mt-1">
                Para cancelar las deudas pendientes, acérquese a la cafetería del colegio. 
                El cajero registrará su pago en el sistema.
              </p>
              <p className="text-[10px] text-blue-400 mt-2 italic">
                Pronto habilitaremos pagos en línea (Yape, Plin, tarjeta).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de Deuda Total */}
      <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700 font-semibold uppercase">Deuda Total Pendiente</p>
              <p className="text-4xl font-black text-amber-900">S/ {(totalDebt || 0).toFixed(2)}</p>
              <p className="text-xs text-amber-600 mt-1">
                {debts.reduce((sum, d) => sum + d.pending_transactions.length, 0)} compra(s) pendientes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deudas por Estudiante */}
      {debts.map((debt) => (
        <Card key={debt.student_id} className="border-2">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-4">
              {debt.student_photo && (
                <img
                  src={debt.student_photo}
                  alt={debt.student_name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                />
              )}
              <div>
                <CardTitle className="text-xl">{debt.student_name}</CardTitle>
                <CardDescription className="text-base">
                  Deuda: <span className="font-bold text-red-600">S/ {(debt.total_debt || 0).toFixed(2)}</span>
                  {' • '}
                  {debt.pending_transactions.length} compra(s)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {debt.pending_transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-3 rounded-lg border-2 bg-white border-gray-200"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Receipt className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(transaction.created_at), "d 'de' MMMM, yyyy • HH:mm", { locale: es })}
                        {transaction.ticket_code && ` • Ticket: ${transaction.ticket_code}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base sm:text-lg font-bold text-red-600">S/ {(transaction.amount || 0).toFixed(2)}</p>
                      <Badge variant="outline" className="text-[10px] sm:text-xs border-amber-300 text-amber-700">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente
                      </Badge>
                    </div>
                  </div>
                  {/* Estado del voucher si aplica */}
                  {renderVoucherStatus(transaction)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

