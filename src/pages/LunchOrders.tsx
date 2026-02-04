import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  UtensilsCrossed, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  UserPlus,
  PackagePlus,
  Search,
  Filter,
  Loader2,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateTemporaryStudentModal } from '@/components/lunch/CreateTemporaryStudentModal';
import { DeliverWithoutOrderModal } from '@/components/lunch/DeliverWithoutOrderModal';
import { LunchOrderActionsModal } from '@/components/lunch/LunchOrderActionsModal';

interface LunchOrder {
  id: string;
  order_date: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  postponed_at: string | null;
  cancellation_reason: string | null;
  postponement_reason: string | null;
  is_no_order_delivery: boolean;
  student_id: string | null;
  teacher_id: string | null;
  manual_name: string | null;
  payment_method: string | null;
  payment_details: any;
  menu_id: string | null;
  school?: {
    name: string;
    code: string;
  };
  student?: {
    full_name: string;
    photo_url: string | null;
    is_temporary: boolean;
    temporary_classroom_name: string | null;
    school_id: string;
  };
  teacher?: {
    full_name: string;
    school_id_1: string;
  };
  menu?: {
    starter: string | null;
    main_course: string | null;
    beverage: string | null;
    dessert: string | null;
    notes: string | null;
    category?: {
      name: string;
      icon: string | null;
    };
  };
}

interface School {
  id: string;
  name: string;
  code: string;
}

export default function LunchOrders() {
  const { user } = useAuth();
  const { role, canViewAllSchools, loading: roleLoading } = useRole();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<LunchOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<LunchOrder[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  
  // Fecha por defecto: basada en configuración de entrega
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [defaultDeliveryDate, setDefaultDeliveryDate] = useState<string>('');
  
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showCreateTemporary, setShowCreateTemporary] = useState(false);
  const [showDeliverWithoutOrder, setShowDeliverWithoutOrder] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<LunchOrder | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showMenuDetails, setShowMenuDetails] = useState(false);
  const [selectedMenuOrder, setSelectedMenuOrder] = useState<LunchOrder | null>(null);

  useEffect(() => {
    if (!roleLoading && role && user) {
      fetchConfigAndInitialize();
    }
  }, [role, roleLoading, user]);

  useEffect(() => {
    if (selectedDate) {
      fetchOrders();
    }
  }, [selectedDate]);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedSchool, selectedStatus, searchTerm]);

  const fetchConfigAndInitialize = async () => {
    try {
      console.log('📅 Cargando configuración de entrega...');
      
      // Obtener configuración de lunch
      const { data: profileData } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      const schoolId = profileData?.school_id;

      if (schoolId) {
        const { data: config, error: configError } = await supabase
          .from('lunch_configuration')
          .select('delivery_end_time')
          .eq('school_id', schoolId)
          .maybeSingle();

        if (configError) {
          console.error('Error cargando configuración:', configError);
        }

        console.log('🕐 Configuración de entrega:', config);

        // Calcular fecha por defecto basada en la hora de CORTE (delivery_end_time)
        const now = new Date();
        const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const currentHour = peruTime.getHours();
        const currentMinute = peruTime.getMinutes();
        
        // Convertir delivery_end_time a horas y minutos (ej: "17:00:00" -> 17:00)
        const deliveryEndHour = config?.delivery_end_time 
          ? parseInt(config.delivery_end_time.split(':')[0]) 
          : 17; // Default 5 PM
        const deliveryEndMinute = config?.delivery_end_time 
          ? parseInt(config.delivery_end_time.split(':')[1]) 
          : 0;

        // Si ya pasó la hora de corte, mostrar pedidos de mañana
        // Si no ha pasado, mostrar pedidos de hoy
        let defaultDate = new Date(peruTime);
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const cutoffTotalMinutes = deliveryEndHour * 60 + deliveryEndMinute;
        
        if (currentTotalMinutes >= cutoffTotalMinutes) {
          defaultDate.setDate(defaultDate.getDate() + 1);
          console.log('⏰ Ya pasó la hora de corte, mostrando pedidos del día siguiente');
        } else {
          console.log('⏰ Aún no es hora de corte, mostrando pedidos de hoy');
        }

        const formattedDate = format(defaultDate, 'yyyy-MM-dd');
        console.log('📅 Fecha por defecto calculada:', formattedDate);
        console.log('⏰ Hora de corte configurada:', `${deliveryEndHour}:${String(deliveryEndMinute).padStart(2, '0')}`);
        
        setDefaultDeliveryDate(formattedDate);
        setSelectedDate(formattedDate);
      } else {
        // Si no tiene school_id (admin general), usar mañana por defecto
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formattedDate = format(tomorrow, 'yyyy-MM-dd');
        setDefaultDeliveryDate(formattedDate);
        setSelectedDate(formattedDate);
      }

      await fetchSchools();
    } catch (error: any) {
      console.error('Error inicializando:', error);
      // En caso de error, usar mañana como fallback
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formattedDate = format(tomorrow, 'yyyy-MM-dd');
      setDefaultDeliveryDate(formattedDate);
      setSelectedDate(formattedDate);
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      console.error('Error cargando escuelas:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('📅 Cargando pedidos de almuerzo para:', selectedDate);
      console.log('👤 Usuario:', user?.id);
      console.log('🎭 Rol:', role);

      let query = supabase
        .from('lunch_orders')
        .select(`
          *,
          school:schools!lunch_orders_school_id_fkey (
            name,
            code
          ),
          student:students (
            full_name,
            photo_url,
            is_temporary,
            temporary_classroom_name,
            school_id
          ),
          teacher:teacher_profiles (
            full_name,
            school_id_1
          ),
          menu:lunch_menus (
            starter,
            main_course,
            beverage,
            dessert,
            notes,
            category:lunch_categories (
              name,
              icon
            )
          )
        `)
        .eq('order_date', selectedDate)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ ERROR EN QUERY:', error);
        throw error;
      }
      
      console.log('✅ Pedidos cargados:', data?.length || 0);
      setOrders(data || []);
    } catch (error: any) {
      console.error('❌ Error cargando pedidos:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los pedidos de almuerzo.',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filtrar por sede
    if (selectedSchool !== 'all') {
      filtered = filtered.filter(order => {
        // Incluir pedidos de estudiantes de la sede seleccionada
        if (order.student?.school_id === selectedSchool) return true;
        // Incluir pedidos de profesores de la sede seleccionada
        if (order.teacher?.school_id_1 === selectedSchool) return true;
        // Incluir pedidos con nombre manual (sin crédito) - no tienen school_id
        // TODO: En el futuro, podríamos agregar school_id a los pedidos manuales
        if (order.manual_name) return true;
        return false;
      });
    }

    // Filtrar por estado
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.student?.full_name.toLowerCase().includes(term) ||
        order.teacher?.full_name.toLowerCase().includes(term) ||
        order.manual_name?.toLowerCase().includes(term) ||
        order.student?.temporary_classroom_name?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(filtered);
  };

  const canModifyOrder = () => {
    const now = new Date();
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const currentHour = peruTime.getHours();
    
    // Solo se puede modificar antes de las 9 AM
    return currentHour < 9;
  };

  const getStatusBadge = (status: string, isNoOrderDelivery: boolean) => {
    if (isNoOrderDelivery) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Sin pedido previo
        </Badge>
      );
    }

    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Confirmado
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Entregado
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Anulado
          </Badge>
        );
      case 'postponed':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Postergado
          </Badge>
        );
      case 'pending_payment':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendiente de pago
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOrderAction = (order: LunchOrder) => {
    setSelectedOrderForAction(order);
    setShowActionsModal(true);
  };

  const handleActionComplete = () => {
    setShowActionsModal(false);
    setSelectedOrderForAction(null);
    fetchOrders(); // Recargar los pedidos
  };

  const handleViewMenu = (order: LunchOrder) => {
    setSelectedMenuOrder(order);
    setShowMenuDetails(true);
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando pedidos de almuerzo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <UtensilsCrossed className="h-6 w-6 text-blue-600" />
            Gestión de Pedidos
          </h2>
          <p className="text-gray-600">Gestiona las entregas de almuerzos del día</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowDeliverWithoutOrder(true)}
            className="bg-orange-600 hover:bg-orange-700 gap-2"
          >
            <PackagePlus className="h-4 w-4" />
            Entregar sin pedido
          </Button>
          <Button
            onClick={() => setShowCreateTemporary(true)}
            className="bg-purple-600 hover:bg-purple-700 gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Crear Puente Temporal
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Fecha */}
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
                {selectedDate !== defaultDeliveryDate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedDate(defaultDeliveryDate)}
                    className="whitespace-nowrap"
                    title="Volver a fecha de entrega configurada"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Sede */}
            {canViewAllSchools && (
              <div>
                <label className="text-sm font-medium mb-2 block">Sede</label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las sedes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sedes</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Estado */}
            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                  <SelectItem value="cancelled">Anulado</SelectItem>
                  <SelectItem value="postponed">Postergado</SelectItem>
                  <SelectItem value="pending_payment">Pendiente de pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nombre del estudiante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pedidos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pedidos del día</CardTitle>
              <CardDescription>
                {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''} encontrado{filteredOrders.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            {!canModifyOrder() && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                Después de las 9:00 AM - Solo lectura
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-2">No hay pedidos</p>
              <p className="text-sm">
                No se encontraron pedidos de almuerzo para los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Foto o inicial */}
                    <div className="relative">
                      {order.student?.photo_url ? (
                        <img
                          src={order.student.photo_url}
                          alt={order.student.full_name}
                          className="h-14 w-14 rounded-full object-cover border-2 border-blue-200"
                        />
                      ) : (
                        <div className={cn(
                          "h-14 w-14 rounded-full flex items-center justify-center border-2",
                          order.teacher ? "bg-green-100 border-green-300" : "bg-blue-100 border-blue-200"
                        )}>
                          <span className={cn(
                            "font-bold text-xl",
                            order.teacher ? "text-green-700" : "text-blue-600"
                          )}>
                            {order.student?.full_name[0] || order.teacher?.full_name[0] || order.manual_name?.[0] || '?'}
                          </span>
                        </div>
                      )}
                      {order.student?.is_temporary && (
                        <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-1">
                          <UserPlus className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {order.teacher && (
                        <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1">
                          <span className="text-white text-[10px] font-bold px-1">👨‍🏫</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-lg text-gray-900">
                          {order.student?.full_name || order.teacher?.full_name || order.manual_name || 'Desconocido'}
                        </p>
                        {order.school && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                            🏫 {order.school.name}
                          </Badge>
                        )}
                        {order.teacher && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                            Profesor
                          </Badge>
                        )}
                        {order.manual_name && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                            💵 Pago Físico
                          </Badge>
                        )}
                        {order.student && !order.student.is_temporary && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                            Alumno
                          </Badge>
                        )}
                      </div>
                      {order.student?.is_temporary && order.student.temporary_classroom_name && (
                        <p className="text-sm font-medium text-purple-600">
                          🎫 Puente Temporal - {order.student.temporary_classroom_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Pedido a las {format(new Date(order.created_at), "HH:mm", { locale: es })}
                      </p>
                    </div>

                    {/* Estado */}
                    <div>
                      {getStatusBadge(order.status, order.is_no_order_delivery)}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    {order.menu && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewMenu(order)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Menú
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleOrderAction(order)}
                      disabled={!canModifyOrder() && order.status === 'confirmed'}
                    >
                      Acciones
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateTemporaryStudentModal
        isOpen={showCreateTemporary}
        onClose={() => setShowCreateTemporary(false)}
        onSuccess={() => {
          setShowCreateTemporary(false);
          fetchOrders();
        }}
      />

      <DeliverWithoutOrderModal
        isOpen={showDeliverWithoutOrder}
        onClose={() => setShowDeliverWithoutOrder(false)}
        selectedDate={selectedDate}
        onSuccess={() => {
          setShowDeliverWithoutOrder(false);
          fetchOrders();
        }}
      />

      {selectedOrderForAction && (
        <LunchOrderActionsModal
          isOpen={showActionsModal}
          onClose={() => setShowActionsModal(false)}
          order={selectedOrderForAction}
          onSuccess={handleActionComplete}
          canModify={canModifyOrder()}
        />
      )}

      {/* Modal de Detalles del Menú */}
      {selectedMenuOrder && selectedMenuOrder.menu && (
        <Dialog open={showMenuDetails} onOpenChange={setShowMenuDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-blue-600" />
                Detalles del Menú
              </DialogTitle>
              <DialogDescription>
                Menú ordenado por {selectedMenuOrder.student?.full_name || selectedMenuOrder.teacher?.full_name || selectedMenuOrder.manual_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Categoría */}
              {selectedMenuOrder.menu.category && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  {selectedMenuOrder.menu.category.icon && (
                    <span className="text-3xl">{selectedMenuOrder.menu.category.icon}</span>
                  )}
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Categoría</p>
                    <p className="text-lg font-bold text-gray-900">{selectedMenuOrder.menu.category.name}</p>
                  </div>
                </div>
              )}

              {/* Platos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Entrada */}
                {selectedMenuOrder.menu.starter && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        🥗 Entrada
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base text-gray-900">{selectedMenuOrder.menu.starter}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Plato Principal */}
                {selectedMenuOrder.menu.main_course && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        🍽️ Plato Principal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base text-gray-900">{selectedMenuOrder.menu.main_course}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Bebida */}
                {selectedMenuOrder.menu.beverage && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        🥤 Bebida
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base text-gray-900">{selectedMenuOrder.menu.beverage}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Postre */}
                {selectedMenuOrder.menu.dessert && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        🍰 Postre
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base text-gray-900">{selectedMenuOrder.menu.dessert}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Notas */}
              {selectedMenuOrder.menu.notes && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                      📝 Notas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{selectedMenuOrder.menu.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Información del Pedido */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Fecha del pedido:</span>
                  <span className="font-semibold text-gray-900">
                    {format(new Date(selectedMenuOrder.order_date), "dd 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Hora de registro:</span>
                  <span className="font-semibold text-gray-900">
                    {format(new Date(selectedMenuOrder.created_at), "HH:mm", { locale: es })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estado:</span>
                  <div>
                    {getStatusBadge(selectedMenuOrder.status, selectedMenuOrder.is_no_order_delivery)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowMenuDetails(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
