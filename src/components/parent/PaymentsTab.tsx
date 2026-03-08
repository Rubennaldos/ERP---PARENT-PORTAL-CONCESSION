import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  AlertCircle, Check, Clock, Receipt, XCircle, Send,
  Banknote, Link2, FileDown, Eye, Loader2, History,
  ShoppingBag, CreditCard, X as XIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RechargeModal } from './RechargeModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import maracuyaLogo from '@/assets/maracuya-logo.png';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────
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

interface PaidTransaction {
  id: string;
  description: string;
  amount: number;
  created_at: string;
  ticket_code: string | null;
  payment_method: string | null;
  operation_number: string | null;
  metadata?: any;
  recharge_request?: {
    id: string;
    reference_code: string | null;
    voucher_url: string | null;
    approved_at: string | null;
    payment_method: string;
  } | null;
}

interface StudentPaidHistory {
  student_id: string;
  student_name: string;
  student_photo: string | null;
  paid_transactions: PaidTransaction[];
}

interface PaymentsTabProps {
  userId: string;
}

const METHOD_LABELS: Record<string, string> = {
  yape: '💜 Yape',
  plin: '💚 Plin',
  transferencia: '🏦 Transferencia',
  efectivo: '💵 Efectivo',
  teacher_account: '👨‍🏫 Cuenta Profesor',
};

// ─────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────
export const PaymentsTab = ({ userId }: PaymentsTabProps) => {
  const { toast } = useToast();

  // ── Active tab ──
  const [activeTab, setActiveTab] = useState<'por_pagar' | 'pagados'>('por_pagar');

  // ── Por Pagar state ──
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<StudentDebt[]>([]);
  const [voucherStatuses, setVoucherStatuses] = useState<Map<string, VoucherStatus>>(new Map());
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
  const [selectedTxByStudent, setSelectedTxByStudent] = useState<Map<string, Set<string>>>(new Map());

  // ── Pagados state ──
  const [loadingPaid, setLoadingPaid] = useState(false);
  const [paidHistory, setPaidHistory] = useState<StudentPaidHistory[]>([]);
  const [voucherUrls, setVoucherUrls] = useState<Record<string, string>>({});
  const [viewingVoucher, setViewingVoucher] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [paidLoaded, setPaidLoaded] = useState(false);

  // ── Initial load ──
  useEffect(() => {
    fetchDebts();
  }, [userId]);

  // ── Fetch paid history lazily ──
  useEffect(() => {
    if (activeTab === 'pagados' && !paidLoaded) {
      fetchPaidHistory();
    }
  }, [activeTab]);

  // ─────────────────────────────────────────────────
  // FETCH: Por Pagar
  // ─────────────────────────────────────────────────
  const fetchDebts = async () => {
    try {
      setLoading(true);

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, photo_url, free_account, school_id, balance')
        .eq('parent_id', userId)
        .eq('is_active', true);

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) { setDebts([]); return; }

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
          debtsData.push({
            student_id: student.id,
            student_name: student.full_name,
            student_photo: student.photo_url,
            student_balance: student.balance || 0,
            school_id: student.school_id || null,
            total_debt: transactions.reduce((s, t) => s + Math.abs(t.amount), 0),
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

      // Voucher statuses
      const statusMap = new Map<string, VoucherStatus>();
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

        if (rechargeRequests?.length) {
          rechargeRequests.forEach(req => {
            if (req.paid_transaction_ids) {
              req.paid_transaction_ids.forEach((txId: string) => {
                const existing = statusMap.get(txId);
                if (!existing || new Date(req.created_at) > new Date(existing.created_at || '')) {
                  statusMap.set(txId, { transaction_id: txId, status: req.status as any, rejection_reason: req.rejection_reason || undefined, created_at: req.created_at });
                }
              });
            }
            if (req.lunch_order_ids) {
              const allTx = debtsData.flatMap(d => d.pending_transactions);
              req.lunch_order_ids.forEach((orderId: string) => {
                const matchingTx = allTx.find(tx => tx.metadata?.lunch_order_id === orderId);
                if (matchingTx) {
                  const existing = statusMap.get(matchingTx.id);
                  if (!existing || new Date(req.created_at) > new Date(existing.created_at || '')) {
                    statusMap.set(matchingTx.id, { transaction_id: matchingTx.id, status: req.status as any, rejection_reason: req.rejection_reason || undefined, created_at: req.created_at });
                  }
                }
              });
            }
          });
        }
      }
      setVoucherStatuses(statusMap);

      const initialSelection = new Map<string, Set<string>>();
      debtsData.forEach(d => {
        const payable = d.pending_transactions.filter(tx => { const vs = statusMap.get(tx.id); return !vs || vs.status !== 'pending'; }).map(tx => tx.id);
        initialSelection.set(d.student_id, new Set(payable));
      });
      setSelectedTxByStudent(initialSelection);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las deudas pendientes' });
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────
  // FETCH: Pagados
  // ─────────────────────────────────────────────────
  const fetchPaidHistory = useCallback(async () => {
    try {
      setLoadingPaid(true);

      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, photo_url')
        .eq('parent_id', userId)
        .eq('is_active', true);

      if (!students?.length) { setPaidHistory([]); return; }
      const studentIds = students.map(s => s.id);

      // Paid transactions
      const { data: paidTxs } = await supabase
        .from('transactions')
        .select('id, description, amount, created_at, ticket_code, payment_method, operation_number, metadata, student_id')
        .in('student_id', studentIds)
        .eq('type', 'purchase')
        .eq('payment_status', 'paid')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(200);

      // Approved recharge_requests
      const { data: approvedReqs } = await supabase
        .from('recharge_requests')
        .select('id, reference_code, voucher_url, approved_at, payment_method, paid_transaction_ids')
        .eq('parent_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      // Map txId → request
      const txToReq = new Map<string, any>();
      approvedReqs?.forEach(req => {
        req.paid_transaction_ids?.forEach((txId: string) => { txToReq.set(txId, req); });
      });

      // Group by student
      const historyByStudent: Record<string, StudentPaidHistory> = {};
      students.forEach(s => {
        historyByStudent[s.id] = { student_id: s.id, student_name: s.full_name, student_photo: s.photo_url, paid_transactions: [] };
      });

      paidTxs?.forEach(tx => {
        const grp = historyByStudent[tx.student_id];
        if (!grp) return;
        grp.paid_transactions.push({
          id: tx.id,
          description: tx.description,
          amount: Math.abs(tx.amount),
          created_at: tx.created_at,
          ticket_code: tx.ticket_code,
          payment_method: tx.payment_method,
          operation_number: tx.operation_number,
          metadata: tx.metadata,
          recharge_request: txToReq.get(tx.id) || null,
        });
      });

      const history = Object.values(historyByStudent).filter(s => s.paid_transactions.length > 0);
      setPaidHistory(history);
      setPaidLoaded(true);

      // Resolve voucher URLs
      const urlMap: Record<string, string> = {};
      const urlPromises = approvedReqs?.map(async req => {
        if (!req.voucher_url) return;
        const url = await resolveVoucherUrl(req.voucher_url);
        if (url) urlMap[req.id] = url;
      }) || [];
      await Promise.all(urlPromises);
      setVoucherUrls(urlMap);

    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial de pagos' });
    } finally {
      setLoadingPaid(false);
    }
  }, [userId]);

  // Resolve voucher URL (storage path → signed URL, or full URL)
  const resolveVoucherUrl = async (path: string): Promise<string | null> => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = await supabase.storage.from('vouchers').createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  // ─────────────────────────────────────────────────
  // Por Pagar helpers
  // ─────────────────────────────────────────────────
  const isTxLocked = (txId: string) => voucherStatuses.get(txId)?.status === 'pending';

  const toggleTransaction = (studentId: string, txId: string) => {
    if (isTxLocked(txId)) return;
    setSelectedTxByStudent(prev => {
      const next = new Map(prev);
      const s = new Set(next.get(studentId) || []);
      s.has(txId) ? s.delete(txId) : s.add(txId);
      next.set(studentId, s);
      return next;
    });
  };

  const toggleAllForStudent = (studentId: string, payableTxIds: string[]) => {
    setSelectedTxByStudent(prev => {
      const next = new Map(prev);
      const cur = next.get(studentId) || new Set();
      const allSelected = payableTxIds.every(id => cur.has(id));
      next.set(studentId, allSelected ? new Set() : new Set(payableTxIds));
      return next;
    });
  };

  const getSelectedAmount = (debt: StudentDebt) => {
    const sel = selectedTxByStudent.get(debt.student_id) || new Set();
    return debt.pending_transactions.filter(tx => sel.has(tx.id)).reduce((s, tx) => s + tx.amount, 0);
  };

  const handlePaySelected = (debt: StudentDebt) => {
    const sel = selectedTxByStudent.get(debt.student_id) || new Set();
    if (sel.size === 0) { toast({ title: 'Selecciona al menos una deuda', variant: 'destructive' }); return; }
    const txs = debt.pending_transactions.filter(tx => sel.has(tx.id));
    const amount = txs.reduce((s, tx) => s + tx.amount, 0);
    const lunchOrderIds: string[] = [];
    const transactionIds: string[] = [];
    txs.forEach(tx => { transactionIds.push(tx.id); if (tx.metadata?.lunch_order_id) lunchOrderIds.push(tx.metadata.lunch_order_id); });
    setPaymentModalData({
      studentName: debt.student_name,
      studentId: debt.student_id,
      currentBalance: debt.student_balance,
      amount,
      requestType: 'debt_payment',
      description: `Pago de deuda: ${txs.length} compra(s) — ${debt.student_name}`,
      lunchOrderIds: lunchOrderIds.length ? lunchOrderIds : undefined,
      paidTransactionIds: transactionIds,
    });
    setShowPaymentModal(true);
  };

  const handlePayAllCombined = () => {
    const allTxIds: string[] = [], allLunchIds: string[] = [];
    let total = 0;
    debts.forEach(d => d.pending_transactions.forEach(tx => {
      if (!isTxLocked(tx.id)) { allTxIds.push(tx.id); total += tx.amount; if (tx.metadata?.lunch_order_id) allLunchIds.push(tx.metadata.lunch_order_id); }
    }));
    if (!allTxIds.length) { toast({ title: 'Todas las deudas ya tienen comprobante en revisión', variant: 'destructive' }); return; }
    const first = debts[0];
    setPaymentModalData({
      studentName: debts.map(d => d.student_name).join(', '),
      studentId: first.student_id,
      currentBalance: first.student_balance,
      amount: total,
      requestType: 'debt_payment',
      description: `Pago combinado: ${debts.map(d => d.student_name).join(', ')}`,
      lunchOrderIds: allLunchIds.length ? allLunchIds : undefined,
      paidTransactionIds: allTxIds,
    });
    setShowPaymentModal(true);
  };

  const renderVoucherStatus = (transaction: PendingTransaction) => {
    const vs = voucherStatuses.get(transaction.id);
    const rejected = transaction.metadata?.last_payment_rejected;
    if (vs?.status === 'pending') return (
      <div className="mt-1.5 bg-blue-50 border border-blue-200 rounded px-2 py-1 flex items-center gap-1.5 text-blue-700">
        <Send className="h-3 w-3" />
        <span className="text-[10px] sm:text-xs font-semibold">Comprobante enviado — en revisión</span>
      </div>
    );
    if (vs?.status === 'rejected' || rejected) {
      const reason = vs?.rejection_reason || transaction.metadata?.rejection_reason || 'Comprobante no válido';
      return (
        <div className="mt-1.5 bg-red-50 border border-red-200 rounded px-2 py-1">
          <div className="flex items-center gap-1.5 text-red-700"><XCircle className="h-3 w-3" /><span className="text-[10px] sm:text-xs font-semibold">Pago rechazado</span></div>
          <p className="text-[10px] text-red-600 mt-0.5 ml-[18px]">{reason}. Puedes enviar un nuevo comprobante.</p>
        </div>
      );
    }
    return null;
  };

  // ─────────────────────────────────────────────────
  // PDF Receipt Generator
  // ─────────────────────────────────────────────────
  const downloadReceiptPDF = async (tx: PaidTransaction, studentName: string) => {
    setGeneratingPDF(tx.id);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const PW = doc.internal.pageSize.width;
      const MARGIN = 20;
      const CONTENT_W = PW - MARGIN * 2;
      const GREEN: [number, number, number] = [34, 139, 34];
      const DARK: [number, number, number] = [30, 30, 30];
      const GRAY: [number, number, number] = [100, 100, 100];
      const LIGHT_GREEN: [number, number, number] = [240, 255, 240];

      // ── Load logo ──
      let logoBase64 = '';
      try {
        const res = await fetch(maracuyaLogo);
        const blob = await res.blob();
        logoBase64 = await new Promise<string>(resolve => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.readAsDataURL(blob);
        });
      } catch {}

      // ── Header band ──
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, PW, 45, 'F');

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', MARGIN, 5, 32, 32, undefined, 'FAST');
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Maracuyá', PW - MARGIN, 16, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Tiendas & Concesionarias Saludables', PW - MARGIN, 23, { align: 'right' });

      // ── Title ──
      doc.setTextColor(...DARK);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPROBANTE DE PAGO', PW / 2, 60, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text('Documento interno • No tiene validez tributaria', PW / 2, 67, { align: 'center' });

      // ── Ticket number box ──
      doc.setFillColor(248, 255, 248);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.8);
      doc.roundedRect(MARGIN, 73, CONTENT_W, 14, 3, 3, 'FD');
      doc.setTextColor(...GREEN);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`N° ${tx.ticket_code || 'S/N'}`, PW / 2, 82, { align: 'center' });

      let yPos = 97;

      // ── Info section ──
      const infoRows = [
        ['Fecha:', format(new Date(tx.created_at), "dd 'de' MMMM, yyyy", { locale: es })],
        ['Hora:', format(new Date(tx.created_at), 'HH:mm', { locale: es })],
        ['Alumno:', studentName],
      ];
      const req = tx.recharge_request;
      if (req?.approved_at) infoRows.push(['Aprobado el:', format(new Date(req.approved_at), "dd/MM/yyyy HH:mm", { locale: es })]);

      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, yPos - 5, CONTENT_W, infoRows.length * 9 + 10, 2, 2, 'FD');

      infoRows.forEach(([label, value]) => {
        doc.setTextColor(...DARK);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(label, MARGIN + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, MARGIN + 45, yPos);
        yPos += 9;
      });

      yPos += 8;

      // ── Detail table ──
      doc.setTextColor(...DARK);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE COMPRA', MARGIN, yPos);
      yPos += 4;

      autoTable(doc, {
        startY: yPos,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Descripción', 'Monto']],
        body: [[tx.description, `S/ ${tx.amount.toFixed(2)}`]],
        foot: [['TOTAL PAGADO', `S/ ${tx.amount.toFixed(2)}`]],
        theme: 'grid',
        headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 10 },
        footStyles: { fillColor: [34, 80, 34], textColor: 255, fontStyle: 'bold', fontSize: 11 },
        columnStyles: { 0: { cellWidth: CONTENT_W * 0.65 }, 1: { halign: 'right', cellWidth: CONTENT_W * 0.35 } },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // ── Payment info ──
      const method = req?.payment_method || tx.payment_method;
      const refCode = req?.reference_code || tx.operation_number;

      if (method || refCode) {
        doc.setFillColor(250, 250, 255);
        doc.setDrawColor(200, 200, 230);
        const payRows = [];
        if (method) payRows.push(['Método de pago:', METHOD_LABELS[method] || method.toUpperCase()]);
        if (refCode) payRows.push(['N° de operación:', refCode]);
        doc.setLineWidth(0.3);
        doc.roundedRect(MARGIN, yPos - 5, CONTENT_W, payRows.length * 9 + 10, 2, 2, 'FD');

        payRows.forEach(([label, value]) => {
          doc.setTextColor(...DARK);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(label, MARGIN + 5, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(value, MARGIN + 50, yPos);
          yPos += 9;
        });
        yPos += 8;
      }

      // ── PAGADO stamp ──
      doc.setFillColor(...LIGHT_GREEN);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(1.5);
      doc.roundedRect(MARGIN, yPos, CONTENT_W, 22, 4, 4, 'FD');
      doc.setTextColor(...GREEN);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('✓  PAGADO', PW / 2, yPos + 14, { align: 'center' });

      // ── Footer ──
      const footerY = doc.internal.pageSize.height - 20;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, footerY - 5, PW - MARGIN, footerY - 5);
      doc.setTextColor(...GRAY);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, PW / 2, footerY, { align: 'center' });
      doc.text('Este documento es un comprobante interno de pago y no reemplaza comprobantes tributarios.', PW / 2, footerY + 5, { align: 'center' });

      // ── Save ──
      const fileName = `Comprobante_${tx.ticket_code || tx.id.slice(0, 8)}_${studentName.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      toast({ title: '📄 PDF generado', description: `Guardado como ${fileName}` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF' });
    } finally {
      setGeneratingPDF(null);
    }
  };

  // ─────────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────────
  const totalDebt = debts.reduce((s, d) => s + d.total_debt, 0);
  const totalPaidCount = paidHistory.reduce((s, h) => s + h.paid_transactions.length, 0);

  // ─────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-500">Cargando pagos...</p>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Sub-tabs ── */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-2 h-11">
          <TabsTrigger value="por_pagar" className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" />
            Por Pagar
            {debts.reduce((s, d) => s + d.pending_transactions.length, 0) > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] px-1.5 h-4">
                {debts.reduce((s, d) => s + d.pending_transactions.length, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pagados" className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4" />
            Pagados
            {paidLoaded && totalPaidCount > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] px-1.5 h-4">
                {totalPaidCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════
            TAB 1 — POR PAGAR
        ═══════════════════════════════════════════════ */}
        <TabsContent value="por_pagar" className="mt-4 space-y-4">
          {debts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Check className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">¡Todo al día!</h3>
                  <p className="text-gray-500">No tienes deudas pendientes.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Instrucción */}
              <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Puedes pagar <strong>en caja</strong> o enviando un <strong>comprobante</strong> (Yape, Plin, transferencia). Selecciona las deudas que deseas pagar.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen total */}
              <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-full">
                      <AlertCircle className="h-7 w-7 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-amber-700 font-semibold uppercase">Deuda Total Pendiente</p>
                      <p className="text-3xl font-black text-amber-900">S/ {totalDebt.toFixed(2)}</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {debts.reduce((s, d) => s + d.pending_transactions.length, 0)} compra(s) pendientes
                      </p>
                    </div>
                  </div>
                  {debts.length > 1 && (
                    <div className="mt-3">
                      <Button onClick={handlePayAllCombined} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 font-semibold gap-2 text-sm">
                        <Link2 className="h-4 w-4" />
                        Pagar todo junto — S/ {totalDebt.toFixed(2)}
                      </Button>
                      <p className="text-[10px] text-amber-600 mt-1 text-center">Paga las deudas de todos tus hijos en un solo comprobante</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deudas por alumno */}
              {debts.map(debt => {
                const sel = selectedTxByStudent.get(debt.student_id) || new Set();
                const payable = debt.pending_transactions.filter(tx => !isTxLocked(tx.id)).map(tx => tx.id);
                const lockedCount = debt.pending_transactions.length - payable.length;
                const allPayableSelected = payable.length > 0 && payable.every(id => sel.has(id));
                const someSelected = payable.some(id => sel.has(id));
                const selAmount = getSelectedAmount(debt);

                return (
                  <Card key={debt.student_id} className="border-2">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-3">
                      <div className="flex items-center gap-3">
                        {debt.student_photo && (
                          <img src={debt.student_photo} alt={debt.student_name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-base">{debt.student_name}</CardTitle>
                          <CardDescription className="text-xs">
                            Deuda: <span className="font-bold text-red-600">S/ {debt.total_debt.toFixed(2)}</span>
                            {' • '}{debt.pending_transactions.length} compra(s)
                          </CardDescription>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {lockedCount > 0 && (
                          <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <Send className="h-3 w-3 text-blue-600 shrink-0" />
                            <p className="text-[10px] text-blue-700"><strong>{lockedCount}</strong> compra(s) con comprobante en revisión</p>
                          </div>
                        )}
                        {payable.length > 0 ? (
                          <Button onClick={() => handlePaySelected(debt)} disabled={!someSelected} className="w-full h-10 bg-green-600 hover:bg-green-700 font-semibold gap-2 text-sm">
                            <Banknote className="h-4 w-4" />
                            {allPayableSelected && sel.size === payable.length ? `Pagar ${payable.length === debt.pending_transactions.length ? 'todo' : 'disponibles'} — S/ ${selAmount.toFixed(2)}` : `Pagar seleccionados — S/ ${selAmount.toFixed(2)}`}
                          </Button>
                        ) : (
                          <div className="w-full bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <p className="text-xs text-green-700 font-medium">Todas las deudas ya tienen comprobante enviado</p>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-3">
                      {payable.length > 1 && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                          <Checkbox checked={allPayableSelected} onCheckedChange={() => toggleAllForStudent(debt.student_id, payable)} className="h-4 w-4" />
                          <span className="text-xs text-gray-500 font-medium">
                            {allPayableSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                            {someSelected && !allPayableSelected && ` (${sel.size} de ${payable.length})`}
                          </span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {debt.pending_transactions.map(tx => {
                          const locked = isTxLocked(tx.id);
                          const checked = sel.has(tx.id);
                          return (
                            <div key={tx.id} className={`p-3 rounded-lg border transition-colors ${locked ? 'bg-blue-50/30 border-blue-200 opacity-70' : checked ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-center gap-3">
                                <Checkbox checked={checked} onCheckedChange={() => toggleTransaction(debt.student_id, tx.id)} disabled={locked} className="h-4 w-4 flex-shrink-0" />
                                <Receipt className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-xs sm:text-sm truncate">{tx.description}</p>
                                  <p className="text-[10px] sm:text-xs text-gray-500">
                                    {format(new Date(tx.created_at), "d 'de' MMMM, yyyy • HH:mm", { locale: es })}
                                    {tx.ticket_code && <span className="ml-1 text-blue-600 font-mono">• {tx.ticket_code}</span>}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-red-600">S/ {tx.amount.toFixed(2)}</p>
                                  <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700">
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />Pendiente
                                  </Badge>
                                </div>
                              </div>
                              {renderVoucherStatus(tx)}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════
            TAB 2 — PAGADOS
        ═══════════════════════════════════════════════ */}
        <TabsContent value="pagados" className="mt-4 space-y-4">
          {loadingPaid ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Cargando historial...</p>
              </div>
            </div>
          ) : paidHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-600 mb-2">Sin pagos realizados</h3>
                  <p className="text-gray-400 text-sm">Aquí verás el historial de tus pagos aprobados.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Info banner */}
              <Card className="border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700">
                      Aquí puedes ver todos tus pagos aprobados y <strong>descargar el comprobante en PDF</strong>.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Por alumno */}
              {paidHistory.map(student => (
                <Card key={student.student_id} className="border-2 border-green-100">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-3">
                    <div className="flex items-center gap-3">
                      {student.student_photo && (
                        <img src={student.student_photo} alt={student.student_name} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow" />
                      )}
                      <div>
                        <CardTitle className="text-base">{student.student_name}</CardTitle>
                        <CardDescription className="text-xs">{student.paid_transactions.length} pago(s) registrado(s)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3 space-y-2">
                    {student.paid_transactions.map(tx => {
                      const req = tx.recharge_request;
                      const method = req?.payment_method || tx.payment_method;
                      const refCode = req?.reference_code || tx.operation_number;
                      const hasVoucher = !!req?.voucher_url;
                      const voucherUrl = req ? voucherUrls[req.id] : undefined;

                      return (
                        <div key={tx.id} className="border border-green-200 rounded-lg bg-white overflow-hidden">
                          {/* Top row */}
                          <div className="flex items-start gap-3 p-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="h-4 w-4 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-tight">{tx.description}</p>
                                <span className="text-sm font-bold text-green-700 flex-shrink-0">S/ {tx.amount.toFixed(2)}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                {tx.ticket_code && (
                                  <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                                    {tx.ticket_code}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400">
                                  {format(new Date(tx.created_at), "d MMM yyyy", { locale: es })}
                                </span>
                                {method && (
                                  <span className="text-[10px] text-indigo-600 font-medium">
                                    {METHOD_LABELS[method] || method}
                                  </span>
                                )}
                                {refCode && (
                                  <span className="text-[10px] text-gray-500">Ref: {refCode}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action row */}
                          <div className="border-t border-green-100 bg-green-50/50 px-3 py-2 flex items-center justify-between gap-2">
                            <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">
                              <Check className="h-2.5 w-2.5 mr-0.5" />
                              PAGADO
                            </Badge>
                            <div className="flex gap-2">
                              {hasVoucher && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[10px] border-blue-300 text-blue-600 hover:bg-blue-50"
                                  onClick={() => setViewingVoucher(voucherUrl || req?.voucher_url || null)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Voucher
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="h-7 px-2 text-[10px] bg-green-600 hover:bg-green-700"
                                onClick={() => downloadReceiptPDF(tx, student.student_name)}
                                disabled={generatingPDF === tx.id}
                              >
                                {generatingPDF === tx.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <FileDown className="h-3 w-3 mr-1" />
                                )}
                                PDF
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Modal de Pago ── */}
      {paymentModalData && (
        <RechargeModal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setPaymentModalData(null); fetchDebts(); }}
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

      {/* ── Modal Voucher Viewer ── */}
      <Dialog open={!!viewingVoucher} onOpenChange={open => { if (!open) setViewingVoucher(null); }}>
        <DialogContent className="max-w-lg p-3">
          <DialogTitle className="text-sm font-semibold flex items-center justify-between">
            Comprobante de Pago
            <Button size="sm" variant="ghost" onClick={() => setViewingVoucher(null)} className="h-7 w-7 p-0">
              <XIcon className="h-4 w-4" />
            </Button>
          </DialogTitle>
          {viewingVoucher && (
            <img
              src={viewingVoucher}
              alt="Comprobante de pago"
              className="w-full rounded-lg object-contain max-h-[70vh]"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
