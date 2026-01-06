import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  MapPin, 
  CheckCircle2, 
  RefreshCw,
  Search,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ErrorLog {
  id: string;
  user_email: string;
  user_role: string;
  error_type: string;
  error_message: string;
  error_translated: string;
  page_url: string;
  component: string;
  action: string;
  created_at: string;
  is_resolved: boolean;
}

interface ErrorStatistic {
  error_type: string;
  total_count: number;
  affected_users: number;
  last_occurrence: string;
}

interface ErrorHotspot {
  page_url: string;
  component: string;
  error_count: number;
  affected_users: number;
  error_types: string[];
}

interface FrequentError {
  error_message: string;
  error_translated: string;
  occurrences: number;
  affected_users: number;
  last_seen: string;
  page_url: string;
  component: string;
}

export default function ErrorDashboard() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<ErrorStatistic[]>([]);
  const [hotspots, setHotspots] = useState<ErrorHotspot[]>([]);
  const [frequentErrors, setFrequentErrors] = useState<FrequentError[]>([]);
  const [recentErrors, setRecentErrors] = useState<ErrorLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchErrorData();
  }, []);

  const fetchErrorData = async () => {
    setLoading(true);
    try {
      // Estadísticas generales
      const { data: stats } = await supabase
        .from('error_statistics')
        .select('*');
      
      if (stats) setStatistics(stats);

      // Puntos de bloqueo (hotspots)
      const { data: spots } = await supabase
        .from('error_hotspots')
        .select('*');
      
      if (spots) setHotspots(spots);

      // Errores más frecuentes
      const { data: frequent } = await supabase
        .from('most_frequent_errors')
        .select('*');
      
      if (frequent) setFrequentErrors(frequent);

      // Errores recientes (últimos 50)
      const { data: recent } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (recent) setRecentErrors(recent);

    } catch (error) {
      console.error('Error fetching error data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsResolved = async (errorId: string) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', errorId);

      if (!error) {
        fetchErrorData();
      }
    } catch (error) {
      console.error('Error marking as resolved:', error);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Fecha', 'Usuario', 'Tipo', 'Mensaje', 'Página', 'Componente', 'Resuelto'].join(','),
      ...recentErrors.map(e => [
        format(new Date(e.created_at), 'dd/MM/yyyy HH:mm'),
        e.user_email,
        e.error_type,
        `"${e.error_translated}"`,
        e.page_url,
        e.component || 'N/A',
        e.is_resolved ? 'Sí' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errores-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const filteredErrors = recentErrors.filter(error => {
    const matchesSearch = 
      error.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.page_url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || error.error_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getErrorTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      auth: 'bg-yellow-100 text-yellow-800',
      database: 'bg-red-100 text-red-800',
      validation: 'bg-orange-100 text-orange-800',
      network: 'bg-blue-100 text-blue-800',
      permission: 'bg-purple-100 text-purple-800',
      unknown: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.unknown;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Dashboard de Errores</h2>
          <p className="text-muted-foreground">Análisis y monitoreo de errores del sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchErrorData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Errores (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statistics.reduce((acc, s) => acc + s.total_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{statistics.filter(s => s.avg_hours_ago < 24).length} últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuarios Afectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-orange-600" />
              {statistics.reduce((acc, s) => acc + s.affected_users, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Usuarios únicos con errores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Puntos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-red-600" />
              {hotspots.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Páginas con más errores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Resolución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              {((recentErrors.filter(e => e.is_resolved).length / recentErrors.length) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Errores resueltos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Errores por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Distribución de Errores por Tipo
          </CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.map((stat) => (
              <div key={stat.error_type} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Badge className={getErrorTypeColor(stat.error_type)}>
                    {stat.error_type.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{
                          width: `${(stat.total_count / Math.max(...statistics.map(s => s.total_count))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-bold">{stat.total_count}</div>
                  <div className="text-xs text-muted-foreground">
                    {stat.affected_users} usuarios
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Puntos de Bloqueo (Hotspots) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            Puntos de Bloqueo (Últimos 7 días)
          </CardTitle>
          <CardDescription>Páginas donde los usuarios encuentran más errores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {hotspots.slice(0, 5).map((spot, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{spot.page_url}</h4>
                    {spot.component && (
                      <p className="text-xs text-muted-foreground">Componente: {spot.component}</p>
                    )}
                  </div>
                  <Badge variant="destructive" className="ml-2">
                    {spot.error_count} errores
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {spot.error_types.map((type, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {spot.affected_users} usuarios afectados
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Errores Más Frecuentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Errores Más Frecuentes
          </CardTitle>
          <CardDescription>Top 10 errores de la última semana</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {frequentErrors.slice(0, 10).map((error, index) => (
              <div key={index} className="border-l-4 border-orange-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{error.error_translated}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {error.page_url} {error.component && `• ${error.component}`}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <Badge variant="secondary">{error.occurrences}x</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {error.affected_users} usuarios
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historial de Errores Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial de Errores
          </CardTitle>
          <CardDescription>Últimos 50 errores registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por mensaje, usuario o página..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">Todos los tipos</option>
              <option value="auth">Autenticación</option>
              <option value="database">Base de datos</option>
              <option value="validation">Validación</option>
              <option value="network">Red</option>
              <option value="permission">Permisos</option>
              <option value="unknown">Desconocido</option>
            </select>
          </div>

          {/* Tabla de errores */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredErrors.map((error) => (
              <div
                key={error.id}
                className={`border rounded-lg p-3 ${error.is_resolved ? 'opacity-50 bg-green-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getErrorTypeColor(error.error_type)}>
                        {error.error_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(error.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {error.user_email}
                      </span>
                      {error.is_resolved && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          ✓ Resuelto
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm">{error.error_translated}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {error.page_url} {error.component && `• ${error.component}`}
                      {error.action && ` • ${error.action}`}
                    </p>
                  </div>
                  {!error.is_resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsResolved(error.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Resolver
                    </Button>
                  )}
                </div>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Ver error técnico
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                    {error.error_message}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

