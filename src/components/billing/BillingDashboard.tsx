import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Building2,
  Loader2,
  Lightbulb,
  AlertTriangle,
  Clock,
  CreditCard,
  RefreshCw,
  ChevronRight,
  Zap,
  ShieldAlert,
  UserCheck,
  Banknote
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface School {
  id: string;
  name: string;
  code: string;
}

interface DashboardStats {
  // Resumen ejecutivo
  totalPending: number;
  totalCollectedToday: number;
  totalCollectedWeek: number;
  totalCollectedMonth: number;
  totalDebtors: number;
  totalTeacherDebt: number;
  totalStudentDebt: number;
  totalManualDebt: number;
  teacherDebtors: number;
  studentDebtors: number;
  manualDebtors: number;
  // Comparación
  collectedYesterday: number;
  // Antigüedad de deudas
  debtByAge: {
    today: number;
    days1to3: number;
    days4to7: number;
    days8to15: number;
    daysOver15: number;
    countToday: number;
    count1to3: number;
    count4to7: number;
    count8to15: number;
    countOver15: number;
  };
  // Métodos de pago (cobros recientes)
  paymentMethods: {
    efectivo: number;
    tarjeta: number;
    yape: number;
    transferencia: number;
    plin: number;
    otro: number;
  };
  // Top deudores (todos los tipos)
  topDebtors: Array<{
    name: string;
    type: 'student' | 'teacher' | 'manual';
    amount: number;
    school_name: string;
    days_overdue: number;
    count: number;
  }>;
  // Reembolsos pendientes
  pendingRefunds: number;
  pendingRefundAmount: number;
  // Por sede
  collectionBySchool: Array<{
    school_name: string;
    pending: number;
    collected: number;
    debtors: number;
  }>;
}

export const BillingDashboard = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    totalPending: 0,
    totalCollectedToday: 0,
    totalCollectedWeek: 0,
    totalCollectedMonth: 0,
    totalDebtors: 0,
    totalTeacherDebt: 0,
    totalStudentDebt: 0,
    totalManualDebt: 0,
    teacherDebtors: 0,
    studentDebtors: 0,
    manualDebtors: 0,
    collectedYesterday: 0,
    debtByAge: { today: 0, days1to3: 0, days4to7: 0, days8to15: 0, daysOver15: 0, countToday: 0, count1to3: 0, count4to7: 0, count8to15: 0, countOver15: 0 },
    paymentMethods: { efectivo: 0, tarjeta: 0, yape: 0, transferencia: 0, plin: 0, otro: 0 },
    topDebtors: [],
    pendingRefunds: 0,
    pendingRefundAmount: 0,
    collectionBySchool: [],
  });

  const canViewAllSchools = role === 'admin_general';

  useEffect(() => {
    fetchUserSchool();
    fetchSchools();
  }, [user]);

  useEffect(() => {
    if (userSchoolId || canViewAllSchools) {
      fetchDashboardStats();
    }
  }, [selectedSchool, userSchoolId, canViewAllSchools]);

  const fetchUserSchool = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
    if (data?.school_id) {
      setUserSchoolId(data.school_id);
      if (!canViewAllSchools) {
        setSelectedSchool(data.school_id);
      }
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const schoolIdFilter = (!canViewAllSchools || selectedSchool !== 'all')
        ? (selectedSchool !== 'all' ? selectedSchool : userSchoolId)
        : null;

      // ========== FECHAS ==========
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // ========== 1. TODAS LAS DEUDAS PENDIENTES ==========
      let pendingQuery = supabase
        .from('transactions')
        .select('id, amount, school_id, student_id, teacher_id, manual_client_name, created_at, students(full_name, parent_id), teacher_profiles(full_name), schools(name)')
        .in('payment_status', ['pending', 'partial'])
        .eq('type', 'purchase')
        .neq('payment_status', 'cancelled')
        .limit(100000);

      if (schoolIdFilter) {
        pendingQuery = pendingQuery.eq('school_id', schoolIdFilter);
      }

      const { data: pendingData } = await pendingQuery;

      // Calcular totales por tipo
      let totalPending = 0;
      let totalTeacherDebt = 0;
      let totalStudentDebt = 0;
      let totalManualDebt = 0;
      const teacherIds = new Set<string>();
      const studentIds = new Set<string>();
      const manualNames = new Set<string>();

      // Antigüedad
      const debtByAge = { today: 0, days1to3: 0, days4to7: 0, days8to15: 0, daysOver15: 0, countToday: 0, count1to3: 0, count4to7: 0, count8to15: 0, countOver15: 0 };

      pendingData?.forEach((t: any) => {
        const amt = Math.abs(t.amount || 0);
        totalPending += amt;

        // Por tipo
        if (t.teacher_id) {
          totalTeacherDebt += amt;
          teacherIds.add(t.teacher_id);
        } else if (t.student_id) {
          totalStudentDebt += amt;
          studentIds.add(t.student_id);
        } else if (t.manual_client_name) {
          totalManualDebt += amt;
          manualNames.add(t.manual_client_name.toLowerCase().trim());
        }

        // Antigüedad
        const createdAt = new Date(t.created_at);
        const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / 86400000);
        if (daysOld === 0) { debtByAge.today += amt; debtByAge.countToday++; }
        else if (daysOld <= 3) { debtByAge.days1to3 += amt; debtByAge.count1to3++; }
        else if (daysOld <= 7) { debtByAge.days4to7 += amt; debtByAge.count4to7++; }
        else if (daysOld <= 15) { debtByAge.days8to15 += amt; debtByAge.count8to15++; }
        else { debtByAge.daysOver15 += amt; debtByAge.countOver15++; }
      });

      // ========== 2. COBROS (HOY, AYER, SEMANA, MES) ==========
      let paidQuery = supabase
        .from('transactions')
        .select('amount, payment_method, created_at, school_id, schools(name)')
        .eq('type', 'purchase')
        .eq('payment_status', 'paid')
        .gte('created_at', monthStart.toISOString())
        .limit(100000);

      if (schoolIdFilter) {
        paidQuery = paidQuery.eq('school_id', schoolIdFilter);
      }

      const { data: paidData } = await paidQuery;

      let totalCollectedToday = 0;
      let collectedYesterday = 0;
      let totalCollectedWeek = 0;
      let totalCollectedMonth = 0;
      const paymentMethods = { efectivo: 0, tarjeta: 0, yape: 0, transferencia: 0, plin: 0, otro: 0 };

      // Para sede
      const schoolStatsMap: Record<string, { pending: number; collected: number; debtors: Set<string> }> = {};

      // Inicializar sedes desde pendingData
      pendingData?.forEach((t: any) => {
        const sName = t.schools?.name || 'Sin sede';
        if (!schoolStatsMap[sName]) schoolStatsMap[sName] = { pending: 0, collected: 0, debtors: new Set() };
        schoolStatsMap[sName].pending += Math.abs(t.amount || 0);
        const debtorKey = t.teacher_id || t.student_id || t.manual_client_name || 'unknown';
        schoolStatsMap[sName].debtors.add(debtorKey);
      });

      paidData?.forEach((t: any) => {
        const amt = Math.abs(t.amount || 0);
        const txDate = t.created_at.split('T')[0];
        totalCollectedMonth += amt;

        if (txDate === today) totalCollectedToday += amt;
        if (txDate === yesterday) collectedYesterday += amt;
        if (new Date(t.created_at) >= weekStart) totalCollectedWeek += amt;

        // Métodos de pago
        const method = (t.payment_method || 'efectivo').toLowerCase();
        if (method.includes('yape')) paymentMethods.yape += amt;
        else if (method.includes('plin')) paymentMethods.plin += amt;
        else if (method.includes('tarjeta') || method.includes('card')) paymentMethods.tarjeta += amt;
        else if (method.includes('transferencia') || method.includes('transfer')) paymentMethods.transferencia += amt;
        else if (method.includes('efectivo') || method.includes('cash')) paymentMethods.efectivo += amt;
        else paymentMethods.otro += amt;

        // Sede
        const sName = t.schools?.name || 'Sin sede';
        if (!schoolStatsMap[sName]) schoolStatsMap[sName] = { pending: 0, collected: 0, debtors: new Set() };
        schoolStatsMap[sName].collected += amt;
      });

      // ========== 3. TOP DEUDORES (todos los tipos) ==========
      const debtorMap: Record<string, { name: string; type: 'student' | 'teacher' | 'manual'; amount: number; school_name: string; oldest: Date; count: number }> = {};

      pendingData?.forEach((t: any) => {
        let key = '';
        let name = '';
        let type: 'student' | 'teacher' | 'manual' = 'manual';

        if (t.teacher_id) {
          key = `teacher_${t.teacher_id}`;
          name = t.teacher_profiles?.full_name || 'Profesor sin nombre';
          type = 'teacher';
        } else if (t.student_id) {
          key = `student_${t.student_id}`;
          name = t.students?.full_name || 'Estudiante sin nombre';
          type = 'student';
        } else if (t.manual_client_name) {
          key = `manual_${t.manual_client_name.toLowerCase().trim()}`;
          name = t.manual_client_name;
          type = 'manual';
        } else return;

        if (!debtorMap[key]) {
          debtorMap[key] = { name, type, amount: 0, school_name: t.schools?.name || 'Sin sede', oldest: new Date(t.created_at), count: 0 };
        }
        debtorMap[key].amount += Math.abs(t.amount || 0);
        debtorMap[key].count++;
        const txDate = new Date(t.created_at);
        if (txDate < debtorMap[key].oldest) debtorMap[key].oldest = txDate;
      });

      const topDebtors = Object.values(debtorMap)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 15)
        .map(d => ({
          ...d,
          days_overdue: Math.floor((now.getTime() - d.oldest.getTime()) / 86400000),
        }));

      // ========== 4. REEMBOLSOS PENDIENTES ==========
      let refundCount = 0;
      let refundAmount = 0;
      try {
        const { data: refundData } = await supabase
          .from('transactions')
          .select('amount, metadata')
          .eq('payment_status', 'cancelled')
          .eq('metadata->>requires_refund', 'true')
          .limit(1000);

        refundCount = refundData?.length || 0;
        refundAmount = refundData?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0;
      } catch {
        // Silently ignore
      }

      // ========== 5. POR SEDE ==========
      const collectionBySchool = Object.entries(schoolStatsMap)
        .map(([name, data]) => ({
          school_name: name,
          pending: data.pending,
          collected: data.collected,
          debtors: data.debtors.size,
        }))
        .sort((a, b) => b.pending - a.pending);

      // ========== SETEAR STATS ==========
      setStats({
        totalPending,
        totalCollectedToday,
        totalCollectedWeek,
        totalCollectedMonth,
        totalDebtors: teacherIds.size + studentIds.size + manualNames.size,
        totalTeacherDebt,
        totalStudentDebt,
        totalManualDebt,
        teacherDebtors: teacherIds.size,
        studentDebtors: studentIds.size,
        manualDebtors: manualNames.size,
        collectedYesterday,
        debtByAge,
        paymentMethods,
        topDebtors,
        pendingRefunds: refundCount,
        pendingRefundAmount: refundAmount,
        collectionBySchool,
      });
      setLastRefresh(new Date());

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== GENERAR RECOMENDACIONES ==========
  const getRecommendations = () => {
    const recs: Array<{ icon: any; color: string; bgColor: string; borderColor: string; title: string; description: string; priority: 'urgent' | 'warning' | 'info' | 'success' }> = [];

    // 🔴 URGENTE: Deudas mayores a 15 días
    if (stats.debtByAge.daysOver15 > 0) {
      recs.push({
        icon: ShieldAlert,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        title: `${stats.debtByAge.countOver15} deuda(s) con más de 15 días sin pagar`,
        description: `Total: S/ ${stats.debtByAge.daysOver15.toFixed(2)}. Contacta urgentemente a estos deudores para evitar acumulación.`,
        priority: 'urgent',
      });
    }

    // 🔴 URGENTE: Deudas de 8-15 días
    if (stats.debtByAge.days8to15 > 0) {
      recs.push({
        icon: AlertTriangle,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        title: `${stats.debtByAge.count8to15} deuda(s) de 8 a 15 días pendientes`,
        description: `Total: S/ ${stats.debtByAge.days8to15.toFixed(2)}. Envía recordatorios antes de que se vuelvan críticas.`,
        priority: 'warning',
      });
    }

    // 🟡 Profesores con deuda
    if (stats.teacherDebtors > 0) {
      recs.push({
        icon: UserCheck,
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        title: `${stats.teacherDebtors} profesor(es) con deuda pendiente`,
        description: `Total: S/ ${stats.totalTeacherDebt.toFixed(2)}. Los profesores suelen pagar rápido si les envías un recordatorio.`,
        priority: 'warning',
      });
    }

    // 🟡 Clientes manuales con deuda
    if (stats.manualDebtors > 0) {
      recs.push({
        icon: Users,
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
        title: `${stats.manualDebtors} cliente(s) manual(es) con deuda`,
        description: `Total: S/ ${stats.totalManualDebt.toFixed(2)}. Verifica que los datos de contacto estén actualizados.`,
        priority: 'warning',
      });
    }

    // ⚠️ Reembolsos pendientes
    if (stats.pendingRefunds > 0) {
      recs.push({
        icon: RefreshCw,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        title: `${stats.pendingRefunds} reembolso(s) pendiente(s) de devolución`,
        description: `Total: S/ ${stats.pendingRefundAmount.toFixed(2)}. Pedidos anulados que ya habían sido pagados. Devuelve el dinero al cliente.`,
        priority: 'urgent',
      });
    }

    // 🟢 Comparación con ayer
    if (stats.collectedYesterday > 0) {
      const diff = stats.totalCollectedToday - stats.collectedYesterday;
      const pct = ((diff / stats.collectedYesterday) * 100).toFixed(0);
      if (diff > 0) {
        recs.push({
          icon: TrendingUp,
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
          title: `Has cobrado ${pct}% más que ayer`,
          description: `Hoy: S/ ${stats.totalCollectedToday.toFixed(2)} vs Ayer: S/ ${stats.collectedYesterday.toFixed(2)}. ¡Buen ritmo!`,
          priority: 'success',
        });
      } else if (diff < 0) {
        recs.push({
          icon: TrendingDown,
          color: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-300',
          title: `Hoy llevas ${Math.abs(Number(pct))}% menos que ayer`,
          description: `Hoy: S/ ${stats.totalCollectedToday.toFixed(2)} vs Ayer: S/ ${stats.collectedYesterday.toFixed(2)}. Revisa la pestaña "¡Cobrar!" para gestionar pagos.`,
          priority: 'info',
        });
      }
    }

    // 💡 Sin deudas
    if (stats.totalPending === 0 && stats.totalDebtors === 0) {
      recs.push({
        icon: CheckCircle2,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        title: '¡Todas las cuentas están al día!',
        description: 'No hay deudas pendientes. Excelente gestión de cobranza.',
        priority: 'success',
      });
    }

    // 💡 Consejo general
    if (stats.totalDebtors > 5) {
      recs.push({
        icon: Lightbulb,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        title: 'Consejo: Prioriza los montos grandes',
        description: `Tienes ${stats.totalDebtors} deudores. Enfócate primero en los 5 mayores deudores que representan la mayor parte del monto pendiente.`,
        priority: 'info',
      });
    }

    // Ordenar por prioridad
    const priorityOrder = { urgent: 0, warning: 1, info: 2, success: 3 };
    recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recs;
  };

  const getDebtorTypeBadge = (type: 'student' | 'teacher' | 'manual') => {
    switch (type) {
      case 'teacher': return <Badge className="bg-green-600 text-xs">👨‍🏫 Profesor</Badge>;
      case 'student': return <Badge className="bg-blue-600 text-xs">👨‍🎓 Alumno</Badge>;
      case 'manual': return <Badge className="bg-orange-600 text-xs">👤 Manual</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-red-600" />
        <p className="text-gray-600 font-medium">Analizando datos de cobranza...</p>
        <p className="text-xs text-gray-400">Generando recomendaciones inteligentes</p>
      </div>
    );
  }

  const recommendations = getRecommendations();
  const totalPayments = Object.values(stats.paymentMethods).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* ===== HEADER CON FILTRO Y REFRESH ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canViewAllSchools && schools.length > 1 && (
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-red-600" />
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="bg-white flex h-10 rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Todas las Sedes</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchDashboardStats()}
          className="text-xs gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Actualizar
          <span className="text-gray-400 ml-1">
            {lastRefresh.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </Button>
      </div>

      {/* ===== SECCIÓN 1: RESUMEN EJECUTIVO ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Por Cobrar */}
        <Card className="border-l-4 border-red-500 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1.5 uppercase tracking-wide">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              Total Por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600">
              S/ {stats.totalPending.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.totalDebtors} deudor(es) activo(s)</p>
          </CardContent>
        </Card>

        {/* Cobrado Hoy */}
        <Card className="border-l-4 border-green-500 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              Cobrado Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-green-600">
              S/ {stats.totalCollectedToday.toFixed(2)}
            </div>
            {stats.collectedYesterday > 0 && (
              <p className={cn("text-xs mt-1 font-medium", 
                stats.totalCollectedToday >= stats.collectedYesterday ? "text-green-600" : "text-orange-600"
              )}>
                {stats.totalCollectedToday >= stats.collectedYesterday ? '↑' : '↓'} Ayer: S/ {stats.collectedYesterday.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cobrado Esta Semana */}
        <Card className="border-l-4 border-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1.5 uppercase tracking-wide">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              Esta Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">
              S/ {stats.totalCollectedWeek.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Este mes: S/ {stats.totalCollectedMonth.toFixed(2)}</p>
          </CardContent>
        </Card>

        {/* Tasa de Cobro */}
        <Card className="border-l-4 border-purple-500 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1.5 uppercase tracking-wide">
              <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
              Eficiencia de Cobro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-600">
              {stats.totalCollectedMonth + stats.totalPending > 0
                ? ((stats.totalCollectedMonth / (stats.totalCollectedMonth + stats.totalPending)) * 100).toFixed(0)
                : 100}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Cobrado vs Pendiente (mes)</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== SECCIÓN 2: RECOMENDACIONES INTELIGENTES ===== */}
      {recommendations.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-900">
              <Zap className="h-5 w-5 text-indigo-600" />
              Recomendaciones y Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recommendations.map((rec, i) => (
                <div key={i} className={cn("flex items-start gap-3 p-4", rec.bgColor)}>
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 border", rec.borderColor, rec.bgColor)}>
                    <rec.icon className={cn("h-4.5 w-4.5", rec.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold text-sm", rec.color)}>{rec.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{rec.description}</p>
                  </div>
                  {rec.priority === 'urgent' && (
                    <Badge variant="destructive" className="text-[10px] flex-shrink-0">URGENTE</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== SECCIÓN 3: DESGLOSE DE DEUDA + ANTIGÜEDAD ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deuda por tipo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
              <Users className="h-4 w-4 text-gray-600" />
              Deuda por Tipo de Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Alumnos */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">👨‍🎓</span>
                <div>
                  <p className="font-semibold text-sm text-blue-900">Alumnos</p>
                  <p className="text-xs text-blue-600">{stats.studentDebtors} deudor(es)</p>
                </div>
              </div>
              <p className="font-bold text-blue-800">S/ {stats.totalStudentDebt.toFixed(2)}</p>
            </div>
            {/* Profesores */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">👨‍🏫</span>
                <div>
                  <p className="font-semibold text-sm text-green-900">Profesores</p>
                  <p className="text-xs text-green-600">{stats.teacherDebtors} deudor(es)</p>
                </div>
              </div>
              <p className="font-bold text-green-800">S/ {stats.totalTeacherDebt.toFixed(2)}</p>
            </div>
            {/* Clientes Manuales */}
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <div>
                  <p className="font-semibold text-sm text-orange-900">Clientes Manuales</p>
                  <p className="text-xs text-orange-600">{stats.manualDebtors} deudor(es)</p>
                </div>
              </div>
              <p className="font-bold text-orange-800">S/ {stats.totalManualDebt.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Antigüedad de deudas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
              <Clock className="h-4 w-4 text-gray-600" />
              Antigüedad de Deudas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Hoy', amount: stats.debtByAge.today, count: stats.debtByAge.countToday, color: 'bg-green-100 text-green-800 border-green-300' },
              { label: '1-3 días', amount: stats.debtByAge.days1to3, count: stats.debtByAge.count1to3, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
              { label: '4-7 días', amount: stats.debtByAge.days4to7, count: stats.debtByAge.count4to7, color: 'bg-orange-100 text-orange-800 border-orange-300' },
              { label: '8-15 días', amount: stats.debtByAge.days8to15, count: stats.debtByAge.count8to15, color: 'bg-red-100 text-red-800 border-red-300' },
              { label: '+15 días', amount: stats.debtByAge.daysOver15, count: stats.debtByAge.countOver15, color: 'bg-red-200 text-red-900 border-red-400' },
            ].map((tier, i) => (
              <div key={i} className={cn("flex items-center justify-between p-2.5 rounded-lg border", tier.color)}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm min-w-[70px]">{tier.label}</span>
                  <Badge variant="outline" className="text-[10px]">{tier.count} tx</Badge>
                </div>
                <p className="font-bold text-sm">S/ {tier.amount.toFixed(2)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ===== SECCIÓN 4: MÉTODOS DE PAGO (este mes) ===== */}
      {totalPayments > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
              <CreditCard className="h-4 w-4 text-gray-600" />
              Métodos de Pago Recibidos (Este Mes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Efectivo', icon: '💵', amount: stats.paymentMethods.efectivo, color: 'bg-green-50 border-green-200' },
                { label: 'Yape', icon: '📱', amount: stats.paymentMethods.yape, color: 'bg-purple-50 border-purple-200' },
                { label: 'Tarjeta', icon: '💳', amount: stats.paymentMethods.tarjeta, color: 'bg-blue-50 border-blue-200' },
                { label: 'Transferencia', icon: '🏦', amount: stats.paymentMethods.transferencia, color: 'bg-cyan-50 border-cyan-200' },
                { label: 'Plin', icon: '📲', amount: stats.paymentMethods.plin, color: 'bg-teal-50 border-teal-200' },
              ].filter(m => m.amount > 0).map((method, i) => (
                <div key={i} className={cn("text-center p-3 rounded-lg border", method.color)}>
                  <span className="text-2xl">{method.icon}</span>
                  <p className="font-bold text-sm mt-1">S/ {method.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-600">{method.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {totalPayments > 0 ? ((method.amount / totalPayments) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== SECCIÓN 5: TOP DEUDORES ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
            <TrendingUp className="h-4 w-4 text-red-600" />
            Top 15 Deudores (Todos los Tipos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topDebtors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">¡Excelente! No hay deudas pendientes.</p>
              <p className="text-xs text-gray-400 mt-1">Todas las cuentas están al día.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.topDebtors.map((debtor, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg hover:shadow-sm transition-all",
                    debtor.days_overdue > 15 ? "bg-red-50 border border-red-200" :
                    debtor.days_overdue > 7 ? "bg-orange-50 border border-orange-200" :
                    "bg-gray-50 border border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border",
                      debtor.days_overdue > 15 ? "bg-red-200 text-red-800 border-red-300" :
                      debtor.days_overdue > 7 ? "bg-orange-200 text-orange-800 border-orange-300" :
                      "bg-gray-200 text-gray-700 border-gray-300"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900">{debtor.name}</p>
                        {getDebtorTypeBadge(debtor.type)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {canViewAllSchools && (
                          <p className="text-xs text-gray-500">🏫 {debtor.school_name}</p>
                        )}
                        <p className="text-xs text-gray-400">•</p>
                        <p className={cn("text-xs font-medium",
                          debtor.days_overdue > 15 ? "text-red-600" :
                          debtor.days_overdue > 7 ? "text-orange-600" :
                          "text-gray-500"
                        )}>
                          {debtor.days_overdue === 0 ? 'Hoy' : `${debtor.days_overdue} día(s)`}
                        </p>
                        <p className="text-xs text-gray-400">• {debtor.count} transacción(es)</p>
                      </div>
                    </div>
                  </div>
                  <p className={cn("text-base font-bold",
                    debtor.days_overdue > 15 ? "text-red-700" :
                    debtor.days_overdue > 7 ? "text-orange-700" :
                    "text-gray-800"
                  )}>
                    S/ {debtor.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== SECCIÓN 6: COBRANZA POR SEDE (admin_general) ===== */}
      {canViewAllSchools && selectedSchool === 'all' && stats.collectionBySchool.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
              <Building2 className="h-4 w-4 text-blue-600" />
              Cobranza por Sede
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.collectionBySchool.map((school, index) => {
              const total = school.pending + school.collected;
              const pct = total > 0 ? (school.collected / total) * 100 : 0;
              return (
                <div key={index} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{school.school_name}</p>
                      <p className="text-xs text-gray-500">{school.debtors} deudor(es)</p>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-red-600 font-bold">
                        Pend: S/ {school.pending.toFixed(2)}
                      </span>
                      <span className="text-green-600 font-bold">
                        Cobrado: S/ {school.collected.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={cn(
                        "h-2.5 rounded-full transition-all",
                        pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 text-right">{pct.toFixed(0)}% cobrado</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
