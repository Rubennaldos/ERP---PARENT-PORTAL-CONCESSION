import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePreviewStore } from '@/stores/previewStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Eye,
  Copy,
  Search,
  Loader2,
  CheckCircle2,
  DollarSign,
  History,
  Users,
  Check,
  RefreshCw,
  KeyRound,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeSearch } from '@/lib/utils';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Debtor {
  id: string;
  client_name: string;
  client_type: 'student' | 'teacher' | 'manual';
  parent_id?: string;   // user_id del padre (para preview)
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  school_id: string;
  school_name: string;
  total_amount: number;
  transaction_count: number;
  transactions: any[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const BillingCollection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setPreview } = usePreviewStore();

  // â”€â”€ Core state â”€â”€
  const [loading, setLoading] = useState(true);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // â”€â”€ Checklist de "cobrado" (local, para esta sesiÃ³n) â”€â”€
  const [checkedDebtors, setCheckedDebtors] = useState<Set<string>>(new Set());

  // â”€â”€ Vista "Control de Cuenta" por cliente â”€â”€
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [statementEvents, setStatementEvents] = useState<any[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // â”€â”€ Modal de pago â”€â”€
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentDebtor, setCurrentDebtor] = useState<Debtor | null>(null);
  const [paymentData, setPaymentData] = useState({
    paid_amount: 0,
    payment_method: 'efectivo',
    operation_number: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // â”€â”€ Permisos â”€â”€
  const [canCollect, setCanCollect] = useState(false);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Init
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    initUser();
  }, [user]);

  const initUser = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user.id)
      .single();
    if (data) {
      setUserSchoolId(data.school_id || null);
      const adminRoles = ['admin_general', 'admin_sede', 'cajero', 'supervisor'];
      setCanCollect(adminRoles.includes(data.role));
    }
  };

  useEffect(() => {
    if (userSchoolId !== undefined) {
      fetchDebtors();
    }
  }, [userSchoolId]);


  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Fetch deudores
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchDebtors = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('transactions')
        .select(`
          *,
          students(id, full_name, parent_id),
          teacher_profiles(id, full_name),
          schools(id, name),
          transaction_items(id, product_name, quantity, unit_price, subtotal)
        `)
        .neq('type', 'recharge')
        .in('payment_status', ['pending', 'partial'])
        .order('created_at', { ascending: false });

      if (userSchoolId) {
        query = query.eq('school_id', userSchoolId);
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

      // Obtener IDs de pedidos cancelados
      const lunchOrderIds = transactions
        ?.map((t: any) => t.metadata?.lunch_order_id)
        .filter(Boolean) || [];

      let cancelledOrderIds = new Set<string>();
      if (lunchOrderIds.length > 0) {
        const { data: cancelledOrders } = await supabase
          .from('lunch_orders')
          .select('id')
          .in('id', lunchOrderIds)
          .eq('is_cancelled', true);
        cancelledOrderIds = new Set(cancelledOrders?.map((o: any) => o.id) || []);
      }

      const validTransactions = transactions?.filter((t: any) => {
        if (t.metadata?.lunch_order_id && cancelledOrderIds.has(t.metadata.lunch_order_id)) return false;
        return true;
      }) || [];

      // Buscar transacciones PAID para evitar duplicados en lunch_orders
      let paidLunchSet = new Set<string>();
      const { data: paidTxs } = await supabase
        .from('transactions')
        .select('metadata')
        .eq('type', 'purchase')
        .eq('payment_status', 'paid')
        .not('metadata', 'is', null)
        .limit(100000);
      paidTxs?.forEach((t: any) => {
        if (t.metadata?.lunch_order_id) paidLunchSet.add(t.metadata.lunch_order_id);
      });

      // Pedidos de almuerzo confirmados sin transacciÃ³n
      let lunchOrdersQuery = supabase
        .from('lunch_orders')
        .select(`
          id, order_date, created_at, student_id, teacher_id, manual_name,
          payment_method, school_id, category_id, quantity, final_price, base_price,
          students(id, full_name, parent_id, school_id),
          teacher_profiles(id, full_name, school_id_1),
          schools(id, name),
          lunch_categories(id, name, price)
        `)
        .in('status', ['confirmed', 'delivered'])
        .eq('is_cancelled', false);

      const { data: lunchOrders } = await lunchOrdersQuery;

      const existingOrderKeys = new Set<string>();
      validTransactions.forEach((t: any) => {
        if (t.metadata?.lunch_order_id) existingOrderKeys.add(t.metadata.lunch_order_id);
      });

      // Crear transacciones virtuales para pedidos de almuerzo sin tx
      const virtualTransactions: any[] = [];
      lunchOrders?.forEach((order: any) => {
        if (existingOrderKeys.has(order.id) || paidLunchSet.has(order.id)) return;

        const price = order.final_price || order.base_price || order.lunch_categories?.price || 0;
        const filterSchoolId = userSchoolId;
        const orderSchoolId = order.school_id || order.students?.school_id || order.teacher_profiles?.school_id_1;
        if (filterSchoolId && orderSchoolId && orderSchoolId !== filterSchoolId) return;

        const student = order.students;
        const teacher = order.teacher_profiles;
        const school = order.schools;
        const categoryName = order.lunch_categories?.name || 'Almuerzo';

        virtualTransactions.push({
          id: `lunch_${order.id}`,
          type: 'purchase',
          payment_status: 'pending',
          amount: -price,
          description: `${categoryName} - ${format(new Date(order.order_date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}`,
          created_at: order.created_at,
          student_id: order.student_id || null,
          teacher_id: order.teacher_id || null,
          manual_client_name: order.manual_name || null,
          school_id: order.school_id || orderSchoolId,
          students: student || null,
          teacher_profiles: teacher || null,
          schools: school || null,
          transaction_items: [],
          metadata: {
            source: 'lunch_order',
            lunch_order_id: order.id,
            order_date: order.order_date,
            category: categoryName,
          },
        });
      });

      const allTransactions = [...validTransactions, ...virtualTransactions];

      // Buscar parents para enriquecer datos
      const parentIds = [...new Set(
        allTransactions
          .filter((t: any) => t.students?.parent_id)
          .map((t: any) => t.students.parent_id)
      )];

      let parentMap = new Map<string, any>();
      if (parentIds.length > 0) {
        // profiles solo tiene full_name y email; el teléfono vive en parent_profiles.phone_1
        const [{ data: profileRows }, { data: parentProfileRows }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', parentIds),
          supabase
            .from('parent_profiles')
            .select('user_id, phone_1')
            .in('user_id', parentIds),
        ]);
        const phoneMap = new Map<string, string>();
        parentProfileRows?.forEach((pp: any) => {
          if (pp.phone_1) phoneMap.set(pp.user_id, pp.phone_1);
        });
        profileRows?.forEach((p: any) =>
          parentMap.set(p.id, { ...p, phone: phoneMap.get(p.id) ?? null }),
        );
      }

      // Agrupar por deudor
      const debtorMap = new Map<string, Debtor>();

      allTransactions.forEach((tx: any) => {
        let debtorId: string;
        let clientName: string;
        let clientType: 'student' | 'teacher' | 'manual';
        let parentId: string | undefined;
        let parentInfo: any = null;
        const schoolName = tx.schools?.name || 'Sin sede';
        const schoolId = tx.school_id || '';

        if (tx.student_id && tx.students?.full_name) {
          debtorId = tx.student_id;
          clientName = tx.students.full_name;
          clientType = 'student';
          parentId = tx.students.parent_id;
          parentInfo = parentId ? parentMap.get(parentId) : null;
        } else if (tx.teacher_id && tx.teacher_profiles?.full_name) {
          debtorId = tx.teacher_id;
          clientName = tx.teacher_profiles.full_name;
          clientType = 'teacher';
        } else if (tx.manual_client_name) {
          debtorId = `manual_${tx.manual_client_name}`;
          clientName = tx.manual_client_name;
          clientType = 'manual';
        } else {
          return; // skip
        }

        // Para transacciones parciales, solo contar lo que AÚN se debe
        const netAmount =
          tx.payment_status === 'partial'
            ? Math.max(0, Math.abs(tx.amount) - Number(tx.metadata?.partial_paid_amount || 0))
            : Math.abs(tx.amount);

        if (debtorMap.has(debtorId)) {
          const existing = debtorMap.get(debtorId)!;
          existing.total_amount += netAmount;
          existing.transaction_count += 1;
          existing.transactions.push(tx);
        } else {
          debtorMap.set(debtorId, {
            id: debtorId,
            client_name: clientName,
            client_type: clientType,
            parent_id: parentId || undefined,
            parent_name: parentInfo?.full_name,
            parent_phone: parentInfo?.phone,
            parent_email: parentInfo?.email,
            school_id: schoolId,
            school_name: schoolName,
            total_amount: netAmount,
            transaction_count: 1,
            transactions: [tx],
          });
        }
      });

      const sortedDebtors = Array.from(debtorMap.values()).sort(
        (a, b) => b.total_amount - a.total_amount
      );
      setDebtors(sortedDebtors);
    } catch (error: any) {
      console.error('Error fetching debtors:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las deudas' });
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Control de Cuenta â€” carga historial completo de un cliente
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchClientStatement = async (client: {
    id: string; name: string; type: 'student' | 'teacher' | 'manual';
  }) => {
    setLoadingStatement(true);
    setStatementEvents([]);
    try {
      let txData: any[] = [];
      let rrData: any[] = [];

      if (client.type === 'student') {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('student_id', client.id)
          .not('is_deleted', 'eq', true)
          .order('created_at', { ascending: true });
        if (error) throw error;
        txData = data || [];

        const { data: rr } = await supabase
          .from('recharge_requests')
          .select('*')
          .eq('student_id', client.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: true });
        rrData = rr || [];

      } else if (client.type === 'teacher') {
        // Buscar TODAS las transacciones del profesor (por teacher_id)
        const { data: txById, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('teacher_id', client.id)
          .not('is_deleted', 'eq', true)
          .order('created_at', { ascending: true });
        if (error) throw error;

        // Tambien buscar pagos guardados por nombre (sistema anterior)
        const { data: txByName } = await supabase
          .from('transactions')
          .select('*')
          .eq('manual_client_name', client.name)
          .in('type', ['payment', 'recharge'])
          .not('is_deleted', 'eq', true)
          .order('created_at', { ascending: true });

        const existingIds = new Set((txById || []).map((t: any) => t.id));
        const legacyPayments = (txByName || []).filter((t: any) => !existingIds.has(t.id));
        txData = [...(txById || []), ...legacyPayments]
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const typeCounts = txData.reduce((acc: any, t: any) => { acc[t.type] = (acc[t.type]||0)+1; return acc; }, {});
        console.log('[DEBUG] txData para teacher:', txData.length, 'tipos:', typeCounts);
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('manual_client_name', client.name)
          .not('is_deleted', 'eq', true)
          .order('created_at', { ascending: true });
        if (error) throw error;
        txData = data || [];
      }

      // Construir eventos: consumos + abonos + recargas
      const txEvents: any[] = [];
      txData.forEach((tx) => {
        const debtAmount = Math.abs(Number(tx.amount || 0));
        const source = tx.metadata?.source || tx.type;
        const isPurchase = tx.type === 'purchase';
        const isRecharge = tx.type === 'recharge';
        const isPaymentTx = tx.type === 'payment'; // pagos legacy (antes del sistema FIFO)
        const partialPaid = Number(tx.metadata?.partial_paid_amount || 0);

        // 1) Evento de consumo (siempre para compras)
        if (isPurchase) {
          txEvents.push({
            id: `${tx.id}-debt`,
            created_at: tx.created_at,
            amount: -debtAmount,
            description: tx.description || 'Consumo',
            event_type: 'purchase',
            source,
            payment_status: tx.payment_status,
            ticket_code: tx.ticket_code,
            payment_method: null,
            metadata: tx.metadata,
          });
        }

        // 2) Evento de abono (cuando la compra fue parcial o pagada)
        if (isPurchase && tx.payment_status === 'partial' && partialPaid > 0) {
          txEvents.push({
            id: `${tx.id}-payment-partial`,
            created_at: tx.metadata?.partial_paid_at || tx.updated_at || tx.created_at,
            amount: partialPaid,
            description: `Abono parcial${tx.description ? ` Â· ${tx.description}` : ''}`,
            event_type: 'payment',
            source: 'debt_collection',
            payment_status: 'partial',
            ticket_code: tx.ticket_code,
            payment_method: tx.payment_method,
            metadata: tx.metadata,
          });
        } else if (isPurchase && tx.payment_status === 'paid') {
          txEvents.push({
            id: `${tx.id}-payment-full`,
            created_at: tx.updated_at || tx.created_at,
            amount: debtAmount,
            description: `Abono${tx.description ? ` Â· ${tx.description}` : ''}`,
            event_type: 'payment',
            source: 'debt_collection',
            payment_status: 'paid',
            ticket_code: tx.ticket_code,
            payment_method: tx.payment_method,
            metadata: tx.metadata,
          });
        }

        // 2c) Pago registrado como transaccion independiente (sistema anterior)
        if (isPaymentTx) {
          txEvents.push({
            id: `\-legacy-payment`,
            created_at: tx.created_at,
            amount: Math.abs(Number(tx.amount || 0)),
            description: tx.description || 'Abono registrado',
            event_type: 'payment',
            source: 'legacy',
            payment_status: 'paid',
            ticket_code: tx.ticket_code,
            payment_method: tx.payment_method,
            metadata: tx.metadata,
          });
        }

        // 3) Evento de recarga en transactions
        if (isRecharge) {
          txEvents.push({
            id: `${tx.id}-recharge`,
            created_at: tx.created_at,
            amount: Number(tx.amount || 0),
            description: tx.description || 'Recarga',
            event_type: 'recharge',
            source,
            payment_status: tx.payment_status,
            ticket_code: tx.ticket_code,
            payment_method: tx.payment_method,
            metadata: tx.metadata,
          });
        }
      });

      const rrEvents = rrData.map(rr => ({
        id: rr.id,
        created_at: rr.created_at,
        amount: rr.amount,
        description: `Recarga aprobada${rr.reference_code ? ` Â· NÂº ${rr.reference_code}` : ''}${rr.payment_method ? ` (${rr.payment_method})` : ''}`,
        event_type: 'recharge',
        source: 'recharge_request',
        payment_status: 'approved',
        ticket_code: null,
        payment_method: rr.payment_method,
        metadata: null,
      }));

      // Combinar y ordenar todas las fuentes cronolÃ³gicamente
      const events: any[] = [...txEvents, ...rrEvents]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Calcular saldo acumulado (running balance)
      let balance = 0;
      const enriched = events.map(e => {
        balance += e.amount;
        return { ...e, running_balance: balance };
      });
      setStatementEvents(enriched);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el estado de cuenta' });
    } finally {
      setLoadingStatement(false);
    }
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Filtrado
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredDebtors = useMemo(() => {
    if (!searchTerm) return debtors;
    const norm = normalizeSearch(searchTerm);
    return debtors.filter(d =>
      normalizeSearch(d.client_name).includes(norm) ||
      normalizeSearch(d.parent_name || '').includes(norm)
    );
  }, [debtors, searchTerm]);

  const totalDebt = useMemo(() => filteredDebtors.reduce((s, d) => s + d.total_amount, 0), [filteredDebtors]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Helpers de "fuente de verdad" â€” nombres reales de productos
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Dado un item de transaction_items, devuelve un nombre legible */
  const cleanProductName = (raw: string): string => {
    if (!raw) return 'Producto';
    // Quitar prefijos tÃ©cnicos
    return raw
      .replace(/^(product_|item_)/i, '')
      .replace(/^\d+\s*[-â€“â€”]\s*/, '')   // quita "1 - ", "2 - "
      .trim();
  };

  /**
   * Devuelve las lÃ­neas de detalle de una transacciÃ³n.
   * Fuente de verdad: transaction_items (nombres reales de productos).
   * Fallback: descripciÃ³n legible.
   */
  const getTxProductLines = (tx: any): Array<{ name: string; qty: number; subtotal: number }> => {
    const items = tx.transaction_items as Array<any> | null | undefined;

    // 1) Usar transaction_items si existen
    if (items && items.length > 0) {
      // Agregar por nombre de producto (en caso de duplicados)
      const map = new Map<string, { qty: number; subtotal: number }>();
      items.forEach((it: any) => {
        const name = cleanProductName(it.product_name || 'Producto');
        const existing = map.get(name);
        if (existing) {
          existing.qty += it.quantity || 1;
          existing.subtotal += it.subtotal ?? Math.abs(it.unit_price ?? 0) * (it.quantity ?? 1);
        } else {
          map.set(name, {
            qty: it.quantity || 1,
            subtotal: it.subtotal ?? Math.abs(it.unit_price ?? 0) * (it.quantity ?? 1),
          });
        }
      });
      return Array.from(map.entries()).map(([name, v]) => ({ name, qty: v.qty, subtotal: v.subtotal }));
    }

    // 2) Almuerzo virtual (sin transaction_items)
    if (tx.metadata?.source === 'lunch_order' || tx.description?.toLowerCase().includes('almuerzo')) {
      const label = tx.metadata?.category
        ? `ðŸ½ï¸ ${tx.metadata.category}`
        : 'ðŸ½ï¸ Almuerzo';
      const dateStr = tx.metadata?.order_date
        ? format(new Date(tx.metadata.order_date + 'T12:00:00'), "d 'de' MMM", { locale: es })
        : '';
      return [{ name: dateStr ? `${label} â€” ${dateStr}` : label, qty: 1, subtotal: Math.abs(tx.amount) }];
    }

    // 3) Venta histÃ³rica
    if (tx.metadata?.source === 'historical_kiosk_entry') {
      return [{ name: 'ðŸ“‹ Consumo histÃ³rico kiosco', qty: 1, subtotal: Math.abs(tx.amount) }];
    }

    // 4) Fallback: limpiar descripciÃ³n genÃ©rica
    let desc = tx.description || 'Consumo';
    desc = desc
      .replace(/Compra POS \(Cuenta Libre\)\s*[-â€“â€”]?\s*Total:\s*S\/\s*[\d.]+/i, 'Consumo Kiosco')
      .replace(/Compra POS\s*[-â€“â€”]?\s*Total:\s*S\/\s*[\d.]+/i, 'Consumo Kiosco')
      .replace(/Compra Profesor:\s*.+\s*[-â€“â€”]\s*\d+ items?/i, 'Consumo Kiosco')
      .replace(/\s*[-â€“â€”]\s*Total:\s*S\/\s*[\d.]+/i, '')
      .trim();
    return [{ name: desc || 'Consumo Kiosco', qty: 1, subtotal: Math.abs(tx.amount) }];
  };

  /**
   * Agrega todas las lÃ­neas de producto de un deudor (todas sus transacciones).
   * Si el mismo producto aparece en mÃºltiples tickets, suma cantidades y subtotales.
   */
  const getDebtorProductSummary = (
    debtor: Debtor,
  ): Array<{ name: string; qty: number; subtotal: number }> => {
    const map = new Map<string, { qty: number; subtotal: number }>();
    debtor.transactions.forEach(tx => {
      getTxProductLines(tx).forEach(({ name, qty, subtotal }) => {
        const existing = map.get(name);
        if (existing) {
          existing.qty += qty;
          existing.subtotal += subtotal;
        } else {
          map.set(name, { qty, subtotal });
        }
      });
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, qty: v.qty, subtotal: v.subtotal }));
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Acciones
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleChecked = (id: string) => {
    setCheckedDebtors(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyMessage = (debtor: Debtor) => {
    const recipientName =
      debtor.client_type === 'student'
        ? debtor.parent_name || 'Padre/Madre de familia'
        : debtor.client_name;

    const productLines = getDebtorProductSummary(debtor);

    const lines: string[] = [
      `*Recordatorio de Pago - ${
        debtor.client_type === 'student' ? debtor.client_name : debtor.client_name
      }*`,
      '',
      `Estimado(a) ${recipientName},`,
      '',
      debtor.client_type === 'student'
        ? `El alumno *${debtor.client_name}* tiene consumos pendientes en MaracuyÃ¡:`
        : `Tiene consumos pendientes en MaracuyÃ¡:`,
      '',
      `Monto Total: *S/ ${debtor.total_amount.toFixed(2)}*`,
      '',
      'Detalle:',
      ...productLines.map(p =>
        p.qty > 1
          ? `- ${p.qty}x ${p.name} â€” S/ ${p.subtotal.toFixed(2)}`
          : `- ${p.name} â€” S/ ${p.subtotal.toFixed(2)}`
      ),
      '',
      'Para cancelar, acÃ©rquese a administraciÃ³n o contÃ¡ctenos.',
      'Gracias ðŸ™',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'ðŸ“‹ Copiado', description: 'Mensaje listo para WhatsApp' });
    setCheckedDebtors(prev => new Set(prev).add(debtor.id));
  };

  const handleOpenPayment = (debtor: Debtor) => {
    setCurrentDebtor(debtor);
    setPaymentData({
      paid_amount: debtor.total_amount,
      payment_method: 'efectivo',
      operation_number: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleRegisterPayment = async () => {
    if (!currentDebtor || !user) return;
    if (paymentData.paid_amount <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'El monto debe ser mayor a 0' });
      return;
    }

    setSaving(true);
    try {
      // â”€â”€ FIFO: ordenar TODOS los tickets de mÃ¡s antiguo a mÃ¡s reciente â”€â”€
      const allTxsSorted = [...currentDebtor.transactions].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const virtualTxs = allTxsSorted.filter((t: any) => t.id?.toString().startsWith('lunch_'));

      let remaining = paymentData.paid_amount;
      let opCounter = 0;
      const totalTxCount = allTxsSorted.length;

      const makeOpNum = (base: string | null) => {
        if (!base) return null;
        opCounter++;
        return totalTxCount === 1 ? base : `${base}-${opCounter}`;
      };

      // Pre-generar ticket base para pedidos virtuales
      let ticketBase = '';
      if (virtualTxs.length > 0) {
        try {
          const { data: tNum } = await supabase.rpc('get_next_ticket_number', { p_user_id: user.id });
          if (tNum) ticketBase = tNum;
        } catch {}
        if (!ticketBase) ticketBase = `COB-${Date.now()}`;
      }

      // Anti-duplicado para pedidos de almuerzo
      const lunchIds = virtualTxs.map((vt: any) => vt.metadata?.lunch_order_id).filter(Boolean);
      let existingLunchSet = new Set<string>();
      if (lunchIds.length > 0) {
        const { data: exTx } = await supabase
          .from('transactions').select('metadata').eq('type', 'purchase')
          .not('metadata', 'is', null).limit(100000);
        exTx?.forEach((t: any) => { if (t.metadata?.lunch_order_id) existingLunchSet.add(t.metadata.lunch_order_id); });
      }

      let ticketCounter = 0;
      const lunchOrdersToDeliver: string[] = [];

      // â”€â”€ Aplicar FIFO ticket por ticket â”€â”€
      for (const tx of allTxsSorted) {
        if (remaining <= 0.001) break;

        const txAmount = Math.abs(tx.amount);
        const isVirtual = tx.id?.toString().startsWith('lunch_');
        const lunchOrderId = tx.metadata?.lunch_order_id;

        if (isVirtual) {
          if (existingLunchSet.has(lunchOrderId)) continue;
          ticketCounter++;
          const tCode = virtualTxs.length > 1 ? `${ticketBase}-${ticketCounter}` : ticketBase;

          const status = remaining >= txAmount ? 'paid' : 'partial';
          const partialMeta = remaining < txAmount
            ? { partial_paid_amount: remaining, partial_paid_at: new Date().toISOString() }
            : {};

          const { error } = await supabase.from('transactions').insert({
            type: 'purchase',
            amount: tx.amount,
            payment_status: status,
            payment_method: paymentData.payment_method,
            operation_number: makeOpNum(paymentData.operation_number || null),
            description: tx.description,
            student_id: tx.student_id || null,
            teacher_id: tx.teacher_id || null,
            manual_client_name: tx.manual_client_name || null,
            school_id: tx.school_id,
            created_by: user.id,
            ticket_code: tCode,
            metadata: { ...(tx.metadata || {}), ...partialMeta },
          });
          if (error) throw error;
          if (lunchOrderId) lunchOrdersToDeliver.push(lunchOrderId);
          remaining = remaining >= txAmount ? remaining - txAmount : 0;

        } else {
          // TransacciÃ³n real: UPDATE
          if (remaining >= txAmount) {
            const { error } = await supabase
              .from('transactions')
              .update({
                payment_status: 'paid',
                payment_method: paymentData.payment_method,
                operation_number: makeOpNum(paymentData.operation_number || null),
                created_by: user.id,
              })
              .eq('id', tx.id);
            if (error) throw error;
            if (lunchOrderId) lunchOrdersToDeliver.push(lunchOrderId);
            remaining -= txAmount;
          } else {
            // Pago parcial: marca el ticket como 'partial' y guarda cuÃ¡nto se abonÃ³
            const { error } = await supabase
              .from('transactions')
              .update({
                payment_status: 'partial',
                payment_method: paymentData.payment_method,
                operation_number: makeOpNum(paymentData.operation_number || null),
                metadata: {
                  ...(tx.metadata || {}),
                  partial_paid_amount: remaining,
                  partial_paid_at: new Date().toISOString(),
                  partial_paid_by: user.id,
                },
              })
              .eq('id', tx.id);
            if (error) throw error;
            if (lunchOrderId) lunchOrdersToDeliver.push(lunchOrderId);
            remaining = 0;
          }
        }
      }

      // Marcar lunch_orders como delivered
      if (lunchOrdersToDeliver.length > 0) {
        await supabase.from('lunch_orders')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .in('id', lunchOrdersToDeliver.filter(Boolean));
      }

      // Si sobra dinero (pago > deuda) â†’ acreditar excedente al balance del alumno
      if (remaining > 0.01 && currentDebtor.client_type === 'student') {
        try {
          await supabase.rpc('process_manual_recharge', {
            p_student_id:     currentDebtor.id,
            p_amount:         remaining,
            p_payment_method: paymentData.payment_method,
            p_description:    `Excedente de cobro - ${format(new Date(), "d MMM yyyy", { locale: es })}`,
            p_admin_id:       user.id,
          });
        } catch (exErr) {
          console.error('Error aplicando excedente al saldo:', exErr);
        }
      }

      let desc = `S/ ${paymentData.paid_amount.toFixed(2)} aplicado con ${paymentData.payment_method}`;
      if (remaining > 0.01 && currentDebtor.client_type === 'student') {
        desc += ` Â· S/ ${remaining.toFixed(2)} acreditado al saldo`;
      } else if (remaining <= 0.001) {
        const totalDebtDebtor = currentDebtor.total_amount;
        if (paymentData.paid_amount < totalDebtDebtor) desc += ' (pago parcial â€” FIFO)';
      }

      toast({ title: 'âœ… Pago registrado', description: desc });
      setShowPaymentModal(false);
      const debtorId = currentDebtor.id;
      setCurrentDebtor(null);
      setCheckedDebtors(prev => new Set(prev).add(debtorId));
      await fetchDebtors();
      // Refrescar el Control de Cuenta si estaba abierto
      if (selectedDebtor && selectedDebtor.id === debtorId) {
        fetchClientStatement({ id: selectedDebtor.id, name: selectedDebtor.client_name, type: selectedDebtor.client_type });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al registrar pago', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Render helpers
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const clientTypeLabel = (type: string) => {
    if (type === 'teacher') return <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-700">Profesor</Badge>;
    if (type === 'manual') return <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-600">GenÃ©rico</Badge>;
    return <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">Alumno</Badge>;
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Render
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4">

      {/* â”€â”€ Buscador + Refresh + Volver â”€â”€ */}
      <div className="flex gap-2 items-center">
        {selectedDebtor && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            title="Volver a la lista"
            onClick={() => { setSelectedDebtor(null); setStatementEvents([]); setSearchTerm(''); }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar nombreâ€¦"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              if (selectedDebtor) { setSelectedDebtor(null); setStatementEvents([]); }
            }}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => selectedDebtor
            ? fetchClientStatement({ id: selectedDebtor.id, name: selectedDebtor.client_name, type: selectedDebtor.client_type })
            : fetchDebtors()
          }
          title="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          VISTA UNIFICADA â€” CONTROL DE CUENTA
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {selectedDebtor ? (
        /* â”€â”€ CONTROL DE CUENTA: feed cronolÃ³gico â”€â”€ */
        <div className="space-y-3">
          {/* Cabecera del cliente */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-base text-gray-900 truncate">{selectedDebtor.client_name}</p>
                {clientTypeLabel(selectedDebtor.client_type)}
              </div>
              {selectedDebtor.client_type === 'student' && selectedDebtor.parent_name && (
                <p className="text-[11px] text-gray-500 truncate mt-0.5">ðŸ‘¤ {selectedDebtor.parent_name}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-emerald-600"
                title="Copiar para WhatsApp" onClick={() => copyMessage(selectedDebtor)}>
                <Copy className="h-4 w-4" />
              </Button>
              {(selectedDebtor.client_type === 'teacher' || (selectedDebtor.client_type === 'student' && selectedDebtor.parent_id)) && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-amber-600"
                  title={selectedDebtor.client_type === 'teacher' ? 'Ver portal del profesor' : 'Ver portal del padre'}
                  onClick={() => {
                    if (selectedDebtor.client_type === 'teacher') { setPreview(selectedDebtor.id, selectedDebtor.client_name, 'teacher'); navigate('/teacher'); }
                    else if (selectedDebtor.parent_id) { setPreview(selectedDebtor.parent_id, selectedDebtor.parent_name || selectedDebtor.client_name, 'parent'); navigate('/'); }
                  }}>
                  <KeyRound className="h-4 w-4" />
                </Button>
              )}
              {canCollect && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                  onClick={() => handleOpenPayment(selectedDebtor)}>
                  <DollarSign className="h-3.5 w-3.5" />
                  Registrar Pago
                </Button>
              )}
            </div>
          </div>

          {/* DOS TABLAS: Consumos + Abonos */}
          {loadingStatement ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (() => {
            const debtRows    = statementEvents.filter(e => e.event_type === 'purchase');
            const paymentRows = statementEvents.filter(e => e.event_type === 'payment' || e.event_type === 'recharge');

            // totalDebtAmt = solo lo que AÚN se debe (pending completo + restante de partial)
            // Las compras ya pagadas (status=paid) aparecen en la tabla pero NO suman a la deuda activa
            const totalDebtAmt = debtRows.reduce((s, e) => {
              if (e.payment_status === 'paid') return s;
              if (e.payment_status === 'partial') {
                const partialPaid = Number(e.metadata?.partial_paid_amount || 0);
                return s + Math.max(0, Math.abs(e.amount) - partialPaid);
              }
              return s + Math.abs(e.amount);
            }, 0);
            const totalPaidAmt = paymentRows.reduce((s, e) => s + Math.abs(e.amount), 0);
            const netBalance   = totalPaidAmt - totalDebtAmt;
            return (
              <div className="space-y-4">
                {/* TABLA 1: Lo que debe */}
                <div className="rounded-xl border border-red-200 overflow-hidden shadow-sm">
                  <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="font-bold text-sm">Consumos / Lo que debe</span>
                    <span className="font-black text-base">-S/ {totalDebtAmt.toFixed(2)}</span>
                  </div>
                  {debtRows.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm bg-white">Sin consumos pendientes</div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[40vh] overflow-y-auto">
                      {debtRows.map(ev => {
                        const isPaid    = ev.payment_status === 'paid';
                        const isPartial = ev.payment_status === 'partial';
                        const partialPaid = Number(ev.metadata?.partial_paid_amount || 0);
                        const remaining   = Math.abs(ev.amount) - partialPaid;
                        return (
                          <div key={ev.id} className={`flex items-start gap-3 px-4 py-3 ${isPaid ? 'bg-gray-50' : isPartial ? 'bg-amber-50' : 'bg-white'}`}>
                            <div className="flex-shrink-0 mt-1">
                              {isPaid    ? <CheckCircle2 className="h-4 w-4 text-gray-400" />
                              : isPartial ? <span className="text-amber-500 font-black text-sm leading-none">1/2</span>
                              :             <span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isPaid ? 'text-gray-400 line-through decoration-2' : isPartial ? 'text-amber-700 line-through' : 'text-gray-800'}`}>
                                {ev.description || 'Consumo'}
                              </p>
                              <div className="flex gap-2 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-gray-400">{format(new Date(ev.created_at), "d MMM yyyy", { locale: es })}</span>
                                {isPartial && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 rounded-full font-semibold">Parcial - resta S/ {remaining.toFixed(2)}</span>}
                                {isPaid    && <span className="text-[10px] bg-gray-100 text-gray-500 border border-gray-200 px-1.5 rounded-full font-semibold">Pagado</span>}
                              </div>
                            </div>
                            <span className={`font-bold text-sm whitespace-nowrap flex-shrink-0 ${isPaid ? 'text-gray-400 line-through decoration-2' : isPartial ? 'text-amber-600' : 'text-red-600'}`}>
                              -S/ {Math.abs(ev.amount).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* TABLA 2: Lo que ha abonado */}
                <div className="rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
                  <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="font-bold text-sm">Abonos / Lo que ha pagado</span>
                    <span className="font-black text-base">+S/ {totalPaidAmt.toFixed(2)}</span>
                  </div>
                  {paymentRows.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm bg-white">Sin pagos registrados</div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[40vh] overflow-y-auto">
                      {paymentRows.map(ev => (
                        <div key={ev.id} className="flex items-start gap-3 px-4 py-3 bg-white">
                          <div className="flex-shrink-0 mt-1">
                            {ev.event_type === 'recharge'
                              ? <span className="text-emerald-500 font-black text-base leading-none">+</span>
                              : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-emerald-700">
                              {ev.description || (ev.event_type === 'recharge' ? 'Recarga' : 'Abono')}
                            </p>
                            <div className="flex gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-gray-400">{format(new Date(ev.created_at), "d MMM yyyy", { locale: es })}</span>
                              {ev.payment_method && <span className="text-[11px] capitalize text-indigo-500">{ev.payment_method}</span>}
                              {ev.event_type === 'recharge' && <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 rounded-full font-semibold">Recarga</span>}
                            </div>
                          </div>
                          <span className="font-bold text-sm text-emerald-600 whitespace-nowrap flex-shrink-0">
                            +S/ {Math.abs(ev.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* FOOTER: Saldo neto */}
                <div className={`flex items-center justify-between rounded-xl px-5 py-4 font-black shadow-sm ${netBalance < 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest opacity-80">{netBalance < 0 ? 'Aun debe' : 'Saldo a favor'}</p>
                    <p className="text-xl">{netBalance < 0 ? '-' : '+'}S/ {Math.abs(netBalance).toFixed(2)}</p>
                  </div>
                  <div className="text-right text-[11px] opacity-80 space-y-0.5">
                    <p>Consumos: S/ {totalDebtAmt.toFixed(2)}</p>
                    <p>Abonos: +S/ {totalPaidAmt.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* â”€â”€ LISTA DE DEUDORES â”€â”€ */
        <>
          {/* Resumen */}
          {!loading && filteredDebtors.length > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700 font-medium">{filteredDebtors.length} deudores</span>
              </div>
              <span className="text-lg font-black text-red-700">S/ {totalDebt.toFixed(2)}</span>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredDebtors.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
              <p className="font-semibold text-gray-600">Â¡Sin deudas pendientes!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDebtors.map(debtor => {
                const isChecked = checkedDebtors.has(debtor.id);
                return (
                  <div
                    key={debtor.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isChecked
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Checkbox de cobrado */}
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleChecked(debtor.id)}
                      title="Marcar como cobrado/notificado"
                      className="flex-shrink-0"
                    />

                    {/* Nombre + tipo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-sm truncate ${isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {debtor.client_name}
                        </p>
                        {clientTypeLabel(debtor.client_type)}
                        {isChecked && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">
                            <Check className="h-2.5 w-2.5 mr-0.5" />
                            Notificado
                          </Badge>
                        )}
                      </div>
                      {debtor.client_type === 'student' && debtor.parent_name && (
                        <p className="text-[11px] text-gray-500 truncate">ðŸ‘¤ {debtor.parent_name}</p>
                      )}
                      <p className="text-[11px] text-gray-400">{debtor.transaction_count} consumo(s)</p>
                    </div>

                    {/* Monto */}
                    <span className="text-base font-black text-red-600 flex-shrink-0 tabular-nums">
                      S/ {debtor.total_amount.toFixed(2)}
                    </span>

                    {/* Acciones */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Ver Control de Cuenta"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDebtor(debtor);
                          fetchClientStatement({ id: debtor.id, name: debtor.client_name, type: debtor.client_type });
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                        title="Copiar para WhatsApp"
                        onClick={() => copyMessage(debtor)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {/* BotÃ³n de impersonaciÃ³n â€” solo para alumnos (con padre) y profesores */}
                      {(debtor.client_type === 'teacher' || (debtor.client_type === 'student' && debtor.parent_id)) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                          title={debtor.client_type === 'teacher' ? 'Ver portal del profesor' : 'Ver portal del padre'}
                          onClick={() => {
                            if (debtor.client_type === 'teacher') {
                              setPreview(debtor.id, debtor.client_name, 'teacher');
                              navigate('/teacher');
                            } else if (debtor.parent_id) {
                              setPreview(debtor.parent_id, debtor.parent_name || debtor.client_name, 'parent');
                              navigate('/');
                            }
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredDebtors.length > 0 && (
            <p className="text-[11px] text-gray-400 text-center">
              â˜‘ Marca el checkbox cuando notifiques Â· toca la fila para ver el historial completo
            </p>
          )}
        </>
      )}


      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          MODAL â€” Registrar pago
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Dialog open={showPaymentModal} onOpenChange={open => { if (!open) { setShowPaymentModal(false); setCurrentDebtor(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Registrar Pago â€” {currentDebtor?.client_name}
            </DialogTitle>
          </DialogHeader>

          {currentDebtor && (
            <div className="space-y-4">
              {/* Monto */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Monto (S/)</label>
                <Input
                  type="number"
                  step="0.10"
                  min="0.01"
                  value={paymentData.paid_amount}
                  onChange={e => setPaymentData(p => ({ ...p, paid_amount: parseFloat(e.target.value) || 0 }))}
                  className="text-base font-semibold"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-gray-400">Total deuda: S/ {currentDebtor.total_amount.toFixed(2)}</p>
                  {paymentData.paid_amount > currentDebtor.total_amount + 0.01 && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      +S/ {(paymentData.paid_amount - currentDebtor.total_amount).toFixed(2)} al saldo
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-indigo-500 mt-1">
                  âŸ³ El pago se aplicarÃ¡ automÃ¡ticamente a los consumos mÃ¡s antiguos
                </p>
              </div>

              {/* MÃ©todo de pago */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">MÃ©todo de pago</label>
                <select
                  value={paymentData.payment_method}
                  onChange={e => setPaymentData(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="efectivo">ðŸ’µ Efectivo</option>
                  <option value="yape">ðŸ’œ Yape</option>
                  <option value="plin">ðŸ’š Plin</option>
                  <option value="transferencia">ðŸ¦ Transferencia</option>
                </select>
              </div>

              {/* NÂ° OperaciÃ³n â€” opcional */}
              {['yape', 'plin', 'transferencia'].includes(paymentData.payment_method) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">NÂ° de operaciÃ³n</label>
                  <Input
                    placeholder="Ej: 123456789"
                    value={paymentData.operation_number}
                    onChange={e => setPaymentData(p => ({ ...p, operation_number: e.target.value }))}
                  />
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Notas (opcional)</label>
                <Input
                  placeholder="Observacionesâ€¦"
                  value={paymentData.notes}
                  onChange={e => setPaymentData(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowPaymentModal(false); setCurrentDebtor(null); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegisterPayment}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
