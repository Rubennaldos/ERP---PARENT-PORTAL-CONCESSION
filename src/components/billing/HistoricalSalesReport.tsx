import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  History, Search, RefreshCw, CalendarDays,
  Loader2, User, School, Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoricalSale {
  id: string;
  student_id: string;
  school_id: string;
  amount: number;
  description: string;
  ticket_code: string | null;
  payment_status: string;
  created_at: string;
  metadata: any;
  student_name: string;
  school_name: string;
}

interface SchoolOption { id: string; name: string; }

export const HistoricalSalesReport = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const canViewAll = role === 'admin_general' || role === 'superadmin';

  const [sales, setSales] = useState<HistoricalSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSchoolId, setUserSchoolId] = useState<string | null | undefined>(undefined);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState({ count: 0, total: 0, pending: 0, paid: 0 });

  useEffect(() => {
    initSchool();
    if (canViewAll) fetchSchools();
  }, [user]);

  useEffect(() => {
    if (userSchoolId !== undefined) fetchSales();
  }, [userSchoolId, selectedSchool, dateFrom, dateTo]);

  const initSchool = async () => {
    if (!user) return;
    if (canViewAll) { setUserSchoolId(null); return; }
    const { data } = await supabase.from('profiles').select('school_id').eq('id', user!.id).single();
    setUserSchoolId(data?.school_id || null);
  };

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name');
    setSchools(data || []);
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('id, student_id, school_id, amount, description, ticket_code, payment_status, created_at, metadata')
        .eq('type', 'purchase')
        .eq('metadata->>source', 'historical_kiosk_entry')
        .order('created_at', { ascending: false })
        .limit(300);

      // Filtro sede
      const schoolFilter = canViewAll ? (selectedSchool !== 'all' ? selectedSchool : null) : userSchoolId;
      if (schoolFilter) query = query.eq('school_id', schoolFilter);

      // Filtro fechas (por fecha de venta real en metadata)
      if (dateFrom) query = query.gte('metadata->>sale_date', dateFrom);
      if (dateTo) query = query.lte('metadata->>sale_date', dateTo);

      const { data: txs, error } = await query;
      if (error) throw error;
      if (!txs?.length) { setSales([]); setSummary({ count: 0, total: 0, pending: 0, paid: 0 }); return; }

      // Enriquecer con nombre del alumno y sede
      const studentIds = [...new Set(txs.map(t => t.student_id))];
      const schoolIds = [...new Set(txs.map(t => t.school_id).filter(Boolean))];

      const [{ data: studs }, { data: schoolsData }] = await Promise.all([
        supabase.from('students').select('id, full_name').in('id', studentIds),
        supabase.from('schools').select('id, name').in('id', schoolIds),
      ]);

      const studMap = Object.fromEntries((studs || []).map(s => [s.id, s.full_name]));
      const schoolMap = Object.fromEntries((schoolsData || []).map(s => [s.id, s.name]));

      const enriched: HistoricalSale[] = txs.map(t => ({
        ...t,
        amount: Math.abs(t.amount),
        student_name: studMap[t.student_id] || 'Alumno desconocido',
        school_name: t.school_id ? (schoolMap[t.school_id] || 'Sede desconocida') : '—',
      }));

      setSales(enriched);
      setSummary({
        count: enriched.length,
        total: enriched.reduce((s, t) => s + t.amount, 0),
        pending: enriched.filter(t => t.payment_status === 'pending').length,
        paid: enriched.filter(t => t.payment_status === 'paid').length,
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = sales.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.student_name.toLowerCase().includes(q) || (s.ticket_code || '').toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const formatSaleDate = (metadata: any) => {
    const d = metadata?.sale_date;
    if (!d) return '—';
    return format(new Date(d + 'T12:00:00'), "d 'de' MMM yyyy", { locale: es });
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-xl">
          <History className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Ventas Históricas del Kiosco</h3>
          <p className="text-xs text-slate-500">Ventas ingresadas manualmente con fecha pasada</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchSales} disabled={loading} className="ml-auto gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total ventas', value: summary.count, color: 'bg-amber-50 border-amber-200 text-amber-800' },
          { label: 'Monto total', value: `S/ ${summary.total.toFixed(2)}`, color: 'bg-slate-50 border-slate-200 text-slate-800' },
          { label: 'Pendientes de pago', value: summary.pending, color: 'bg-red-50 border-red-200 text-red-800' },
          { label: 'Pagadas', value: summary.paid, color: 'bg-green-50 border-green-200 text-green-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
            <p className="text-[10px] uppercase font-semibold opacity-70">{s.label}</p>
            <p className="text-xl font-black mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar alumno, ticket..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Fecha real:</span>
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white min-w-[130px]"
          placeholder="Desde"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white min-w-[130px]"
          placeholder="Hasta"
        />
        {canViewAll && (
          <select
            value={selectedSchool}
            onChange={e => setSelectedSchool(e.target.value)}
            className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white min-w-[140px]"
          >
            <option value="all">Todas las sedes</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {(search || dateFrom || dateTo) && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }} className="h-9 text-slate-500">
            Limpiar
          </Button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No se encontraron ventas históricas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(sale => (
            <div key={sale.id} className="bg-white border border-amber-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow">
              {/* Ícono */}
              <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <History className="h-4 w-4 text-amber-600" />
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-800 truncate">{sale.student_name}</p>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[9px] gap-0.5">
                    <History className="h-2.5 w-2.5" />Histórico
                  </Badge>
                  <Badge
                    className={`text-[9px] ${sale.payment_status === 'paid' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}
                  >
                    {sale.payment_status === 'paid' ? '✓ Pagado' : '⏳ Pendiente'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 truncate">{sale.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-amber-700 flex items-center gap-1 font-semibold">
                    <CalendarDays className="h-3 w-3" />
                    Venta: {formatSaleDate(sale.metadata)}
                  </span>
                  {sale.ticket_code && (
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      {sale.ticket_code}
                    </span>
                  )}
                  {canViewAll && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <School className="h-3 w-3" />
                      {sale.school_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Monto */}
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-amber-700">S/ {sale.amount.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">
                  Ingresado: {format(new Date(sale.created_at), "d MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          ))}

          {/* Total visible */}
          <div className="bg-slate-800 rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-300 font-semibold">
              {filtered.length} venta{filtered.length !== 1 ? 's' : ''} mostrada{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xl font-black text-white">
              S/ {filtered.reduce((s, t) => s + t.amount, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
