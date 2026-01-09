import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Calendar,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaymentStats {
  total_amount: number;
  total_transactions: number;
  approved_amount: number;
  approved_count: number;
  pending_amount: number;
  pending_count: number;
  rejected_amount: number;
  rejected_count: number;
}

interface RecentTransaction {
  id: string;
  amount: number;
  status: string;
  payment_gateway: string;
  payment_method: string;
  created_at: string;
  parent_email?: string;
  student_name?: string;
}

export function PaymentStatistics() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7'); // días
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
    fetchRecentTransactions();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from('payment_transactions')
        .select('amount, status')
        .gte('created_at', daysAgo.toISOString());

      if (error) throw error;

      const stats: PaymentStats = {
        total_amount: 0,
        total_transactions: data?.length || 0,
        approved_amount: 0,
        approved_count: 0,
        pending_amount: 0,
        pending_count: 0,
        rejected_amount: 0,
        rejected_count: 0,
      };

      data?.forEach((tx) => {
        stats.total_amount += parseFloat(tx.amount.toString());
        if (tx.status === 'approved') {
          stats.approved_amount += parseFloat(tx.amount.toString());
          stats.approved_count++;
        } else if (tx.status === 'pending' || tx.status === 'processing') {
          stats.pending_amount += parseFloat(tx.amount.toString());
          stats.pending_count++;
        } else if (tx.status === 'rejected' || tx.status === 'cancelled') {
          stats.rejected_amount += parseFloat(tx.amount.toString());
          stats.rejected_count++;
        }
      });

      setStats(stats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          id,
          amount,
          status,
          payment_gateway,
          payment_method,
          created_at,
          user_id,
          student_id
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      approved: 'Aprobado',
      pending: 'Pendiente',
      processing: 'Procesando',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
      expired: 'Expirado',
    };
    return labels[status] || status;
  };

  const getGatewayLabel = (gateway: string) => {
    const labels: Record<string, string> = {
      niubiz: 'Niubiz (Visa)',
      izipay: 'Izipay',
      culqi: 'Culqi',
      mercadopago: 'Mercado Pago',
      manual: 'Manual',
    };
    return labels[gateway] || gateway;
  };

  const exportToCSV = () => {
    if (!recentTransactions.length) return;

    const headers = ['Fecha', 'Monto', 'Estado', 'Pasarela', 'Método'];
    const rows = recentTransactions.map((tx) => [
      new Date(tx.created_at).toLocaleString('es-PE'),
      `S/ ${tx.amount.toFixed(2)}`,
      getStatusLabel(tx.status),
      getGatewayLabel(tx.payment_gateway),
      tx.payment_method || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: '✅ Exportado',
      description: 'Archivo CSV descargado exitosamente',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de rango de tiempo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="365">Último año</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Procesado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">S/ {stats?.total_amount.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.total_transactions || 0} transacciones
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              ✅ Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-900">
                  S/ {stats?.approved_amount.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-green-700">
                  {stats?.approved_count || 0} pagos exitosos
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">
              ⏳ Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-900">
                  S/ {stats?.pending_amount.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-yellow-700">
                  {stats?.pending_count || 0} en proceso
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              ❌ Rechazados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-900">
                  S/ {stats?.rejected_amount.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-red-700">
                  {stats?.rejected_count || 0} fallidos
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transacciones recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
          <CardDescription>Últimas 10 transacciones procesadas</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay transacciones aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(tx.status)}
                    <div>
                      <p className="font-medium">S/ {tx.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{getGatewayLabel(tx.payment_gateway)}</p>
                    <p className="text-xs text-muted-foreground">{getStatusLabel(tx.status)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

