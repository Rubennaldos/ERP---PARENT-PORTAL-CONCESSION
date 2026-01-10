import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useViewAsStore } from '@/stores/viewAsStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Building2,
  Loader2
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  code: string;
}

interface DashboardStats {
  totalPending: number;
  totalCollected: number;
  activePeriods: number;
  parentsWithDebt: number;
  topDebtors: Array<{
    student_name: string;
    parent_name: string;
    amount: number;
    school_name: string;
  }>;
  collectionBySchool: Array<{
    school_name: string;
    pending: number;
    collected: number;
  }>;
}

export const BillingDashboard = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [stats, setStats] = useState<DashboardStats>({
    totalPending: 0,
    totalCollected: 0,
    activePeriods: 0,
    parentsWithDebt: 0,
    topDebtors: [],
    collectionBySchool: [],
  });

  const canViewAllSchools = role === 'admin_general';

  useEffect(() => {
    fetchSchools();
    fetchDashboardStats();
  }, [selectedSchool]);

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

      console.log('🔍 Iniciando fetchDashboardStats...');

      // 1. Total pendiente por cobrar (DESDE TRANSACTIONS)
      let pendingQuery = supabase
        .from('transactions')
        .select('amount, school_id, student_id, students(full_name, parent_id), schools(name)')
        .in('payment_status', ['pending', 'partial'])
        .eq('type', 'purchase');

      if (!canViewAllSchools || selectedSchool !== 'all') {
        const schoolId = selectedSchool !== 'all' ? selectedSchool : await getUserSchoolId();
        if (schoolId) {
          pendingQuery = pendingQuery.eq('school_id', schoolId);
        }
      }

      const { data: pendingData, error: pendingError } = await pendingQuery;
      console.log('📊 Deudas pendientes (transactions):', pendingData);
      if (pendingError) console.error('❌ Error en pendingQuery:', pendingError);
      
      const totalPending = pendingData?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0;

      // Obtener IDs únicos de padres para buscar sus nombres
      const parentIds = [...new Set(pendingData?.map((t: any) => t.students?.parent_id).filter(Boolean))];
      
      // Buscar información de los padres
      const { data: parentsData } = await supabase
        .from('parent_profiles')
        .select('user_id, full_name')
        .in('user_id', parentIds);
      
      const parentsMap = new Map();
      parentsData?.forEach((p: any) => {
        parentsMap.set(p.user_id, p.full_name);
      });

      // 2. Total cobrado hoy (transacciones pagadas hoy)
      const today = new Date().toISOString().split('T')[0];
      let collectedQuery = supabase
        .from('transactions')
        .select('amount, school_id')
        .eq('type', 'purchase')
        .eq('payment_status', 'paid')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (!canViewAllSchools || selectedSchool !== 'all') {
        const schoolId = selectedSchool !== 'all' ? selectedSchool : await getUserSchoolId();
        if (schoolId) {
          collectedQuery = collectedQuery.eq('school_id', schoolId);
        }
      }

      const { data: collectedData, error: collectedError } = await collectedQuery;
      console.log('💰 Cobrado hoy:', collectedData);
      if (collectedError) console.error('❌ Error en collectedQuery:', collectedError);
      
      const totalCollected = collectedData?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0;

      // 3. Períodos activos (open) - Mantener de billing_periods
      let periodsQuery = supabase
        .from('billing_periods')
        .select('id, school_id')
        .eq('status', 'open');

      if (!canViewAllSchools || selectedSchool !== 'all') {
        const schoolId = selectedSchool !== 'all' ? selectedSchool : await getUserSchoolId();
        if (schoolId) {
          periodsQuery = periodsQuery.eq('school_id', schoolId);
        }
      }

      const { data: periodsData } = await periodsQuery;
      const activePeriods = periodsData?.length || 0;

      // 4. Padres con deuda (contar padres únicos)
      const parentsWithDebt = parentIds.length;

      // 5. Top 10 deudores (DESDE TRANSACTIONS agrupados por estudiante)
      const debtByStudent: { [key: string]: { student_name: string; parent_name: string; amount: number; school_name: string } } = {};
      
      pendingData?.forEach((t: any) => {
        const studentId = t.student_id;
        if (!debtByStudent[studentId]) {
          const parentName = parentsMap.get(t.students?.parent_id) || 'Sin padre';
          debtByStudent[studentId] = {
            student_name: t.students?.full_name || 'Sin nombre',
            parent_name: parentName,
            amount: 0,
            school_name: t.schools?.name || 'Sin sede',
          };
        }
        debtByStudent[studentId].amount += Math.abs(t.amount || 0);
      });

      const topDebtors = Object.values(debtByStudent)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      console.log('👥 Top deudores:', topDebtors);

      // 6. Cobranza por sede (solo si es admin_general y ve todas)
      let collectionBySchool: any[] = [];
      if (canViewAllSchools && selectedSchool === 'all') {
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('school_id, amount, payment_status, type, schools(name)')
          .eq('type', 'purchase');

        const schoolsMap: { [key: string]: { name: string; pending: number; collected: number } } = {};

        allTransactions?.forEach((t: any) => {
          const schoolName = t.schools?.name || 'Sin sede';
          if (!schoolsMap[schoolName]) {
            schoolsMap[schoolName] = { name: schoolName, pending: 0, collected: 0 };
          }
          
          if (t.payment_status === 'pending' || t.payment_status === 'partial') {
            schoolsMap[schoolName].pending += Math.abs(t.amount || 0);
          }
          
          if (t.payment_status === 'paid') {
            schoolsMap[schoolName].collected += Math.abs(t.amount || 0);
          }
        });

        collectionBySchool = Object.values(schoolsMap).map(s => ({
          school_name: s.name,
          pending: s.pending,
          collected: s.collected,
        }));
      }

      console.log('📈 Stats finales:', {
        totalPending,
        totalCollected,
        activePeriods,
        parentsWithDebt,
        topDebtors,
        collectionBySchool,
      });

      setStats({
        totalPending,
        totalCollected,
        activePeriods,
        parentsWithDebt,
        topDebtors,
        collectionBySchool,
      });

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserSchoolId = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
    return data?.school_id || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <p className="ml-3 text-gray-600">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Sede (solo para admin_general) */}
      {canViewAllSchools && schools.length > 1 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Building2 className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">Filtrar por Sede:</p>
              </div>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-[250px] bg-white">
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-semibold">Todas las Sedes</span>
                    </div>
                  </SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Pendiente */}
        <Card className="border-l-4 border-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Total Por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              S/ {stats.totalPending.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Pendiente de pago</p>
          </CardContent>
        </Card>

        {/* Total Cobrado Hoy */}
        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Cobrado Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              S/ {stats.totalCollected.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Pagos recibidos hoy</p>
          </CardContent>
        </Card>

        {/* Períodos Abiertos */}
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Períodos Abiertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.activePeriods}
            </div>
            <p className="text-xs text-gray-500 mt-1">Activos para cobro</p>
          </CardContent>
        </Card>

        {/* Padres con Deuda */}
        <Card className="border-l-4 border-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              Padres con Deuda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.parentsWithDebt}
            </div>
            <p className="text-xs text-gray-500 mt-1">Cuentas pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Deudores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            Top 10 Deudores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topDebtors.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              ¡Excelente! No hay deudas pendientes.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topDebtors.map((debtor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      #{index + 1}
                    </Badge>
                    <div>
                      <p className="font-semibold text-gray-900">{debtor.student_name}</p>
                      <p className="text-sm text-gray-600">Padre: {debtor.parent_name}</p>
                      {canViewAllSchools && (
                        <p className="text-xs text-gray-500">{debtor.school_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">
                      S/ {debtor.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cobranza por Sede (solo admin_general viendo todas) */}
      {canViewAllSchools && selectedSchool === 'all' && stats.collectionBySchool.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Cobranza por Sede
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.collectionBySchool.map((school, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{school.school_name}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-red-600 font-semibold">
                        Pendiente: S/ {school.pending.toFixed(2)}
                      </span>
                      <span className="text-green-600 font-semibold">
                        Cobrado: S/ {school.collected.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${
                          school.pending + school.collected > 0
                            ? (school.collected / (school.pending + school.collected)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

