import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { History, Search, RefreshCw, CalendarDays, Loader2, Users, AlertTriangle } from 'lucide-react';
import { normalizeSearch } from '@/lib/utils';
import { StudentLedgerRow, StudentLedgerGroup } from './StudentLedgerRow';

interface SchoolOption { id: string; name: string; }

interface RawTransaction {
  id: string;
  student_id: string;
  school_id: string;
  amount: number;
  description: string;
  ticket_code: string | null;
  payment_status: string;
  created_at: string;
  metadata: any;
}

interface StudentInfo {
  id: string;
  full_name: string;
  balance: number;
  free_account: boolean;
  school_id: string;
}

export const HistoricalSalesReport = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const canViewAll = role === 'admin_general' || role === 'superadmin';

  const [groups,        setGroups]        = useState<StudentLedgerGroup[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [userSchoolId,  setUserSchoolId]  = useState<string | null | undefined>(undefined);
  const [schools,       setSchools]       = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [search,        setSearch]        = useState('');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');

  // Totales calculados desde los grupos
  const summary = useMemo(() => ({
    students:       groups.length,
    total:          groups.reduce((s, g) => s + g.historical_total, 0),
    transactions:   groups.reduce((s, g) => s + g.historical_count, 0),
    negativeCount:  groups.filter(g => g.current_balance < 0).length,
  }), [groups]);

  useEffect(() => {
    initSchool();
    if (canViewAll) fetchSchools();
  }, [user]);

  useEffect(() => {
    if (userSchoolId !== undefined) fetchData();
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // ── 1. Traer transacciones históricas del kiosco ──────────────────
      let txQuery = supabase
        .from('transactions')
        .select('id, student_id, school_id, amount, description, ticket_code, payment_status, created_at, metadata')
        .eq('type', 'purchase')
        .eq('metadata->>source', 'historical_kiosk_entry')
        .order('created_at', { ascending: false })
        .limit(500);

      const schoolFilter = canViewAll
        ? (selectedSchool !== 'all' ? selectedSchool : null)
        : userSchoolId;
      if (schoolFilter) txQuery = txQuery.eq('school_id', schoolFilter);
      if (dateFrom) txQuery = txQuery.gte('metadata->>sale_date', dateFrom);
      if (dateTo)   txQuery = txQuery.lte('metadata->>sale_date', dateTo);

      const { data: txs, error: txErr } = await txQuery;
      if (txErr) throw txErr;
      if (!txs?.length) { setGroups([]); return; }

      // ── 2. Obtener info de alumnos únicos ────────────────────────────
      const studentIds = [...new Set(txs.map((t: RawTransaction) => t.student_id).filter(Boolean))];
      const schoolIds  = [...new Set(txs.map((t: RawTransaction) => t.school_id).filter(Boolean))];

      const [{ data: studs }, { data: schoolsData }] = await Promise.all([
        supabase
          .from('students')
          .select('id, full_name, balance, free_account, school_id')
          .in('id', studentIds),
        supabase
          .from('schools')
          .select('id, name')
          .in('id', schoolIds),
      ]);

      const studMap    = Object.fromEntries((studs as StudentInfo[] || []).map(s => [s.id, s]));
      const schoolMap  = Object.fromEntries((schoolsData || []).map(s => [s.id, s.name as string]));

      // ── 3. Agrupar transacciones por alumno → un grupo por alumno ────
      const groupMap = new Map<string, StudentLedgerGroup>();

      for (const tx of txs as RawTransaction[]) {
        const sid = tx.student_id;
        if (!sid) continue;

        if (!groupMap.has(sid)) {
          const stud = studMap[sid];
          groupMap.set(sid, {
            student_id:       sid,
            student_name:     stud?.full_name    ?? 'Alumno desconocido',
            school_name:      schoolMap[tx.school_id] ?? '—',
            current_balance:  stud?.balance       ?? 0,
            free_account:     stud?.free_account  ?? true,
            historical_count: 0,
            historical_total: 0,
          });
        }

        const g = groupMap.get(sid)!;
        g.historical_count += 1;
        g.historical_total += Math.abs(tx.amount);
      }

      // Ordenar: saldo negativo primero, luego por nombre
      const sorted = [...groupMap.values()].sort((a, b) => {
        if (a.current_balance < 0 && b.current_balance >= 0) return -1;
        if (b.current_balance < 0 && a.current_balance >= 0) return  1;
        return a.student_name.localeCompare(b.student_name, 'es');
      });

      setGroups(sorted);
    } finally {
      setLoading(false);
    }
  };

  // Filtro búsqueda cliente-side (accent + case insensitive)
  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return groups;
    return groups.filter(g => normalizeSearch(g.student_name).includes(q));
  }, [groups, search]);

  return (
    <div className="space-y-4">

      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-xl">
          <History className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Estado de Cuenta — Ventas Históricas</h3>
          <p className="text-xs text-slate-500">Un alumno = una fila · expande para ver su línea de tiempo completa</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} disabled={loading} className="ml-auto gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      {/* ── Tarjetas resumen ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          {
            label: 'Alumnos con historial',
            value: summary.students,
            color: 'bg-amber-50 border-amber-200 text-amber-800',
            icon: <Users className="h-3.5 w-3.5 opacity-60" />,
          },
          {
            label: 'Ventas históricas',
            value: summary.transactions,
            color: 'bg-slate-50 border-slate-200 text-slate-800',
            icon: <History className="h-3.5 w-3.5 opacity-60" />,
          },
          {
            label: 'Monto total hist.',
            value: `S/ ${summary.total.toFixed(2)}`,
            color: 'bg-blue-50 border-blue-200 text-blue-800',
            icon: null,
          },
          {
            label: 'Saldos negativos',
            value: summary.negativeCount,
            color: summary.negativeCount > 0
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800',
            icon: summary.negativeCount > 0
              ? <AlertTriangle className="h-3.5 w-3.5 opacity-70" />
              : null,
          },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
            <div className="flex items-center gap-1 text-[10px] uppercase font-semibold opacity-70 mb-0.5">
              {s.icon}{s.label}
            </div>
            <p className="text-xl font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar alumno..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Fecha:</span>
        </div>
        <input
          type="date" value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white min-w-[130px]"
        />
        <input
          type="date" value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white min-w-[130px]"
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
          <Button
            size="sm" variant="ghost"
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
            className="h-9 text-slate-500"
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* ── Lista de grupos (acordeón) ──────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search ? `Sin resultados para "${search}"` : 'No hay ventas históricas registradas'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Ayuda visual rápida */}
          <p className="text-[11px] text-slate-400 px-1">
            {filtered.length} alumno{filtered.length !== 1 ? 's' : ''} · pulsa una fila para ver su línea de tiempo completa
          </p>

          {filtered.map(group => (
            <StudentLedgerRow
              key={group.student_id}
              group={group}
              canViewAll={canViewAll}
            />
          ))}
        </div>
      )}
    </div>
  );
};
