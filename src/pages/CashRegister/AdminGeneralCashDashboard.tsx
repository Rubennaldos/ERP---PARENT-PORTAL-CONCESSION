import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SchoolCashSummary {
  school_id: string;
  school_name: string;
  school_code: string;
  // Estado de caja hoy
  register_id: string | null;
  register_status: 'open' | 'closed' | 'never_opened';
  opened_at: string | null;
  opened_by_name: string | null;
  initial_amount: number;
  // Último cierre
  last_closure_date: string | null;
  last_closure_actual: number | null;
  last_closure_difference: number | null;
  // Ventas del día (calculadas desde closure o en tiempo real)
  today_sales: number;
  today_cash: number;
  today_card: number;
  today_yape: number;
  today_credit: number;
  // Caja sin cerrar de día anterior
  has_unclosed_previous: boolean;
}

export default function AdminGeneralCashDashboard() {
  const [schools, setSchools] = useState<SchoolCashSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // 1. Obtener todas las sedes
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name, code')
        .order('name');

      if (!schoolsData) { setLoading(false); return; }

      // 2. Para cada sede, obtener estado de caja
      const summaries: SchoolCashSummary[] = await Promise.all(
        schoolsData.map(async (school) => {
          // Caja abierta hoy
          const { data: openReg } = await supabase
            .from('cash_registers')
            .select('id, status, opened_at, initial_amount, opened_by')
            .eq('school_id', school.id)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Detectar si hay caja sin cerrar de día anterior
          let hasPrevUnclosed = false;
          if (openReg) {
            const openedDate = new Date(openReg.opened_at);
            openedDate.setHours(0, 0, 0, 0);
            if (openedDate < today) {
              hasPrevUnclosed = true;
            }
          }

          // Nombre del cajero que abrió
          let openedByName: string | null = null;
          if (openReg?.opened_by && !hasPrevUnclosed) {
            const { data: opener } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', openReg.opened_by)
              .single();
            openedByName = opener?.full_name || opener?.email || 'Desconocido';
          }

          // Último cierre registrado
          const { data: lastClosure } = await supabase
            .from('cash_closures')
            .select('closure_date, actual_final, difference, total_sales, total_cash, total_card, total_yape, total_credit')
            .eq('school_id', school.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Totales del día (si hay caja abierta hoy)
          let todaySales = 0, todayCash = 0, todayCard = 0, todayYape = 0, todayCredit = 0;
          const todayOpenReg = openReg && !hasPrevUnclosed ? openReg : null;

          if (todayOpenReg) {
            try {
              const { data: totals } = await supabase.rpc('calculate_daily_totals', {
                p_school_id: school.id,
                p_date: format(today, 'yyyy-MM-dd'),
              });
              if (totals) {
                todaySales = (totals.pos?.total || 0) + (totals.lunch?.total || 0);
                todayCash = (totals.pos?.cash || 0) + (totals.pos?.mixed_cash || 0) + (totals.lunch?.cash || 0);
                todayCard = (totals.pos?.card || 0) + (totals.pos?.mixed_card || 0) + (totals.lunch?.card || 0);
                todayYape = (totals.pos?.yape || 0) + (totals.pos?.mixed_yape || 0) + (totals.lunch?.yape || 0);
                todayCredit = (totals.pos?.credit || 0) + (totals.lunch?.credit || 0);
              }
            } catch (_) {}
          }

          const status: 'open' | 'closed' | 'never_opened' =
            todayOpenReg
              ? 'open'
              : lastClosure?.closure_date === format(today, 'yyyy-MM-dd')
                ? 'closed'
                : 'never_opened';

          return {
            school_id: school.id,
            school_name: school.name,
            school_code: school.code,
            register_id: todayOpenReg?.id || null,
            register_status: status,
            opened_at: todayOpenReg?.opened_at || null,
            opened_by_name: openedByName,
            initial_amount: todayOpenReg?.initial_amount || 0,
            last_closure_date: lastClosure?.closure_date || null,
            last_closure_actual: lastClosure?.actual_final || null,
            last_closure_difference: lastClosure?.difference || null,
            today_sales: todaySales,
            today_cash: todayCash,
            today_card: todayCard,
            today_yape: todayYape,
            today_credit: todayCredit,
            has_unclosed_previous: hasPrevUnclosed,
          };
        })
      );

      setSchools(summaries);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error cargando dashboard de caja:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openCount    = schools.filter(s => s.register_status === 'open').length;
  const closedCount  = schools.filter(s => s.register_status === 'closed').length;
  const problemCount = schools.filter(s => s.has_unclosed_previous || s.register_status === 'never_opened').length;
  const totalSales   = schools.reduce((acc, s) => acc + s.today_sales, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Cargando estado de cajas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => window.location.href = '/#/dashboard'} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-black">💰 Control de Cajas — Todas las Sedes</h1>
            <p className="text-sm text-muted-foreground">
              Actualizado {format(lastRefresh, "HH:mm:ss", { locale: es })}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </Button>
      </div>

      {/* Cards resumen ejecutivo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium uppercase">Cajas Abiertas</p>
                <p className="text-3xl font-black text-green-700">{openCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium uppercase">Cajas Cerradas Hoy</p>
                <p className="text-3xl font-black text-gray-700">{closedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={problemCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100'}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase ${problemCount > 0 ? 'text-red-700' : 'text-gray-600'}`}>
                  Con Problemas
                </p>
                <p className={`text-3xl font-black ${problemCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                  {problemCount}
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${problemCount > 0 ? 'text-red-500' : 'text-gray-300'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium uppercase">Ventas Hoy (Total)</p>
                <p className="text-2xl font-black text-blue-700">S/ {totalSales.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de sedes */}
      <div className="space-y-3">
        {schools.map((school) => {
          const isExpanded = expandedSchool === school.school_id;
          const diff = school.last_closure_difference ?? 0;

          return (
            <Card
              key={school.school_id}
              className={`border-2 transition-all ${
                school.has_unclosed_previous
                  ? 'border-red-400 bg-red-50'
                  : school.register_status === 'open'
                    ? 'border-green-300'
                    : school.register_status === 'never_opened'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-200'
              }`}
            >
              {/* Fila principal */}
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Icono + nombre */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      school.register_status === 'open' ? 'bg-green-100' :
                      school.has_unclosed_previous ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <Building2 className={`h-5 w-5 ${
                        school.register_status === 'open' ? 'text-green-600' :
                        school.has_unclosed_previous ? 'text-red-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-base truncate">{school.school_name}</p>
                      <p className="text-xs text-gray-500">{school.school_code}</p>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex items-center gap-3 shrink-0">
                    {school.has_unclosed_previous ? (
                      <Badge className="bg-red-100 text-red-800 border-red-300">
                        ⚠️ Sin cerrar (día anterior)
                      </Badge>
                    ) : school.register_status === 'open' ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        🟢 Abierta
                      </Badge>
                    ) : school.register_status === 'closed' ? (
                      <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                        🔒 Cerrada hoy
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                        ⏸️ Sin aperturar
                      </Badge>
                    )}

                    {/* Ventas del día */}
                    {school.today_sales > 0 && (
                      <span className="text-sm font-bold text-emerald-700">
                        S/ {school.today_sales.toFixed(2)}
                      </span>
                    )}

                    {/* Diferencia del último cierre */}
                    {school.register_status === 'closed' && school.last_closure_difference !== null && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        Math.abs(diff) < 0.01
                          ? 'bg-green-100 text-green-700'
                          : diff < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {Math.abs(diff) < 0.01 ? '✅ Sin diferencia' : diff < 0 ? `⚠️ Faltante S/ ${Math.abs(diff).toFixed(2)}` : `⚠️ Sobrante S/ ${diff.toFixed(2)}`}
                      </span>
                    )}

                    {/* Expandir */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedSchool(isExpanded ? null : school.school_id)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Info apertura */}
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-700 flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Apertura de hoy
                      </p>
                      {school.register_status === 'open' ? (
                        <div className="bg-green-50 rounded-lg p-3 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Hora apertura:</span>
                            <span className="font-medium">
                              {school.opened_at
                                ? format(new Date(school.opened_at), 'HH:mm', { locale: es })
                                : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Abrió:</span>
                            <span className="font-medium flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {school.opened_by_name || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monto declarado:</span>
                            <span className="font-bold text-green-700">S/ {school.initial_amount.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic text-xs">
                          {school.register_status === 'closed'
                            ? 'Caja ya cerrada'
                            : 'No se ha abierto caja hoy'}
                        </p>
                      )}
                    </div>

                    {/* Ventas del día desglosadas */}
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-700 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> Ventas de hoy
                      </p>
                      {school.today_sales > 0 ? (
                        <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                          {school.today_cash > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">💵 Efectivo:</span>
                              <span className="font-medium text-green-700">S/ {school.today_cash.toFixed(2)}</span>
                            </div>
                          )}
                          {school.today_card > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">💳 Tarjeta:</span>
                              <span className="font-medium text-blue-700">S/ {school.today_card.toFixed(2)}</span>
                            </div>
                          )}
                          {school.today_yape > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">📱 Yape:</span>
                              <span className="font-medium text-purple-700">S/ {school.today_yape.toFixed(2)}</span>
                            </div>
                          )}
                          {school.today_credit > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">📋 Crédito:</span>
                              <span className="font-medium text-amber-700">S/ {school.today_credit.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-1 mt-1">
                            <span className="font-bold">Total:</span>
                            <span className="font-black text-blue-800">S/ {school.today_sales.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic text-xs">Sin ventas registradas hoy</p>
                      )}
                    </div>

                    {/* Último cierre */}
                    {school.last_closure_date && (
                      <div className="md:col-span-2 space-y-1">
                        <p className="font-semibold text-gray-700 text-xs uppercase">Último cierre registrado</p>
                        <div className="bg-gray-50 rounded-lg p-3 flex flex-wrap gap-4 text-sm">
                          <span>
                            📅 Fecha:{' '}
                            <strong>
                              {format(new Date(school.last_closure_date + 'T12:00:00'), "dd MMM yyyy", { locale: es })}
                            </strong>
                          </span>
                          {school.last_closure_actual !== null && (
                            <span>
                              💰 Cerró con: <strong>S/ {school.last_closure_actual.toFixed(2)}</strong>
                            </span>
                          )}
                          {school.last_closure_difference !== null && (
                            <span className={Math.abs(school.last_closure_difference) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                              {Math.abs(school.last_closure_difference) < 0.01
                                ? '✅ Sin diferencia'
                                : `⚠️ Diferencia: S/ ${school.last_closure_difference.toFixed(2)}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {schools.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No hay sedes registradas en el sistema.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
