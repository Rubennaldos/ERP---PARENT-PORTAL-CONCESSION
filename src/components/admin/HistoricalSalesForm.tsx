import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  ChevronDown,
  Loader2,
  ShoppingBag,
  User,
  CalendarDays,
  Package,
  PlusCircle,
  X,
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

// ── Tooltip de fecha sticky ──────────────────────────────────
function StickyDateBadge({ date }: { date: string }) {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const label = format(new Date(y, m - 1, d), "EEEE d 'de' MMMM yyyy", { locale: es });
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
      <CalendarDays className="h-4 w-4 text-amber-600 shrink-0" />
      <div>
        <p className="text-[10px] text-amber-500 uppercase font-semibold tracking-wider">Fecha activa (sticky)</p>
        <p className="text-xs font-semibold text-amber-700 capitalize">{label}</p>
      </div>
    </div>
  );
}

export function HistoricalSalesForm({ schoolId, schoolName }: HistoricalSalesFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const [saleDate, setSaleDate] = useState<string>(today);
  const [students, setStudents] = useState<Student[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Filtros de estudiante
  const [studentSearch, setStudentSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const studentInputRef = useRef<HTMLInputElement>(null);

  // Filtros de producto
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Carrito
  const [cart, setCart] = useState<SaleEntry[]>([]);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Historial de esta sesión
  const [sessionLog, setSessionLog] = useState<{ studentName: string; amount: number; date: string }[]>([]);

  // ── Cargar datos ──────────────────────────────────────────
  useEffect(() => {
    if (schoolId) {
      fetchStudents();
      fetchProducts();
    }
  }, [schoolId]);

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
    } catch (err) {
      console.error('Error cargando estudiantes:', err);
    } finally {
      setLoadingStudents(false);
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
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // ── Filtros derivados ─────────────────────────────────────
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

  const filteredStudents = students.filter(s => {
    const matchSearch = !studentSearch || s.full_name.toLowerCase().includes(studentSearch.toLowerCase());
    const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter;
    return matchSearch && matchGrade;
  }).slice(0, 40);

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 30);

  // ── Carrito ───────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(e => e.product.id === product.id);
      if (existing) {
        return prev.map(e => e.product.id === product.id ? { ...e, quantity: e.quantity + 1 } : e);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setProductSearch('');
    setShowProductDropdown(false);
    productInputRef.current?.focus();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(e =>
        e.product.id === productId ? { ...e, quantity: Math.max(1, e.quantity + delta) } : e
      );
      return updated;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(e => e.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, e) => sum + e.product.price * e.quantity, 0);

  // ── Confirmar venta ───────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedStudent) {
      toast({ variant: 'destructive', title: 'Selecciona un alumno' });
      return;
    }
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Agrega al menos un producto' });
      return;
    }
    if (!saleDate) {
      toast({ variant: 'destructive', title: 'Selecciona una fecha' });
      return;
    }

    setSubmitting(true);
    try {
      // Descripción resumida de los items
      const itemsSummary = cart.map(e => `${e.quantity}x ${e.product.name}`).join(', ');
      const description = `Kiosco histórico - ${itemsSummary} - S/ ${cartTotal.toFixed(2)}`;

      // Metadata con detalle de items
      const metadata = {
        items: cart.map(e => ({
          product_name: e.product.name,
          quantity: e.quantity,
          unit_price: e.product.price,
          subtotal: e.product.price * e.quantity,
        })),
      };

      const { data: txId, error } = await supabase.rpc('insert_historical_kiosk_sale', {
        p_student_id:  selectedStudent.id,
        p_school_id:   schoolId,
        p_amount:      cartTotal,
        p_description: description,
        p_sale_date:   saleDate,
        p_created_by:  user?.id,
        p_metadata:    metadata,
      });

      if (error) throw error;

      // También insertar en transaction_items para que PurchaseHistoryModal muestre el detalle
      if (txId) {
        const itemRows = cart.map(e => ({
          transaction_id: txId,
          product_name: e.product.name,
          quantity: e.quantity,
          unit_price: e.product.price,
          subtotal: e.product.price * e.quantity,
        }));
        const { error: itemsErr } = await supabase.from('transaction_items').insert(itemRows);
        if (itemsErr) console.warn('No se pudieron insertar items de transacción:', itemsErr.message);
      }

      // Log de sesión
      setSessionLog(prev => [
        { studentName: selectedStudent.full_name, amount: cartTotal, date: saleDate },
        ...prev,
      ]);

      toast({
        title: '✅ Venta histórica registrada',
        description: `${selectedStudent.full_name} — S/ ${cartTotal.toFixed(2)} el ${saleDate}`,
      });

      // Reset: mantener fecha sticky, limpiar alumno y carrito
      setSelectedStudent(null);
      setStudentSearch('');
      setCart([]);
      setProductSearch('');
      // Devolver foco al buscador de alumno para la siguiente entrada rápida
      setTimeout(() => studentInputRef.current?.focus(), 100);

    } catch (err: any) {
      console.error('Error registrando venta histórica:', err);
      toast({
        variant: 'destructive',
        title: 'Error al registrar',
        description: err.message || 'Inténtalo de nuevo.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5 py-2">

      {/* ── Título ── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-800 rounded-xl">
          <History className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Ventas Históricas del Kiosco</h2>
          <p className="text-xs text-slate-500">Registra ventas anotadas en cuaderno con su fecha real</p>
        </div>
      </div>

      {/* ── FECHA (sticky) ── */}
      <Card className="border border-amber-200/60 shadow-sm">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                Fecha de la Venta
              </Label>
              <Input
                type="date"
                value={saleDate}
                max={today}
                onChange={e => setSaleDate(e.target.value)}
                className="h-10 text-sm font-medium"
              />
            </div>
            <div className="flex-1 pt-5">
              <StickyDateBadge date={saleDate} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            📌 La fecha queda guardada entre ventas. Solo cámbiala cuando sea necesario.
          </p>
        </CardContent>
      </Card>

      {/* ── ALUMNO ── */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            Alumno
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4 space-y-3">
          {/* Filtro de grado */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                gradeFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              Todos
            </button>
            {uniqueGrades.map(g => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  gradeFilter === g ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Buscador de alumno */}
          <div className="relative">
            {selectedStudent ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{selectedStudent.full_name}</p>
                    <p className="text-[10px] text-emerald-600">{selectedStudent.grade} · {selectedStudent.section}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedStudent(null); setStudentSearch(''); setTimeout(() => studentInputRef.current?.focus(), 50); }}
                  className="text-emerald-400 hover:text-red-500 transition-colors p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  ref={studentInputRef}
                  placeholder={loadingStudents ? 'Cargando alumnos...' : 'Buscar alumno por nombre...'}
                  value={studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setShowStudentDropdown(true); }}
                  onFocus={() => setShowStudentDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStudentDropdown(false), 150)}
                  className="pl-9 h-10 text-sm"
                  disabled={loadingStudents}
                />
                {showStudentDropdown && filteredStudents.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filteredStudents.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={() => { setSelectedStudent(s); setStudentSearch(''); setShowStudentDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <p className="text-sm font-medium text-slate-800">{s.full_name}</p>
                        <p className="text-[11px] text-slate-400">{s.grade} · {s.section}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showStudentDropdown && studentSearch && filteredStudents.length === 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3">
                    <p className="text-xs text-slate-400 text-center">No se encontraron alumnos</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── PRODUCTOS ── */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-500" />
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4 space-y-3">
          {/* Buscador de producto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={productInputRef}
              placeholder={loadingProducts ? 'Cargando productos...' : 'Buscar y agregar producto...'}
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
              onFocus={() => setShowProductDropdown(true)}
              onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
              className="pl-9 h-10 text-sm"
              disabled={loadingProducts}
            />
            {showProductDropdown && filteredProducts.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => addToCart(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-400">{p.category}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600 shrink-0 ml-3">S/ {p.price.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Carrito */}
          {cart.length > 0 ? (
            <div className="space-y-2">
              {cart.map(entry => (
                <div key={entry.product.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{entry.product.name}</p>
                    <p className="text-[11px] text-slate-400">S/ {entry.product.price.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQty(entry.product.id, -1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-sm font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-slate-800">{entry.quantity}</span>
                    <button
                      onClick={() => updateQty(entry.product.id, 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-sm font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="w-14 text-right text-sm font-bold text-emerald-600">
                      S/ {(entry.product.price * entry.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(entry.product.id)}
                      className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 px-1">
                <p className="text-sm font-semibold text-slate-600">Total</p>
                <p className="text-xl font-bold text-slate-900">S/ {cartTotal.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-3">
              Busca y selecciona productos para agregarlos
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── BOTÓN CONFIRMAR ── */}
      <Button
        onClick={handleConfirm}
        disabled={submitting || !selectedStudent || cart.length === 0 || !saleDate}
        className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm gap-2 shadow-md"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</>
        ) : (
          <><PlusCircle className="h-4 w-4" /> Confirmar Venta Histórica · S/ {cartTotal.toFixed(2)}</>
        )}
      </Button>

      {/* ── LOG DE SESIÓN ── */}
      {sessionLog.length > 0 && (
        <Card className="border border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Registradas en esta sesión ({sessionLog.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4 space-y-1.5">
            {sessionLog.map((log, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{log.studentName}</span>
                <span className="text-slate-400 mx-2">{log.date}</span>
                <span className="font-semibold text-emerald-700">S/ {log.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-emerald-200 pt-1.5 flex justify-between text-xs font-bold">
              <span className="text-emerald-700">Total sesión</span>
              <span className="text-emerald-800">S/ {sessionLog.reduce((s, l) => s + l.amount, 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
