import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LogOut, User, ShoppingBag, UtensilsCrossed, Home, Loader2,
  DollarSign, CheckCircle2, Download, Filter, Wallet,
  ChevronDown, ChevronUp, Clock, Settings, Key, HelpCircle,
  Menu as MenuIcon, Phone, Mail, Building2, XCircle, CreditCard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeacherOnboardingModal } from '@/components/teacher/TeacherOnboardingModal';
import { UnifiedLunchCalendarV2 } from '@/components/lunch/UnifiedLunchCalendarV2';
import { MyLunchOrders } from '@/components/teacher/MyLunchOrders';
import { EditTeacherProfileModal } from '@/components/teacher/EditTeacherProfileModal';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';
import { RechargeModal } from '@/components/parent/RechargeModal';
import jsPDF from 'jspdf';
import maracuyaLogo from '@/assets/maracuya-logo.png';

interface TeacherProfile {
  id: string;
  full_name: string;
  dni: string;
  corporate_email: string | null;
  personal_email: string | null;
  phone_1: string;
  corporate_phone: string | null;
  area: string;
  school_1_id: string;
  school_2_id: string | null;
  school_1_name?: string;
  school_2_name?: string;
  onboarding_completed: boolean;
}

type TabType = 'home' | 'menu' | 'payments' | 'more';

export default function Teacher() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Core state
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Home data
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Payments data
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [paidTransactions, setPaidTransactions] = useState<any[]>([]);
  const [paymentSubTab, setPaymentSubTab] = useState<'pending' | 'paid'>('pending');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Menu sub-navigation
  const [menuSubTab, setMenuSubTab] = useState<'order' | 'my-orders'>('order');

  // More menu
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<{
    amount: number;
    description: string;
    paidTransactionIds: string[];
  } | null>(null);
  const [selectedPayTx, setSelectedPayTx] = useState<Set<string>>(new Set());

  // ─── Effects ───
  useEffect(() => {
    if (user) checkOnboardingStatus();
  }, [user]);

  useEffect(() => {
    if (!teacherProfile) return;
    if (activeTab === 'home') fetchPurchaseHistory();
    if (activeTab === 'payments') {
      fetchCurrentBalance();
      fetchPendingAndPaidTransactions();
    }
  }, [activeTab, teacherProfile]);

  // ─── Data Fetching ───
  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      let profile: any = null;

      const { data: profileView, error: viewError } = await supabase
        .from('teacher_profiles_with_schools')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (viewError) {
        const { data: rawProfile, error: rawError } = await supabase
          .from('teacher_profiles')
          .select(`*, school1:schools!teacher_profiles_school_id_1_fkey(id, name, code), school2:schools!teacher_profiles_school_id_2_fkey(id, name, code)`)
          .eq('id', user?.id)
          .maybeSingle();

        if (rawError) {
          const { data: minProfile } = await supabase
            .from('teacher_profiles').select('*').eq('id', user?.id).maybeSingle();
          profile = minProfile ? {
            ...minProfile,
            school_1_id: minProfile.school_id_1,
            school_2_id: minProfile.school_id_2,
            school_1_name: null, school_2_name: null,
          } : null;
        } else if (rawProfile) {
          profile = {
            ...rawProfile,
            school_1_id: rawProfile.school_id_1,
            school_2_id: rawProfile.school_id_2,
            school_1_name: rawProfile.school1?.name || null,
            school_2_name: rawProfile.school2?.name || null,
          };
        }
      } else {
        profile = profileView;
      }

      if (!profile) { setShowOnboarding(true); setLoading(false); return; }
      setTeacherProfile(profile);
      if (!profile.onboarding_completed) setShowOnboarding(true);
      setLoading(false);
    } catch (error: any) {
      console.error('Error verificando perfil:', error);
      setShowOnboarding(true);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar tu perfil.' });
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    if (!teacherProfile) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`id, type, amount, description, created_at, ticket_code, payment_status,
          transaction_items (product_name, quantity, unit_price, subtotal)`)
        .eq('teacher_id', teacherProfile.id)
        .eq('type', 'purchase')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPurchaseHistory(data || []);
      setTotalSpent(data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0);
    } catch (error: any) {
      console.error('Error cargando historial:', error);
    }
  };

  const fetchCurrentBalance = async () => {
    if (!teacherProfile) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, payment_status')
        .eq('teacher_id', teacherProfile.id)
        .eq('is_deleted', false)
        .or('payment_status.eq.pending,payment_status.is.null');
      if (error) throw error;
      setCurrentBalance(data?.reduce((sum, t) => sum + t.amount, 0) || 0);
    } catch (error: any) {
      console.error('Error balance:', error);
    }
  };

  const fetchPendingAndPaidTransactions = async () => {
    if (!teacherProfile) return;
    try {
      // Pendientes
      const { data: pending, error: pe } = await supabase
        .from('transactions')
        .select(`id, type, amount, description, created_at, ticket_code, payment_status,
          transaction_items (product_name, quantity, unit_price, subtotal)`)
        .eq('teacher_id', teacherProfile.id)
        .eq('type', 'purchase').eq('is_deleted', false)
        .or('payment_status.eq.pending,payment_status.is.null')
        .order('created_at', { ascending: false });
      if (pe) throw pe;
      setPendingTransactions(pending || []);

      // Pagadas
      const { data: paid, error: pa } = await supabase
        .from('transactions')
        .select(`id, type, amount, description, created_at, ticket_code, payment_status,
          payment_method, operation_number, created_by, school_id,
          transaction_items (product_name, quantity, unit_price, subtotal)`)
        .eq('teacher_id', teacherProfile.id)
        .eq('type', 'purchase').eq('is_deleted', false)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      if (pa) throw pa;

      if (paid && paid.length > 0) {
        const cashierIds = [...new Set(paid.map((t: any) => t.created_by).filter(Boolean))];
        const schoolIds = [...new Set(paid.map((t: any) => t.school_id).filter(Boolean))];
        const cashiersMap = new Map();
        const schoolsMap = new Map();

        if (cashierIds.length > 0) {
          const { data: c } = await supabase.from('profiles').select('id, full_name, email').in('id', cashierIds);
          c?.forEach((x: any) => cashiersMap.set(x.id, x));
        }
        if (schoolIds.length > 0) {
          const { data: s } = await supabase.from('schools').select('id, name').in('id', schoolIds);
          s?.forEach((x: any) => schoolsMap.set(x.id, x));
        }
        setPaidTransactions(paid.map((t: any) => ({
          ...t,
          profiles: t.created_by ? cashiersMap.get(t.created_by) : null,
          schools: t.school_id ? schoolsMap.get(t.school_id) : null,
        })));
      } else {
        setPaidTransactions([]);
      }
    } catch (error: any) {
      console.error('Error transacciones:', error);
    }
  };

  // ─── Filters ───
  const filterAndSort = (items: any[]) => {
    let filtered = [...items];
    if (dateFrom) filtered = filtered.filter(t => new Date(t.created_at) >= new Date(dateFrom));
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.created_at) <= end);
    }
    filtered.sort((a, b) => {
      const dA = new Date(a.created_at).getTime(), dB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dB - dA : dA - dB;
    });
    return filtered;
  };

  const filteredPending = useMemo(() => filterAndSort(pendingTransactions), [pendingTransactions, dateFrom, dateTo, sortOrder]);
  const filteredPaid = useMemo(() => filterAndSort(paidTransactions), [paidTransactions, dateFrom, dateTo, sortOrder]);

  // ─── PDF Receipt ───
  const generatePaymentReceipt = async (transaction: any) => {
    try {
      const doc = new jsPDF();
      let logoBase64 = '';
      try {
        const response = await fetch(maracuyaLogo);
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (_) {}

      const pw = doc.internal.pageSize.width;
      const ph = doc.internal.pageSize.height;

      if (logoBase64) doc.addImage(logoBase64, 'PNG', 15, 15, 30, 30);
      doc.setFontSize(20); doc.setTextColor(34, 139, 34);
      doc.text('COMPROBANTE DE PAGO', pw / 2, 25, { align: 'center' });
      doc.setFontSize(12); doc.setTextColor(100, 100, 100);
      doc.text('Maracuyá - Profesor', pw / 2, 32, { align: 'center' });
      doc.setDrawColor(34, 139, 34); doc.setLineWidth(0.5); doc.line(15, 50, pw - 15, 50);

      doc.setFontSize(10); doc.setTextColor(0, 0, 0);
      let y = 60;
      const addLine = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold'); doc.text(label, 15, y);
        doc.setFont('helvetica', 'normal'); doc.text(value, 70, y); y += 7;
      };

      addLine('FECHA:', new Date(transaction.created_at).toLocaleDateString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima'
      }));
      addLine('PROFESOR:', teacherProfile?.full_name || '');
      if (transaction.schools?.name) addLine('SEDE:', transaction.schools.name);
      if (transaction.profiles?.full_name) addLine('COBRADO POR:', transaction.profiles.full_name);
      if (transaction.payment_method) addLine('MÉTODO:', transaction.payment_method.toUpperCase());
      if (transaction.operation_number) addLine('Nº OPERACIÓN:', transaction.operation_number);
      if (transaction.ticket_code) addLine('Nº TICKET:', transaction.ticket_code);

      y += 3;
      doc.setFont('helvetica', 'bold'); doc.text('DESCRIPCIÓN:', 15, y); y += 6;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(transaction.description || '', pw - 30);
      doc.text(lines, 15, y); y += lines.length * 5 + 5;

      if (transaction.transaction_items?.length > 0) {
        doc.setFont('helvetica', 'bold'); doc.text('PRODUCTOS:', 15, y); y += 6;
        doc.setFont('helvetica', 'normal');
        transaction.transaction_items.forEach((item: any) => {
          doc.text(`${item.quantity}x ${item.product_name}`, 20, y);
          doc.text(`S/ ${item.subtotal.toFixed(2)}`, pw - 20, y, { align: 'right' }); y += 5;
        });
        y += 5;
      }

      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(15, y, pw - 15, y); y += 10;
      doc.setFillColor(34, 139, 34); doc.rect(15, y - 5, pw - 30, 15, 'F');
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text('MONTO PAGADO:', 20, y + 5);
      doc.setFontSize(18); doc.text(`S/ ${Math.abs(transaction.amount).toFixed(2)}`, pw - 20, y + 5, { align: 'right' });

      doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.setFont('helvetica', 'normal');
      const fy = ph - 20;
      doc.text('© 2026 ERP Profesional diseñado por ARQUISIA Soluciones para Maracuyá', pw / 2, fy, { align: 'center' });

      doc.save(`Comprobante_${teacherProfile?.full_name.replace(/\s+/g, '_')}_${new Date(transaction.created_at).toLocaleDateString('es-PE').replace(/\//g, '-')}.pdf`);
      toast({ title: '✅ Comprobante descargado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el comprobante' });
    }
  };

  // ─── Payment selection ───
  const toggleTxSelection = (id: string) => {
    setSelectedPayTx(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    if (selectedPayTx.size === filteredPending.length) {
      setSelectedPayTx(new Set());
    } else {
      setSelectedPayTx(new Set(filteredPending.map(t => t.id)));
    }
  };

  const selectedTotal = useMemo(() => {
    return filteredPending
      .filter(t => selectedPayTx.has(t.id))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [filteredPending, selectedPayTx]);

  const handlePaySelected = () => {
    if (selectedPayTx.size === 0) {
      toast({ variant: 'destructive', title: 'Selecciona tickets', description: 'Marca los tickets que deseas pagar.' });
      return;
    }
    const txIds = Array.from(selectedPayTx);
    const descriptions = filteredPending
      .filter(t => selectedPayTx.has(t.id))
      .map(t => t.description)
      .join(', ');

    setPaymentModalData({
      amount: selectedTotal,
      description: `Pago profesor: ${descriptions}`,
      paidTransactionIds: txIds,
    });
    setShowPaymentModal(true);
  };

  // ─── Handlers ───
  const handleLogout = async () => {
    try { await signOut(); navigate('/auth'); } catch (_) {}
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    checkOnboardingStatus();
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  // ─── Items shown in home history ───
  const visibleHistory = showAllHistory ? purchaseHistory : purchaseHistory.slice(0, 8);
  const pendingTotal = filteredPending.reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* ═══════════════ COMPACT HEADER ═══════════════ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-purple-100/50 shadow-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center gap-2.5">
              <img src={maracuyaLogo} alt="Maracuyá" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain" />
              <div className="leading-tight">
                <h1 className="text-sm sm:text-base font-bold text-gray-900">Portal del Profesor</h1>
                {teacherProfile && (
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[180px] sm:max-w-none">
                    {teacherProfile.full_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <main className="max-w-3xl mx-auto px-3 sm:px-4 pb-24 pt-3 sm:pt-4">
        {teacherProfile && teacherProfile.onboarding_completed ? (
          <>
            {/* ══════ TAB: INICIO ══════ */}
            {activeTab === 'home' && (
              <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-200">
                {/* Welcome + Stats */}
                <div className="bg-white rounded-2xl border border-purple-100/50 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                          Hola, {teacherProfile.full_name.split(' ')[0]} 👋
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Cuenta libre • Sin límites de gasto</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full">
                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-semibold text-green-700">Activa</span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-purple-50/80 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">Total Gastado</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">
                          S/ {totalSpent.toFixed(2)}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${currentBalance < 0 ? 'bg-red-50/80' : 'bg-green-50/80'}`}>
                        <p className="text-[10px] text-gray-500 mb-0.5">Deuda Pendiente</p>
                        <p className={`text-xl sm:text-2xl font-bold ${currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          S/ {Math.abs(currentBalance).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick info */}
                  <div className="border-t border-purple-50 px-4 py-2.5 bg-purple-50/30 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-purple-500" />
                      <span className="truncate max-w-[150px] sm:max-w-none">{teacherProfile.school_1_name || 'Sin sede'}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize border-purple-200 text-purple-700">
                      {teacherProfile.area}
                    </Badge>
                  </div>
                </div>

                {/* Purchase History */}
                <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm">
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Historial de Compras</h3>
                      <p className="text-[10px] text-gray-400">
                        {purchaseHistory.length} compra{purchaseHistory.length !== 1 ? 's' : ''} registrada{purchaseHistory.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ShoppingBag className="h-5 w-5 text-purple-300" />
                  </div>

                  <div className="px-3 pb-3">
                    {purchaseHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                        <p className="text-sm text-gray-400">Sin compras registradas</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          {visibleHistory.map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50/80 rounded-xl hover:bg-gray-100/80 transition-colors">
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{t.description}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px] text-gray-400">
                                    {new Date(t.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' })}
                                  </p>
                                  {t.ticket_code && (
                                    <span className="text-[9px] text-gray-300">#{t.ticket_code}</span>
                                  )}
                                  {t.payment_status === 'paid' ? (
                                    <Badge className="text-[8px] px-1 py-0 bg-green-100 text-green-700 hover:bg-green-100">Pagado</Badge>
                                  ) : (
                                    <Badge className="text-[8px] px-1 py-0 bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm font-bold text-red-600 whitespace-nowrap">
                                S/ {Math.abs(t.amount).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {purchaseHistory.length > 8 && (
                          <button
                            onClick={() => setShowAllHistory(!showAllHistory)}
                            className="w-full mt-2 py-2 text-xs text-purple-600 font-medium hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            {showAllHistory ? (
                              <><ChevronUp className="h-3.5 w-3.5" /> Mostrar menos</>
                            ) : (
                              <><ChevronDown className="h-3.5 w-3.5" /> Ver todas ({purchaseHistory.length})</>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════ TAB: MENÚ ══════ */}
            {activeTab === 'menu' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Sub-nav */}
                <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100/80 shadow-sm">
                  <button
                    onClick={() => setMenuSubTab('order')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      menuSubTab === 'order'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5 inline mr-1.5" />
                    Hacer Pedido
                  </button>
                  <button
                    onClick={() => setMenuSubTab('my-orders')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      menuSubTab === 'my-orders'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 inline mr-1.5" />
                    Mis Pedidos
                  </button>
                </div>

                {menuSubTab === 'order' && teacherProfile.school_1_id && (
                  <UnifiedLunchCalendarV2
                    userType="teacher"
                    userId={teacherProfile.id}
                    userSchoolId={teacherProfile.school_1_id}
                  />
                )}

                {menuSubTab === 'my-orders' && (
                  <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-3 sm:p-4">
                    <MyLunchOrders teacherId={teacherProfile.id} />
                  </div>
                )}
              </div>
            )}

            {/* ══════ TAB: PAGOS ══════ */}
            {activeTab === 'payments' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Balance Card */}
                <div className={`rounded-2xl p-4 shadow-sm border ${
                  currentBalance < 0
                    ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100'
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Balance pendiente</p>
                      <p className={`text-2xl sm:text-3xl font-bold ${currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        S/ {Math.abs(currentBalance).toFixed(2)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${currentBalance < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      {currentBalance < 0
                        ? <DollarSign className="h-6 w-6 text-red-600" />
                        : <CheckCircle2 className="h-6 w-6 text-green-600" />
                      }
                    </div>
                  </div>
                  <p className={`text-[10px] mt-2 ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {currentBalance < 0 ? '⚠️ Deuda pendiente • Coordinar pago con administración' : '✅ Sin deudas pendientes'}
                  </p>
                </div>

                {/* Info banner */}
                <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-blue-700 leading-relaxed">
                    Selecciona los tickets que deseas pagar y sube tu comprobante de Yape, Plin o Transferencia. También puedes pagar directamente con el administrador.
                  </p>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100/80 shadow-sm">
                  <button
                    onClick={() => setPaymentSubTab('pending')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      paymentSubTab === 'pending'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Por Pagar
                    {filteredPending.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        paymentSubTab === 'pending' ? 'bg-red-500/30 text-white' : 'bg-red-100 text-red-700'
                      }`}>
                        {filteredPending.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setPaymentSubTab('paid')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      paymentSubTab === 'paid'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Pagados
                  </button>
                </div>

                {/* Filters toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-gray-100/80 shadow-sm text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    Filtros
                    {(dateFrom || dateTo) && (
                      <Badge className="text-[8px] px-1 py-0 bg-purple-100 text-purple-700 hover:bg-purple-100">Activos</Badge>
                    )}
                  </span>
                  {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showFilters && (
                  <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm p-3 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-gray-500">Desde</Label>
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-500">Hasta</Label>
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Select value={sortOrder} onValueChange={(v: 'desc' | 'asc') => setSortOrder(v)}>
                        <SelectTrigger className="h-8 text-xs w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Más reciente primero</SelectItem>
                          <SelectItem value="asc">Más antiguo primero</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="text-[10px] h-7"
                        onClick={() => { setDateFrom(''); setDateTo(''); setSortOrder('desc'); }}>
                        Limpiar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Pending Tickets */}
                {paymentSubTab === 'pending' && (
                  <div className="space-y-2">
                    {filteredPending.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-2xl border border-gray-100/80 shadow-sm">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-300" />
                        <p className="text-sm font-medium text-gray-400">¡Sin deudas!</p>
                        <p className="text-[10px] text-gray-300 mt-0.5">No tienes tickets pendientes</p>
                      </div>
                    ) : (
                      <>
                        {/* Total + Select All + Pay */}
                        <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-red-600 font-medium">Total pendiente:</span>
                            <span className="text-sm font-bold text-red-700">S/ {pendingTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={selectAllPending}
                              className="text-[10px] text-purple-600 font-medium hover:underline"
                            >
                              {selectedPayTx.size === filteredPending.length ? '✓ Deseleccionar todo' : '☐ Seleccionar todo'}
                            </button>
                            {selectedPayTx.size > 0 && (
                              <Button
                                onClick={handlePaySelected}
                                size="sm"
                                className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3"
                              >
                                <Wallet className="h-3 w-3 mr-1" />
                                Pagar S/ {selectedTotal.toFixed(2)}
                              </Button>
                            )}
                          </div>
                        </div>

                        {filteredPending.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => toggleTxSelection(t.id)}
                            className={`bg-white rounded-xl border shadow-sm p-3 transition-colors cursor-pointer ${
                              selectedPayTx.has(t.id)
                                ? 'border-purple-300 bg-purple-50/30 ring-1 ring-purple-200'
                                : 'border-red-100/50 hover:border-red-200'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {/* Checkbox */}
                              <div className={`mt-0.5 w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                selectedPayTx.has(t.id)
                                  ? 'bg-purple-600 border-purple-600'
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {selectedPayTx.has(t.id) && (
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{t.description}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(t.created_at).toLocaleDateString('es-PE', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima'
                                  })}
                                </p>
                                {t.ticket_code && <p className="text-[9px] text-gray-300 mt-0.5">#{t.ticket_code}</p>}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm sm:text-base font-bold text-red-600">- S/ {Math.abs(t.amount).toFixed(2)}</p>
                                <Badge className="text-[8px] mt-0.5 bg-red-100 text-red-700 hover:bg-red-100">Pendiente</Badge>
                              </div>
                            </div>
                            {t.transaction_items?.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5 ml-7">
                                {t.transaction_items.map((item: any, i: number) => (
                                  <div key={i} className="flex justify-between text-[10px] text-gray-500">
                                    <span>{item.quantity}x {item.product_name}</span>
                                    <span>S/ {item.subtotal.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Paid Tickets */}
                {paymentSubTab === 'paid' && (
                  <div className="space-y-2">
                    {filteredPaid.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-2xl border border-gray-100/80 shadow-sm">
                        <DollarSign className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                        <p className="text-sm font-medium text-gray-400">Sin pagos registrados</p>
                        <p className="text-[10px] text-gray-300 mt-0.5">Tus pagos aparecerán aquí</p>
                      </div>
                    ) : (
                      filteredPaid.map((t) => (
                        <div key={t.id} className="bg-white rounded-xl border border-green-100/50 shadow-sm p-3 hover:border-green-200 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{t.description}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(t.created_at).toLocaleDateString('es-PE', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima'
                                })}
                              </p>
                              {t.profiles?.full_name && (
                                <p className="text-[10px] text-blue-500 mt-0.5">Cobrado por: {t.profiles.full_name}</p>
                              )}
                              {t.schools?.name && (
                                <p className="text-[10px] text-gray-400">🏫 {t.schools.name}</p>
                              )}
                              {t.payment_method && (
                                <p className="text-[10px] text-gray-400">💳 {t.payment_method.toUpperCase()}</p>
                              )}
                              {t.ticket_code && <p className="text-[9px] text-gray-300 mt-0.5">#{t.ticket_code}</p>}
                            </div>
                            <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                              <p className="text-sm sm:text-base font-bold text-green-600">S/ {Math.abs(t.amount).toFixed(2)}</p>
                              <Badge className="text-[8px] bg-green-100 text-green-700 hover:bg-green-100">✅ Pagado</Badge>
                              <button
                                onClick={() => generatePaymentReceipt(t)}
                                className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 font-medium"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </button>
                            </div>
                          </div>
                          {t.transaction_items?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                              {t.transaction_items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-[10px] text-gray-500">
                                  <span>{item.quantity}x {item.product_name}</span>
                                  <span>S/ {item.subtotal.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════ TAB: MÁS ══════ */}
            {activeTab === 'more' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-5 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white/20 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {teacherProfile.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-white">
                        <h3 className="font-bold text-sm sm:text-base">{teacherProfile.full_name}</h3>
                        <p className="text-purple-200 text-[10px] sm:text-xs">DNI: {teacherProfile.dni}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <InfoField icon={<Mail className="h-3.5 w-3.5" />} label="Email Personal" value={teacherProfile.personal_email || user?.email || ''} />
                      <InfoField icon={<Mail className="h-3.5 w-3.5" />} label="Email Corporativo" value={teacherProfile.corporate_email || 'No registrado'} />
                      <InfoField icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono" value={teacherProfile.phone_1} />
                      <InfoField icon={<Phone className="h-3.5 w-3.5" />} label="Tel. Corporativo" value={teacherProfile.corporate_phone || 'No registrado'} />
                      <InfoField icon={<Building2 className="h-3.5 w-3.5" />} label="Escuela Principal" value={teacherProfile.school_1_name || 'Sin asignar'} />
                      {teacherProfile.school_2_name && (
                        <InfoField icon={<Building2 className="h-3.5 w-3.5" />} label="Segunda Escuela" value={teacherProfile.school_2_name} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-1.5">
                  <ActionButton
                    icon={<User className="h-4 w-4" />}
                    label="Editar Datos Personales"
                    onClick={() => setShowEditProfile(true)}
                  />
                  <ActionButton
                    icon={<Key className="h-4 w-4" />}
                    label="Cambiar Contraseña"
                    onClick={() => setShowChangePassword(true)}
                  />
                  <ActionButton
                    icon={<HelpCircle className="h-4 w-4" />}
                    label="Ayuda y Soporte"
                    onClick={() => toast({ title: '📞 Soporte', description: 'Contacta al administrador de tu sede.' })}
                  />
                  <ActionButton
                    icon={<LogOut className="h-4 w-4 text-red-500" />}
                    label="Cerrar Sesión"
                    onClick={handleLogout}
                    danger
                  />
                </div>

                {/* Footer */}
                <div className="text-center py-3">
                  <p className="text-[9px] text-gray-300">© 2026 ERP Profesional • ARQUISIA Soluciones para Maracuyá</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Completando tu perfil...</p>
          </div>
        )}
      </main>

      {/* ═══════════════ BOTTOM NAVIGATION ═══════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-purple-100/50 shadow-lg z-50">
        <div className="max-w-3xl mx-auto px-1 sm:px-2">
          <div className="grid grid-cols-4 gap-0.5">
            <BottomTab
              icon={<Home className="h-5 w-5" />}
              label="Inicio"
              active={activeTab === 'home'}
              onClick={() => setActiveTab('home')}
            />
            <BottomTab
              icon={<UtensilsCrossed className="h-5 w-5" />}
              label="Menú"
              active={activeTab === 'menu'}
              onClick={() => setActiveTab('menu')}
            />
            <BottomTab
              icon={<Wallet className="h-5 w-5" />}
              label="Pagos"
              active={activeTab === 'payments'}
              onClick={() => setActiveTab('payments')}
              badge={pendingTransactions.length > 0 ? pendingTransactions.length : undefined}
            />
            <BottomTab
              icon={<MenuIcon className="h-5 w-5" />}
              label="Más"
              active={activeTab === 'more'}
              onClick={() => setActiveTab('more')}
            />
          </div>
        </div>
      </nav>

      {/* ═══════════════ MODALS ═══════════════ */}
      {showOnboarding && (
        <TeacherOnboardingModal open={showOnboarding} onComplete={handleOnboardingComplete} />
      )}

      {showEditProfile && (
        <EditTeacherProfileModal
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          teacherProfile={teacherProfile}
          onSuccess={() => { setShowEditProfile(false); checkOnboardingStatus(); }}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal open={showChangePassword} onOpenChange={setShowChangePassword} />
      )}

      {/* Payment Modal */}
      {paymentModalData && teacherProfile && (
        <RechargeModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentModalData(null);
            setSelectedPayTx(new Set());
            fetchCurrentBalance();
            fetchPendingAndPaidTransactions();
          }}
          studentName={teacherProfile.full_name}
          studentId={teacherProfile.id}
          currentBalance={currentBalance}
          accountType="free_account"
          onRecharge={async () => {}}
          suggestedAmount={paymentModalData.amount}
          requestType="debt_payment"
          requestDescription={paymentModalData.description}
          paidTransactionIds={paymentModalData.paidTransactionIds}
          schoolId={teacherProfile.school_1_id}
          isTeacherPayment={true}
        />
      )}
    </div>
  );
}

// ═══════════════ HELPER COMPONENTS ═══════════════

function BottomTab({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center py-2.5 sm:py-3 transition-all duration-200 rounded-lg ${
        active
          ? 'text-purple-700 bg-purple-50'
          : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50/30'
      }`}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 py-0 rounded-full min-w-[14px] text-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] sm:text-xs font-medium mt-0.5">{label}</span>
    </button>
  );
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 p-2 bg-gray-50/80 rounded-lg">
      <div className="text-purple-400 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border shadow-sm transition-all hover:shadow-md ${
        danger
          ? 'border-red-100 hover:bg-red-50 text-red-600'
          : 'border-gray-100/80 hover:bg-gray-50 text-gray-700'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
