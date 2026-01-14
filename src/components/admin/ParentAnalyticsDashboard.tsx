import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Clock, 
  Activity,
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ParentMetrics {
  total_logins: number;
  total_payments: number;
  total_recharges: number;
  avg_session_duration_minutes: number;
  total_pages_viewed: number;
  last_login: string;
  engagement_score: number;
}

interface ParentReport {
  parent_id: string;
  parent_name: string;
  parent_email: string;
  total_students: number;
  total_logins: number;
  avg_session_minutes: number;
  total_payments: number;
  total_amount_paid: number;
  engagement_score: number;
  last_activity: string;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  event_category: string;
  event_data: any;
  created_at: string;
}

const COLORS = ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460'];

interface ParentAnalyticsDashboardProps {
  selectedSchool?: string;
}

export function ParentAnalyticsDashboard({ selectedSchool = 'all' }: ParentAnalyticsDashboardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ParentMetrics | null>(null);
  const [allParentsReport, setAllParentsReport] = useState<ParentReport[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<ActivityEvent[]>([]);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange, selectedSchool]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar si es admin para cargar reportes globales
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profileData?.role && ['superadmin', 'admin_general', 'admin_sede'].includes(profileData.role);

      if (isAdmin) {
        // Cargar reporte de todos los padres
        let query = supabase.rpc('get_all_parents_report');
        
        const { data: reportData, error: reportError } = await query;
        
        if (!reportError && reportData) {
          // Filtrar por sede si está seleccionada
          let filteredData = reportData;
          
          if (selectedSchool && selectedSchool !== 'all') {
            // Obtener padres de la sede seleccionada
            const { data: studentsInSchool } = await supabase
              .from('students')
              .select('parent_id')
              .eq('school_id', selectedSchool)
              .eq('is_active', true);
            
            const parentIdsInSchool = new Set(studentsInSchool?.map(s => s.parent_id) || []);
            filteredData = reportData.filter(r => parentIdsInSchool.has(r.parent_id));
          }
          
          setAllParentsReport(filteredData);
          
          // Calcular métricas agregadas globales o por sede
          const totalLogins = filteredData.reduce((sum, p) => sum + (p.total_logins || 0), 0);
          const totalPayments = filteredData.reduce((sum, p) => sum + (p.total_payments || 0), 0);
          const avgSession = filteredData.length > 0 
            ? filteredData.reduce((sum, p) => sum + (p.avg_session_minutes || 0), 0) / filteredData.length 
            : 0;
          const totalEngagement = filteredData.reduce((sum, p) => sum + (p.engagement_score || 0), 0);
          
          setMetrics({
            total_logins: totalLogins,
            total_payments: totalPayments,
            total_recharges: 0,
            avg_session_duration_minutes: avgSession,
            total_pages_viewed: 0,
            last_login: new Date().toISOString(),
            engagement_score: totalEngagement
          });
        }
        
        // Cargar timeline (todas las actividades o filtradas por sede)
        let timelineQuery = supabase
          .from('parent_activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (selectedSchool && selectedSchool !== 'all') {
          // Filtrar timeline por padres de la sede
          const { data: studentsInSchool } = await supabase
            .from('students')
            .select('parent_id')
            .eq('school_id', selectedSchool)
            .eq('is_active', true);
          
          const parentIdsInSchool = studentsInSchool?.map(s => s.parent_id) || [];
          
          if (parentIdsInSchool.length > 0) {
            timelineQuery = timelineQuery.in('parent_id', parentIdsInSchool);
          }
        }
        
        const { data: timelineData } = await timelineQuery;
        setActivityTimeline(timelineData || []);
      }

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las métricas',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (allParentsReport.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay datos para exportar',
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(allParentsReport.map(r => ({
      'Nombre': r.parent_name,
      'Email': r.parent_email,
      'Total Hijos': r.total_students,
      'Logins': r.total_logins,
      'Duración Promedio (min)': r.avg_session_minutes,
      'Pagos Realizados': r.total_payments,
      'Monto Total Pagado (S/)': r.total_amount_paid,
      'Score de Engagement': r.engagement_score,
      'Última Actividad': new Date(r.last_activity).toLocaleString('es-PE')
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Padres');
    
    XLSX.writeFile(workbook, `reporte_padres_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: '✅ Exportado',
      description: 'El reporte se descargó exitosamente',
    });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login': return '🔐';
      case 'payment': return '💳';
      case 'recharge': return '💰';
      case 'view_page': return '👁️';
      case 'update_profile': return '✏️';
      default: return '📌';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'login': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'payment': return 'bg-green-50 text-green-700 border-green-200';
      case 'recharge': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B4513]"></div>
      </div>
    );
  }

  // Datos para gráficos
  const activityByCategory = activityTimeline.reduce((acc, event) => {
    acc[event.event_category] = (acc[event.event_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(activityByCategory).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="space-y-6">
      {/* Header con título y filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800">
            Lima Analytics
            {selectedSchool === 'all' ? ' - Global' : ' - Por Sede'}
          </h2>
          <p className="text-slate-400 font-medium mt-1">
            {selectedSchool === 'all' 
              ? '📊 Vista consolidada de todos los padres del sistema' 
              : '🏫 Vista filtrada por sede seleccionada'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeRange(7)}
            className={timeRange === 7 ? 'bg-[#8B4513] text-white' : ''}
          >
            7 días
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeRange(30)}
            className={timeRange === 30 ? 'bg-[#8B4513] text-white' : ''}
          >
            30 días
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeRange(90)}
            className={timeRange === 90 ? 'bg-[#8B4513] text-white' : ''}
          >
            90 días
          </Button>
        </div>
      </div>

      {/* Métricas principales (KPIs) */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{metrics.total_logins}</div>
              <p className="text-xs text-slate-400 mt-1">En los últimos {timeRange} días</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pagos Realizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{metrics.total_payments}</div>
              <p className="text-xs text-slate-400 mt-1">Transacciones completadas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tiempo Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">
                {metrics.avg_session_duration_minutes.toFixed(1)}
                <span className="text-lg text-slate-400 ml-1">min</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Por sesión</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Engagement Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{metrics.engagement_score.toFixed(0)}</div>
              <p className="text-xs text-slate-400 mt-1">Nivel de actividad</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="timeline">Historial</TabsTrigger>
          <TabsTrigger value="report">Reporte General</TabsTrigger>
        </TabsList>

        {/* Pestaña de Gráficos */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Actividad por Categoría</CardTitle>
                <CardDescription>Distribución de eventos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen de Métricas</CardTitle>
                <CardDescription>Vista general de tu actividad</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Logins', value: metrics?.total_logins || 0 },
                    { name: 'Pagos', value: metrics?.total_payments || 0 },
                    { name: 'Recargas', value: metrics?.total_recharges || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8B4513" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pestaña de Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividad</CardTitle>
              <CardDescription>Últimas 50 acciones registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {activityTimeline.map((event) => (
                  <div 
                    key={event.id} 
                    className={`p-4 rounded-xl border ${getEventColor(event.event_type)} flex items-center gap-4`}
                  >
                    <div className="text-2xl">{getEventIcon(event.event_type)}</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm capitalize">{event.event_type.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500">{event.event_category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-600">
                        {new Date(event.created_at).toLocaleDateString('es-PE')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(event.created_at).toLocaleTimeString('es-PE')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Reporte General (solo para admins) */}
        <TabsContent value="report">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reporte de Todos los Padres</CardTitle>
                  <CardDescription>Análisis comparativo para Marketing</CardDescription>
                </div>
                <Button onClick={exportToExcel} className="bg-[#8B4513] hover:bg-[#6F370F]">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {allParentsReport.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-black">Nombre</th>
                        <th className="text-left p-3 font-black">Email</th>
                        <th className="text-center p-3 font-black">Hijos</th>
                        <th className="text-center p-3 font-black">Logins</th>
                        <th className="text-center p-3 font-black">Tiempo Prom.</th>
                        <th className="text-center p-3 font-black">Pagos</th>
                        <th className="text-center p-3 font-black">Monto Total</th>
                        <th className="text-center p-3 font-black">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allParentsReport.map((parent) => (
                        <tr key={parent.parent_id} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-bold">{parent.parent_name}</td>
                          <td className="p-3 text-slate-500">{parent.parent_email}</td>
                          <td className="p-3 text-center">{parent.total_students}</td>
                          <td className="p-3 text-center">{parent.total_logins}</td>
                          <td className="p-3 text-center">{parent.avg_session_minutes.toFixed(1)} min</td>
                          <td className="p-3 text-center">{parent.total_payments}</td>
                          <td className="p-3 text-center font-bold text-green-600">
                            S/ {parent.total_amount_paid.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="bg-purple-100 text-purple-700">
                              {parent.engagement_score.toFixed(0)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-400 py-12">
                  Solo los administradores pueden ver este reporte
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
