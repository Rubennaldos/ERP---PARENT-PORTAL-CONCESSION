import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  LogOut, 
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  User,
  Coffee,
  Cookie,
  UtensilsCrossed,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  balance: number;
  grade: string;
  section: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string | null;
  active?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const POS = () => {
  const { signOut, user } = useAuth();
  const { role } = useRole();
  const { toast } = useToast();

  // Estados
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudentResults, setShowStudentResults] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('todos');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cargar productos al inicio
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtrar productos por búsqueda y categoría
  useEffect(() => {
    let filtered = products;

    // Filtrar por categoría
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filtrar por búsqueda
    if (productSearch.trim()) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [productSearch, selectedCategory, products]);

  // Buscar estudiantes cuando se escribe
  useEffect(() => {
    if (studentSearch.trim().length >= 2) {
      searchStudents(studentSearch);
      setShowStudentResults(true);
    } else {
      setStudents([]);
      setShowStudentResults(false);
    }
  }, [studentSearch]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los productos',
      });
    }
  };

  const searchStudents = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .ilike('full_name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error('Error searching students:', error);
    }
  };

  const selectStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentSearch(student.full_name);
    setShowStudentResults(false);
    setCart([]); // Limpiar carrito al cambiar de estudiante
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }

    // Feedback visual
    toast({
      title: '✅ Agregado',
      description: `${product.name} agregado al carrito`,
      duration: 1500,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const canCheckout = () => {
    if (!selectedStudent) return false;
    if (cart.length === 0) return false;
    const total = getTotal();
    return selectedStudent.balance >= total;
  };

  const handleCheckout = async () => {
    if (!selectedStudent) return;
    if (!canCheckout()) return;

    setIsProcessing(true);

    try {
      const total = getTotal();
      const newBalance = selectedStudent.balance - total;

      // 1. Crear transacción
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
          student_id: selectedStudent.id,
          type: 'purchase',
          amount: -total,
          description: `Compra en POS - ${cart.length} items`,
          balance_after: newBalance,
          created_by: user?.id,
        })
        .select()
        .single();

      if (transError) throw transError;

      // 2. Crear items de la transacción
      const items = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // 3. Actualizar saldo del estudiante
      const { error: updateError } = await supabase
        .from('students')
        .update({ balance: newBalance })
        .eq('id', selectedStudent.id);

      if (updateError) throw updateError;

      // 4. Éxito
      toast({
        title: '✅ Venta Realizada',
        description: `Nuevo saldo: S/ ${newBalance.toFixed(2)}`,
        duration: 3000,
      });

      // 5. Limpiar y actualizar
      setSelectedStudent({ ...selectedStudent, balance: newBalance });
      setCart([]);
      setProductSearch('');

    } catch (error: any) {
      console.error('Error processing checkout:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo completar la venta: ' + error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const total = getTotal();
  const insufficientBalance = selectedStudent && (selectedStudent.balance < total);

  const categories = [
    { id: 'todos', label: 'Todos', icon: ShoppingCart },
    { id: 'bebidas', label: 'Bebidas', icon: Coffee },
    { id: 'snacks', label: 'Snacks', icon: Cookie },
    { id: 'menu', label: 'Menú', icon: UtensilsCrossed },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header Compacto */}
      <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">PUNTO DE VENTA</h1>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-slate-800">
          <LogOut className="h-5 w-5 mr-2" />
          Salir
        </Button>
      </header>

      {/* Modal de Búsqueda de Estudiante */}
      {!selectedStudent && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <User className="h-6 w-6 text-emerald-600" />
              Seleccionar Estudiante
            </h2>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Escribe el nombre del estudiante..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-12 text-lg h-14 border-2"
                autoFocus
              />
            </div>

            {showStudentResults && students.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => selectStudent(student)}
                    className="w-full p-4 hover:bg-emerald-50 border-2 border-gray-200 hover:border-emerald-500 rounded-xl text-left flex items-center gap-4 transition-all"
                  >
                    <img
                      src={student.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.full_name}`}
                      alt={student.full_name}
                      className="w-16 h-16 rounded-full border-2 border-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-lg">{student.full_name}</p>
                      <p className="text-sm text-gray-500">{student.grade} - {student.section}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Saldo</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        S/ {student.balance.toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {studentSearch.length >= 2 && students.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p>No se encontraron estudiantes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layout de 3 Zonas */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ZONA 1: BARRA LATERAL DE CATEGORÍAS (15%) */}
        <aside className="w-[15%] bg-slate-800 p-4 flex flex-col gap-2 overflow-y-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 py-6 rounded-xl font-semibold transition-all",
                  "hover:bg-slate-700 active:scale-95",
                  isActive 
                    ? "bg-emerald-500 text-white shadow-lg" 
                    : "bg-slate-700 text-gray-300"
                )}
              >
                <Icon className="h-8 w-8" />
                <span className="text-sm">{cat.label}</span>
              </button>
            );
          })}
        </aside>

        {/* ZONA 2: VITRINA DE PRODUCTOS (55%) */}
        <main className="w-[55%] bg-white flex flex-col">
          {/* Buscador de Productos */}
          <div className="p-4 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar productos..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-12 h-14 text-lg border-2"
              />
            </div>
          </div>

          {/* Grid de Productos */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Search className="h-24 w-24 mb-4 opacity-30" />
                <p className="text-xl font-semibold">No hay productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={!selectedStudent}
                    className={cn(
                      "group bg-white border-2 rounded-2xl overflow-hidden transition-all",
                      "hover:shadow-xl hover:border-emerald-500 hover:-translate-y-1",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
                      "active:scale-95 flex flex-col h-full"
                    )}
                  >
                    {/* Imagen (70% de la tarjeta) */}
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      <img
                        src={product.image_url || 'https://via.placeholder.com/300x300?text=Producto'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    
                    {/* Info (30% de la tarjeta) */}
                    <div className="p-3 flex-1 flex flex-col">
                      <h3 className="font-bold text-sm mb-1 line-clamp-2 flex-1">
                        {product.name}
                      </h3>
                      <p className="text-2xl font-black text-emerald-600">
                        S/ {product.price.toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* ZONA 3: TICKET / CARRITO (30%) */}
        <aside className="w-[30%] bg-slate-50 flex flex-col border-l-2 border-slate-200">
          {/* Info del Estudiante */}
          {selectedStudent && (
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4">
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={selectedStudent.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudent.full_name}`}
                  alt={selectedStudent.full_name}
                  className="w-14 h-14 rounded-full border-2 border-white"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-base">{selectedStudent.full_name}</h3>
                  <p className="text-xs text-emerald-100">{selectedStudent.grade} - {selectedStudent.section}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearch('');
                    setCart([]);
                  }}
                  className="hover:bg-emerald-700 p-2 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex justify-between items-center bg-emerald-700/50 rounded-lg px-3 py-2">
                <span className="text-sm">SALDO DISPONIBLE</span>
                <span className="text-2xl font-black">S/ {selectedStudent.balance.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Items del Carrito */}
          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="h-20 w-20 mb-3 opacity-30" />
                <p className="font-semibold">Carrito vacío</p>
                <p className="text-sm text-center mt-1">Toca un producto para agregarlo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-3 flex items-center gap-3"
                  >
                    <img
                      src={item.product.image_url || 'https://via.placeholder.com/80'}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-gray-500">S/ {item.product.price.toFixed(2)} c/u</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">
                        S/ {(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center font-black text-lg">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-md hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-full py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-3 w-3 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total y Botón Cobrar */}
          {cart.length > 0 && (
            <div className="bg-white border-t-2 border-slate-300 p-4 space-y-3">
              {/* Total */}
              <div className="bg-slate-900 text-white rounded-xl p-4">
                <p className="text-sm mb-1">TOTAL A PAGAR</p>
                <p className="text-5xl font-black">S/ {total.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-2">{cart.length} productos</p>
              </div>

              {/* Validación */}
              {selectedStudent && insufficientBalance && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-800 text-sm">Saldo Insuficiente</p>
                    <p className="text-xs text-red-600">Falta: S/ {(total - selectedStudent.balance).toFixed(2)}</p>
                  </div>
                </div>
              )}

              {selectedStudent && !insufficientBalance && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-800 text-sm">Saldo OK</p>
                    <p className="text-xs text-emerald-600">
                      Saldo después: S/ {(selectedStudent.balance - total).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Botón Cobrar */}
              <Button
                onClick={handleCheckout}
                disabled={!canCheckout() || isProcessing}
                className={cn(
                  "w-full h-16 text-xl font-black rounded-xl shadow-lg",
                  "bg-emerald-500 hover:bg-emerald-600 active:scale-95",
                  "disabled:bg-gray-300 disabled:cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <span>PROCESANDO...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    COBRAR
                  </>
                )}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default POS;
