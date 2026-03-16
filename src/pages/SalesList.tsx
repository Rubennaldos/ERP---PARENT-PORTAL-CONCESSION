import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, LogOut, ArrowLeft, BarChart3, FileText, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SalesList as SalesListGrid } from '@/components/admin/SalesList';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { PurchaseVisibilityConfig } from '@/components/sales/PurchaseVisibilityConfig';
import { HistoricalSalesForm } from '@/components/admin/HistoricalSalesForm';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface School {
  id: string;
  name: string;
}

const SalesList = () => {
  const { signOut, user } = useAuth();
  const { role, canViewAllSchools } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [canViewDashboard, setCanViewDashboard] = useState(false);
  const [canEnterHistorical, setCanEnterHistorical] = useState(false);
  const [userSchoolId, setUserSchoolId] = useState<string>('');
  const [userSchoolName, setUserSchoolName] = useState<string>('');

  useEffect(() => {
    checkPermissions();
    if (canViewAllSchools) {
      loadSchools();
    }
  }, [user, role]);

  const checkPermissions = async () => {
    if (!user) return;

    // Admin General siempre puede ver el dashboard y ventas históricas
    if (role === 'admin_general') {
      setCanViewDashboard(true);
      setCanEnterHistorical(true);
      // Cargar school_id del admin general
      loadUserSchool();
      return;
    }

    // Verificar permiso específico
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          granted,
          permissions(module, action)
        `)
        .eq('role', role)
        .eq('granted', true);

      if (error) throw error;

      const hasDashboardPermission = data?.some((perm: any) => 
        perm.permissions?.module === 'ventas' && 
        perm.permissions?.action === 'ver_dashboard'
      );

      const hasHistoricalPermission = data?.some((perm: any) =>
        perm.permissions?.module === 'ventas' &&
        (perm.permissions?.action === 'ingresar_historico' || perm.permissions?.action === 'ver_dashboard')
      );

      setCanViewDashboard(hasDashboardPermission || false);
      setCanEnterHistorical(hasHistoricalPermission || false);
      if (hasHistoricalPermission) loadUserSchool();
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const loadUserSchool = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('school_id, schools(id, name)')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.school_id) {
        setUserSchoolId(data.school_id);
        setUserSchoolName((data as any).schools?.name || '');
      }
    } catch (err) {
      console.error('Error cargando sede del usuario:', err);
    }
  };

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Módulo de Ventas</h1>
              <p className="text-xs text-gray-500">Historial y reportes</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden md:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-3">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className={`grid w-full bg-white border rounded-xl p-1 mb-4 ${
            canViewDashboard && canEnterHistorical ? 'grid-cols-4'
            : (canViewDashboard || canEnterHistorical) ? 'grid-cols-3'
            : 'grid-cols-2'
          }`}>
            <TabsTrigger value="list" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white text-xs px-1 py-1.5 gap-1">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Lista de Ventas</span>
              <span className="sm:hidden">Ventas</span>
            </TabsTrigger>
            {canViewDashboard && (
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white text-xs px-1 py-1.5 gap-1">
                <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Dashboard & Analytics</span>
                <span className="sm:hidden">Dashboard</span>
              </TabsTrigger>
            )}
            {canEnterHistorical && (
              <TabsTrigger value="historical" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white text-xs px-1 py-1.5 gap-1">
                <History className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Ventas Históricas</span>
                <span className="sm:hidden">Históricas</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="visibility" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white text-xs px-1 py-1.5 gap-1">
              <Settings className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Config. Visualización</span>
              <span className="sm:hidden">Config.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <SalesListGrid />
          </TabsContent>

          {canViewDashboard && (
            <TabsContent value="dashboard">
              {/* Filtro por Sede */}
              {canViewAllSchools && schools.length > 0 && (
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <label className="font-bold text-slate-700">Filtrar por Sede:</label>
                      <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                        <SelectTrigger className="w-[300px]">
                          <SelectValue placeholder="Seleccionar sede" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">📊 Todas las Sedes (Global)</SelectItem>
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

              <SalesDashboard selectedSchool={selectedSchool} canViewAllSchools={canViewAllSchools} />
            </TabsContent>
          )}

          {canEnterHistorical && (
            <TabsContent value="historical">
              {canViewAllSchools && schools.length > 0 ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-4">
                        <label className="font-bold text-slate-700 text-sm whitespace-nowrap">Sede:</label>
                        <Select
                          value={userSchoolId || 'all'}
                          onValueChange={(val) => {
                            setUserSchoolId(val);
                            const found = schools.find(s => s.id === val);
                            setUserSchoolName(found?.name || '');
                          }}
                        >
                          <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Seleccionar sede" />
                          </SelectTrigger>
                          <SelectContent>
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
                  {userSchoolId && userSchoolId !== 'all' && (
                    <HistoricalSalesForm schoolId={userSchoolId} schoolName={userSchoolName} />
                  )}
                </div>
              ) : userSchoolId ? (
                <HistoricalSalesForm schoolId={userSchoolId} schoolName={userSchoolName} />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-slate-400">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Cargando sede...</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          <TabsContent value="visibility">
            <PurchaseVisibilityConfig />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SalesList;

