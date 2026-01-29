import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  UtensilsCrossed,
  Loader2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ParentLunchOrdersProps {
  parentId: string;
}

interface LunchOrder {
  id: string;
  order_date: string;
  status: string;
  ordered_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  postponed_at: string | null;
  cancellation_reason: string | null;
  postponement_reason: string | null;
  is_no_order_delivery: boolean;
  student: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
}

export function ParentLunchOrders({ parentId }: ParentLunchOrdersProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<LunchOrder[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (parentId) {
      fetchOrders();
    }
  }, [parentId, filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('📅 Cargando pedidos de almuerzo del padre...');

      // Obtener IDs de los hijos del padre
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('parent_id', parentId)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Obtener pedidos de almuerzo
      let query = supabase
        .from('lunch_orders')
        .select(`
          id,
          order_date,
          status,
          ordered_at,
          delivered_at,
          cancelled_at,
          postponed_at,
          cancellation_reason,
          postponement_reason,
          is_no_order_delivery,
          student:students!lunch_orders_student_id_fkey (
            id,
            full_name,
            photo_url
          )
        `)
        .in('student_id', studentIds)
        .order('order_date', { ascending: false });

      // Aplicar filtros
      const today = new Date().toISOString().split('T')[0];
      if (filter === 'upcoming') {
        query = query.gte('order_date', today);
      } else if (filter === 'past') {
        query = query.lt('order_date', today);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      setOrders(data || []);
      console.log('✅ Pedidos cargados:', data?.length);
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

  const getStatusBadge = (status: string, isNoOrderDelivery: boolean) => {
    if (isNoOrderDelivery) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Entregado sin pedido
        </Badge>
      );
    }

    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Confirmado
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Entregado
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Anulado
          </Badge>
        );
      case 'postponed':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Postergado
          </Badge>
        );
      case 'pending_payment':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendiente de pago
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Mis Pedidos de Almuerzo
            </CardTitle>
            <CardDescription>
              Historial de pedidos realizados para tus hijos
            </CardDescription>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setFilter('upcoming')}
            >
              Próximos
            </Button>
            <Button
              size="sm"
              variant={filter === 'past' ? 'default' : 'outline'}
              onClick={() => setFilter('past')}
            >
              Pasados
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold mb-2">No hay pedidos</p>
            <p className="text-sm">
              {filter === 'upcoming' 
                ? 'No tienes pedidos próximos.' 
                : filter === 'past'
                ? 'No tienes pedidos pasados.'
                : 'Aún no has realizado ningún pedido de almuerzo.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Foto del estudiante */}
                  <div>
                    {order.student.photo_url ? (
                      <img
                        src={order.student.photo_url}
                        alt={order.student.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-lg">
                          {order.student.full_name[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info del pedido */}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {order.student.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(order.order_date), "EEEE, d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-xs text-gray-400">
                      Pedido el {format(new Date(order.ordered_at), "d 'de' MMM 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>

                  {/* Estado */}
                  <div>
                    {getStatusBadge(order.status, order.is_no_order_delivery)}
                  </div>
                </div>

                {/* Detalles adicionales */}
                {(order.cancellation_reason || order.postponement_reason) && (
                  <div className="ml-4 text-xs text-gray-500 max-w-xs">
                    {order.cancellation_reason && (
                      <p>
                        <span className="font-semibold">Motivo de anulación:</span> {order.cancellation_reason}
                      </p>
                    )}
                    {order.postponement_reason && (
                      <p>
                        <span className="font-semibold">Motivo de postergación:</span> {order.postponement_reason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Nota informativa */}
        {orders.some(o => o.is_no_order_delivery) && (
          <div className="mt-4 bg-orange-50 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-1">Almuerzos entregados sin pedido previo</p>
              <p>
                Algunos almuerzos fueron entregados sin que hayas hecho un pedido anticipado. 
                Esto genera una deuda automática en la cuenta de tu hijo que puedes ver en la pestaña "Pagos".
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
