import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Calendar,
  Users,
  FileText,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Importar los componentes de cada tab
import { BillingDashboard } from '@/components/billing/BillingDashboard';
import { BillingPeriods } from '@/components/billing/BillingPeriods';
import { BillingCollection } from '@/components/billing/BillingCollection';
import { BillingReports } from '@/components/billing/BillingReports';
import { BillingConfig } from '@/components/billing/BillingConfig';

interface TabPermissions {
  dashboard: boolean;
  periods: boolean;
  collect: boolean;
  reports: boolean;
  config: boolean;
}

const Cobranzas = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [permissions, setPermissions] = useState<TabPermissions>({
    dashboard: false,
    periods: false,
    collect: false,
    reports: false,
    config: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, [user, role]);

  const checkPermissions = async () => {
    if (!user || !role) return;

    try {
      setLoading(true);

      // Por ahora, dar acceso según el rol
      if (role === 'admin_general') {
        setPermissions({
          dashboard: true,
          periods: true,
          collect: true,
          reports: true,
          config: true,
        });
        setLoading(false);
        return;
      }

      if (role === 'supervisor_red' || role === 'gestor_unidad') {
        setPermissions({
          dashboard: true,
          periods: true,
          collect: true,
          reports: true,
          config: false,
        });
        setLoading(false);
        return;
      }

      // Otros roles no tienen acceso
      setPermissions({
        dashboard: false,
        periods: false,
        collect: false,
        reports: false,
        config: false,
      });

    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no tiene ningún permiso
  const hasAnyPermission = Object.values(permissions).some(p => p);
  if (!hasAnyPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sin Permisos de Acceso</h2>
              <p className="text-gray-600">
                No tienes permisos para acceder a ninguna funcionalidad del módulo de Cobranzas.
                <br />
                Contacta al administrador del sistema.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-red-600" />
              Módulo de Cobranzas
            </h1>
            <p className="text-gray-600 mt-1">
              Gestión integral de cuentas por cobrar y períodos de facturación
            </p>
          </div>
        </div>

        {/* Tabs Principal */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full h-auto" style={{ gridTemplateColumns: `repeat(${Object.values(permissions).filter(Boolean).length}, 1fr)` }}>
                {permissions.dashboard && (
                  <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </TabsTrigger>
                )}
                {permissions.periods && (
                  <TabsTrigger value="periods" className="flex items-center gap-2 py-3">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Períodos</span>
                  </TabsTrigger>
                )}
                {permissions.collect && (
                  <TabsTrigger value="collect" className="flex items-center gap-2 py-3">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Cobrar</span>
                  </TabsTrigger>
                )}
                {permissions.reports && (
                  <TabsTrigger value="reports" className="flex items-center gap-2 py-3">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Reportes</span>
                  </TabsTrigger>
                )}
                {permissions.config && (
                  <TabsTrigger value="config" className="flex items-center gap-2 py-3">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Config</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Dashboard Tab */}
              {permissions.dashboard && (
                <TabsContent value="dashboard" className="mt-6">
                  <BillingDashboard />
                </TabsContent>
              )}

              {/* Períodos Tab */}
              {permissions.periods && (
                <TabsContent value="periods" className="mt-6">
                  <BillingPeriods />
                </TabsContent>
              )}

              {/* Cobrar Tab */}
              {permissions.collect && (
                <TabsContent value="collect" className="mt-6">
                  <BillingCollection />
                </TabsContent>
              )}

              {/* Reportes Tab */}
              {permissions.reports && (
                <TabsContent value="reports" className="mt-6">
                  <BillingReports />
                </TabsContent>
              )}

              {/* Configuración Tab */}
              {permissions.config && (
                <TabsContent value="config" className="mt-6">
                  <BillingConfig />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cobranzas;

