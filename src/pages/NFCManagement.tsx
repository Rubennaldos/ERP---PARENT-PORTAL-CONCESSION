import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserProfileMenu } from '@/components/admin/UserProfileMenu';
import { ManualRechargeTab } from '@/components/billing/ManualRechargeTab';
import { NFCCardsManager } from '@/components/admin/NFCCardsManager';
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  History,
  RefreshCw,
  User,
  Banknote,
  QrCode,
  Smartphone,
  Clock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentRecharge {
  id: string;
  amount: number;
  payment_method: string | null;
  ticket_code: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  student?: { full_name: string; grade: string; section: string } | null;
}

const METHOD_ICON: Record<string, React.ElementType> = {
  efectivo:      Banknote,
  yape:          QrCode,
  plin:          Smartphone,
  transferencia: CreditCard,
};

const METHOD_COLOR: Record<string, string> = {
  efectivo:      'text-emerald-600 bg-emerald-50 border-emerald-200',
  yape:          'text-purple-600 bg-purple-50 border-purple-200',
  plin:          'text-blue-600 bg-blue-50 border-blue-200',
  transferencia: 'text-amber-600 bg-amber-50 border-amber-200',
};

const NFCManagement = () => {
  const navigate           = useNavigate();
  const { user, signOut }  = useAuth();
  const { role }           = useRole();
  const { full_name }      = useUserProfile();

  const [activeTab,     setActiveTab]     = useState<'recargas' | 'nfc'>('recargas');
  const [userSchoolId,  setUserSchoolId]  = useState<string | null>(null);
  const [recentRecharges, setRecentRecharges] = useState<RecentRecharge[]>([]);
  const [loadingHistory,  setLoadingHistory]  = useState(false);
  const [historyKey,      setHistoryKey]      = useState(0);

  // ── Obtener school_id del usuario ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchSchool = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', user.id)
        .single();
      if (data?.school_id) setUserSchoolId(data.school_id);
    };
    fetchSchool();
  }, [user]);

  // ── Cargar últimas 10 recargas ────────────────────────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        let query = supabase
          .from('transactions')
          .select(`
            id, amount, payment_method, ticket_code, created_at, metadata,
            student:students(full_name, grade, section)
          `)
          .eq('type', 'recharge')
          .order('created_at', { ascending: false })
          .limit(10);

        // Solo ver recargas de la propia sede si no es admin_general
        if (role !== 'admin_general' && userSchoolId) {
          query = query.eq('school_id', userSchoolId);
        }

        const { data } = await query;
        setRecentRecharges((data as RecentRecharge[]) || []);
      } catch (e) {
        console.error('Error cargando historial:', e);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [userSchoolId, role, historyKey]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Volver</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
                <span>Gestión NFC y Recargas</span>
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5 hidden sm:block">
                Registro de tarjetas NFC y recargas manuales de saldo
              </p>
            </div>
          </div>
          <div className="self-end sm:self-auto">
            <UserProfileMenu
              userEmail={user?.email || ''}
              userName={full_name || undefined}
              onLogout={signOut}
            />
          </div>
        </div>

        {/* ── Contenido: dos columnas ──────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Columna izquierda (2/3): formulario + tabs ──────────────── */}
          <div className="xl:col-span-2 space-y-4">
            {/* Tab selector */}
            <Card>
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('recargas')}
                    className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${
                      activeTab === 'recargas'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Wallet className="h-4 w-4" />
                    Recargas Manuales
                  </button>
                  <button
                    onClick={() => setActiveTab('nfc')}
                    className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${
                      activeTab === 'nfc'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Registro de Tarjetas NFC
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Contenido del tab activo */}
            {activeTab === 'recargas' && (
              <ManualRechargeTab
                onRechargeSuccess={() => setHistoryKey(k => k + 1)}
              />
            )}

            {activeTab === 'nfc' && (
              <NFCCardsManager schoolId={userSchoolId} />
            )}
          </div>

          {/* ── Columna derecha (1/3): historial rápido ──────────────────── */}
          <div className="xl:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <History className="h-4 w-4 text-blue-600" />
                    Últimas Recargas
                  </CardTitle>
                  <button
                    onClick={() => setHistoryKey(k => k + 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Actualizar"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Últimas 10 recargas realizadas</p>
              </CardHeader>
              <CardContent className="p-0">
                {loadingHistory ? (
                  <div className="py-8 text-center text-slate-400 text-sm">Cargando…</div>
                ) : recentRecharges.length === 0 ? (
                  <div className="py-8 text-center">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-500 text-sm">Sin recargas recientes</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentRecharges.map(r => {
                      const MethodIcon = METHOD_ICON[r.payment_method || ''] ?? Banknote;
                      const methodColor = METHOD_COLOR[r.payment_method || ''] ?? 'text-slate-600 bg-slate-50 border-slate-200';
                      return (
                        <div key={r.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                          {/* Alumno */}
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {r.student?.full_name ?? (r.metadata?.student_name as string) ?? 'Alumno'}
                              </p>
                            </div>
                            <p className="text-sm font-black text-emerald-700 shrink-0">
                              +S/ {Math.abs(r.amount).toFixed(2)}
                            </p>
                          </div>

                          {/* Grado + método + hora */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            {r.student && (
                              <span className="text-[10px] text-slate-400">
                                {r.student.grade} {r.student.section}
                              </span>
                            )}
                            <div className="flex items-center gap-1 ml-auto">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${methodColor}`}>
                                <MethodIcon className="h-2.5 w-2.5" />
                                {r.payment_method || '—'}
                              </span>
                              {r.ticket_code && (
                                <span className="text-[10px] font-mono bg-blue-600 text-white px-1.5 py-0.5 rounded">
                                  {r.ticket_code}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tiempo */}
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-2.5 w-2.5 text-slate-300" />
                            <span className="text-[10px] text-slate-400">
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFCManagement;
