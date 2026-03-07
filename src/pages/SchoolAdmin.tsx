import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Calendar, CreditCard, Plus, Clock, CheckCircle2, AlertTriangle, ArrowLeft, GraduationCap, Nfc, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CreateSupplyRequestModal } from '@/components/school-admin/CreateSupplyRequestModal';
import { GradesManagement } from '@/components/school-admin/GradesManagement';
import { NFCCardsManager } from '@/components/admin/NFCCardsManager';
import { NFCRequestsManager } from '@/components/school-admin/NFCRequestsManager';
import { MaintenanceModeManager } from '@/components/school-admin/MaintenanceModeManager';

interface SupplyRequest {
  id: string;
  request_number: string;
  status: string;
  created_at: string;
  items_count: number;
  notes: string;
}

const SchoolAdmin = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<SupplyRequest[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Obtener el school_id y rol del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('school_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      // Admin General puede no tener school_id, es normal
      setUserSchoolId(profileData.school_id);

      // Cargar pedidos de esta sede (solo si tiene school_id)
      if (profileData.school_id) {
        const { data: requestsData, error: requestsError } = await supabase
          .from('supply_requests')
          .select(`
            *,
            items:supply_request_items(count)
          `)
          .eq('requesting_school_id', profileData.school_id)
          .order('created_at', { ascending: false });

        if (requestsError) throw requestsError;

        const formattedRequests = requestsData?.map(req => ({
          ...req,
          items_count: req.items?.[0]?.count || 0
        })) || [];

        setMyRequests(formattedRequests);
      }

    } catch (error: any) {
      console.error('Error loading school admin data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar la información',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      processing: { label: 'En Proceso', color: 'bg-blue-100 text-blue-700', icon: ShoppingCart },
      partially_fulfilled: { label: 'Parcial', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
      fulfilled: { label: 'Completado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9E4D68] mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando administración de sede...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-3xl font-black text-slate-800 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 sm:h-8 sm:w-8 text-[#9E4D68] flex-shrink-0" />
              <span className="truncate">Administración de Sede</span>
            </h1>
            <p className="text-slate-400 font-medium mt-1 text-xs sm:text-sm hidden sm:block">
              Gestión de pedidos, calendarios y tarjetas de identificación
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="gap-2 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver al Panel</span>
          </Button>
        </div>

        {/* Tabs Principales */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white border rounded-xl p-1 h-auto">
            <TabsTrigger value="requests" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline text-[10px] sm:text-sm leading-tight">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="grades" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline text-[10px] sm:text-sm leading-tight">Grados</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline text-[10px] sm:text-sm leading-tight">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <CreditCard className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline text-[10px] sm:text-sm leading-tight">Tarjetas</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-[#9E4D68] data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <Wrench className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline text-[10px] sm:text-sm leading-tight">Mant.</span>
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Pedidos */}
          <TabsContent value="requests" className="mt-4">
            <Card className="border-2 border-[#9E4D68]/20">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-6">
                <div className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-lg sm:text-2xl mb-2">
                    <ShoppingCart className="h-5 w-5 sm:h-8 sm:w-8 text-[#9E4D68]" />
                    Módulo de Pedidos
                  </CardTitle>
                  <Badge className="bg-gradient-to-r from-[#9E4D68] to-amber-700 text-white text-sm sm:text-lg px-4 py-1 sm:px-6 sm:py-2">
                    🚧 Próximamente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-8 p-3 sm:p-6">
                {/* Especificaciones del Módulo */}
                <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
                  {/* Descripción General */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
                    <h3 className="text-base sm:text-xl font-black text-blue-900 mb-2 flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 flex-shrink-0" />
                      ¿Qué es este módulo?
                    </h3>
                    <p className="text-blue-800 leading-relaxed text-sm sm:text-base">
                      El módulo de <strong>Pedidos de Suministros</strong> permitirá a los administradores de sede solicitar mercadería, ingredientes y productos desde la sede central o almacén principal de forma organizada y trazable.
                    </p>
                  </div>

                  {/* Funcionalidades */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border-2 border-emerald-200">
                    <h3 className="text-base sm:text-xl font-black text-emerald-900 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      Funcionalidades Incluidas
                    </h3>
                    <ul className="space-y-2 text-emerald-800 text-sm sm:text-base">
                      {[
                        { title: 'Crear Pedidos', desc: 'Solicitar productos del catálogo con cantidades específicas.' },
                        { title: 'Historial de Pedidos', desc: 'Ver todos los pedidos realizados con su estado actual.' },
                        { title: 'Tracking en Tiempo Real', desc: 'Seguimiento del estado de cada pedido hasta la entrega.' },
                        { title: 'Notificaciones', desc: 'Alertas cuando un pedido cambia de estado o es completado.' },
                        { title: 'Reportes', desc: 'Generación de reportes de pedidos por fecha, estado o sede.' },
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold text-base mt-0.5">•</span>
                          <div><strong>{item.title}:</strong> {item.desc}</div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mensaje Final */}
                  <div className="text-center bg-gradient-to-r from-slate-50 to-gray-100 p-4 rounded-xl border-2 border-slate-300">
                    <p className="text-slate-600 text-sm sm:text-base">
                      Este módulo estará disponible próximamente. Mientras tanto, puedes contactar al administrador para realizar pedidos manuales.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Grados y Salones */}
          <TabsContent value="grades" className="mt-4">
            <GradesManagement schoolId={userSchoolId} />
          </TabsContent>

          {/* Pestaña de Calendario */}
          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="h-5 w-5 text-[#9E4D68]" />
                  Calendarios
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Eventos académicos e internos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <p className="text-slate-400 text-center py-8 text-sm sm:text-base">Próximamente: Gestión de eventos</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Tarjetas NFC (incluye solicitudes + gestión de tarjetas) */}
          <TabsContent value="cards" className="mt-4 space-y-4">
            <NFCRequestsManager schoolId={userSchoolId} />
            <NFCCardsManager schoolId={userSchoolId} />
          </TabsContent>

          {/* Pestaña de Modo Mantenimiento */}
          <TabsContent value="maintenance" className="mt-4">
            <Card className="border-2 border-amber-200">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Wrench className="h-5 w-5 text-amber-600" />
                  Modo Mantenimiento
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Controla qué módulos del portal de padres están disponibles. Agrega tu correo de prueba para verlos tú solo.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <MaintenanceModeManager schoolId={userSchoolId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Crear Pedido */}
        <CreateSupplyRequestModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
          userSchoolId={userSchoolId}
        />
      </div>
    </div>
  );
};

export default SchoolAdmin;
