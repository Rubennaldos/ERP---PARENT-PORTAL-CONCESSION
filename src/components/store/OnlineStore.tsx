import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  ChevronDown,
  User,
} from 'lucide-react';

// ─── tipos ─────────────────────────────────────────────────────────────────

interface StoreProduct {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  price_sale: number;
  image_url?: string | null;
}

interface CartItem extends StoreProduct {
  qty: number;
}

interface StudentOption {
  id: string;
  full_name: string;
  school_id?: string | null;
}

interface OnlineStoreProps {
  /** auth.uid() del usuario logueado (padre o profesor) */
  userId: string;
  userName?: string;
  schoolId?: string | null;
  /** 'parent' o 'teacher' para saber cómo insertar la deuda */
  userType: 'parent' | 'teacher';
  /**
   * Solo para padres: lista de alumnos vinculados.
   * Si hay más de uno, aparece un selector antes de poder hacer el pedido.
   */
  students?: StudentOption[];
  /**
   * Solo para profesores: teacher_profiles.id
   * (distinto al auth.uid; necesario para transactions.teacher_id)
   */
  teacherProfileId?: string | null;
}

// ─── emoji por categoría ────────────────────────────────────────────────────

const categoryEmoji: Record<string, string> = {
  bebidas: '🥤',
  dulces: '🍬',
  frutas: '🍎',
  menu: '🍽️',
  snacks: '🍿',
  lacteos: '🥛',
  panadería: '🥐',
  default: '📦',
};

function getCategoryEmoji(cat: string) {
  return categoryEmoji[cat.toLowerCase()] ?? categoryEmoji.default;
}

// ─── componente ─────────────────────────────────────────────────────────────

export function OnlineStore({
  userId,
  userName,
  schoolId,
  userType,
  students = [],
  teacherProfileId,
}: OnlineStoreProps) {
  const { toast } = useToast();
  const [products, setProducts]           = useState<StoreProduct[]>([]);
  const [loading, setLoading]             = useState(true);
  const [placing, setPlacing]             = useState(false);
  const [cart, setCart]                   = useState<Map<string, CartItem>>(new Map());
  const [orderPlaced, setOrderPlaced]     = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Selector de alumno (para padres con varios hijos)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students.length === 1 ? students[0].id : ''
  );
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  // Derivar el schoolId efectivo del alumno seleccionado
  const effectiveSchoolId =
    userType === 'parent'
      ? students.find(s => s.id === selectedStudentId)?.school_id ?? schoolId
      : schoolId;

  // ── fetch productos ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchOnlineProducts();
  }, []);

  const fetchOnlineProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category, price_sale, image_url')
        .eq('available_online', true)
        .eq('active', true)
        .order('category')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al cargar la tienda', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── carrito ─────────────────────────────────────────────────────────────

  const addToCart = (product: StoreProduct) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      next.set(product.id, existing
        ? { ...existing, qty: existing.qty + 1 }
        : { ...product, qty: 1 }
      );
      return next;
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart(prev => {
      const next = new Map(prev);
      const item = next.get(productId);
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) next.delete(productId);
      else next.set(productId, { ...item, qty: newQty });
      return next;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => { const next = new Map(prev); next.delete(productId); return next; });
  };

  const cartItems  = Array.from(cart.values());
  const cartTotal  = cartItems.reduce((s, i) => s + i.price_sale * i.qty, 0);
  const cartCount  = cartItems.reduce((s, i) => s + i.qty, 0);

  // ── categorías ──────────────────────────────────────────────────────────
  const categories    = ['todos', ...Array.from(new Set(products.map(p => p.category)))];
  const visibleProducts = selectedCategory === 'todos'
    ? products
    : products.filter(p => p.category === selectedCategory);

  // ── validación antes de pedir ───────────────────────────────────────────
  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null;
  const canOrder = userType === 'teacher'
    ? !!teacherProfileId
    : !!selectedStudentId;

  // ── hacer pedido (Fase 2: RPC atómica) ──────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!canOrder) {
      toast({
        variant: 'destructive',
        title: userType === 'parent' ? 'Selecciona un alumno' : 'Error de perfil',
        description: userType === 'parent'
          ? 'Elige para cuál de tus hijos es el pedido.'
          : 'No se encontró el perfil de profesor.',
      });
      return;
    }
    if (cartItems.length === 0) return;

    setPlacing(true);
    try {
      const itemsPayload = cartItems.map(i => ({
        productId:   i.id,
        productName: i.name,
        qty:         i.qty,
        unitPrice:   i.price_sale,
        subtotal:    +(i.price_sale * i.qty).toFixed(2),
      }));

      const { data, error } = await supabase.rpc('place_online_order', {
        p_user_id:    userId,
        p_user_name:  userName || 'Usuario',
        p_school_id:  effectiveSchoolId || null,
        p_user_type:  userType,
        p_student_id:    userType === 'parent'   ? selectedStudentId  : null,
        p_teacher_id:    userType === 'teacher'  ? teacherProfileId   : null,
        p_total:      +cartTotal.toFixed(2),
        p_items:      itemsPayload,
        p_notes:      null,
      });

      if (error) throw error;

      const result = data as { success: boolean; order_id: string; transaction_id: string; ticket_code: string };

      // Limpiar carrito y mostrar confirmación
      setCart(new Map());
      setOrderPlaced(true);
      setTimeout(() => setOrderPlaced(false), 5000);

      toast({
        title: '¡Pedido enviado a cocina! 🍽️',
        description: `Ticket ${result.ticket_code} — S/ ${cartTotal.toFixed(2)}. La deuda quedó registrada en tu módulo de pagos.`,
      });
    } catch (err: any) {
      console.error('❌ Error al hacer pedido:', err);
      toast({
        variant: 'destructive',
        title: 'Error al procesar el pedido',
        description: err.message || 'Intenta de nuevo o contacta al administrador.',
      });
    } finally {
      setPlacing(false);
    }
  };

  // ── estados de carga ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
        <p className="text-sm text-muted-foreground">Cargando tienda virtual…</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
        <Package className="h-16 w-16 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-700">La tienda está vacía</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          El administrador aún no ha publicado productos en la tienda virtual. Vuelve pronto.
        </p>
      </div>
    );
  }

  // ── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="pb-44">

      {/* ── Cabecera + selector de alumno ────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-violet-100 px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-violet-600" />
              Tienda Virtual
            </h2>
            <p className="text-xs text-muted-foreground">{products.length} productos disponibles</p>
          </div>
          {cartCount > 0 && (
            <div className="relative">
              <ShoppingCart className="h-7 w-7 text-violet-600" />
              <span className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </div>
          )}
        </div>

        {/* Selector de alumno solo para padres con +1 hijo */}
        {userType === 'parent' && students.length > 1 && (
          <div className="relative mb-2">
            <button
              onClick={() => setShowStudentPicker(v => !v)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedStudentId
                  ? 'border-violet-400 bg-violet-50 text-violet-900'
                  : 'border-amber-400 bg-amber-50 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0" />
                {selectedStudentId
                  ? <span>Pedido para: <strong>{selectedStudent?.full_name}</strong></span>
                  : <span className="text-amber-700">⚠ Selecciona para cuál de tus hijos</span>
                }
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showStudentPicker ? 'rotate-180' : ''}`} />
            </button>

            {showStudentPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-violet-200 rounded-xl shadow-lg z-30 overflow-hidden">
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStudentId(s.id); setShowStudentPicker(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-violet-50 transition ${
                      selectedStudentId === s.id ? 'bg-violet-50 font-bold text-violet-800' : 'text-gray-800'
                    }`}
                  >
                    {s.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aviso para padre con un solo hijo */}
        {userType === 'parent' && students.length === 1 && (
          <div className="flex items-center gap-1.5 text-[11px] text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1 mb-1">
            <User className="h-3 w-3 shrink-0" />
            <span>Pedido para: <strong>{students[0].full_name}</strong></span>
          </div>
        )}

        {/* Filtro de categoría */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mt-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1 shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                selectedCategory === cat
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'
              }`}
            >
              {cat !== 'todos' && <span>{getCategoryEmoji(cat)}</span>}
              <span className="capitalize">{cat === 'todos' ? '🏪 Todos' : cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Banner de confirmación ────────────────────────────────────────── */}
      {orderPlaced && (
        <div className="mx-4 mt-4 flex items-center gap-3 bg-green-50 border border-green-300 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-900 text-sm">¡Pedido enviado a cocina!</p>
            <p className="text-xs text-green-700">La deuda quedó registrada y puedes verla en tu módulo de Pagos.</p>
          </div>
        </div>
      )}

      {/* ── Grilla de productos ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4 pt-4">
        {visibleProducts.map(product => {
          const inCart = cart.get(product.id);
          return (
            <Card
              key={product.id}
              className={`overflow-hidden border transition-all ${
                inCart
                  ? 'border-violet-400 shadow-md shadow-violet-100'
                  : 'border-gray-200 hover:border-violet-300 hover:shadow-sm'
              }`}
            >
              {/* Imagen / placeholder */}
              <div className="relative bg-gradient-to-br from-violet-50 to-indigo-50 aspect-square flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-5xl select-none">{getCategoryEmoji(product.category)}</span>
                )}
                {inCart && (
                  <div className="absolute top-1.5 right-1.5 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    ×{inCart.qty}
                  </div>
                )}
              </div>

              <CardContent className="p-2.5 space-y-2">
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{product.name}</p>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 mt-0.5 capitalize">
                    {getCategoryEmoji(product.category)} {product.category}
                  </Badge>
                </div>

                <p className="text-base font-black text-violet-700">
                  S/ {product.price_sale.toFixed(2)}
                </p>

                {/* Control de cantidad */}
                {inCart ? (
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => changeQty(product.id, -1)}
                      className="w-7 h-7 rounded-full border-2 border-violet-300 flex items-center justify-center text-violet-600 hover:bg-violet-100 transition"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 min-w-[1.5rem] text-center">
                      {inCart.qty}
                    </span>
                    <button
                      onClick={() => changeQty(product.id, +1)}
                      className="w-7 h-7 rounded-full border-2 border-violet-500 bg-violet-500 flex items-center justify-center text-white hover:bg-violet-600 transition"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-700"
                    onClick={() => addToCart(product)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Carrito flotante ─────────────────────────────────────────────── */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 z-30 px-4">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-violet-200 overflow-hidden">

            {/* Items */}
            <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 px-4 pt-3">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1.5">
                  <span className="text-lg">{getCategoryEmoji(item.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.qty} × S/ {item.price_sale.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-violet-700 shrink-0">
                    S/ {(item.price_sale * item.qty).toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-300 hover:text-red-400 transition"
                    disabled={placing}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer del carrito */}
            <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border-t border-violet-100">
              <div>
                {/* Aviso si padre no seleccionó alumno */}
                {userType === 'parent' && !selectedStudentId && (
                  <p className="text-[10px] text-amber-600 font-semibold mb-0.5">
                    ⚠ Selecciona un alumno arriba
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">{cartCount} producto(s)</p>
                <p className="text-base font-black text-violet-700">S/ {cartTotal.toFixed(2)}</p>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={placing || !canOrder}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 rounded-xl disabled:opacity-60"
                size="lg"
              >
                {placing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Hacer Pedido
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
