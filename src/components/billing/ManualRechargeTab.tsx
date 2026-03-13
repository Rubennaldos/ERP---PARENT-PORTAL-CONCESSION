import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Search,
  Check,
  X,
  Loader2,
  User,
  Wallet,
  Banknote,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  grade: string;
  section: string;
  school_id: string;
  balance: number;
  free_account: boolean;
}

type PaymentMethod = 'efectivo' | 'yape' | 'plin' | 'transferencia';

interface RechargeResult {
  success: boolean;
  transaction_id: string;
  ticket_code: string;
  student_name: string;
  previous_balance: number;
  amount: number;
  new_balance: number;
}

interface SessionEntry {
  studentName: string;
  amount: number;
  method: PaymentMethod;
  ticket: string;
  newBalance: number;
}

export function ManualRechargeTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form
  const [studentSearch, setStudentSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sesión
  const [sessionLog, setSessionLog] = useState<SessionEntry[]>([]);

  const quickAmounts = [5, 10, 20, 50, 100];

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, grade, section, school_id, balance, free_account')
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      setStudents(data || []);
    } catch (err) {
      console.error('Error cargando alumnos:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const filteredStudents = students.filter(s =>
    !studentSearch || s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 30);

  const numAmount = parseFloat(amount || '0');

  const handleConfirm = async () => {
    if (!selectedStudent) {
      toast({ variant: 'destructive', title: 'Selecciona un alumno' });
      return;
    }
    if (numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Ingresa un monto válido' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('process_manual_recharge', {
        p_student_id: selectedStudent.id,
        p_amount: numAmount,
        p_payment_method: method,
        p_description: description.trim() || '',
        p_admin_id: user?.id || null,
      });

      if (error) throw error;

      const result = data as RechargeResult;

      setSessionLog(prev => [
        {
          studentName: result.student_name || selectedStudent.full_name,
          amount: numAmount,
          method,
          ticket: result.ticket_code,
          newBalance: result.new_balance,
        },
        ...prev,
      ]);

      toast({
        title: '✅ Recarga aplicada',
        description: `${selectedStudent.full_name} — S/ ${numAmount.toFixed(2)} · Nuevo saldo: S/ ${result.new_balance.toFixed(2)}`,
      });

      // Reset parcial: limpiar alumno, monto y descripción, mantener método
      setSelectedStudent(null);
      setStudentSearch('');
      setAmount('');
      setDescription('');
      setTimeout(() => searchRef.current?.focus(), 100);

      // Refrescar el balance local del alumno (para la búsqueda siguiente)
      setStudents(prev =>
        prev.map(s => s.id === selectedStudent.id ? { ...s, balance: result.new_balance } : s)
      );

    } catch (err: any) {
      console.error('Error en recarga manual:', err);
      toast({
        variant: 'destructive',
        title: 'Error al recargar',
        description: err.message || 'Inténtalo de nuevo.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const methodConfig: { key: PaymentMethod; label: string; icon: JSX.Element; color: string }[] = [
    { key: 'efectivo',      label: 'Efectivo',      icon: <Banknote className="h-4 w-4" />,    color: 'border-green-500 bg-green-50 text-green-800' },
    { key: 'yape',          label: 'Yape',          icon: <CreditCard className="h-4 w-4" />,  color: 'border-purple-500 bg-purple-50 text-purple-800' },
    { key: 'plin',          label: 'Plin',          icon: <CreditCard className="h-4 w-4" />,  color: 'border-teal-500 bg-teal-50 text-teal-800' },
    { key: 'transferencia', label: 'Transferencia', icon: <CreditCard className="h-4 w-4" />,  color: 'border-orange-500 bg-orange-50 text-orange-800' },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* ── Título ── */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2.5 bg-emerald-600 rounded-xl shadow">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Recarga Manual de Saldo</h2>
          <p className="text-xs text-slate-500">Acredita saldo directamente al alumno. Se registra como transacción pagada.</p>
        </div>
      </div>

      {/* ── ALUMNO ── */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            Alumno
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="relative">
            {selectedStudent ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{selectedStudent.full_name}</p>
                    <p className="text-[10px] text-emerald-600">
                      {selectedStudent.grade} · {selectedStudent.section}
                      <span className="ml-2">Saldo actual: <strong>S/ {(selectedStudent.balance || 0).toFixed(2)}</strong></span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedStudent(null); setStudentSearch(''); setTimeout(() => searchRef.current?.focus(), 50); }}
                  className="text-emerald-400 hover:text-red-500 transition-colors p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  ref={searchRef}
                  placeholder={loadingStudents ? 'Cargando alumnos...' : 'Buscar alumno por nombre...'}
                  value={studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  className="pl-9 h-10 text-sm"
                  disabled={loadingStudents}
                />
                {showDropdown && filteredStudents.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filteredStudents.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={() => { setSelectedStudent(s); setStudentSearch(''); setShowDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{s.full_name}</p>
                            <p className="text-[11px] text-slate-400">{s.grade} · {s.section}</p>
                          </div>
                          <p className="text-xs font-semibold text-emerald-600 shrink-0 ml-3">
                            S/ {(s.balance || 0).toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && studentSearch && filteredStudents.length === 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3">
                    <p className="text-xs text-slate-400 text-center">No se encontraron alumnos</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── MONTO ── */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="pt-4 pb-4 px-4 space-y-3">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Monto a recargar</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">S/</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xl h-12 text-center font-bold pl-9"
                min="0.50"
                step="0.50"
              />
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {quickAmounts.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q.toString())}
                className={`h-9 px-3 rounded-lg border text-xs font-bold transition-all
                  ${amount === q.toString()
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                  }`}
              >
                S/ {q}
              </button>
            ))}
          </div>
          {selectedStudent && numAmount > 0 && (
            <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
              <span className="text-[11px] text-emerald-700">Nuevo saldo estimado:</span>
              <span className="text-sm font-bold text-emerald-800">
                S/ {((selectedStudent.balance || 0) + numAmount).toFixed(2)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MÉTODO DE PAGO ── */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="pt-4 pb-4 px-4 space-y-3">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Método de pago</Label>
          <div className="grid grid-cols-2 gap-2">
            {methodConfig.map(mc => {
              const isSelected = method === mc.key;
              return (
                <button
                  key={mc.key}
                  onClick={() => setMethod(mc.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    isSelected ? mc.color + ' shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {mc.icon}
                  {mc.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── NOTA (opcional) ── */}
      <Input
        placeholder="Nota / descripción (opcional, ej: 'billete de 50')"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="h-10 text-sm"
      />

      {/* ── BOTÓN CONFIRMAR ── */}
      <Button
        onClick={handleConfirm}
        disabled={submitting || !selectedStudent || numAmount <= 0}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm gap-2 shadow-md"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
        ) : (
          <>
            <Wallet className="h-4 w-4" />
            Confirmar Recarga · S/ {numAmount > 0 ? numAmount.toFixed(2) : '0.00'}
            <ArrowRight className="h-4 w-4 ml-auto" />
          </>
        )}
      </Button>

      {/* ── LOG DE SESIÓN ── */}
      {sessionLog.length > 0 && (
        <Card className="border border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Recargas de esta sesión ({sessionLog.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4 space-y-2">
            {sessionLog.map((log, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-emerald-100 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{log.studentName}</p>
                  <p className="text-[10px] text-slate-400">{log.ticket} · {log.method}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-bold text-emerald-700">+ S/ {log.amount.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400">Saldo: S/ {log.newBalance.toFixed(2)}</p>
                </div>
              </div>
            ))}
            <div className="border-t border-emerald-200 pt-2 flex justify-between text-xs font-bold">
              <span className="text-emerald-700">Total recargado</span>
              <span className="text-emerald-800">S/ {sessionLog.reduce((s, l) => s + l.amount, 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Alerta informativa ── */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
        <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-blue-700 leading-relaxed">
          Cada recarga queda registrada en <strong>transactions</strong> con tu usuario como autor.
          El padre la verá inmediatamente en su historial de movimientos.
        </p>
      </div>
    </div>
  );
}
