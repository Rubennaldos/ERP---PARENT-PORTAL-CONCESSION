import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CreditCard, Check, Clock, Receipt, XCircle, Send, Wallet, Banknote, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RechargeModal } from './RechargeModal';

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
  student_balance: number;
  school_id: string | null;
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

  // ── Estado para el modal de pago ──
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<{
    studentName: string;
    studentId: string;
    currentBalance: number;
    amount: number;
    requestType: 'debt_payment';
    description: string;
    lunchOrderIds?: string[];
    paidTransactionIds: string[];
  } | null>(null);

  // ── Estado para detectar si hay voucher pendiente de tipo debt_payment por estudiante ──
  const [pendingDebtVoucherStudents, setPendingDebtVoucherStudents] = useState<Set<string>>(new Set());

  // ── Checkboxes por transacción por alumno ──
  const [selectedTxByStudent, setSelectedTxByStudent] = useState<Map<string, Set<string>>>(new Map());

  // ── Modo pago combinado (todos los hijos) ──
  const [showCombinedPaymentModal, setShowCombinedPaymentModal] = useState(false);

  useEffect(() => {
    fetchDebts();
  }, [userId]);

  const fetchDebts = async () => {
    try {
      setLoading(true);

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, photo_url, free_account, school_id, balance')
        .eq('parent_id', userId)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setDebts([]);
        return;
      }

      const debtsData: StudentDebt[] = [];

      for (const student of students) {
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('*')
          .eq('student_id', student.id)
          .eq('type', 'purchase')
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false });

        if (transError) throw transError;

        if (transactions && transactions.length > 0) {
          const totalDebt = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

          debtsData.push({
            student_id: student.id,
            student_name: student.full_name,
            student_photo: student.photo_url,
            student_balance: student.balance || 0,
            school_id: student.school_id || null,
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

      // ── Inicializar checkboxes: todas seleccionadas por defecto ──
      const initialSelection = new Map<string, Set<string>>();
      debtsData.forEach(d => {
        initialSelection.set(d.student_id, new Set(d.pending_transactions.map(tx => tx.id)));
      });
      setSelectedTxByStudent(initialSelection);

      // ── Obtener estados de vouchers enviados por este padre ──
      if (debtsData.length > 0) {
        const studentIds = debtsData.map(d => d.student_id);

        const { data: rechargeRequests } = await supabase
          .from('recharge_requests')
          .select('id, student_id, status, rejection_reason, created_at, lunch_order_ids, request_type, paid_transaction_ids')
          .eq('parent_id', userId)
          .in('request_type', ['lunch_payment', 'debt_payment'])
          .in('student_id', studentIds)
          .in('status', ['pending', 'rejected'])
          .order('created_at', { ascending: false });

        if (rechargeRequests && rechargeRequests.length > 0) {
          const statusMap = new Map<string, VoucherStatus>();
          const pendingDebtStudents = new Set<string>();

          rechargeRequests.forEach(req => {
            if (req.status === 'pending' && req.request_type === 'debt_payment') {
              pendingDebtStudents.add(req.student_id);
            }

            // Mapear paid_transaction_ids directamente
            if (req.paid_transaction_ids) {
              req.paid_transaction_ids.forEach((txId: string) => {
                const existing = statusMap.get(txId);
                if (!existing || new Date(req.created_at) > new Date(existing.created_at || '')) {
                  statusMap.set(txId, {
                    transaction_id: txId,
                    status: req.status as any,
                    rejection_reason: req.rejection_reason || undefined,
                    created_at: req.created_at,
                  });
                }
              });
            }

            // También mapear por lunch_order_ids
            if (req.lunch_order_ids) {
              const allTx = debtsData.flatMap(d => d.pending_transactions);
              req.lunch_order_ids.forEach((orderId: string) => {
                const matchingTx = allTx.find(tx => tx.metadata?.lunch_order_id === orderId);
                if (matchingTx) {
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
            }
          });

          setVoucherStatuses(statusMap);
          setPendingDebtVoucherStudents(pendingDebtStudents);
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

  // ── Toggle checkbox individual ──
  const toggleTransaction = (studentId: string, txId: string) => {
    setSelectedTxByStudent(prev => {
      const next = new Map(prev);
      const studentSet = new Set(next.get(studentId) || []);
      if (studentSet.has(txId)) {
        studentSet.delete(txId);
      } else {
        studentSet.add(txId);
      }
      next.set(studentId, studentSet);
      return next;
    });
  };

  // ── Toggle all for a student ──
  const toggleAllForStudent = (studentId: string, allTxIds: string[]) => {
    setSelectedTxByStudent(prev => {
      const next = new Map(prev);
      const currentSet = next.get(studentId) || new Set();
      if (currentSet.size === allTxIds.length) {
        // Deseleccionar todo
        next.set(studentId, new Set());
      } else {
        // Seleccionar todo
        next.set(studentId, new Set(allTxIds));
      }
      return next;
    });
  };

  // ── Calcular monto seleccionado para un alumno ──
  const getSelectedAmountForStudent = (debt: StudentDebt): number => {
    const selected = selectedTxByStudent.get(debt.student_id) || new Set();
    return debt.pending_transactions
      .filter(tx => selected.has(tx.id))
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  /**
   * Abre el modal de pago para las transacciones seleccionadas de un estudiante
   */
  const handlePaySelected = (debt: StudentDebt) => {
    const selected = selectedTxByStudent.get(debt.student_id) || new Set();
    if (selected.size === 0) {
      toast({ title: 'Selecciona al menos una deuda', variant: 'destructive' });
      return;
    }

    const selectedTxs = debt.pending_transactions.filter(tx => selected.has(tx.id));
    const selectedAmount = selectedTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const lunchOrderIds: string[] = [];
    const transactionIds: string[] = [];
    selectedTxs.forEach(tx => {
      transactionIds.push(tx.id);
      if (tx.metadata?.lunch_order_id) {
        lunchOrderIds.push(tx.metadata.lunch_order_id);
      }
    });

    const count = selectedTxs.length;
    const description = `Pago de deuda: ${count} compra(s) pendiente(s) — ${debt.student_name}`;

    setPaymentModalData({
      studentName: debt.student_name,
      studentId: debt.student_id,
      currentBalance: debt.student_balance,
      amount: selectedAmount,
      requestType: 'debt_payment',
      description,
      lunchOrderIds: lunchOrderIds.length > 0 ? lunchOrderIds : undefined,
      paidTransactionIds: transactionIds,
    });
    setShowPaymentModal(true);
  };

  /**
   * Abre el modal combinado para pagar TODOS los hijos juntos
   */
  const handlePayAllCombined = () => {
    // Usar el primer estudiante como "portador" del voucher
    // pero incluir transacciones de todos
    const allTransactionIds: string[] = [];
    const allLunchOrderIds: string[] = [];
    let totalAmount = 0;

    debts.forEach(debt => {
      debt.pending_transactions.forEach(tx => {
        allTransactionIds.push(tx.id);
        totalAmount += tx.amount;
        if (tx.metadata?.lunch_order_id) {
          allLunchOrderIds.push(tx.metadata.lunch_order_id);
        }
      });
    });

    const firstDebt = debts[0];
    const childNames = debts.map(d => d.student_name).join(', ');
    const description = `Pago combinado de deudas: ${childNames}`;

    setPaymentModalData({
      studentName: childNames,
      studentId: firstDebt.student_id,
      currentBalance: firstDebt.student_balance,
      amount: totalAmount,
      requestType: 'debt_payment',
      description,
      lunchOrderIds: allLunchOrderIds.length > 0 ? allLunchOrderIds : undefined,
      paidTransactionIds: allTransactionIds,
    });
    setShowPaymentModal(true);
  };

  /**
   * Renderiza un badge de estado del voucher para la transacción
   */
  const renderVoucherStatus = (transaction: PendingTransaction) => {
    const vStatus = voucherStatuses.get(transaction.id);
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
      {/* 💳 AVISO: Cómo pagar */}
      <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 rounded-full flex-shrink-0">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">💳 ¿Cómo pagar?</p>
              <p className="text-xs text-blue-600 mt-1">
                Puedes pagar tus deudas <strong>presencialmente en caja</strong> o enviando un <strong>comprobante de pago</strong> (Yape, Plin, transferencia) desde aquí. Selecciona las deudas que deseas pagar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de Deuda Total */}
      <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-700 font-semibold uppercase">Deuda Total Pendiente</p>
              <p className="text-4xl font-black text-amber-900">S/ {(totalDebt || 0).toFixed(2)}</p>
              <p className="text-xs text-amber-600 mt-1">
                {debts.reduce((sum, d) => sum + d.pending_transactions.length, 0)} compra(s) pendientes
              </p>
            </div>
          </div>

          {/* 🔗 Botón pagar todo junto (si hay más de 1 hijo) */}
          {debts.length > 1 && (
            <div className="mt-4">
              <Button
                onClick={handlePayAllCombined}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-semibold gap-2 text-sm shadow-md"
                disabled={[...pendingDebtVoucherStudents].some(id => debts.find(d => d.student_id === id))}
              >
                <Link2 className="h-5 w-5" />
                Pagar todo junto — S/ {totalDebt.toFixed(2)}
              </Button>
              <p className="text-[10px] text-amber-600 mt-1 text-center">
                Paga las deudas de todos tus hijos en un solo comprobante
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deudas por Estudiante */}
      {debts.map((debt) => {
        const hasPendingVoucher = pendingDebtVoucherStudents.has(debt.student_id);
        const selectedSet = selectedTxByStudent.get(debt.student_id) || new Set();
        const allTxIds = debt.pending_transactions.map(tx => tx.id);
        const allSelected = selectedSet.size === allTxIds.length && allTxIds.length > 0;
        const someSelected = selectedSet.size > 0;
        const selectedAmount = getSelectedAmountForStudent(debt);

        return (
          <Card key={debt.student_id} className="border-2">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-3">
              <div className="flex items-center gap-4">
                {debt.student_photo && (
                  <img
                    src={debt.student_photo}
                    alt={debt.student_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <CardTitle className="text-lg">{debt.student_name}</CardTitle>
                  <CardDescription className="text-sm">
                    Deuda: <span className="font-bold text-red-600">S/ {(debt.total_debt || 0).toFixed(2)}</span>
                    {' • '}
                    {debt.pending_transactions.length} compra(s)
                  </CardDescription>
                </div>
              </div>

              {/* ── Botón de Pagar ── */}
              <div className="mt-3 space-y-2">
                {hasPendingVoucher ? (
                  <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                    <Send className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs font-semibold text-blue-800">Comprobante en revisión</p>
                      <p className="text-[10px] text-blue-600">Un administrador verificará tu pago pronto.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePaySelected(debt)}
                      disabled={!someSelected}
                      className="flex-1 h-11 bg-green-600 hover:bg-green-700 font-semibold gap-2 text-sm shadow-md"
                    >
                      <Banknote className="h-5 w-5" />
                      {selectedSet.size === allTxIds.length
                        ? `Pagar todo — S/ ${debt.total_debt.toFixed(2)}`
                        : `Pagar seleccionados — S/ ${selectedAmount.toFixed(2)}`
                      }
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-3">
              {/* Seleccionar/deseleccionar todo */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleAllForStudent(debt.student_id, allTxIds)}
                  className="h-4 w-4"
                />
                <span className="text-xs text-gray-500 font-medium">
                  {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  {someSelected && !allSelected && ` (${selectedSet.size} de ${allTxIds.length})`}
                </span>
              </div>

              <div className="space-y-2">
                {debt.pending_transactions.map((transaction) => {
                  const isChecked = selectedSet.has(transaction.id);
                  return (
                    <div
                      key={transaction.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isChecked ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleTransaction(debt.student_id, transaction.id)}
                          className="h-4 w-4 flex-shrink-0"
                        />
                        <Receipt className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm truncate">{transaction.description}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">
                            {format(new Date(transaction.created_at), "d 'de' MMMM, yyyy • HH:mm", { locale: es })}
                            {transaction.ticket_code && ` • Ticket: ${transaction.ticket_code}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm sm:text-base font-bold text-red-600">S/ {(transaction.amount || 0).toFixed(2)}</p>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] border-amber-300 text-amber-700">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            Pendiente
                          </Badge>
                        </div>
                      </div>
                      {renderVoucherStatus(transaction)}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* ── Modal de Pago ── */}
      {paymentModalData && (
        <RechargeModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentModalData(null);
            fetchDebts();
          }}
          studentName={paymentModalData.studentName}
          studentId={paymentModalData.studentId}
          currentBalance={paymentModalData.currentBalance}
          accountType="free_account"
          onRecharge={async () => {}}
          suggestedAmount={paymentModalData.amount}
          requestType={paymentModalData.requestType}
          requestDescription={paymentModalData.description}
          lunchOrderIds={paymentModalData.lunchOrderIds}
          paidTransactionIds={paymentModalData.paidTransactionIds}
        />
      )}
    </div>
  );
};
