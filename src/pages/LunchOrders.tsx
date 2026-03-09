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
  Search,
  Filter,
  Loader2,
  Eye,
  Trash2,
  Download,
  PackagePlus
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LunchOrderActionsModal } from '@/components/lunch/LunchOrderActionsModal';
import { getDisplayValue } from '@/components/lunch/MenuFieldOptionSelector';

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
  is_cancelled: boolean;
  cancelled_by: string | null;
  created_by: string | null;
  student_id: string | null;
  teacher_id: string | null;
  manual_name: string | null;
  payment_method: string | null;
  payment_details: any;
  menu_id: string | null;
  chosen_starter?: string | null;
  chosen_main_course?: string | null;
  chosen_beverage?: string | null;
  chosen_dessert?: string | null;
  quantity: number | null;
  base_price: number | null;
  addons_total: number | null;
  final_price: number | null;
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
    free_account: boolean | null;
  };
  teacher?: {
    full_name: string;
    school_id_1: string;
  };
  lunch_menus?: {
    starter: string | null;
    main_course: string | null;
    beverage: string | null;
    dessert: string | null;
    notes: string | null;
    category_id: string | null;
    lunch_categories?: {
      name: string;
      icon: string | null;
    };
  };
  lunch_order_addons?: Array<{
    id: string;
    addon_name: string;
    addon_price: number;
    quantity: number;
  }>;
  comments?: string | null; // 💬 Comentarios del pedido
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
  
  // Filtros de rango de fechas para auditoría
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isDateRangeMode, setIsDateRangeMode] = useState(false);
  
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<LunchOrder | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showMenuDetails, setShowMenuDetails] = useState(false);
  const [selectedMenuOrder, setSelectedMenuOrder] = useState<LunchOrder | null>(null);
  const [selectedOrderTicketCode, setSelectedOrderTicketCode] = useState<string | null>(null);
  
  // Estados para anulación de pedidos
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [pendingCancelOrder, setPendingCancelOrder] = useState<LunchOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // 🆕 Info de pago del pedido a anular (para mostrar advertencia de reembolso)
  const [cancelOrderPaymentInfo, setCancelOrderPaymentInfo] = useState<{
    isPaid: boolean;
    amount: number;
    paymentMethod: string | null;
    clientName: string;
  } | null>(null);
  const [lunchConfig, setLunchConfig] = useState<{ cancellation_deadline_time?: string; cancellation_deadline_days?: number } | null>(null);

  useEffect(() => {
    if (!roleLoading && role && user) {
      fetchConfigAndInitialize();
    }
  }, [role, roleLoading, user]);

  useEffect(() => {
    if (selectedDate && !isDateRangeMode) {
      fetchOrders();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isDateRangeMode && startDate && endDate) {
      fetchOrders();
    }
  }, [isDateRangeMode, startDate, endDate]);

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
        // Si el usuario tiene una sede asignada y NO puede ver todas las sedes, 
        // configurar automáticamente el filtro a su sede
        if (!canViewAllSchools) {
          setSelectedSchool(schoolId);
          console.log('🏫 Admin de sede: filtrando automáticamente por su sede:', schoolId);
        }

        const { data: config, error: configError } = await supabase
          .from('lunch_configuration')
          .select('delivery_end_time, cancellation_deadline_time, cancellation_deadline_days')
          .eq('school_id', schoolId)
          .maybeSingle();

        if (configError) {
          console.error('Error cargando configuración:', configError);
        }

        // Guardar configuración para usar en canModifyOrder
        if (config) {
          setLunchConfig({
            cancellation_deadline_time: config.cancellation_deadline_time,
            cancellation_deadline_days: config.cancellation_deadline_days
          });
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
        // Admin general sin school_id: usar hoy en hora de Perú
        const peruNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const formattedDate = format(peruNow, 'yyyy-MM-dd');
        setDefaultDeliveryDate(formattedDate);
        setSelectedDate(formattedDate);
      }

      await fetchSchools();
    } catch (error: any) {
      console.error('Error inicializando:', error);
      // Fallback: usar hoy en hora de Perú
      const peruNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
      const formattedDate = format(peruNow, 'yyyy-MM-dd');
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
      
      // Si está en modo de rango de fechas, obtener pedidos en ese rango
      if (isDateRangeMode && startDate && endDate) {
        console.log('📅 Cargando pedidos de almuerzo desde:', startDate, 'hasta:', endDate);
        
        let query = supabase
          .from('lunch_orders')
          .select(`
            *,
            chosen_starter,
            chosen_main_course,
            chosen_beverage,
            chosen_dessert,
            school:schools!lunch_orders_school_id_fkey (
              name,
              code
            ),
            student:students (
              full_name,
              photo_url,
              is_temporary,
              temporary_classroom_name,
              school_id,
              free_account
            ),
            teacher:teacher_profiles (
              full_name,
              school_id_1
            ),
            lunch_menus (
              starter,
              main_course,
              beverage,
              dessert,
              notes,
              category_id
            ),
            lunch_order_addons (
              id,
              addon_name,
              addon_price,
              quantity
            )
          `)
          .gte('order_date', startDate)
          .lte('order_date', endDate)
          .eq('is_cancelled', false)
          .order('order_date', { ascending: false })
          .order('created_at', { ascending: false });

        const { data, error } = await query;
        
        if (error) {
          console.error('❌ ERROR EN QUERY:', error);
          throw error;
        }
        
        console.log('✅ Pedidos cargados (rango):', data?.length || 0);
        
        // Cargar categorías para los menús que tengan category_id
        if (data && data.length > 0) {
          const categoryIds = data
            .map(order => order.lunch_menus?.category_id)
            .filter((id): id is string => id !== null && id !== undefined);
          
          if (categoryIds.length > 0) {
            const { data: categories, error: catError } = await supabase
              .from('lunch_categories')
              .select('id, name')
              .in('id', categoryIds);
            
            if (!catError && categories) {
              const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
              data.forEach(order => {
                if (order.lunch_menus?.category_id) {
                  order.lunch_menus.category_name = categoryMap.get(order.lunch_menus.category_id);
                }
              });
            }
          }
        }
        
        // 🎫💰 Batch: obtener ticket_codes + payment_status + amount para modo rango
        if (data && data.length > 0) {
          try {
            const orderIds = data.map(o => o.id);
            const { data: txData } = await supabase
              .from('transactions')
              .select('metadata, ticket_code, payment_status, payment_method, amount')
              .eq('type', 'purchase')
              .neq('payment_status', 'cancelled')
              .not('metadata', 'is', null);
            
            if (txData) {
              const ticketMap = new Map<string, string>();
              const paymentStatusMap = new Map<string, { status: string; method: string | null }>();
              const amountMap = new Map<string, number>();
              const sourceMap = new Map<string, string>();
              txData.forEach((tx: any) => {
                const lunchOrderId = tx.metadata?.lunch_order_id;
                if (lunchOrderId && orderIds.includes(lunchOrderId)) {
                  if (tx.ticket_code) {
                    ticketMap.set(lunchOrderId, tx.ticket_code);
                  }
                  const existing = paymentStatusMap.get(lunchOrderId);
                  if (!existing || tx.payment_status === 'paid') {
                    paymentStatusMap.set(lunchOrderId, { 
                      status: tx.payment_status, 
                      method: tx.payment_method 
                    });
                  }
                  // Guardar el monto de la transacción (valor absoluto)
                  if (tx.amount) {
                    amountMap.set(lunchOrderId, Math.abs(tx.amount));
                  }
                  // Guardar el source de la transacción
                  if (tx.metadata?.source) {
                    sourceMap.set(lunchOrderId, tx.metadata.source);
                  }
                }
              });
              
              data.forEach((order: any) => {
                if (ticketMap.has(order.id)) {
                  order._ticket_code = ticketMap.get(order.id);
                }
                if (paymentStatusMap.has(order.id)) {
                  order._tx_payment_status = paymentStatusMap.get(order.id)!.status;
                  order._tx_payment_method = paymentStatusMap.get(order.id)!.method;
                }
                if (sourceMap.has(order.id)) {
                  order._tx_source = sourceMap.get(order.id);
                }
                // 💰 Si final_price es 0 o null, usar el monto de la transacción
                if ((!order.final_price || order.final_price === 0) && amountMap.has(order.id)) {
                  order.final_price = amountMap.get(order.id);
                }
              });
            }
          } catch (err) {
            console.log('⚠️ No se pudieron obtener ticket_codes/payment_status batch (rango)');
          }
        }
        
        setOrders(data || []);
        setLoading(false);
        return;
      }
      
      // Modo normal: una sola fecha
      console.log('📅 Cargando pedidos de almuerzo para:', selectedDate);
      console.log('👤 Usuario:', user?.id);
      console.log('🎭 Rol:', role);

      let query = supabase
        .from('lunch_orders')
        .select(`
          *,
          comments,
          chosen_starter,
          chosen_main_course,
          chosen_beverage,
          chosen_dessert,
          school:schools!lunch_orders_school_id_fkey (
            name,
            code
          ),
          student:students (
            full_name,
            photo_url,
            is_temporary,
            temporary_classroom_name,
            school_id,
            free_account
          ),
          teacher:teacher_profiles (
            full_name,
            school_id_1
          ),
          lunch_menus (
            starter,
            main_course,
            beverage,
            dessert,
            notes,
            category_id
          ),
          lunch_order_addons (
            id,
            addon_name,
            addon_price,
            quantity
          )
        `)
        .eq('order_date', selectedDate)
        .eq('is_cancelled', false) // 🚫 SOLO traer los que son explícitamente false
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ ERROR EN QUERY:', error);
        throw error;
      }
      
      console.log('✅ Pedidos cargados:', data?.length || 0);
      console.log('🔍 [DEBUG] Pedidos con is_cancelled:', data?.map(o => ({
        nombre: o.student?.full_name || o.teacher?.full_name || o.manual_name,
        is_cancelled: o.is_cancelled,
        status: o.status
      })));
      
      // DEBUG: Ver qué pedidos tienen menú
      data?.forEach((order, index) => {
        console.log(`Pedido ${index + 1}:`, {
          id: order.id,
          student: order.student?.full_name,
          teacher: order.teacher?.full_name,
          manual_name: order.manual_name,
          menu_id: order.menu_id,
          tiene_menu: !!order.lunch_menus,
          menu: order.lunch_menus
        });
      });
      
      // Cargar categorías para los menús que tengan category_id
      if (data && data.length > 0) {
        const categoryIds = data
          .map(order => order.lunch_menus?.category_id)
          .filter((id): id is string => id !== null && id !== undefined);
        
        if (categoryIds.length > 0) {
          const { data: categories } = await supabase
            .from('lunch_categories')
            .select('id, name, icon')
            .in('id', categoryIds);
          
          // Mapear categorías a los menús
          const categoriesMap = new Map(categories?.map(c => [c.id, c]) || []);
          
          data.forEach(order => {
            if (order.lunch_menus && order.lunch_menus.category_id) {
              const category = categoriesMap.get(order.lunch_menus.category_id);
              if (category) {
                order.lunch_menus.lunch_categories = category;
              }
            }
          });
        }
      }
      
      // 🎫💰 Batch: obtener ticket_codes + payment_status + amount de transacciones asociadas a estos pedidos
      if (data && data.length > 0) {
        try {
          const orderIds = data.map(o => o.id);
          const { data: txData } = await supabase
            .from('transactions')
            .select('metadata, ticket_code, payment_status, payment_method, amount')
            .eq('type', 'purchase')
            .neq('payment_status', 'cancelled')
            .not('metadata', 'is', null);
          
          if (txData) {
            const ticketMap = new Map<string, string>();
            const paymentStatusMap = new Map<string, { status: string; method: string | null }>();
            const amountMap = new Map<string, number>();
            const sourceMap = new Map<string, string>();
            txData.forEach((tx: any) => {
              const lunchOrderId = tx.metadata?.lunch_order_id;
              if (lunchOrderId && orderIds.includes(lunchOrderId)) {
                if (tx.ticket_code) {
                  ticketMap.set(lunchOrderId, tx.ticket_code);
                }
                // Priorizar 'paid' sobre 'pending'
                const existing = paymentStatusMap.get(lunchOrderId);
                if (!existing || tx.payment_status === 'paid') {
                  paymentStatusMap.set(lunchOrderId, { 
                    status: tx.payment_status, 
                    method: tx.payment_method 
                  });
                }
                // Guardar el monto de la transacción (valor absoluto)
                if (tx.amount) {
                  amountMap.set(lunchOrderId, Math.abs(tx.amount));
                }
                // Guardar el source de la transacción
                if (tx.metadata?.source) {
                  sourceMap.set(lunchOrderId, tx.metadata.source);
                }
              }
            });
            
            data.forEach((order: any) => {
              if (ticketMap.has(order.id)) {
                order._ticket_code = ticketMap.get(order.id);
              }
              if (paymentStatusMap.has(order.id)) {
                order._tx_payment_status = paymentStatusMap.get(order.id)!.status;
                order._tx_payment_method = paymentStatusMap.get(order.id)!.method;
              }
              if (sourceMap.has(order.id)) {
                order._tx_source = sourceMap.get(order.id);
              }
              // 💰 Si final_price es 0 o null, usar el monto de la transacción
              if ((!order.final_price || order.final_price === 0) && amountMap.has(order.id)) {
                order.final_price = amountMap.get(order.id);
              }
            });
          }
        } catch (err) {
          console.log('⚠️ No se pudieron obtener ticket_codes/payment_status batch');
        }
      }

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

    // Ya no es necesario filtrar por is_cancelled aquí porque lo hacemos en la query SQL
    // Los pedidos anulados nunca llegan a este punto

    // Filtrar por sede
    if (selectedSchool !== 'all') {
      filtered = filtered.filter(order => {
        // Incluir pedidos de estudiantes de la sede seleccionada
        if (order.student?.school_id === selectedSchool) return true;
        // Incluir pedidos de profesores de la sede seleccionada
        if (order.teacher?.school_id_1 === selectedSchool) return true;
        // ✅ Incluir pedidos manuales (sin crédito) de la sede seleccionada
        if (order.manual_name && order.school_id === selectedSchool) return true;
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
    // Si no hay configuración, usar 9 AM por defecto
    if (!lunchConfig || !lunchConfig.cancellation_deadline_time) {
      const now = new Date();
      const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      const currentHour = peruTime.getHours();
      return currentHour < 9;
    }

    // Usar la configuración de cancellation_deadline_time
    const now = new Date();
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const currentTime = peruTime.getHours() * 60 + peruTime.getMinutes(); // Minutos desde medianoche
    
    // Parsear la hora de la configuración (ej: "09:00:00" -> 540 minutos)
    const [deadlineHour, deadlineMinute] = lunchConfig.cancellation_deadline_time.split(':').map(Number);
    const deadlineTime = deadlineHour * 60 + deadlineMinute;
    
    // Verificar si ya pasó la hora límite
    return currentTime < deadlineTime;
  };

  const getDeadlineTime = () => {
    if (!lunchConfig || !lunchConfig.cancellation_deadline_time) {
      return '9:00 AM';
    }
    const [hour, minute] = lunchConfig.cancellation_deadline_time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
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

  // ========================================
  // FUNCIONES DE CONFIRMACIÓN Y ENTREGA
  // ========================================

  const handleConfirmOrder = async (order: LunchOrder) => {
    try {
      setLoading(true);
      console.log('✅ Confirmando pedido:', order.id);

      // ============================================
      // 🛡️ ANTI-DUPLICADO NIVEL 1: Por metadata.lunch_order_id
      // ============================================
      const { data: existingByMetadata, error: checkError } = await supabase
        .from('transactions')
        .select('id, payment_status, metadata')
        .eq('metadata->>lunch_order_id', order.id)
        .neq('payment_status', 'cancelled');

      if (checkError) {
        console.error('❌ Error verificando transacción existente (metadata):', checkError);
        // No lanzar error - continuar con fallback
      }

      if (existingByMetadata && existingByMetadata.length > 0) {
        const hasPaid = existingByMetadata.some((t: any) => t.payment_status === 'paid');
        console.log('⚠️ [NIVEL 1] Ya existe(n) transacción(es) por metadata:', existingByMetadata.length, 'pagada:', hasPaid);
        
        toast({
          title: hasPaid ? '✅ Pedido ya fue pagado' : '⚠️ Pedido ya tiene transacción',
          description: hasPaid 
            ? 'Este pedido ya fue pagado. Solo se actualizó el estado del pedido.'
            : 'Este pedido ya tiene una transacción registrada. Solo se actualizó el estado.',
        });
        
        // Solo actualizar el status del pedido (no crear transacción)
        const { error: updateError } = await supabase
          .from('lunch_orders')
          .update({ status: 'confirmed' })
          .eq('id', order.id);

        if (updateError) throw updateError;

        fetchOrders();
        return;
      }

      // ============================================
      // 🛡️ ANTI-DUPLICADO NIVEL 2: FALLBACK por descripción + persona + fecha
      // Para transacciones creadas SIN metadata.lunch_order_id (código viejo)
      // ============================================
      console.log('🔍 [NIVEL 2] Buscando duplicado por descripción (fallback para metadata faltante)...');
      
      // Formatear la fecha del pedido como aparece en las descripciones
      const orderDateFormatted = format(new Date(order.order_date + 'T12:00:00'), "d 'de' MMMM", { locale: es });
      console.log('🔍 [NIVEL 2] Buscando "Almuerzo" + "' + orderDateFormatted + '" para', 
        order.teacher_id ? 'teacher:' + order.teacher_id : 'student:' + order.student_id);
      
      let fallbackQuery = supabase
        .from('transactions')
        .select('id, payment_status, description, metadata')
        .eq('type', 'purchase')
        .neq('payment_status', 'cancelled')
        .ilike('description', `%Almuerzo%`);

      if (order.teacher_id) {
        fallbackQuery = fallbackQuery.eq('teacher_id', order.teacher_id);
      } else if (order.student_id) {
        fallbackQuery = fallbackQuery.eq('student_id', order.student_id);
      } else if (order.manual_name) {
        fallbackQuery = fallbackQuery.ilike('manual_client_name', `%${order.manual_name}%`);
      }

      const { data: fallbackResults } = await fallbackQuery;
      
      // Filtrar por fecha en la descripción
      const existingByDescription = fallbackResults?.filter((t: any) => {
        return t.description?.includes(orderDateFormatted);
      }) || [];

      if (existingByDescription.length > 0) {
        const hasPaid = existingByDescription.some((t: any) => t.payment_status === 'paid');
        console.log('⚠️ [NIVEL 2] Encontrada(s) transacción(es) por descripción:', existingByDescription.length, 'pagada:', hasPaid);
        
        // 🔧 BONUS: Actualizar la transacción vieja para que tenga metadata.lunch_order_id
        // Esto evita que el duplicado se repita en futuras confirmaciones
        const txToFix = existingByDescription[0];
        try {
          const updatedMetadata = {
            ...(txToFix.metadata || {}),
            lunch_order_id: order.id,
            order_date: order.order_date,
            fixed_by: 'handleConfirmOrder_fallback',
            fixed_at: new Date().toISOString()
          };
          await supabase
            .from('transactions')
            .update({ metadata: updatedMetadata })
            .eq('id', txToFix.id);
          console.log('✅ [NIVEL 2] Metadata actualizada en transacción vieja:', txToFix.id);
        } catch (fixErr) {
          console.warn('⚠️ [NIVEL 2] No se pudo actualizar metadata:', fixErr);
        }

        toast({
          title: hasPaid ? '✅ Pedido ya fue pagado' : '⚠️ Pedido ya tiene transacción',
          description: hasPaid 
            ? 'Este pedido ya fue pagado. Solo se actualizó el estado.'
            : 'Se detectó una transacción existente (sin metadata). Solo se actualizó el estado.',
        });
        
        // Solo actualizar el status del pedido (no crear transacción)
        const { error: updateError } = await supabase
          .from('lunch_orders')
          .update({ status: 'confirmed' })
          .eq('id', order.id);

        if (updateError) throw updateError;

        fetchOrders();
        return;
      }
      
      console.log('✅ [ANTI-DUPLICADO] No se encontraron duplicados. Procediendo a crear transacción...');

      // Actualizar status a confirmed
      const { error: updateError } = await supabase
        .from('lunch_orders')
        .update({ status: 'confirmed' })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // 🎫 Generar ticket_code
      let ticketCode: string | null = null;
      try {
        const { data: ticketNumber, error: ticketErr } = await supabase
          .rpc('generate_ticket_number', { p_prefix: 'ALM' });
        if (!ticketErr && ticketNumber) {
          ticketCode = ticketNumber;
        }
      } catch (err) {
        console.warn('⚠️ No se pudo generar ticket_code:', err);
      }

      // Crear transacción si es necesario (crédito o pagar luego)
      let needsTransaction = false;
      let transactionData: any = {
        type: 'purchase',
        payment_status: 'pending',
        school_id: order.school_id || order.student?.school_id || order.teacher?.school_id_1,
        created_by: user?.id, // 👤 Registrar quién confirmó
        ticket_code: ticketCode,
        metadata: {
          lunch_order_id: order.id,
          source: 'lunch_orders_confirm',
          order_date: order.order_date,
          order_created_at: order.created_at, // 📅 Fecha original de creación del pedido
        }
      };

      // Determinar si necesita transacción y el monto
      if (order.student_id) {
        // Es estudiante - verificar si tiene cuenta libre
        const { data: studentData } = await supabase
          .from('students')
          .select('free_account, school_id')
          .eq('id', order.student_id)
          .single();

        if (studentData?.free_account === true) {
          needsTransaction = true;
          transactionData.student_id = order.student_id;
          
          // Obtener precio desde categoría o configuración
          const { data: category } = await supabase
            .from('lunch_categories')
            .select('price')
            .eq('id', order.category_id || '')
            .single();
          
          const { data: config } = await supabase
            .from('lunch_configuration')
            .select('lunch_price')
            .eq('school_id', studentData.school_id)
            .single();

          const price = category?.price || config?.lunch_price || 7.50;
          transactionData.amount = -Math.abs(price);
          transactionData.description = `Almuerzo - ${format(new Date(order.order_date), "d 'de' MMMM", { locale: es })}`;
        }
      } else if (order.teacher_id) {
        // Es profesor - siempre crear transacción
        // Primero obtener el school_id del profesor
        const { data: teacherData } = await supabase
          .from('teacher_profiles')
          .select('school_id_1')
          .eq('id', order.teacher_id)
          .single();

        const teacherSchoolId = teacherData?.school_id_1 || order.teacher?.school_id_1 || order.school_id;
        
        needsTransaction = true;
        transactionData.teacher_id = order.teacher_id;
        transactionData.school_id = teacherSchoolId;
        
        // Obtener precio desde categoría o configuración
        const { data: category } = await supabase
          .from('lunch_categories')
          .select('price')
          .eq('id', order.category_id || '')
          .single();
        
        const { data: config } = await supabase
          .from('lunch_configuration')
          .select('lunch_price')
          .eq('school_id', teacherSchoolId || '')
          .single();

        const price = category?.price || config?.lunch_price || 7.50;
        transactionData.amount = -Math.abs(price);
        transactionData.description = `Almuerzo - ${format(new Date(order.order_date), "d 'de' MMMM", { locale: es })}`;
      } else if (order.manual_name) {
        // Cliente manual - verificar si es "pagar luego" o ya pagó
        needsTransaction = true;
        transactionData.manual_client_name = order.manual_name;
        
        const { data: category } = await supabase
          .from('lunch_categories')
          .select('price')
          .eq('id', order.category_id || '')
          .single();

        const price = category?.price || 7.50;
        transactionData.amount = -Math.abs(price);
        transactionData.description = `Almuerzo - ${format(new Date(order.order_date), "d 'de' MMMM", { locale: es })} - ${order.manual_name}`;
        
        // 🔑 Si el pedido YA fue pagado (método != pagar_luego), marcar transacción como paid
        if (order.payment_method && order.payment_method !== 'pagar_luego') {
          transactionData.payment_status = 'paid';
          transactionData.payment_method = order.payment_method;
          console.log(`✅ [handleConfirmOrder] Pedido manual ya pagado con ${order.payment_method}, tx se crea como paid`);
        }
      }

      // Crear transacción si es necesario
      if (needsTransaction) {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert([transactionData]);

        if (transactionError) {
          console.error('⚠️ Error creando transacción:', transactionError);
          // No lanzar error, el pedido ya se confirmó
        } else {
          console.log('✅ Transacción creada para pedido confirmado');
        }
      }

      toast({
        title: '✅ Pedido confirmado',
        description: 'El pedido ha sido confirmado y aparecerá en cobranzas si aplica',
      });

      fetchOrders();
    } catch (error: any) {
      console.error('❌ Error confirmando pedido:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo confirmar el pedido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverOrder = async (order: LunchOrder) => {
    try {
      setLoading(true);
      console.log('📦 Marcando pedido como entregado:', order.id);

      const { error } = await supabase
        .from('lunch_orders')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivered_by: user?.id
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: '✅ Pedido entregado',
        description: 'El pedido ha sido marcado como entregado',
      });

      fetchOrders();
    } catch (error: any) {
      console.error('❌ Error entregando pedido:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo marcar como entregado',
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el estado de deuda
  const getDebtStatus = (order: LunchOrder): { label: string; color: string } => {
    const txStatus = (order as any)._tx_payment_status;
    
    // 🔍 Si hay transacción asociada, SIEMPRE confiar en su estado (es la fuente de verdad)
    if (txStatus) {
      if (txStatus === 'paid') {
        return { label: '✅ Pagado', color: 'bg-green-50 text-green-700 border-green-300' };
      }
      // La transacción dice pending/partial → mostrar como pendiente
      // NO confiar en order.payment_method porque puede estar desactualizado
      if (order.manual_name && order.payment_method === 'pagar_luego') {
        return { label: '💰 Pagar luego', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' };
      }
      return { label: '💳 Crédito (Pendiente)', color: 'bg-blue-50 text-blue-700 border-blue-300' };
    }
    
    // Sin transacción → usar lógica de fallback basada en el pedido
    if (order.manual_name && order.payment_method === 'pagar_luego') {
      return { label: '💰 Pagar luego', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' };
    }
    
    // Cliente manual con pago inmediato y SIN transacción = pagó al momento
    if (order.manual_name && order.payment_method && order.payment_method !== 'pagar_luego') {
      return { label: '✅ Pagado', color: 'bg-green-50 text-green-700 border-green-300' };
    }
    
    // Si es estudiante, verificar tipo de cuenta
    if (order.student_id && order.student) {
      if (order.student.free_account === true) {
        return { label: '💳 Crédito (Pendiente)', color: 'bg-blue-50 text-blue-700 border-blue-300' };
      } else {
        return { label: '✅ Pagado', color: 'bg-green-50 text-green-700 border-green-300' };
      }
    }
    
    // Si es profesor, crédito pendiente
    if (order.teacher_id) {
      return { label: '💳 Crédito (Pendiente)', color: 'bg-blue-50 text-blue-700 border-blue-300' };
    }
    
    return { label: '⏳ Pendiente', color: 'bg-gray-50 text-gray-700 border-gray-300' };
  };

  const handleViewMenu = async (order: LunchOrder) => {
    setSelectedMenuOrder(order);
    // Usar el ticket_code pre-cargado si existe, sino buscar
    const preloadedTicket = (order as any)._ticket_code;
    setSelectedOrderTicketCode(preloadedTicket || null);
    setShowMenuDetails(true);
    
    // 🎫💰 Siempre buscar ticket_code, payment_status, amount y metadata actualizado al abrir detalle
    try {
      const { data: txData } = await supabase
        .from('transactions')
        .select('ticket_code, payment_status, payment_method, amount, metadata, created_by')
        .eq('type', 'purchase')
        .neq('payment_status', 'cancelled')
        .contains('metadata', { lunch_order_id: order.id })
        .limit(1);
      
      if (txData && txData.length > 0) {
        if (txData[0].ticket_code) {
          setSelectedOrderTicketCode(txData[0].ticket_code);
        }
        // Actualizar el estado de pago en tiempo real
        const updatedOrder = { ...order } as any;
        updatedOrder._tx_payment_status = txData[0].payment_status;
        updatedOrder._tx_payment_method = txData[0].payment_method;
        updatedOrder._tx_source = txData[0].metadata?.source || null;
        updatedOrder._tx_created_by = txData[0].created_by || null;
        // 💰 Si final_price es 0 o null, usar el monto de la transacción
        if ((!updatedOrder.final_price || updatedOrder.final_price === 0) && txData[0].amount) {
          updatedOrder.final_price = Math.abs(txData[0].amount);
        }
        setSelectedMenuOrder(updatedOrder);
      }
    } catch (err) {
      console.log('⚠️ No se pudo obtener info de transacción para el pedido:', order.id);
    }
  };

  // ========================================
  // FUNCIONES DE ANULACIÓN DE PEDIDOS
  // ========================================
  
  const handleOpenCancel = async (order: LunchOrder) => {
    console.log('🗑️ [handleOpenCancel] Intentando anular pedido');
    console.log('👤 [handleOpenCancel] Rol del usuario:', role);
    
    // 🔍 Verificar si el pedido tiene transacción PAGADA (para advertencia de reembolso)
    let paymentInfo: typeof cancelOrderPaymentInfo = null;
    try {
      const { data: txData } = await supabase
        .from('transactions')
        .select('id, payment_status, payment_method, amount')
        .eq('metadata->>lunch_order_id', order.id)
        .neq('payment_status', 'cancelled')
        .limit(1);
      
      if (txData && txData.length > 0) {
        const clientName = order.student?.full_name || order.teacher?.full_name || order.manual_name || 'Cliente';
        if (txData[0].payment_status === 'paid') {
          paymentInfo = {
            isPaid: true,
            amount: Math.abs(txData[0].amount),
            paymentMethod: txData[0].payment_method,
            clientName,
          };
          console.log('💰 [handleOpenCancel] Pedido YA PAGADO:', paymentInfo);
        } else {
          paymentInfo = {
            isPaid: false,
            amount: Math.abs(txData[0].amount),
            paymentMethod: null,
            clientName,
          };
          console.log('📋 [handleOpenCancel] Pedido con deuda pendiente');
        }
      } else {
        // Buscar también por campo legacy (sin metadata) - para pedidos viejos
        // Verificar si el lunch_order tiene payment_method != pagar_luego (pagado en persona)
        if (order.payment_method && order.payment_method !== 'pagar_luego') {
          const price = order.final_price || order.base_price || 0;
          paymentInfo = {
            isPaid: true,
            amount: price,
            paymentMethod: order.payment_method,
            clientName: order.student?.full_name || order.teacher?.full_name || order.manual_name || 'Cliente',
          };
          console.log('💰 [handleOpenCancel] Pedido pagado (sin transacción, info de lunch_orders):', paymentInfo);
        }
      }
    } catch (err) {
      console.warn('⚠️ Error verificando estado de pago al abrir anulación:', err);
    }
    
    setCancelOrderPaymentInfo(paymentInfo);
    
    const isCajero = role === 'operador_caja' || role === 'cajero';
    console.log('💼 [handleOpenCancel] ¿Es cajero?:', isCajero);
    
    if (isCajero) {
      // Si es cajero, primero pedir contraseña
      setPendingCancelOrder(order);
      setAdminPassword('');
      setShowPasswordValidation(true);
    } else {
      // Si es admin, ir directo al motivo
      setPendingCancelOrder(order);
      setCancelReason('');
      setShowCancelModal(true);
    }
  };
  
  const handlePasswordValidated = async () => {
    if (!adminPassword.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes ingresar tu contraseña',
      });
      return;
    }
    
    try {
      setCancelling(true);
      
      // Validar contraseña del admin
      const { data, error } = await supabase.rpc('validate_admin_password', {
        p_admin_id: user?.id,
        p_password: adminPassword
      });
      
      if (error) throw error;
      
      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Contraseña incorrecta',
          description: 'La contraseña del administrador no es válida',
        });
        return;
      }
      
      // Si la contraseña es correcta, mostrar modal de motivo
      setShowPasswordValidation(false);
      setAdminPassword('');
      setCancelReason('');
      setShowCancelModal(true);
      
    } catch (error: any) {
      console.error('Error validando contraseña:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo validar la contraseña',
      });
    } finally {
      setCancelling(false);
    }
  };
  
  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes ingresar un motivo de anulación',
      });
      return;
    }
    
    if (!pendingCancelOrder) return;
    
    try {
      setCancelling(true);
      
      console.log('🚫 [ANULAR] Iniciando anulación...');
      console.log('📋 [ANULAR] Pedido completo:', pendingCancelOrder);
      console.log('🆔 [ANULAR] ID del pedido:', pendingCancelOrder.id);
      console.log('👤 [ANULAR] Usuario actual:', user?.id);
      console.log('📝 [ANULAR] Motivo:', cancelReason.trim());
      
      // Anular el pedido
      const { error: updateError } = await supabase
        .from('lunch_orders')
        .update({
          is_cancelled: true,
          cancellation_reason: cancelReason.trim(),
          cancelled_by: user?.id,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', pendingCancelOrder.id);
      
      if (updateError) {
        console.error('❌ [ANULAR] Error al actualizar:', updateError);
        throw updateError;
      }
      
      console.log('✅ [ANULAR] Pedido actualizado en BD');
      
      // 💰 Buscar transacción asociada para CUALQUIER tipo de pedido
      // (crédito, fiado, pago inmediato - estudiante, profesor O manual)
      console.log('💰 Buscando transacción asociada al pedido...');
      console.log('📋 Datos del pedido:', {
        id: pendingCancelOrder.id,
        student_id: pendingCancelOrder.student_id,
        teacher_id: pendingCancelOrder.teacher_id,
        manual_name: pendingCancelOrder.manual_name,
        order_date: pendingCancelOrder.order_date
      });
      
      let cancelledTransactionWasPaid = false;
      let cancelledTransactionAmount = 0;
      let cancelledTransactionMethod: string | null = null;
      
      // 🔍 NIVEL 1: Buscar por metadata.lunch_order_id (más confiable)
      let { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('id, amount, student_id, teacher_id, manual_client_name, description, created_at, metadata, payment_status, payment_method')
        .eq('metadata->>lunch_order_id', pendingCancelOrder.id)
        .in('payment_status', ['pending', 'paid', 'partial']);
      
      // 🔍 NIVEL 2: Si no se encuentra por metadata, buscar por descripción (legacy)
      if (!transactions || transactions.length === 0) {
        console.log('⚠️ No se encontró por lunch_order_id, buscando por descripción...');
        let query = supabase
          .from('transactions')
          .select('id, amount, student_id, teacher_id, manual_client_name, description, created_at, metadata, payment_status, payment_method')
          .eq('type', 'purchase')
          .in('payment_status', ['pending', 'paid', 'partial']);
        
        // Filtrar por student_id, teacher_id o manual_client_name según corresponda
        if (pendingCancelOrder.student_id) {
          query = query.eq('student_id', pendingCancelOrder.student_id);
        } else if (pendingCancelOrder.teacher_id) {
          query = query.eq('teacher_id', pendingCancelOrder.teacher_id);
        } else if (pendingCancelOrder.manual_name) {
          query = query.ilike('manual_client_name', `%${pendingCancelOrder.manual_name}%`);
        }
        
        // Filtrar por fecha del pedido en la descripción
        const orderDateFormatted = format(new Date(pendingCancelOrder.order_date + 'T12:00:00'), "d 'de' MMMM", { locale: es });
        query = query.ilike('description', `%${orderDateFormatted}%`);
        
        const result = await query;
        transactions = result.data;
        transError = result.error;
      }
      
      console.log('🔍 Transacciones encontradas:', transactions?.length || 0);
      
      if (transError) {
        console.error('❌ Error buscando transacción:', transError);
      } else if (transactions && transactions.length > 0) {
        const transaction = transactions[0];
        console.log('✅ Transacción encontrada:', transaction.id, 'estado:', transaction.payment_status);
        
        // Guardar info del pago para el mensaje final
        cancelledTransactionWasPaid = transaction.payment_status === 'paid';
        cancelledTransactionAmount = Math.abs(transaction.amount);
        cancelledTransactionMethod = transaction.payment_method;
        
        // Anular la transacción (cambiar a 'cancelled')
        const { error: cancelTransError } = await supabase
          .from('transactions')
          .update({ 
            payment_status: 'cancelled',
            metadata: {
              ...transaction.metadata,
              cancellation_reason: cancelReason.trim(),
              cancelled_by: user?.id,
              cancelled_at: new Date().toISOString(),
              original_payment_status: transaction.payment_status,
              original_payment_method: transaction.payment_method,
              requires_refund: cancelledTransactionWasPaid, // 🆕 Marcar si requiere reembolso
              refund_amount: cancelledTransactionWasPaid ? cancelledTransactionAmount : 0,
            }
          })
          .eq('id', transaction.id);
        
        if (cancelTransError) {
          console.error('❌ Error anulando transacción:', cancelTransError);
        } else {
          console.log('✅ Transacción cancelada. Era pagada:', cancelledTransactionWasPaid);
        }
      } else {
        console.log('⚠️ No se encontró transacción asociada al pedido');
      }
      
      // 📢 Mostrar mensaje según el tipo de anulación
      const clientName = pendingCancelOrder.student?.full_name || 
                         pendingCancelOrder.teacher?.full_name || 
                         pendingCancelOrder.manual_name || 'Cliente';
      
      if (cancelledTransactionWasPaid) {
        // ⚠️ El pedido ya estaba PAGADO → necesita reembolso manual
        const methodLabel = cancelledTransactionMethod === 'efectivo' ? 'Efectivo' 
          : cancelledTransactionMethod === 'tarjeta' ? 'Tarjeta' 
          : cancelledTransactionMethod === 'yape' ? 'Yape' 
          : cancelledTransactionMethod === 'transferencia' ? 'Transferencia'
          : cancelledTransactionMethod || 'No especificado';
        
        toast({
          title: '⚠️ Pedido anulado - REQUIERE REEMBOLSO',
          description: `Debes devolver S/ ${cancelledTransactionAmount.toFixed(2)} a ${clientName}. Método original: ${methodLabel}`,
          variant: 'destructive',
          duration: 15000, // 15 segundos para que lo lean
        });
      } else if (transactions && transactions.length > 0) {
        // Tenía deuda pendiente → la deuda se elimina automáticamente
        toast({
          title: '✅ Pedido anulado',
          description: `El pedido de ${clientName} ha sido anulado y la deuda pendiente eliminada.`,
        });
      } else {
        // No tenía transacción → solo se anuló el pedido
        toast({
          title: '✅ Pedido anulado',
          description: `El pedido de ${clientName} ha sido anulado correctamente.`,
        });
      }
      
      // Cerrar modales y limpiar estados
      setShowCancelModal(false);
      setCancelReason('');
      setPendingCancelOrder(null);
      setCancelOrderPaymentInfo(null);
      
      console.log('🔄 [ANULAR] Recargando pedidos...');
      // Recargar pedidos
      await fetchOrders();
      console.log('✅ [ANULAR] Pedidos recargados');
      
    } catch (error: any) {
      console.error('💥 [ANULAR] Error fatal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo anular el pedido',
      });
    } finally {
      setCancelling(false);
    }
  };

  // ========================================
  // FUNCIÓN DE EXPORTACIÓN A PDF
  // ========================================
  
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape para más espacio
      
      // Título del documento
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE PEDIDOS DE ALMUERZO', doc.internal.pageSize.width / 2, 15, { align: 'center' });
      
      // Información de filtros
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      let filterText = '';
      if (isDateRangeMode && startDate && endDate) {
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const [ey, em, ed] = endDate.split('-').map(Number);
        filterText = `Período: ${format(new Date(sy, sm - 1, sd), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(ey, em - 1, ed), 'dd/MM/yyyy', { locale: es })}`;
      } else {
        const [y, m, d] = selectedDate.split('-').map(Number);
        filterText = `Fecha: ${format(new Date(y, m - 1, d), 'dd/MM/yyyy', { locale: es })}`;
      }
      
      if (selectedSchool !== 'all') {
        const school = schools.find(s => s.id === selectedSchool);
        filterText += ` | Sede: ${school?.name || 'N/A'}`;
      }
      
      if (selectedStatus !== 'all') {
        const statusLabels: Record<string, string> = {
          confirmed: 'Confirmado',
          delivered: 'Entregado',
          cancelled: 'Anulado',
          postponed: 'Postergado',
          pending_payment: 'Pendiente de pago'
        };
        filterText += ` | Estado: ${statusLabels[selectedStatus] || selectedStatus}`;
      }
      
      doc.text(filterText, 15, 25);
      doc.text(`Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' })}`, 15, 30);
      
      // Preparar datos para la tabla con TODOS los detalles
      const tableData = filteredOrders.map(order => {
        const clientName = order.student?.full_name || order.teacher?.full_name || order.manual_name || 'N/A';
        const schoolName = order.school?.name || (order.student?.school_id ? schools.find(s => s.id === order.student?.school_id)?.name : null) || 'N/A';
        const [oy, om, od] = order.order_date.split('-').map(Number);
        const orderDate = format(new Date(oy, om - 1, od), 'dd/MM/yyyy', { locale: es });
        const orderTime = new Date(order.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
        
        // 📋 Estado del pedido
        const statusLabels: Record<string, string> = {
          pending: 'Pendiente',
          confirmed: 'Confirmado',
          delivered: 'Entregado',
          cancelled: 'Anulado',
          postponed: 'Postergado',
          pending_payment: 'Pend. Pago'
        };
        const status = statusLabels[order.status] || order.status;
        
        // 💰 Estado de pago
        const debtInfo = getDebtStatus(order);
        const paymentStatus = debtInfo.label.replace(/[💰✅💳⏳]/g, '').trim();
        
        // 🍽️ Categoría del menú
        const menuCategory = order.lunch_menus?.lunch_categories?.name || order.lunch_menus?.category_name || 'Menú del día';
        
        // 📊 Cantidad de menús
        const quantity = order.quantity || 1;
        const quantityText = quantity > 1 ? `${quantity}x` : '';
        
        // 🥗 DETALLE DEL MENÚ (entrada, segundo, postre, bebida) - usa chosen_* con fallback al menú default
        let menuDetails = '';
        if (order.lunch_menus || order.chosen_starter || order.chosen_main_course || order.chosen_dessert || order.chosen_beverage) {
          const parts = [];
          const starter = order.chosen_starter || order.lunch_menus?.starter;
          const mainCourse = order.chosen_main_course || order.lunch_menus?.main_course;
          const dessert = order.chosen_dessert || order.lunch_menus?.dessert;
          const beverage = order.chosen_beverage || order.lunch_menus?.beverage;
          if (starter) parts.push(`Entrada: ${starter}`);
          if (mainCourse) parts.push(`Segundo: ${mainCourse}`);
          if (dessert) parts.push(`Postre: ${dessert}`);
          if (beverage) parts.push(`Bebida: ${beverage}`);
          menuDetails = parts.length > 0 ? parts.join(' | ') : '-';
        } else {
          menuDetails = '-';
        }
        
        // 📝 Observaciones (notas del menú + comentarios del pedido)
        const menuNotes = order.lunch_menus?.notes || '';
        const orderComments = order.comments || '';
        const cancellation = order.cancellation_reason || order.postponement_reason || '';
        const notes = [menuNotes, orderComments, cancellation].filter(Boolean).join(' | ') || '-';
        
        // 📱 Origen del pedido (por qué medio lo hizo)
        let origin = 'Desconocido';
        if (order.teacher_id) {
          origin = 'App Profesor';
        } else if (order.student_id) {
          origin = order.student?.is_temporary ? 'Cocina (Cliente temporal)' : 'App Padre';
        } else if (order.manual_name) {
          origin = 'Registro Manual (Admin)';
        }
        
        // 💵 Precio total
        const totalPrice = order.final_price !== null && order.final_price !== undefined
          ? `S/ ${order.final_price.toFixed(2)}`
          : '-';
        
        return [
          clientName,
          schoolName,
          orderDate,
          orderTime,
          `${quantityText} ${menuCategory}`,
          menuDetails,
          notes,
          origin,
          status,
          paymentStatus,
          totalPrice
        ];
      });
      
      // Crear tabla con autoTable
      autoTable(doc, {
        head: [['Cliente', 'Sede', 'Fecha', 'Hora', 'Categoría y Cant.', 'Detalle del Menú', 'Observaciones', 'Origen', 'Estado', 'Pago', 'Total']],
        body: tableData,
        startY: 35,
        styles: {
          fontSize: 6,
          cellPadding: 1.5,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue-600
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // Gray-50
        },
        columnStyles: {
          0: { cellWidth: 28 }, // Cliente
          1: { cellWidth: 22 }, // Sede
          2: { cellWidth: 18 }, // Fecha
          3: { cellWidth: 12 }, // Hora
          4: { cellWidth: 30 }, // Categoría
          5: { cellWidth: 50 }, // Detalle del menú (MÁS IMPORTANTE)
          6: { cellWidth: 25 }, // Observaciones
          7: { cellWidth: 22 }, // Origen
          8: { cellWidth: 18 }, // Estado
          9: { cellWidth: 18 }, // Pago
          10: { cellWidth: 15, halign: 'right' }  // Total
        },
        margin: { left: 10, right: 10 },
      });
      
      // Footer con branding
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text(
          'Este es un reporte interno generado • © 2026 ERP Profesional diseñado por ARQUISIA Soluciones para Maracuyá',
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width - 15,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      }
      
      // Descargar el PDF
      const fileName = isDateRangeMode 
        ? `Pedidos_Almuerzo_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.pdf`
        : `Pedidos_Almuerzo_${selectedDate.replace(/-/g, '')}.pdf`;
      
      doc.save(fileName);
      
      toast({
        title: '✅ PDF generado',
        description: 'El reporte ha sido descargado exitosamente',
      });
    } catch (error: any) {
      console.error('Error generando PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo generar el PDF',
      });
    }
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            Gestión de Pedidos
          </h2>
          <p className="text-xs text-gray-500 hidden sm:block">Gestiona las entregas de almuerzos del día</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToPDF}
          disabled={filteredOrders.length === 0}
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exportar PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            {/* Filtro de Fecha/Rango - ocupa 2 columnas */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">
                Filtro de Fecha
              </label>
              
              {/* Toggle para cambiar entre fecha única y rango */}
              <div className="flex gap-2 mb-2">
                <Button
                  size="sm"
                  variant={!isDateRangeMode ? 'default' : 'outline'}
                  onClick={() => setIsDateRangeMode(false)}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Fecha Única
                </Button>
                <Button
                  size="sm"
                  variant={isDateRangeMode ? 'default' : 'outline'}
                  onClick={() => setIsDateRangeMode(true)}
                  className="flex-1"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Rango de Fechas
                </Button>
              </div>
              
              {/* Inputs según el modo */}
              {!isDateRangeMode ? (
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
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Desde</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sede */}
            {canViewAllSchools && (
              <div className="md:col-span-1">
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
            <div className="md:col-span-1">
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
            <div className="md:col-span-2">
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
                Después de las {getDeadlineTime()} - Solo lectura
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
                  onClick={() => order.lunch_menus && handleViewMenu(order)}
                  className={cn(
                    "p-3 sm:p-4 border rounded-xl transition-colors bg-white shadow-sm",
                    order.lunch_menus && "cursor-pointer hover:bg-blue-50/50 hover:border-blue-300",
                    order.is_cancelled && "opacity-60"
                  )}
                >
                  {/* Fila superior: foto + info + estado */}
                  <div className="flex items-start gap-3">
                    {/* Foto o inicial — más pequeño en móvil */}
                    <div className="relative shrink-0">
                      {order.student?.photo_url ? (
                        <img
                          src={order.student.photo_url}
                          alt={order.student.full_name}
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-blue-200"
                        />
                      ) : (
                        <div className={cn(
                          "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center border-2",
                          order.teacher ? "bg-green-100 border-green-300" : "bg-blue-100 border-blue-200"
                        )}>
                          <span className={cn(
                            "font-bold text-base sm:text-lg",
                            order.teacher ? "text-green-700" : "text-blue-600"
                          )}>
                            {order.student?.full_name[0] || order.teacher?.full_name[0] || order.manual_name?.[0] || '?'}
                          </span>
                        </div>
                      )}
                      {order.student?.is_temporary && (
                        <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-0.5">
                          <UserPlus className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      {order.teacher && (
                        <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-0.5">
                          <span className="text-white text-[9px] font-bold px-0.5">👨‍🏫</span>
                        </div>
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      {/* Nombre */}
                      <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                        {order.student?.full_name || order.teacher?.full_name || order.manual_name || 'Desconocido'}
                      </p>

                      {/* Badges de tipo — solo los más relevantes en móvil */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {order.school && (
                          <span className="text-[10px] sm:text-xs text-purple-600 font-medium">🏫 {order.school.name}</span>
                        )}
                        {order.teacher && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] py-0 px-1.5 h-4">Profe</Badge>
                        )}
                        {order.manual_name && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 px-1.5 h-4">Físico</Badge>
                        )}
                      </div>

                      {order.student?.is_temporary && order.student.temporary_classroom_name && (
                        <p className="text-xs font-medium text-purple-600 mt-0.5">
                          🎫 {order.student.temporary_classroom_name}
                        </p>
                      )}

                      {/* Hora + precio */}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('es-PE', {
                            hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima'
                          })}
                        </p>
                        {order.final_price !== null && order.final_price !== undefined && (
                          <p className="text-xs font-semibold text-green-700">
                            S/ {order.final_price.toFixed(2)}
                          </p>
                        )}
                        {(order as any)._ticket_code && (
                          <p className="text-[10px] font-bold text-indigo-600">
                            🎫 {(order as any)._ticket_code}
                          </p>
                        )}
                      </div>

                      {/* Agregados */}
                      {order.lunch_order_addons && order.lunch_order_addons.length > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          + {order.lunch_order_addons.map((a: any) => a.addon_name).join(', ')}
                        </p>
                      )}

                      {/* 💬 Comentarios del pedido */}
                      {order.comments && (
                        <p className="text-[10px] text-amber-600 mt-0.5 italic">
                          💬 {order.comments}
                        </p>
                      )}
                    </div>

                    {/* Estado — esquina superior derecha */}
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {getStatusBadge(order.status, order.is_no_order_delivery)}
                      {(() => {
                        const debtStatus = getDebtStatus(order);
                        return (
                          <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 h-4", debtStatus.color)}>
                            {debtStatus.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Fila inferior: botones de acción */}
                  {!order.is_cancelled ? (
                    <div
                      className="flex gap-2 mt-2.5 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmOrder(order)}
                          className="h-8 text-xs px-3 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Confirmar
                        </Button>
                      )}
                      {order.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => handleDeliverOrder(order)}
                          className="h-8 text-xs px-3 bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                        >
                          <PackagePlus className="h-3.5 w-3.5 mr-1" />
                          Entregado
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCancel(order)}
                        className="h-8 text-xs px-3 border-red-200 text-red-600 hover:bg-red-50 flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Anular
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="destructive" className="text-xs">❌ ANULADO</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedOrderForAction && (
        <LunchOrderActionsModal
          isOpen={showActionsModal}
          onClose={() => setShowActionsModal(false)}
          order={selectedOrderForAction}
          onSuccess={handleActionComplete}
          canModify={canModifyOrder()}
        />
      )}

      {/* Modal de Detalles del Pedido - REDESIGNED v1.21.2 */}
      {selectedMenuOrder && selectedMenuOrder.lunch_menus && (
        <Dialog open={showMenuDetails} onOpenChange={setShowMenuDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                🍽️ Detalle del Pedido
              </DialogTitle>
              <DialogDescription className="text-base">
                Información completa del pedido de almuerzo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* 1. PARA QUÉ DÍA ES EL PEDIDO */}
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Para el día</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {format(new Date(selectedMenuOrder.order_date + 'T00:00:00'), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                    <Calendar className="h-12 w-12 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              {/* 2. CUÁNDO LO PIDIÓ */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-10 w-10 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Pedido registrado el</p>
                      <p className="text-lg font-bold text-gray-900">
                        {format(new Date(selectedMenuOrder.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2.5 NÚMERO DE COMPROBANTE / TICKET */}
              {selectedOrderTicketCode && (
                <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🎫</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Nº de Comprobante</p>
                        <p className="text-xl font-bold text-amber-800">{selectedOrderTicketCode}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 3. QUIÉN HIZO EL PEDIDO */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
                    👤 Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {selectedMenuOrder.student?.photo_url ? (
                      <img
                        src={selectedMenuOrder.student.photo_url}
                        alt={selectedMenuOrder.student.full_name}
                        className="h-14 w-14 rounded-full object-cover border-2 border-green-300"
                      />
                    ) : (
                      <div className={cn(
                        "h-14 w-14 rounded-full flex items-center justify-center border-2",
                        selectedMenuOrder.teacher ? "bg-green-100 border-green-400" : "bg-blue-100 border-blue-400"
                      )}>
                        <span className="font-bold text-xl">
                          {(selectedMenuOrder.student?.full_name || selectedMenuOrder.teacher?.full_name || selectedMenuOrder.manual_name || '?')[0]}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-900">
                        {selectedMenuOrder.student?.full_name || selectedMenuOrder.teacher?.full_name || selectedMenuOrder.manual_name || 'Desconocido'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {selectedMenuOrder.teacher && (
                          <Badge className="bg-green-600">👨‍🏫 Profesor</Badge>
                        )}
                        {selectedMenuOrder.student && !selectedMenuOrder.student.is_temporary && (
                          <Badge className="bg-blue-600">👨‍🎓 Alumno</Badge>
                        )}
                        {selectedMenuOrder.manual_name && (
                          <Badge className="bg-orange-600">💵 Cliente Manual</Badge>
                        )}
                        {selectedMenuOrder.school && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                            🏫 {selectedMenuOrder.school.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QUIÉN LO CREÓ */}
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">Registrado por</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const source = (selectedMenuOrder as any)?._tx_source;
                        // Priorizar metadata.source de la transacción
                        if (source) {
                          switch (source) {
                            case 'teacher_lunch_calendar':
                              return '✅ El profesor desde su calendario';
                            case 'parent_lunch_calendar':
                              return '✅ El padre desde su calendario';
                            case 'unified_calendar_v2_parent':
                              return '✅ El padre desde el calendario V2';
                            case 'unified_calendar_v2_teacher':
                              return '✅ El profesor desde el calendario V2';
                            case 'order_lunch_menus':
                              return '✅ Desde el calendario de menús';
                            case 'physical_order_wizard':
                            case 'physical_order_wizard_fiado':
                            case 'physical_order_wizard_paid':
                              return '🔧 Registro manual (administrador/cajero)';
                            case 'lunch_orders_confirm':
                              return '🔧 Confirmado por administrador/cajero';
                            case 'lunch_fast':
                              return '⚡ Pedido rápido (padre)';
                            default:
                              return `📋 ${source}`;
                          }
                        }
                        // Fallback: usar created_by del pedido
                        if (selectedMenuOrder.created_by) {
                          if (selectedMenuOrder.teacher_id && selectedMenuOrder.created_by === selectedMenuOrder.teacher_id) {
                            return '✅ El profesor desde su perfil';
                          }
                          if (selectedMenuOrder.student_id && selectedMenuOrder.created_by === (selectedMenuOrder.student as any)?.parent_id) {
                            return '✅ El padre desde su perfil';
                          }
                          return '🔧 Un administrador/cajero';
                        }
                        // Fallback final
                        if (selectedMenuOrder.manual_name) return '🔧 Un cajero (venta manual)';
                        return '⚙️ Sistema';
                      })()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 4. ESTADO DEL PEDIDO (GRANDE Y CLARO) */}
              <Card className={cn(
                "border-2",
                selectedMenuOrder.status === 'delivered' && "bg-green-50 border-green-500",
                selectedMenuOrder.status === 'confirmed' && "bg-blue-50 border-blue-500",
                selectedMenuOrder.status === 'pending' && "bg-yellow-50 border-yellow-500",
                selectedMenuOrder.is_cancelled && "bg-red-50 border-red-500"
              )}>
                <CardContent className="py-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Estado del Pedido</p>
                    <div className="flex items-center justify-center gap-3">
                      {selectedMenuOrder.status === 'delivered' && (
                        <>
                          <CheckCircle2 className="h-10 w-10 text-green-600" />
                          <p className="text-3xl font-bold text-green-700">ENTREGADO</p>
                        </>
                      )}
                      {selectedMenuOrder.status === 'confirmed' && (
                        <>
                          <CheckCircle2 className="h-10 w-10 text-blue-600" />
                          <p className="text-3xl font-bold text-blue-700">CONFIRMADO</p>
                        </>
                      )}
                      {selectedMenuOrder.status === 'pending' && !selectedMenuOrder.is_cancelled && (
                        <>
                          <Clock className="h-10 w-10 text-yellow-600" />
                          <p className="text-3xl font-bold text-yellow-700">PENDIENTE</p>
                        </>
                      )}
                      {selectedMenuOrder.is_cancelled && (
                        <>
                          <XCircle className="h-10 w-10 text-red-600" />
                          <p className="text-3xl font-bold text-red-700">ANULADO</p>
                        </>
                      )}
                    </div>
                    {selectedMenuOrder.delivered_at && (
                      <p className="text-sm text-gray-600 mt-2">
                        Entregado a las {format(new Date(selectedMenuOrder.delivered_at), "HH:mm", { locale: es })}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 5. CANTIDAD DE MENÚS */}
              {selectedMenuOrder.quantity && selectedMenuOrder.quantity > 1 && (
                <Card className="bg-amber-50 border-amber-300">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-amber-900">{selectedMenuOrder.quantity}</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Cantidad de menús</p>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedMenuOrder.quantity} menú{selectedMenuOrder.quantity > 1 ? 's' : ''} pedido{selectedMenuOrder.quantity > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 6. CATEGORÍA */}
              {selectedMenuOrder.lunch_menus.lunch_categories && (
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      {selectedMenuOrder.lunch_menus.lunch_categories.icon && (
                        <span className="text-4xl">{selectedMenuOrder.lunch_menus.lunch_categories.icon}</span>
                      )}
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Categoría</p>
                        <p className="text-xl font-bold text-gray-900">{selectedMenuOrder.lunch_menus.lunch_categories.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 7. MENÚ COMPLETO */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
                    🍽️ Menú del Día
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(selectedMenuOrder.chosen_starter || selectedMenuOrder.lunch_menus?.starter) && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-semibold text-green-700 uppercase">🥗 Entrada</p>
                          {selectedMenuOrder.chosen_starter && selectedMenuOrder.chosen_starter !== selectedMenuOrder.lunch_menus?.starter && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-400 text-green-700 bg-green-100">Alternativa</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{getDisplayValue(selectedMenuOrder.chosen_starter, selectedMenuOrder.lunch_menus?.starter)}</p>
                      </div>
                    )}
                    {(selectedMenuOrder.chosen_main_course || selectedMenuOrder.lunch_menus?.main_course) && (
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-semibold text-orange-700 uppercase">🍽️ Plato Principal</p>
                          {selectedMenuOrder.chosen_main_course && selectedMenuOrder.chosen_main_course !== selectedMenuOrder.lunch_menus?.main_course && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400 text-orange-700 bg-orange-100">Alternativa</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{getDisplayValue(selectedMenuOrder.chosen_main_course, selectedMenuOrder.lunch_menus?.main_course)}</p>
                      </div>
                    )}
                    {(selectedMenuOrder.chosen_beverage || selectedMenuOrder.lunch_menus?.beverage) && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-semibold text-blue-700 uppercase">🥤 Bebida</p>
                          {selectedMenuOrder.chosen_beverage && selectedMenuOrder.chosen_beverage !== selectedMenuOrder.lunch_menus?.beverage && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-700 bg-blue-100">Alternativa</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{getDisplayValue(selectedMenuOrder.chosen_beverage, selectedMenuOrder.lunch_menus?.beverage)}</p>
                      </div>
                    )}
                    {(selectedMenuOrder.chosen_dessert || selectedMenuOrder.lunch_menus?.dessert) && (
                      <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-semibold text-pink-700 uppercase">🍰 Postre</p>
                          {selectedMenuOrder.chosen_dessert && selectedMenuOrder.chosen_dessert !== selectedMenuOrder.lunch_menus?.dessert && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-pink-400 text-pink-700 bg-pink-100">Alternativa</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{getDisplayValue(selectedMenuOrder.chosen_dessert, selectedMenuOrder.lunch_menus?.dessert)}</p>
                      </div>
                    )}
                  </div>
                  {selectedMenuOrder.lunch_menus.notes && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">📝 Notas del Menú</p>
                      <p className="text-sm text-gray-700">{selectedMenuOrder.lunch_menus.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 💬 COMENTARIOS DEL PEDIDO */}
              {selectedMenuOrder.comments && (
                <Card className="bg-amber-50 border-amber-300">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">💬</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Comentarios del Pedido</p>
                        <p className="text-sm text-gray-800">{selectedMenuOrder.comments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 8. ESTADO DE PAGO (SIEMPRE MOSTRAR SI TIENE PRECIO O TX) */}
              {(selectedMenuOrder.payment_method || selectedMenuOrder.final_price || (selectedMenuOrder as any)._tx_payment_status) && (
                <Card className={cn(
                  "border",
                  (selectedMenuOrder as any)._tx_payment_status === 'paid' 
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300" 
                    : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
                      💰 Información de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Estado real basado en la transacción (FUENTE DE VERDAD) */}
                    {(() => {
                      const txStatus = (selectedMenuOrder as any)._tx_payment_status;
                      const txMethod = (selectedMenuOrder as any)._tx_payment_method;
                      const orderMethod = selectedMenuOrder.payment_method;
                      
                      // Helper para mostrar el método de pago
                      const renderMethod = (method: string | null) => {
                        if (!method) return null;
                        const methodMap: Record<string, string> = {
                          'cash': '💵 Efectivo', 'card': '💳 Tarjeta', 'yape': '📱 Yape',
                          'plin': '📱 Plin', 'transfer': '🏦 Transferencia', 'transferencia': '🏦 Transferencia',
                          'efectivo': '💵 Efectivo', 'tarjeta': '💳 Tarjeta',
                          'Efectivo': '💵 Efectivo', 'Tarjeta': '💳 Tarjeta', 'Yape': '📱 Yape',
                        };
                        return methodMap[method] || method;
                      };

                      // CASO 1: Transacción dice PAGADO → mostrar pagado
                      if (txStatus === 'paid') {
                        return (
                          <div>
                            <p className="text-sm text-gray-600">Estado:</p>
                            <Badge className="bg-green-600 text-white mt-1 text-sm px-3 py-1">✅ Pagado</Badge>
                            {(txMethod || orderMethod) && (
                              <p className="text-sm text-gray-600 mt-2">
                                Método: <span className="font-semibold text-gray-900">
                                  {renderMethod(txMethod || orderMethod)}
                                </span>
                              </p>
                            )}
                          </div>
                        );
                      }
                      
                      // CASO 2: Transacción dice PENDIENTE → mostrar pendiente (confiar en la transacción)
                      if (txStatus === 'pending' || txStatus === 'partial') {
                        return (
                          <div>
                            <p className="text-sm text-gray-600">Estado:</p>
                            <Badge className="bg-yellow-600 text-white mt-1">⏳ Pendiente de Pago</Badge>
                            {orderMethod && orderMethod !== 'pagar_luego' && (
                              <p className="text-xs text-orange-600 mt-2">
                                ⚠️ El pedido indica método "{renderMethod(orderMethod)}" pero la transacción no está marcada como pagada
                              </p>
                            )}
                          </div>
                        );
                      }
                      
                      // CASO 3: Sin transacción - usar lógica del pedido
                      if (selectedMenuOrder.manual_name && orderMethod && orderMethod !== 'pagar_luego') {
                        return (
                          <div>
                            <p className="text-sm text-gray-600">Estado:</p>
                            <Badge className="bg-green-600 text-white mt-1">✅ Pagado ({renderMethod(orderMethod)})</Badge>
                          </div>
                        );
                      }
                      
                      if (orderMethod && orderMethod !== 'pagar_luego') {
                        return (
                          <div>
                            <p className="text-sm text-gray-600">Método de Pago:</p>
                            <p className="font-bold text-gray-900 mt-1">{renderMethod(orderMethod)}</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div>
                          <p className="text-sm text-gray-600">Estado:</p>
                          <Badge className="bg-yellow-600 text-white mt-1">⏳ Pendiente de Pago (A Crédito)</Badge>
                        </div>
                      );
                    })()}

                    {selectedMenuOrder.final_price && (
                      <div className="pt-2 border-t border-emerald-200">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span className="text-gray-700">Total:</span>
                          <span className="text-emerald-700">S/ {selectedMenuOrder.final_price.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <Button onClick={() => setShowMenuDetails(false)} size="lg" className="bg-purple-600 hover:bg-purple-700">
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* MODAL: VALIDACIÓN DE CONTRASEÑA (solo para cajeros) */}
      <Dialog open={showPasswordValidation} onOpenChange={setShowPasswordValidation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔐 Autorización Requerida</DialogTitle>
            <DialogDescription>
              Para anular este pedido, necesitas la autorización de un administrador
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Contraseña del Administrador</label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Ingresa la contraseña"
                disabled={cancelling}
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !cancelling) {
                    handlePasswordValidated();
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordValidation(false);
                setAdminPassword('');
                setPendingCancelOrder(null);
              }}
              disabled={cancelling}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePasswordValidated}
              disabled={!adminPassword.trim() || cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                'Validar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* MODAL: MOTIVO DE ANULACIÓN */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Anular Pedido</DialogTitle>
            <DialogDescription>
              Ingresa el motivo por el cual se está anulando este pedido
            </DialogDescription>
          </DialogHeader>
          
          {pendingCancelOrder && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-semibold">
                {pendingCancelOrder.student?.full_name || 
                 pendingCancelOrder.teacher?.full_name || 
                 pendingCancelOrder.manual_name || 
                 'Desconocido'}
              </p>
              <p className="text-xs text-gray-500">
                Pedido del {format(new Date(pendingCancelOrder.order_date + 'T00:00:00'), "dd 'de' MMMM", { locale: es })}
              </p>
            </div>
          )}
          
          {/* ⚠️ Advertencia si el pedido ya fue PAGADO */}
          {cancelOrderPaymentInfo?.isPaid && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-2">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">⚠️</span>
                <div>
                  <p className="font-bold text-red-800 text-sm">¡ATENCIÓN: Este pedido ya fue PAGADO!</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-red-700">
                      💰 Monto: <span className="font-bold">S/ {cancelOrderPaymentInfo.amount.toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-red-700">
                      💳 Método: <span className="font-bold">
                        {cancelOrderPaymentInfo.paymentMethod === 'efectivo' ? 'Efectivo' 
                          : cancelOrderPaymentInfo.paymentMethod === 'tarjeta' ? 'Tarjeta' 
                          : cancelOrderPaymentInfo.paymentMethod === 'yape' ? 'Yape' 
                          : cancelOrderPaymentInfo.paymentMethod === 'transferencia' ? 'Transferencia'
                          : cancelOrderPaymentInfo.paymentMethod || 'No especificado'}
                      </span>
                    </p>
                    <p className="text-sm text-red-700">
                      👤 Cliente: <span className="font-bold">{cancelOrderPaymentInfo.clientName}</span>
                    </p>
                  </div>
                  <p className="text-sm font-bold text-red-900 mt-3 bg-red-100 p-2 rounded">
                    🔄 Al anular, deberás devolver S/ {cancelOrderPaymentInfo.amount.toFixed(2)} manualmente al cliente.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Motivo de Anulación *</label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Pedido duplicado, error en el registro, etc."
                disabled={cancelling}
                className="mt-2"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {cancelReason.length}/200 caracteres
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
                setPendingCancelOrder(null);
                setCancelOrderPaymentInfo(null);
              }}
              disabled={cancelling}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={!cancelReason.trim() || cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anulando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Confirmar Anulación
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
