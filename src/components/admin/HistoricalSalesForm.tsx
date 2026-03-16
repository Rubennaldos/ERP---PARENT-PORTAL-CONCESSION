import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getProductsForSchool } from '@/lib/productPricing';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  History,
  Search,
  Check,
  Loader2,
  CalendarDays,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  X,
  ShoppingCart,
  User,
  GraduationCap,
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

interface Teacher {
  id: string;
  full_name: string;
  area?: string;
  school_id_1?: string;
}

// Tipo unificado para el buscador
interface Person {
  id: string;
  full_name: string;
  subtitle: string; // grado·sección para alumnos, área para profes
  type: 'student' | 'teacher';
}

interface Product {
  id: string;
  name: string;
  price: number;
  price_sale: number;
  category: string;
}

interface SaleEntry {
  product: Product;
  quantity: number;
}

interface HistoricalSalesFormProps {
  schoolId: string;
  schoolName?: string;
}

// Pasos del wizard
type Step = 'date' | 'student' | 'products' | 'confirm';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'date',     label: 'Fecha',    icon: <CalendarDays className="h-4 w-4" /> },
  { key: 'student',  label: 'Alumno',   icon: <User className="h-4 w-4" /> },
  { key: 'products', label: 'Productos', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'confirm',  label: 'Confirmar', icon: <Check className="h-4 w-4" /> },
];

export function HistoricalSalesForm({ schoolId, schoolName }: HistoricalSalesFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const [step, setStep] = useState<Step>('date');
  const [saleDate, setSaleDate] = useState<string>(today);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Persona seleccionada (alumno o profesor)
  const [studentSearch, setStudentSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const studentInputRef = useRef<HTMLInputElement>(null);

  // Productos
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<SaleEntry[]>([]);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [sessionLog, setSessionLog] = useState<{ studentName: string; amount: number; date: string }[]>([]);

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
      fetchTeachers();
      fetchProducts();
    }
  }, [schoolId]);

  // Auto-focus buscador al entrar al paso alumno
  useEffect(() => {
    if (step === 'student') {
      setTimeout(() => studentInputRef.current?.focus(), 200);
    }
    if (step === 'products') {
      setTimeout(() => productInputRef.current?.focus(), 200);
    }
  }, [step]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, grade, section, school_id, balance, free_account')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      setStudents(data || []);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data } = await supabase
        .from('teacher_profiles')
        .select('id, full_name, area, school_id_1')
        .or(`school_id_1.eq.${schoolId},school_id_2.eq.${schoolId}`)
        .order('full_name', { ascending: true });
      setTeachers((data || []).filter((t: any) => t.full_name));
    } catch {
      // silencioso
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await getProductsForSchool(schoolId);
      setProducts(
        (data || [])
          .filter((p: any) => p.active !== false && p.is_available !== false)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price_sale || p.price || 0,
            price_sale: p.price_sale || p.price || 0,
            category: p.category || 'Sin categoría',
          }))
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const uniqueGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

  // Lista unificada: alumnos + profesores filtrados por búsqueda
  const allPersons: Person[] = [
    ...students
      .filter(s => gradeFilter === 'all' || s.grade === gradeFilter)
      .filter(s => !studentSearch || s.full_name.toLowerCase().includes(studentSearch.toLowerCase()))
      .map(s => ({
        id: s.id,
        full_name: s.full_name,
        subtitle: `${s.grade} · ${s.section}`,
        type: 'student' as const,
      })),
    ...(gradeFilter === 'all'
      ? teachers
          .filter(t => !studentSearch || t.full_name.toLowerCase().includes(studentSearch.toLowerCase()))
          .map(t => ({
            id: t.id,
            full_name: t.full_name,
            subtitle: t.area ? `Profesor · ${t.area}` : 'Profesor',
            type: 'teacher' as const,
          }))
      : []),
  ].slice(0, 50);

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 30);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(e => e.product.id === product.id);
      if (existing) return prev.map(e => e.product.id === product.id ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { product, quantity: 1 }];
    });
    setProductSearch('');
    setShowProductDropdown(false);
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(e =>
      e.product.id === productId ? { ...e, quantity: Math.max(1, e.quantity + delta) } : e
    ));
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(e => e.product.id !== productId));

  const cartTotal = cart.reduce((sum, e) => sum + e.product.price * e.quantity, 0);

  const handleConfirm = async () => {
    if ((!selectedStudent && !selectedTeacher) || cart.length === 0 || !saleDate) return;
    setSubmitting(true);
    const personName = selectedStudent?.full_name || selectedTeacher?.full_name || '';
    try {
      const itemsSummary = cart.map(e => `${e.quantity}x ${e.product.name}`).join(', ');
      const description = `Kiosco histórico - ${itemsSummary} - S/ ${cartTotal.toFixed(2)}`;
      const metadata = {
        items: cart.map(e => ({
          product_name: e.product.name,
          quantity: e.quantity,
          unit_price: e.product.price,
          subtotal: e.product.price * e.quantity,
        })),
      };

      const { data: txId, error } = await supabase.rpc('insert_historical_kiosk_sale', {
        p_student_id:  selectedStudent ? selectedStudent.id : '00000000-0000-0000-0000-000000000000',
        p_teacher_id:  selectedTeacher ? selectedTeacher.id : null,
        p_school_id:   schoolId,
        p_amount:      cartTotal,
        p_description: description,
        p_sale_date:   saleDate,
        p_created_by:  user?.id,
        p_metadata:    metadata,
      });

      if (error) throw error;

      if (txId) {
        const itemRows = cart.map(e => ({
          transaction_id: txId,
          product_name: e.product.name,
          quantity: e.quantity,
          unit_price: e.product.price,
          subtotal: e.product.price * e.quantity,
        }));
        await supabase.from('transaction_items').insert(itemRows);
      }

      setSessionLog(prev => [
        { studentName: personName, amount: cartTotal, date: saleDate },
        ...prev,
      ]);

      toast({
        title: '✅ Venta registrada',
        description: `${personName} — S/ ${cartTotal.toFixed(2)}`,
      });

      setSelectedStudent(null);
      setSelectedTeacher(null);
      setStudentSearch('');
      setCart([]);
      setProductSearch('');
      setStep('student');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al registrar', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-').map(Number);
    return format(new Date(y, m - 1, day), "EEEE d 'de' MMMM", { locale: es });
  };

  // ── RENDER ───────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg mx-auto">

      {/* ── Header compacto ── */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="p-1.5 bg-slate-800 rounded-lg shrink-0">
          <History className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xs font-bold text-slate-800 leading-tight">Ventas Históricas del Kiosco</h2>
          <p className="text-[10px] text-slate-400">{schoolName || 'Kiosco escolar'}</p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="flex items-center mb-2 px-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => { if (i < stepIndex) setStep(s.key); }}
              className={`flex flex-col items-center gap-0.5 transition-all ${i < stepIndex ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                i < stepIndex
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : i === stepIndex
                  ? 'bg-slate-800 border-slate-800 text-white scale-110'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {i < stepIndex ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              </div>
              <span className={`text-[8px] font-semibold uppercase tracking-wide ${
                i === stepIndex ? 'text-slate-800' : i < stepIndex ? 'text-emerald-600' : 'text-slate-300'
              }`}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < stepIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════
          PASO 1 — FECHA
      ════════════════════════════════ */}
      {step === 'date' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">¿De qué fecha es la venta?</h3>
              <p className="text-[10px] text-slate-400">Fecha real del cuaderno</p>
            </div>
          </div>

          <input
            type="date"
            value={saleDate}
            max={today}
            onChange={e => setSaleDate(e.target.value)}
            className="w-full h-10 text-center text-sm font-bold text-slate-800 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none bg-slate-50 cursor-pointer"
          />

          {saleDate && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-xs font-semibold text-amber-700 capitalize">{formatDate(saleDate)}</p>
            </div>
          )}

          <Button
            onClick={() => setStep('student')}
            disabled={!saleDate}
            className="w-full h-9 bg-slate-800 hover:bg-slate-900 text-white font-semibold gap-2 text-xs"
          >
            Siguiente — Elegir alumno
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ════════════════════════════════
          PASO 2 — ALUMNO
      ════════════════════════════════ */}
      {step === 'student' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-3 py-1.5 flex items-center gap-2">
            <CalendarDays className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[10px] text-amber-700 font-semibold capitalize">{formatDate(saleDate)}</span>
            <button onClick={() => setStep('date')} className="ml-auto text-[10px] text-amber-500 hover:text-amber-700 underline">cambiar</button>
          </div>

          <div className="p-3 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 text-center">¿Para quién?</h3>

            {/* Filtro por grado — solo afecta alumnos */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                onClick={() => setGradeFilter('all')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 transition-all ${
                  gradeFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                Todos
              </button>
              {uniqueGrades.map(g => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 transition-all ${
                    gradeFilter === g ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                ref={studentInputRef}
                placeholder={loadingStudents ? 'Cargando...' : 'Buscar alumno o profesor...'}
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setShowStudentDropdown(true); }}
                onFocus={() => setShowStudentDropdown(true)}
                onBlur={() => setTimeout(() => setShowStudentDropdown(false), 150)}
                className="pl-8 h-9 text-xs rounded-lg border-slate-200"
                disabled={loadingStudents}
              />
            </div>

            {/* Lista unificada alumnos + profesores */}
            {(showStudentDropdown || studentSearch) && allPersons.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
                {allPersons.map(p => (
                  <button
                    key={`${p.type}-${p.id}`}
                    onMouseDown={() => {
                      if (p.type === 'student') {
                        const s = students.find(s => s.id === p.id)!;
                        setSelectedStudent(s);
                        setSelectedTeacher(null);
                      } else {
                        const t = teachers.find(t => t.id === p.id)!;
                        setSelectedTeacher(t);
                        setSelectedStudent(null);
                      }
                      setStudentSearch('');
                      setShowStudentDropdown(false);
                      setStep('products');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-2"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      p.type === 'teacher' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {p.type === 'teacher'
                        ? <GraduationCap className="h-3 w-3 text-purple-600" />
                        : <User className="h-3 w-3 text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{p.full_name}</p>
                      <p className="text-[10px] text-slate-400">{p.subtitle}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {studentSearch && allPersons.length === 0 && !loadingStudents && (
              <p className="text-center text-[11px] text-slate-400 py-3">Sin resultados para "<strong>{studentSearch}</strong>"</p>
            )}

            {!studentSearch && !showStudentDropdown && (
              <p className="text-[10px] text-slate-400 text-center py-1">Busca por nombre de alumno o profesor</p>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          PASO 3 — PRODUCTOS
      ════════════════════════════════ */}
      {step === 'products' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 px-3 py-1.5 flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              selectedTeacher ? 'bg-purple-200' : 'bg-emerald-200'
            }`}>
              {selectedTeacher
                ? <GraduationCap className="h-3 w-3 text-purple-700" />
                : <User className="h-3 w-3 text-emerald-700" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-800 truncate">
                {selectedStudent?.full_name || selectedTeacher?.full_name}
              </p>
              <p className="text-[10px] text-emerald-600">
                {selectedStudent
                  ? `${selectedStudent.grade} · ${formatDate(saleDate)}`
                  : selectedTeacher?.area
                    ? `Profesor · ${selectedTeacher.area} · ${formatDate(saleDate)}`
                    : `Profesor · ${formatDate(saleDate)}`
                }
              </p>
            </div>
            <button onClick={() => { setSelectedStudent(null); setSelectedTeacher(null); setStep('student'); }} className="text-[10px] text-emerald-500 hover:text-emerald-700 underline shrink-0">cambiar</button>
          </div>

          <div className="p-3 space-y-2">
            {/* Buscador de producto */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                ref={productInputRef}
                placeholder={loadingProducts ? 'Cargando...' : 'Buscar y agregar producto...'}
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                className="pl-8 h-9 text-xs rounded-lg border-slate-200"
                disabled={loadingProducts}
              />
            </div>

            {/* Dropdown productos */}
            {showProductDropdown && filteredProducts.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto divide-y divide-slate-100">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => addToCart(p)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0 mr-2">
                      <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.category}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-emerald-600">S/ {p.price.toFixed(2)}</span>
                      <div className="w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center">
                        <Plus className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Carrito */}
            {cart.length > 0 ? (
              <div className="space-y-1.5">
                {cart.map(entry => (
                  <div key={entry.product.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{entry.product.name}</p>
                      <p className="text-[10px] text-slate-400">S/ {entry.product.price.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQty(entry.product.id, -1)}
                        className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center active:bg-slate-100"
                      >
                        <Minus className="h-3 w-3 text-slate-600" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">{entry.quantity}</span>
                      <button
                        onClick={() => updateQty(entry.product.id, 1)}
                        className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center active:bg-slate-700"
                      >
                        <Plus className="h-3 w-3 text-white" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 w-14 text-right shrink-0">S/ {(entry.product.price * entry.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(entry.product.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-slate-300">Total</p>
                  <p className="text-base font-black text-white">S/ {cartTotal.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400">
                <ShoppingCart className="h-6 w-6 mx-auto mb-1 opacity-30" />
                <p className="text-xs">Busca y toca un producto para agregarlo</p>
              </div>
            )}

            {cart.length > 0 && (
              <Button
                onClick={() => setStep('confirm')}
                className="w-full h-9 bg-slate-800 hover:bg-slate-900 text-white font-semibold gap-2 text-xs"
              >
                Revisar y confirmar
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          PASO 4 — CONFIRMAR
      ════════════════════════════════ */}
      {step === 'confirm' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-2.5 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Resumen de la venta</p>
            <p className="text-2xl font-black text-white">S/ {cartTotal.toFixed(2)}</p>
          </div>

          <div className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                <p className="text-[9px] text-emerald-500 uppercase font-semibold mb-0.5">
                  {selectedTeacher ? 'Profesor' : 'Alumno'}
                </p>
                <p className="text-xs font-bold text-emerald-800 leading-tight">
                  {selectedStudent?.full_name || selectedTeacher?.full_name}
                </p>
                <p className="text-[10px] text-emerald-600">
                  {selectedStudent?.grade || selectedTeacher?.area || ''}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                <p className="text-[9px] text-amber-500 uppercase font-semibold mb-0.5">Fecha</p>
                <p className="text-xs font-bold text-amber-800 leading-tight capitalize">{formatDate(saleDate)}</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100">
              {cart.map(entry => (
                <div key={entry.product.id} className="flex items-center justify-between px-3 py-1.5">
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{entry.product.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">×{entry.quantity}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">S/ {(entry.product.price * entry.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm gap-2 shadow-md"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</>
              ) : (
                <><Check className="h-4 w-4" /> Confirmar venta · S/ {cartTotal.toFixed(2)}</>
              )}
            </Button>
            <button
              onClick={() => setStep('products')}
              disabled={submitting}
              className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
            >
              ← Volver a editar productos
            </button>
          </div>
        </div>
      )}

      {/* ── Log de sesión ── */}
      {sessionLog.length > 0 && (
        <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
          <div className="px-3 py-1.5 border-b border-emerald-200 flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Registradas esta sesión ({sessionLog.length})
            </span>
          </div>
          <div className="divide-y divide-emerald-100">
            {sessionLog.map((log, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{log.studentName}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{formatDate(log.date)}</p>
                </div>
                <span className="text-xs font-bold text-emerald-700">S/ {log.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-100/60">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Total sesión</span>
              <span className="text-sm font-black text-emerald-800">
                S/ {sessionLog.reduce((s, l) => s + l.amount, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
