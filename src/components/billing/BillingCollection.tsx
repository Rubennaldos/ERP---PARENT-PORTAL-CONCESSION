import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeSearch } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface Debtor {
  id: string;
  client_name: string;
  client_type: 'student' | 'teacher' | 'manual';
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  school_id: string;
  school_name: string;
  total_amount: number;
  transaction_count: number;
  transactions: any[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
export const BillingCollection = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Core state ──
  const [loading, setLoading] = useState(true);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [paidTransactions, setPaidTransactions] = useState<any[]>([]);
  const [loadingPaid, setLoadingPaid] = useState(false);
  const [paidLoaded, setPaidLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'cobrar' | 'pagos'>('cobrar');
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Checklist de "cobrado" (local, para esta sesión) ──
  const [checkedDebtors, setCheckedDebtors] = useState<Set<string>>(new Set());

  // ── Modal de detalle ──
  const [detailDebtor, setDetailDebtor] = useState<Debtor | null>(null);

  // ── Modal de pago ──
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentDebtor, setCurrentDebtor] = useState<Debtor | null>(null);
  const [paymentData, setPaymentData] = useState({
    paid_amount: 0,
    payment_method: 'efectivo',
    operation_number: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // ── Permisos ──
  const [canCollect, setCanCollect] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // Init
  // ──────────────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (activeTab === 'pagos' && !paidLoaded) {
      fetchPaidTransactions();
    }
  }, [activeTab]);

  // ──────────────────────────────────────────────────────────────────────────
  // Fetch deudores
  // ──────────────────────────────────────────────────────────────────────────
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

      // Pedidos de almuerzo confirmados sin transacción
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
        const { data: parents } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email')
          .in('id', parentIds);
        parents?.forEach((p: any) => parentMap.set(p.id, p));
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

        if (debtorMap.has(debtorId)) {
          const existing = debtorMap.get(debtorId)!;
          existing.total_amount += Math.abs(tx.amount);
          existing.transaction_count += 1;
          existing.transactions.push(tx);
        } else {
          debtorMap.set(debtorId, {
            id: debtorId,
            client_name: clientName,
            client_type: clientType,
            parent_name: parentInfo?.full_name,
            parent_phone: parentInfo?.phone,
            parent_email: parentInfo?.email,
            school_id: schoolId,
            school_name: schoolName,
            total_amount: Math.abs(tx.amount),
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

  // ──────────────────────────────────────────────────────────────────────────
  // Fetch pagos realizados
  // ──────────────────────────────────────────────────────────────────────────
  const fetchPaidTransactions = async () => {
    try {
      setLoadingPaid(true);

      let query = supabase
        .from('transactions')
        .select(`
          *,
          students(id, full_name),
          teacher_profiles(id, full_name),
          transaction_items(id, product_name, quantity, unit_price, subtotal)
        `)
        .eq('type', 'purchase')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(500);

      if (userSchoolId) query = query.eq('school_id', userSchoolId);

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar pedidos cancelados
      const lunchOrderIds = data?.map((t: any) => t.metadata?.lunch_order_id).filter(Boolean) || [];
      let cancelledIds = new Set<string>();
      if (lunchOrderIds.length > 0) {
        const { data: cancelled } = await supabase
          .from('lunch_orders').select('id').in('id', lunchOrderIds).eq('is_cancelled', true);
        cancelledIds = new Set(cancelled?.map((o: any) => o.id) || []);
      }

      const valid = data?.filter((t: any) => {
        if (t.metadata?.lunch_order_id && cancelledIds.has(t.metadata.lunch_order_id)) return false;
        return true;
      }) || [];

      setPaidTransactions(valid);
      setPaidLoaded(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los pagos' });
    } finally {
      setLoadingPaid(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Filtrado
  // ──────────────────────────────────────────────────────────────────────────
  const filteredDebtors = useMemo(() => {
    if (!searchTerm) return debtors;
    const norm = normalizeSearch(searchTerm);
    return debtors.filter(d =>
      normalizeSearch(d.client_name).includes(norm) ||
      normalizeSearch(d.parent_name || '').includes(norm)
    );
  }, [debtors, searchTerm]);

  const filteredPaid = useMemo(() => {
    if (!searchTerm) return paidTransactions;
    const norm = normalizeSearch(searchTerm);
    return paidTransactions.filter(t => {
      const name = t.students?.full_name || t.teacher_profiles?.full_name || t.manual_client_name || '';
      return normalizeSearch(name).includes(norm) ||
        (t.ticket_code || '').toLowerCase().includes(norm);
    });
  }, [paidTransactions, searchTerm]);

  const totalDebt = useMemo(() => filteredDebtors.reduce((s, d) => s + d.total_amount, 0), [filteredDebtors]);

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers de "fuente de verdad" — nombres reales de productos
  // ──────────────────────────────────────────────────────────────────────────

  /** Dado un item de transaction_items, devuelve un nombre legible */
  const cleanProductName = (raw: string): string => {
    if (!raw) return 'Producto';
    // Quitar prefijos técnicos
    return raw
      .replace(/^(product_|item_)/i, '')
      .replace(/^\d+\s*[-–—]\s*/, '')   // quita "1 - ", "2 - "
      .trim();
  };

  /**
   * Devuelve las líneas de detalle de una transacción.
   * Fuente de verdad: transaction_items (nombres reales de productos).
   * Fallback: descripción legible.
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
        ? `🍽️ ${tx.metadata.category}`
        : '🍽️ Almuerzo';
      const dateStr = tx.metadata?.order_date
        ? format(new Date(tx.metadata.order_date + 'T12:00:00'), "d 'de' MMM", { locale: es })
        : '';
      return [{ name: dateStr ? `${label} — ${dateStr}` : label, qty: 1, subtotal: Math.abs(tx.amount) }];
    }

    // 3) Venta histórica
    if (tx.metadata?.source === 'historical_kiosk_entry') {
      return [{ name: '📋 Consumo histórico kiosco', qty: 1, subtotal: Math.abs(tx.amount) }];
    }

    // 4) Fallback: limpiar descripción genérica
    let desc = tx.description || 'Consumo';
    desc = desc
      .replace(/Compra POS \(Cuenta Libre\)\s*[-–—]?\s*Total:\s*S\/\s*[\d.]+/i, 'Consumo Kiosco')
      .replace(/Compra POS\s*[-–—]?\s*Total:\s*S\/\s*[\d.]+/i, 'Consumo Kiosco')
      .replace(/Compra Profesor:\s*.+\s*[-–—]\s*\d+ items?/i, 'Consumo Kiosco')
      .replace(/\s*[-–—]\s*Total:\s*S\/\s*[\d.]+/i, '')
      .trim();
    return [{ name: desc || 'Consumo Kiosco', qty: 1, subtotal: Math.abs(tx.amount) }];
  };

  /**
   * Agrega todas las líneas de producto de un deudor (todas sus transacciones).
   * Si el mismo producto aparece en múltiples tickets, suma cantidades y subtotales.
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

  // ──────────────────────────────────────────────────────────────────────────
  // Acciones
  // ──────────────────────────────────────────────────────────────────────────
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
        ? `El alumno *${debtor.client_name}* tiene consumos pendientes en Maracuyá:`
        : `Tiene consumos pendientes en Maracuyá:`,
      '',
      `Monto Total: *S/ ${debtor.total_amount.toFixed(2)}*`,
      '',
      'Detalle:',
      ...productLines.map(p =>
        p.qty > 1
          ? `- ${p.qty}x ${p.name} — S/ ${p.subtotal.toFixed(2)}`
          : `- ${p.name} — S/ ${p.subtotal.toFixed(2)}`
      ),
      '',
      'Para cancelar, acérquese a administración o contáctenos.',
      'Gracias 🙏',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: '📋 Copiado', description: 'Mensaje listo para WhatsApp' });
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
    if (['yape', 'plin', 'transferencia'].includes(paymentData.payment_method) && !paymentData.operation_number) {
      toast({ variant: 'destructive', title: 'Nº de operación requerido', description: 'Ingresa el número de operación' });
      return;
    }

    setSaving(true);
    try {
      const realTxs = currentDebtor.transactions.filter((t: any) => !t.id?.toString().startsWith('lunch_'));
      const virtualTxs = currentDebtor.transactions.filter((t: any) => t.id?.toString().startsWith('lunch_'));
      const totalTx = currentDebtor.transactions.length;
      let counter = 0;

      const makeOpNumber = (base: string | null) => {
        if (!base) return null;
        counter++;
        return totalTx === 1 ? base : `${base}-${counter}`;
      };

      // Actualizar transacciones reales
      for (const tx of realTxs) {
        const { error } = await supabase
          .from('transactions')
          .update({
            payment_status: 'paid',
            payment_method: paymentData.payment_method,
            operation_number: makeOpNumber(paymentData.operation_number || null),
            created_by: user.id,
          })
          .eq('id', tx.id);
        if (error) throw error;
      }

      // Crear transacciones para pedidos virtuales (almuerzo)
      if (virtualTxs.length > 0) {
        let ticketBase = '';
        try {
          const { data: tNum } = await supabase.rpc('get_next_ticket_number', { p_user_id: user.id });
          if (tNum) ticketBase = tNum;
        } catch {}
        if (!ticketBase) ticketBase = `COB-${Date.now()}`;

        // Anti-duplicado
        const lunchIds = virtualTxs.map((vt: any) => vt.metadata?.lunch_order_id).filter(Boolean);
        let existingSet = new Set<string>();
        if (lunchIds.length > 0) {
          const { data: exTx } = await supabase
            .from('transactions').select('metadata').eq('type', 'purchase')
            .not('metadata', 'is', null).limit(100000);
          exTx?.forEach((t: any) => { if (t.metadata?.lunch_order_id) existingSet.add(t.metadata.lunch_order_id); });
        }

        let tCounter = 0;
        const toCreate = virtualTxs
          .filter((vt: any) => !existingSet.has(vt.metadata?.lunch_order_id))
          .map((vt: any) => {
            tCounter++;
            return {
              type: 'purchase',
              amount: vt.amount,
              payment_status: 'paid',
              payment_method: paymentData.payment_method,
              operation_number: makeOpNumber(paymentData.operation_number || null),
              description: vt.description,
              student_id: vt.student_id || null,
              teacher_id: vt.teacher_id || null,
              manual_client_name: vt.manual_client_name || null,
              school_id: vt.school_id,
              created_by: user.id,
              ticket_code: virtualTxs.length > 1 ? `${ticketBase}-${tCounter}` : ticketBase,
              metadata: vt.metadata || null,
            };
          });

        if (toCreate.length > 0) {
          const { error } = await supabase.from('transactions').insert(toCreate);
          if (error) throw error;
        }

        // Marcar lunch_orders como delivered
        const toDeliver = virtualTxs.map((vt: any) => vt.metadata?.lunch_order_id).filter(Boolean);
        if (toDeliver.length > 0) {
          await supabase.from('lunch_orders')
            .update({ status: 'delivered', delivered_at: new Date().toISOString() })
            .in('id', toDeliver);
        }
      }

      // Marcar lunch_orders de reales como delivered
      const realLunchIds = realTxs.map((t: any) => t.metadata?.lunch_order_id).filter(Boolean);
      if (realLunchIds.length > 0) {
        await supabase.from('lunch_orders')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .in('id', realLunchIds);
      }

      toast({ title: '✅ Pago registrado', description: `S/ ${paymentData.paid_amount.toFixed(2)} con ${paymentData.payment_method}` });
      setShowPaymentModal(false);
      setCurrentDebtor(null);
      // Marcar como cobrado
      setCheckedDebtors(prev => new Set(prev).add(currentDebtor.id));
      await fetchDebtors();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al registrar pago', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ──────────────────────────────────────────────────────────────────────────
  const clientTypeLabel = (type: string) => {
    if (type === 'teacher') return <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-700">Profesor</Badge>;
    if (type === 'manual') return <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-600">Genérico</Badge>;
    return <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">Alumno</Badge>;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4">

      {/* ── Tabs ── */}
      <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('cobrar')}
          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'cobrar' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          ¡Cobrar!
          {debtors.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {debtors.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('pagos')}
          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'pagos' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="h-4 w-4" />
          Cobros Realizados
        </button>
      </div>

      {/* ── Buscador + Refresh ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar nombre…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (activeTab === 'cobrar') { fetchDebtors(); }
            else { setPaidLoaded(false); fetchPaidTransactions(); }
          }}
          title="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════
          TAB 1 — ¡COBRAR!
      ═══════════════════════════════════════════════ */}
      {activeTab === 'cobrar' && (
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
              <p className="font-semibold text-gray-600">¡Sin deudas pendientes!</p>
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
                        <p className="text-[11px] text-gray-500 truncate">👤 {debtor.parent_name}</p>
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
                        title="Ver detalle"
                        onClick={() => setDetailDebtor(debtor)}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leyenda checklist */}
          {!loading && filteredDebtors.length > 0 && (
            <p className="text-[11px] text-gray-400 text-center">
              ☑ Marca el checkbox cuando notifiques o cobres al deudor. Se reinicia al salir.
            </p>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════
          TAB 2 — COBROS REALIZADOS
      ═══════════════════════════════════════════════ */}
      {activeTab === 'pagos' && (
        <>
          {loadingPaid ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredPaid.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin cobros registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPaid.map(tx => {
                const clientName =
                  tx.students?.full_name ||
                  tx.teacher_profiles?.full_name ||
                  tx.manual_client_name ||
                  'Cliente genérico';
                const isTeacher = !!tx.teacher_id;
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{clientName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(tx.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                        </span>
                        {tx.ticket_code && (
                          <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 rounded">
                            {tx.ticket_code}
                          </span>
                        )}
                        {tx.payment_method && (
                          <span className="text-[10px] text-indigo-600 font-medium capitalize">
                            {tx.payment_method}
                          </span>
                        )}
                        {isTeacher && (
                          <Badge variant="outline" className="text-[9px] border-indigo-300 text-indigo-600">
                            Profesor
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-700 flex-shrink-0 tabular-nums">
                      S/ {Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════
          MODAL — Detalle de deuda
      ═══════════════════════════════════════════════ */}
      <Dialog open={!!detailDebtor} onOpenChange={open => { if (!open) setDetailDebtor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Detalle — {detailDebtor?.client_name}
            </DialogTitle>
          </DialogHeader>

          {detailDebtor && (
            <div className="space-y-3">
              {/* Info del deudor */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {detailDebtor.client_type === 'student' && detailDebtor.parent_name && (
                  <p className="text-gray-600"><span className="font-medium">Padre/Madre:</span> {detailDebtor.parent_name}</p>
                )}
                {detailDebtor.parent_phone && (
                  <p className="text-gray-600"><span className="font-medium">Teléfono:</span> {detailDebtor.parent_phone}</p>
                )}
                <p className="text-gray-600"><span className="font-medium">Total deuda:</span> <span className="text-red-600 font-black">S/ {detailDebtor.total_amount.toFixed(2)}</span></p>
              </div>

              {/* Línea de transacciones con nombres reales de productos */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {detailDebtor.transactions.map((tx: any, i: number) => {
                  const productLines = getTxProductLines(tx);
                  const txDate = format(new Date(tx.created_at), "d MMM yyyy", { locale: es });
                  const isLunch = tx.metadata?.source === 'lunch_order' || tx.description?.toLowerCase().includes('almuerzo');
                  return (
                    <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                      {/* Cabecera del ticket */}
                      <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{txDate}</span>
                          {tx.ticket_code && (
                            <span className="text-[10px] font-mono bg-white border border-gray-200 text-gray-500 px-1.5 rounded">
                              {tx.ticket_code}
                            </span>
                          )}
                          {isLunch && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 rounded font-medium">
                              Almuerzo
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-red-600">
                          S/ {Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                      {/* Productos */}
                      <div className="px-3 py-1.5 space-y-0.5">
                        {productLines.map((p, pi) => (
                          <div key={pi} className="flex justify-between items-center text-xs text-gray-700">
                            <span className="flex-1 truncate">
                              {p.qty > 1 && (
                                <span className="font-semibold text-gray-500 mr-1">{p.qty}×</span>
                              )}
                              {p.name}
                            </span>
                            <span className="text-gray-500 ml-2 flex-shrink-0">
                              S/ {p.subtotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen de productos totales del deudor */}
              {detailDebtor.transactions.length > 1 && (
                <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Resumen total
                  </p>
                  {getDebtorProductSummary(detailDebtor).map((p, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-700">
                      <span className="flex-1 truncate">
                        {p.qty > 1 && <span className="font-semibold text-gray-500 mr-1">{p.qty}×</span>}
                        {p.name}
                      </span>
                      <span className="font-medium text-red-600 ml-2 flex-shrink-0">
                        S/ {p.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Acciones del modal */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => { copyMessage(detailDebtor); setDetailDebtor(null); }}
                >
                  <Copy className="h-4 w-4" />
                  Copiar WhatsApp
                </Button>
                {canCollect && (
                  <Button
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { setDetailDebtor(null); handleOpenPayment(detailDebtor); }}
                  >
                    <DollarSign className="h-4 w-4" />
                    Registrar Pago
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════
          MODAL — Registrar pago
      ═══════════════════════════════════════════════ */}
      <Dialog open={showPaymentModal} onOpenChange={open => { if (!open) { setShowPaymentModal(false); setCurrentDebtor(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Registrar Pago — {currentDebtor?.client_name}
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
                  max={currentDebtor.total_amount}
                  value={paymentData.paid_amount}
                  onChange={e => setPaymentData(p => ({ ...p, paid_amount: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-[11px] text-gray-400 mt-0.5">Total deuda: S/ {currentDebtor.total_amount.toFixed(2)}</p>
              </div>

              {/* Método de pago */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Método de pago</label>
                <select
                  value={paymentData.payment_method}
                  onChange={e => setPaymentData(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="yape">💜 Yape</option>
                  <option value="plin">💚 Plin</option>
                  <option value="transferencia">🏦 Transferencia</option>
                </select>
              </div>

              {/* N° Operación */}
              {['yape', 'plin', 'transferencia'].includes(paymentData.payment_method) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">N° de operación <span className="text-red-500">*</span></label>
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
                  placeholder="Observaciones…"
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
