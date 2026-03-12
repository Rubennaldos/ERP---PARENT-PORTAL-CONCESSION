import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserProfileMenu } from '@/components/admin/UserProfileMenu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ShoppingCart, 
  LogOut, 
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Check,
  User,
  Coffee,
  Cookie,
  UtensilsCrossed,
  X,
  Printer,
  Receipt,
  Users,
  Maximize2,
  Gift,
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Banknote,
  Loader2,
  Apple,
  Sandwich,
  Cake,
  IceCream,
  Pizza,
  Salad,
  Beef,
  Fish,
  Egg,
  Milk,
  Wine,
  Beer,
  Grape,
  Cherry,
  Package,
  PackageOpen,
  Box,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getProductsForSchool } from '@/lib/productPricing';
import { printPOSSale } from '@/lib/posPrinterService';
import { CashOpeningModal } from '@/components/cash-register/CashOpeningModal';

interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  balance: number;
  grade: string;
  section: string;
  school_id?: string;
  free_account?: boolean;
  kiosk_disabled?: boolean;
  limit_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
}

interface Product {
  id: string;
  barcode?: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string | null;
  active?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// Función para asignar iconos a categorías dinámicamente
const getCategoryIcon = (categoryName: string) => {
  if (!categoryName) return ShoppingCart;
  const name = categoryName.toLowerCase();
  
  // Bebidas
  if (name.includes('bebida') || name.includes('refresco') || name.includes('jugo')) {
    if (name.includes('caliente') || name.includes('café') || name.includes('té')) return Coffee;
    if (name.includes('alcoh') || name.includes('cerveza')) return Beer;
    if (name.includes('vino')) return Wine;
    return Coffee; // Bebidas genéricas
  }
  
  // Snacks y dulces
  if (name.includes('snack') || name.includes('golosina') || name.includes('galleta')) return Cookie;
  if (name.includes('dulce') || name.includes('caramelo') || name.includes('chocolate')) return Gift;
  if (name.includes('helado') || name.includes('postre frio')) return IceCream;
  
  // Comidas
  if (name.includes('almuerzo') || name.includes('menú') || name.includes('comida')) return UtensilsCrossed;
  if (name.includes('sandwich') || name.includes('bocadillo')) return Sandwich;
  if (name.includes('pizza')) return Pizza;
  if (name.includes('ensalada') || name.includes('saludable')) return Salad;
  if (name.includes('carne') || name.includes('pollo')) return Beef;
  if (name.includes('pescado') || name.includes('mariscos')) return Fish;
  if (name.includes('huevo') || name.includes('tortilla')) return Egg;
  
  // Postres
  if (name.includes('postre') || name.includes('torta') || name.includes('pastel') || name.includes('queque')) return Cake;
  
  // Lácteos
  if (name.includes('leche') || name.includes('yogurt') || name.includes('lácteo')) return Milk;
  
  // Frutas
  if (name.includes('fruta')) return Apple;
  if (name.includes('uva')) return Grape;
  if (name.includes('cereza') || name.includes('fresa')) return Cherry;
  
  // Productos empacados
  if (name.includes('empaque') || name.includes('paquete')) return Package;
  if (name.includes('caja')) return Box;
  
  // Default
  return PackageOpen;
};

const POS = () => {
  const { signOut, user } = useAuth();
  const { role } = useRole();
  const { full_name } = useUserProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── NFC POS Refs & Estados ──
  const nfcPosBuffer = useRef('');
  const nfcPosTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nfcPosLastKeyTime = useRef<number>(0);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);

  console.log('🏪 POS - Componente montado');
  console.log('👤 POS - Usuario:', user?.email);
  console.log('🎭 POS - Rol:', role);

  // Estado para la sede del usuario (cajero)
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);

  // ── Guard de caja ────────────────────────────────────────────────
  const [cashGuardLoading, setCashGuardLoading] = useState(true);
  const [posOpenRegister, setPosOpenRegister] = useState<any | null>(null);
  const [posHasUnclosed, setPosHasUnclosed] = useState(false);
  const [posPreviousUnclosed, setPosPreviousUnclosed] = useState<any | null>(null);
  const [posLastClosedAmount, setPosLastClosedAmount] = useState<number | null>(null);

  // Estados de cliente
  const [clientMode, setClientMode] = useState<'student' | 'generic' | 'teacher' | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentAccountStatuses, setStudentAccountStatuses] = useState<Map<string, { canPurchase: boolean; statusText: string; statusColor: string; reason?: string; limitInfo?: { hasLimit: boolean; limitType: string; limitAmount: number; spentAmount: number; remaining: number; periodText: string; renewalText: string } }>>(new Map());
  const [showStudentResults, setShowStudentResults] = useState(false);
  // Estado del tope del estudiante seleccionado (para validación en tiempo real)
  const [selectedStudentLimitInfo, setSelectedStudentLimitInfo] = useState<{ hasLimit: boolean; limitType: string; limitAmount: number; spentAmount: number; remaining: number; periodText: string; renewalText: string } | null>(null);

  // Estados de profesor
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showTeacherResults, setShowTeacherResults] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false); // Para ampliar foto del estudiante

  // Estados de productos
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [combos, setCombos] = useState<any[]>([]); // Combos activos

  // Estados de carrito y venta
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Estados de pago mejorados (Cliente Genérico)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null); // 'efectivo', 'yape_qr', 'yape_numero', 'plin_qr', 'plin_numero', 'tarjeta', 'transferencia', 'mixto'
  const [yapeNumber, setYapeNumber] = useState('');
  const [plinNumber, setPlinNumber] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCreditConfirmDialog, setShowCreditConfirmDialog] = useState(false); // Modal para cuenta de crédito

  // NUEVO: Campo "Con cuánto paga" para calcular vuelto
  const [cashGiven, setCashGiven] = useState('');

  // NUEVO: Pago Mixto
  interface PaymentSplit {
    method: string;
    amount: number;
  }
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [currentSplitMethod, setCurrentSplitMethod] = useState('');
  const [currentSplitAmount, setCurrentSplitAmount] = useState('');

  // NUEVO: Modal para seleccionar tipo de comprobante
  const [showDocumentTypeDialog, setShowDocumentTypeDialog] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');

  // Estado de ticket generado
  const [showTicketPrint, setShowTicketPrint] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  // --- CATEGORÍAS DINÁMICAS ---
  const [orderedCategories, setOrderedCategories] = useState<Array<{ id: string; label: string; icon: any }>>([
    { id: 'todos', label: 'Todos', icon: ShoppingCart },
  ]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Generar categorías dinámicamente desde productos
  useEffect(() => {
    if (products.length === 0) return;

    // Extraer categorías únicas
    const uniqueCategories = Array.from(
      new Set(products.map(p => p.category).filter(Boolean))
    ).sort();

    // Crear categorías con iconos inteligentes
    const dynamicCategories = [
      { id: 'todos', label: 'Todos', icon: ShoppingCart },
      ...uniqueCategories.map(cat => ({
        id: cat,
        label: cat,
        icon: getCategoryIcon(cat)
      }))
    ];

    console.log('📂 Categorías generadas:', dynamicCategories);
    setOrderedCategories(dynamicCategories);

    // Intentar restaurar orden guardado
    const savedOrder = localStorage.getItem('pos_category_order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        const reordered = orderIds
          .map((id: string) => dynamicCategories.find(c => c.id === id))
          .filter(Boolean);

        // Agregar nuevas categorías que no estaban guardadas
        dynamicCategories.forEach(c => {
          if (!orderIds.includes(c.id)) reordered.push(c);
        });

        setOrderedCategories(reordered);
      } catch (e) {
        console.error('Error cargando orden de categorías:', e);
      }
    }
  }, [products]);

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      const target = e.target as HTMLElement;
      target.style.opacity = '0.4';
    }
  };

  const onDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedItemIndex(null);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newList = [...orderedCategories];
    const draggedItem = newList[draggedItemIndex];
    newList.splice(draggedItemIndex, 1);
    newList.splice(index, 0, draggedItem);
    
    setDraggedItemIndex(index);
    setOrderedCategories(newList);
    localStorage.setItem('pos_category_order', JSON.stringify(newList.map(c => c.id)));
  };

  // Cargar productos al inicio
  useEffect(() => {
    fetchProducts();
    fetchCombos();
  }, []);

  // Filtrar productos
  useEffect(() => {
    let filtered = products;

    // Si se selecciona la categoría de combos
    if (selectedCategory === 'combos') {
      setFilteredProducts([]); // No mostramos productos normales, solo combos
      return;
    }

    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (productSearch.trim()) {
      filtered = filtered.filter(p => 
        (p.name || '').toLowerCase().includes(productSearch.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [productSearch, selectedCategory, products]);

  // Buscar estudiantes
  useEffect(() => {
    if (clientMode === 'student' && studentSearch.trim().length >= 2) {
      searchStudents(studentSearch);
      setShowStudentResults(true);
    } else {
      setStudents([]);
      setShowStudentResults(false);
    }
  }, [studentSearch, clientMode]);

  // Buscar profesores
  useEffect(() => {
    if (clientMode === 'teacher' && teacherSearch.trim().length >= 2) {
      searchTeachers(teacherSearch);
      setShowTeacherResults(true);
    } else {
      setTeachers([]);
      setShowTeacherResults(false);
    }
  }, [teacherSearch, clientMode]);

  // Efecto para Escucha Global de Teclado (Pistola de Código de Barras + Atajos)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Si estamos en un modo de venta
      if (clientMode) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        // ⌨️ ATAJOS DE TECLADO
        
        // ENTER → Cobrar (finalizar compra) - SOLO si NO estás escribiendo en un input
        if (e.key === 'Enter' && cart.length > 0 && clientMode && !isInput) {
          e.preventDefault();
          // Verificar si se puede hacer checkout
          const canProceed = 
            (clientMode === 'generic') || 
            (clientMode === 'student' && selectedStudent && (
              selectedStudent.free_account || selectedStudent.balance >= getTotal()
            ));
          
          if (canProceed) {
            handleCheckoutClick();
          }
          return;
        }

        // + (teclado numérico) → Aumentar cantidad del primer item del carrito
        if ((e.key === '+' || e.key === 'Add') && cart.length > 0 && !isInput) {
          e.preventDefault();
          const firstItem = cart[0];
          setCart(cart.map((item, idx) => 
            idx === 0 ? { ...item, quantity: item.quantity + 1 } : item
          ));
          return;
        }

        // - (teclado numérico) → Disminuir cantidad del primer item del carrito
        if ((e.key === '-' || e.key === 'Subtract') && cart.length > 0 && !isInput) {
          e.preventDefault();
          const firstItem = cart[0];
          if (firstItem.quantity > 1) {
            setCart(cart.map((item, idx) => 
              idx === 0 ? { ...item, quantity: item.quantity - 1 } : item
            ));
          } else {
            // Si cantidad es 1, eliminar el item
            setCart(cart.filter((_, idx) => idx !== 0));
          }
          return;
        }

        // DELETE o D → Borrar primer producto del carrito
        if ((e.key === 'Delete' || e.key.toLowerCase() === 'd') && cart.length > 0 && !isInput) {
          e.preventDefault();
          setCart(cart.filter((_, idx) => idx !== 0));
          return;
        }

        // Si no estamos escribiendo en un cuadro de texto y presionamos una tecla alfanumérica
        // O si es una pistola que envía prefijos, esto capturará la primera tecla y enfocará
        if (!isInput && /^[a-zA-Z0-9]$/.test(e.key)) {
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [clientMode, cart, selectedStudent]);

  // Auto-focus cuando se selecciona un cliente
  useEffect(() => {
    if (clientMode === 'generic' || selectedStudent) {
      // Dar un pequeño respiro para que el DOM se actualice
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
    }
  }, [clientMode, selectedStudent]);

  // ── Verificar estado de caja cuando cambia la sede ──────────────
  useEffect(() => {
    const checkCash = async () => {
      if (!userSchoolId) return;
      setCashGuardLoading(true);
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: openRegs } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('school_id', userSchoolId)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1);

        const current = openRegs?.[0] || null;
        if (current) {
          const openedDate = new Date(current.opened_at);
          openedDate.setHours(0, 0, 0, 0);
          if (openedDate < todayStart) {
            setPosHasUnclosed(true);
            setPosPreviousUnclosed(current);
            setPosOpenRegister(null);
          } else {
            setPosOpenRegister(current);
            setPosHasUnclosed(false);
            setPosPreviousUnclosed(null);
          }
        } else {
          setPosOpenRegister(null);
          const { data: unclosed } = await supabase
            .from('cash_registers')
            .select('*')
            .eq('school_id', userSchoolId)
            .eq('status', 'open')
            .lt('opened_at', todayStart.toISOString())
            .order('opened_at', { ascending: false })
            .limit(1);
          if (unclosed && unclosed.length > 0) {
            setPosHasUnclosed(true);
            setPosPreviousUnclosed(unclosed[0]);
          } else {
            setPosHasUnclosed(false);
            setPosPreviousUnclosed(null);
          }
        }

        // Último cierre para referencia
        const { data: lastClosure } = await supabase
          .from('cash_closures')
          .select('actual_final')
          .eq('school_id', userSchoolId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setPosLastClosedAmount(lastClosure?.actual_final ?? null);
      } finally {
        setCashGuardLoading(false);
      }
    };
    checkCash();
  }, [userSchoolId]);

  const fetchProducts = async () => {
    console.log('🔵 POS - Iniciando carga de productos...');
    try {
      // Obtener el school_id del usuario actual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.warn('⚠️ POS - No se pudo obtener school_id del usuario, usando precios base');
      }

      const schoolId = profile?.school_id || null;
      console.log('🏫 POS - Sede del usuario:', schoolId);
      
      // Guardar el school_id del usuario para filtrar estudiantes
      setUserSchoolId(schoolId);

      // Usar la función de pricing inteligente
      const productsData = await getProductsForSchool(schoolId);
      
      console.log('📦 POS - Productos recibidos:', productsData.length);
      console.log('💰 POS - Productos con precio personalizado:', productsData.filter(p => p.is_custom_price).length);
      
      setProducts(productsData);
      setFilteredProducts(productsData);
      console.log('✅ POS - Productos cargados correctamente con precios de sede');
    } catch (error: any) {
      console.error('💥 POS - Error crítico cargando productos:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los productos: ' + error.message,
      });
    }
  };

  const fetchCombos = async () => {
    try {
      // Obtener el school_id del usuario actual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (profileError || !profile?.school_id) {
        console.warn('⚠️ POS - No se pudo obtener school_id para filtrar combos');
        return;
      }

      const { data, error } = await supabase
        .from('combos')
        .select('*')
        .eq('active', true)
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching combos:', error);
        return;
      }

      // Cargar items de cada combo
      const combosWithItems = await Promise.all(
        (data || []).map(async (combo) => {
          const { data: items } = await supabase
            .from('combo_items')
            .select('quantity, product_id')
            .eq('combo_id', combo.id);

          const productIds = (items || []).map(item => item.product_id);
          
          if (productIds.length === 0) {
            return { ...combo, combo_items: [] };
          }

          const { data: products } = await supabase
            .from('products')
            .select('id, name, price_sale, has_stock')
            .in('id', productIds);

          const combo_items = (items || []).map(item => ({
            quantity: item.quantity,
            product: products?.find(p => p.id === item.product_id)
          }));

          return { ...combo, combo_items };
        })
      );

      // Filtrar combos que aplican a esta sede
      const filteredCombos = combosWithItems.filter(combo => {
        if (!combo.school_ids || combo.school_ids.length === 0) return true;
        return combo.school_ids.includes(profile.school_id);
      });

      setCombos(filteredCombos);
      
      // Si hay combos, agregar categoría
      if (filteredCombos.length > 0) {
        setOrderedCategories(prev => {
          const hasComboCategory = prev.some(c => c.id === 'combos');
          if (!hasComboCategory) {
            return [
              ...prev,
              { id: 'combos', label: 'Combos', icon: Gift }
            ];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error cargando combos:', error);
    }
  };

  const searchStudents = async (query: string) => {
    try {
      console.log('🔍 Buscando estudiantes con query:', query);
      console.log('🏫 Filtrando por sede:', userSchoolId);
      
      // Construir la consulta base
      let studentsQuery = supabase
        .from('students')
        .select('id, full_name, photo_url, balance, grade, section, free_account, limit_type, daily_limit, weekly_limit, monthly_limit, school_id')
        .eq('is_active', true)
        .ilike('full_name', `%${query}%`);
      
      // Si el usuario tiene una sede asignada, filtrar solo estudiantes de esa sede
      if (userSchoolId) {
        studentsQuery = studentsQuery.eq('school_id', userSchoolId);
        console.log('✅ Aplicando filtro de sede:', userSchoolId);
      } else {
        console.warn('⚠️ Usuario sin sede asignada, mostrando todos los estudiantes');
      }
      
      const { data, error } = await studentsQuery.limit(5);

      if (error) {
        console.error('❌ Error en consulta de estudiantes:', error);
        throw error;
      }

      console.log('✅ Estudiantes encontrados:', data?.length || 0);
      setStudents(data || []);

      // Calcular estado de cuenta para cada estudiante (con manejo robusto de errores)
      if (data && data.length > 0) {
        const statusMap = new Map();
        
        // Procesar cada estudiante de forma segura
        const statusPromises = data.map(async (student) => {
          try {
            const status = await getAccountStatus(student);
            statusMap.set(student.id, status);
          } catch (err) {
            console.warn(`⚠️ Error calculando estado para ${student.full_name}:`, err);
            // Estado por defecto si falla
            statusMap.set(student.id, {
              canPurchase: true,
              statusText: `💰 Saldo: S/ ${student.balance?.toFixed(2) || '0.00'}`,
              statusColor: 'text-emerald-600'
            });
          }
        });

        await Promise.all(statusPromises);
        setStudentAccountStatuses(statusMap);
      }
    } catch (error: any) {
      console.error('❌ Error crítico buscando estudiantes:', error);
      console.error('Detalles del error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        variant: 'destructive',
        title: 'Error al buscar estudiantes',
        description: error.message || 'No se pudo realizar la búsqueda'
      });
    }
  };

  const searchTeachers = async (query: string) => {
    try {
      console.log('🔍 Buscando profesores con query:', query);
      console.log('🏫 Filtrando por sede:', userSchoolId);
      
      // Construir la consulta base
      let teachersQuery = supabase
        .from('teacher_profiles_with_schools')
        .select('*')
        .ilike('full_name', `%${query}%`);
      
      // Si el usuario tiene una sede asignada, filtrar profesores de esa sede
      if (userSchoolId) {
        teachersQuery = teachersQuery.or(`school_1_id.eq.${userSchoolId},school_2_id.eq.${userSchoolId}`);
        console.log('✅ Aplicando filtro de sede:', userSchoolId);
      } else {
        console.warn('⚠️ Usuario sin sede asignada, mostrando todos los profesores');
      }
      
      const { data, error } = await teachersQuery.limit(5);

      if (error) {
        console.error('❌ Error en consulta de profesores:', error);
        throw error;
      }

      console.log('✅ Profesores encontrados:', data?.length || 0);
      // Filtrar entradas con full_name nulo para evitar errores de render
      setTeachers((data || []).filter(t => t && t.full_name != null));
    } catch (error: any) {
      console.error('❌ Error crítico buscando profesores:', error);
      toast({
        variant: 'destructive',
        title: 'Error al buscar profesores',
        description: error.message || 'No se pudo realizar la búsqueda'
      });
    }
  };

  // ✅ Función helper para calcular la info de tope de un estudiante
  const calculateLimitInfo = async (student: Student): Promise<{
    hasLimit: boolean;
    limitType: string;
    limitAmount: number;
    spentAmount: number;
    remaining: number;
    periodText: string;
    renewalText: string;
  } | null> => {
    if (!student.limit_type || student.limit_type === 'none') return null;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    let limitAmount = 0;
    let spentAmount = 0;
    let periodText = '';
    let renewalText = '';
    let dateFilter = '';

    switch (student.limit_type) {
      case 'daily': {
        limitAmount = student.daily_limit || 0;
        dateFilter = today;
        periodText = 'Diario';
        renewalText = 'Se renueva hoy a las 00:00 hrs';
        const { data } = await supabase
          .from('transactions')
          .select('amount')
          .eq('student_id', student.id)
          .eq('type', 'purchase')
          .gte('created_at', today);
        spentAmount = data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        break;
      }
      case 'weekly': {
        limitAmount = student.weekly_limit || 0;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
        startOfWeek.setHours(0, 0, 0, 0);
        const nextMonday = new Date(startOfWeek);
        nextMonday.setDate(nextMonday.getDate() + 7);
        periodText = 'Semanal';
        renewalText = `Se renueva el ${nextMonday.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}`;
        const { data } = await supabase
          .from('transactions')
          .select('amount')
          .eq('student_id', student.id)
          .eq('type', 'purchase')
          .gte('created_at', startOfWeek.toISOString());
        spentAmount = data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        break;
      }
      case 'monthly': {
        limitAmount = student.monthly_limit || 0;
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        periodText = 'Mensual';
        renewalText = `Se renueva el ${startOfNextMonth.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}`;
        const { data } = await supabase
          .from('transactions')
          .select('amount')
          .eq('student_id', student.id)
          .eq('type', 'purchase')
          .gte('created_at', startOfMonth.toISOString());
        spentAmount = data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        break;
      }
    }

    if (limitAmount <= 0) return null;

    return {
      hasLimit: true,
      limitType: student.limit_type,
      limitAmount,
      spentAmount,
      remaining: Math.max(0, limitAmount - spentAmount),
      periodText,
      renewalText,
    };
  };

  // ✅ Función helper para determinar el estado de cuenta del estudiante
  const getAccountStatus = async (student: Student): Promise<{
    canPurchase: boolean;
    statusText: string;
    statusColor: string;
    reason?: string;
    limitInfo?: {
      hasLimit: boolean;
      limitType: string;
      limitAmount: number;
      spentAmount: number;
      remaining: number;
      periodText: string;
      renewalText: string;
    };
  }> => {
    // ─── 1. VERIFICAR TOPES (aplica tanto a Cuenta Libre como Con Recargas) ───
    if (student.limit_type && student.limit_type !== 'none') {
      try {
        const limitInfo = await calculateLimitInfo(student);
        
        if (limitInfo) {
          const { remaining, limitAmount, spentAmount, periodText, renewalText } = limitInfo;

          if (remaining <= 0) {
            return {
              canPurchase: false,
              statusText: `🚫 Tope ${periodText} Alcanzado (S/ ${spentAmount.toFixed(2)} de S/ ${limitAmount.toFixed(2)})`,
              statusColor: 'text-red-600',
              reason: `Límite ${periodText.toLowerCase()} de S/ ${limitAmount.toFixed(2)} alcanzado. ${renewalText}`,
              limitInfo,
            };
          }

          // Tiene tope pero aún le queda
          const percentUsed = spentAmount / limitAmount;
          const color = percentUsed >= 0.8 ? 'text-orange-600' : percentUsed >= 0.5 ? 'text-amber-600' : 'text-blue-600';
          
          return {
            canPurchase: true,
            statusText: `📊 Tope ${periodText}: Queda S/ ${remaining.toFixed(2)} de S/ ${limitAmount.toFixed(2)}`,
            statusColor: color,
            limitInfo,
          };
        }
      } catch (error) {
        console.error('Error calculating limits:', error);
      }
    }

    // ─── 2. Cuenta Libre sin topes ───
    if (student.free_account) {
      return {
        canPurchase: true,
        statusText: '✨ Cuenta Libre - Sin tope',
        statusColor: 'text-emerald-600'
      };
    }

    // ─── 3. Con Recargas (sin cuenta libre) ───
    const balance = student.balance || 0;
    
    if (balance <= 0) {
      return {
        canPurchase: false,
        statusText: '💳 Sin Saldo - S/ 0.00',
        statusColor: 'text-red-600',
        reason: 'Sin saldo disponible'
      };
    }

    // 4. Sin límites pero con saldo (default)
    return {
      canPurchase: true,
      statusText: `💰 Saldo: S/ ${balance.toFixed(2)}`,
      statusColor: 'text-emerald-600'
    };
  };

  const selectStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentSearch(student.full_name);
    setShowStudentResults(false);
    // Guardar la info de tope del estudiante seleccionado
    const statusInfo = studentAccountStatuses.get(student.id);
    setSelectedStudentLimitInfo(statusInfo?.limitInfo || null);
  };

  const selectTeacher = (teacher: any) => {
    console.log('👨‍🏫 Profesor seleccionado:', teacher);
    setSelectedTeacher(teacher);
    setTeacherSearch(teacher.full_name || '');
    setShowTeacherResults(false);
  };

  const selectGenericClient = () => {
    setClientMode('generic');
    setSelectedStudent(null);
    setStudentSearch('');
  };

  const selectStudentMode = () => {
    console.log('📚 Modo Estudiante seleccionado - Limpiando búsqueda');
    setClientMode('student');
    setSelectedStudent(null);
    setStudentSearch(''); // Asegurar que empiece vacío
    setShowStudentResults(false);
  };

  const selectTeacherMode = () => {
    console.log('👨‍🏫 Modo Profesor seleccionado');
    setClientMode('teacher');
    setSelectedTeacher(null);
    setTeacherSearch('');
    setShowTeacherResults(false);
  };

  const resetClient = () => {
    console.log('🧹 Limpiando estado del cliente...');
    setClientMode(null);
    setSelectedStudent(null);
    setSelectedStudentLimitInfo(null);
    setStudentSearch('');
    setSelectedTeacher(null);
    setTeacherSearch('');
    setCart([]);
    setProductSearch('');
    setSelectedCategory('todos');
    setShowStudentResults(false);
    setShowTeacherResults(false);
    setPaymentMethod(null);
    setYapeNumber('');
    setPlinNumber('');
    setTransactionCode('');
    setRequiresInvoice(false);
    console.log('✅ Estado limpio - Modal de selección debe aparecer');
    setNfcError(null);
  };

  // ══════════════════════════════════════════════════════════
  // 📡 NFC: listener global — activo solo cuando no hay cliente seleccionado
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (clientMode) return; // Desactivar cuando ya hay un cliente seleccionado

    const handleNFCKey = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLast = now - nfcPosLastKeyTime.current;
      nfcPosLastKeyTime.current = now;

      if (e.key === 'Enter') {
        const uid = nfcPosBuffer.current.trim();
        nfcPosBuffer.current = '';
        if (nfcPosTimer.current) clearTimeout(nfcPosTimer.current);
        if (uid.length >= 4 && timeSinceLast < 200) {
          handleNFCScanPOS(uid);
        }
        return;
      }
      if (e.key.length === 1 && (timeSinceLast < 80 || nfcPosBuffer.current.length === 0)) {
        nfcPosBuffer.current += e.key;
        if (nfcPosTimer.current) clearTimeout(nfcPosTimer.current);
        nfcPosTimer.current = setTimeout(() => { nfcPosBuffer.current = ''; }, 200);
      }
    };

    window.addEventListener('keydown', handleNFCKey, true);
    return () => {
      window.removeEventListener('keydown', handleNFCKey, true);
      if (nfcPosTimer.current) clearTimeout(nfcPosTimer.current);
    };
  }, [clientMode]);

  // ══════════════════════════════════════════════════════════
  // 📡 NFC: procesar UID escaneado por el lector USB
  // ══════════════════════════════════════════════════════════
  const handleNFCScanPOS = async (uid: string) => {
    if (!uid.trim()) return;
    setNfcScanning(true);
    setNfcError(null);
    try {
      const { data, error } = await supabase
        .rpc('get_nfc_holder', { p_card_uid: uid.trim().toUpperCase() });

      if (error) throw error;

      if (!data || data.length === 0) {
        setNfcError('Tarjeta no registrada en el sistema');
        toast({
          variant: 'destructive',
          title: '❌ Tarjeta no encontrada',
          description: 'Esta tarjeta no está asignada a ningún alumno ni profesor.',
        });
        return;
      }

      const holder = data[0];

      if (!holder.is_active) {
        setNfcError('Esta tarjeta está desactivada');
        toast({
          variant: 'destructive',
          title: '🔴 Tarjeta inactiva',
          description: 'Contacta al administrador de sede.',
        });
        return;
      }

      if (holder.holder_type === 'student') {
        const student: Student = {
          id: holder.student_id,
          full_name: holder.student_name,
          photo_url: null,
          balance: holder.student_balance ?? 0,
          grade: holder.student_grade,
          section: holder.student_section,
          school_id: holder.student_school_id,
          free_account: holder.student_free_account,
          kiosk_disabled: holder.student_kiosk_disabled,
          limit_type: holder.student_limit_type as any,
          daily_limit: holder.student_daily_limit,
          weekly_limit: holder.student_weekly_limit,
          monthly_limit: holder.student_monthly_limit,
        };
        setClientMode('student');
        selectStudent(student);
        const hasLim = (student.daily_limit && student.daily_limit > 0)
          || (student.weekly_limit && student.weekly_limit > 0)
          || (student.monthly_limit && student.monthly_limit > 0);
        const info = hasLim
          ? `${student.grade} - ${student.section} · Tope: S/ ${(student.daily_limit || student.weekly_limit || student.monthly_limit || 0).toFixed(2)}`
          : `${student.grade} - ${student.section} · Saldo: S/ ${student.balance.toFixed(2)}`;
        toast({ title: `👋 ¡Hola, ${student.full_name}!`, description: info });

      } else if (holder.holder_type === 'teacher') {
        setClientMode('teacher');
        setSelectedTeacher({ id: holder.teacher_id, full_name: holder.teacher_name });
        setTeacherSearch(holder.teacher_name);
        setShowTeacherResults(false);
        toast({ title: '👨‍🏫 Profesor identificado', description: holder.teacher_name });
      }
    } catch (err: any) {
      const msg = err?.message || '';
      const isFunctionMissing = msg.includes('get_nfc_holder') || msg.includes('schema cache') || err?.code === 'PGRST204';
      setNfcError(isFunctionMissing ? 'Función NFC no configurada' : 'Error al leer la tarjeta');
      toast({
        variant: 'destructive',
        title: 'Error NFC',
        description: isFunctionMissing
          ? 'La función get_nfc_holder no existe en la base de datos. Ejecuta la migración ADD_GET_NFC_HOLDER_FUNCTION.sql en Supabase.'
          : msg,
      });
    } finally {
      setNfcScanning(false);
    }
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
  };

  const addComboToCart = (combo: any) => {
    // Crear un "producto virtual" para el combo
    const comboProduct: Product = {
      id: `combo_${combo.id}`,
      name: `🎁 ${combo.name}`,
      price: combo.combo_price,
      category: 'combos',
    };

    const existing = cart.find(item => item.product.id === comboProduct.id);
    
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === comboProduct.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product: comboProduct, quantity: 1 }]);
    }

    toast({
      title: '🎁 Combo agregado',
      description: `${combo.name} - S/ ${combo.combo_price.toFixed(2)}`,
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
    if (!clientMode) return false;
    if (cart.length === 0) return false;
    
    const total = getTotal();
    
    // Si es estudiante
    if (clientMode === 'student' && selectedStudent) {
      // ✅ VERIFICAR TOPE primero (aplica a cuenta libre Y con recargas)
      if (selectedStudentLimitInfo?.hasLimit) {
        if (selectedStudentLimitInfo.remaining <= 0) {
          return false; // Tope alcanzado
        }
        if (total > selectedStudentLimitInfo.remaining) {
          return false; // La compra excede el tope restante
        }
      }
      
      // Si tiene cuenta libre (y pasó la verificación de tope), puede comprar
      if (selectedStudent.free_account) {
        return true;
      }
      // Si no tiene cuenta libre, verificar saldo suficiente
      return selectedStudent.balance >= total;
    }
    
    // Si es profesor (siempre cuenta libre, sin límites)
    if (clientMode === 'teacher' && selectedTeacher) {
      return true;
    }
    
    // Si es cliente genérico, permitir
    if (clientMode === 'generic') {
      return true;
    }
    
    return false;
  };

  const handleCheckoutClick = () => {
    if (!canCheckout()) return;

    // Decidir qué modal mostrar según el tipo de cliente
    if (clientMode === 'student' || clientMode === 'teacher') {
      // Cuenta de crédito (estudiante o profesor): Modal simple de confirmación (sin métodos de pago)
      setShowCreditConfirmDialog(true);
    } else {
      // Cliente genérico: Modal de selección de método de pago
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmCheckout = async (shouldPrint: boolean = false) => {
    // Procesar directamente (ya no hay segundo modal)
    await processCheckout();
    
    // La impresión ahora la maneja posPrinterService automáticamente
    // No necesitamos window.print() aquí ya que interfiere con el ticket HTML
      
    // Después de procesar, resetear automáticamente
    setShowConfirmDialog(false);
    setShowCreditConfirmDialog(false);
    resetClient();
  };

  const processCheckout = async () => {
    setIsProcessing(true);

    try {
      const total = getTotal();
      let ticketCode = '';

      console.log('🔵 INICIANDO CHECKOUT', {
        clientMode,
        selectedStudent: selectedStudent?.full_name,
        selectedTeacher: selectedTeacher?.full_name,
        total,
        userId: user?.id
      });

      // ✅ Generar correlativo ÚNICO para TODOS los usuarios
      try {
        const { data: ticketNumber, error: ticketError } = await supabase
          .rpc('get_next_ticket_number', { p_user_id: user?.id });

        if (ticketError) {
          console.error('❌ Error generando correlativo:', ticketError);
          // Fallback temporal
          ticketCode = `TMP-${Date.now()}`;
        } else {
          console.log('✅ Correlativo generado:', ticketNumber);
          ticketCode = ticketNumber;
        }
      } catch (err) {
        console.error('❌ Error en correlativo:', err);
        ticketCode = `TMP-${Date.now()}`;
      }

      // Obtener school_id del cajero (para impresión)
      const { data: cashierProfile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      // Preparar datos del ticket
      const clientName = clientMode === 'student' ? selectedStudent?.full_name :
                        clientMode === 'teacher' ? selectedTeacher?.full_name :
                        'CLIENTE GENÉRICO';

      const ticketInfo: any = {
        code: ticketCode,
        clientName: clientName,
        clientType: clientMode,
        items: cart,
        total: total,
        paymentMethod: clientMode === 'generic' ? paymentMethod : 'credito',
        documentType: clientMode === 'generic' ? (requiresInvoice ? 'factura' : 'ticket') : 'ticket',
        timestamp: new Date(),
        cashierEmail: user?.email || 'No disponible',
      };

      // Si es estudiante
      if (clientMode === 'student' && selectedStudent) {
        // ✅ DOBLE VALIDACIÓN DE TOPES antes de procesar
        if (selectedStudent.limit_type && selectedStudent.limit_type !== 'none') {
          try {
            const freshLimitInfo = await calculateLimitInfo(selectedStudent);
            if (freshLimitInfo) {
              if (freshLimitInfo.remaining <= 0) {
                toast({
                  variant: 'destructive',
                  title: `🚫 Tope ${freshLimitInfo.periodText} Alcanzado`,
                  description: `${selectedStudent.full_name} ya gastó S/ ${freshLimitInfo.spentAmount.toFixed(2)} de su límite de S/ ${freshLimitInfo.limitAmount.toFixed(2)}. ${freshLimitInfo.renewalText}.`,
                });
                setIsProcessing(false);
                return;
              }
              if (total > freshLimitInfo.remaining) {
                toast({
                  variant: 'destructive',
                  title: `⚠️ Compra excede tope ${freshLimitInfo.periodText.toLowerCase()}`,
                  description: `Solo quedan S/ ${freshLimitInfo.remaining.toFixed(2)} del tope de S/ ${freshLimitInfo.limitAmount.toFixed(2)}. Esta compra es de S/ ${total.toFixed(2)}.`,
                });
                setIsProcessing(false);
                return;
              }
              // Actualizar la info local del tope
              setSelectedStudentLimitInfo(freshLimitInfo);
            }
          } catch (error) {
            console.error('Error en doble validación de topes:', error);
          }
        }

        const isFreeAccount = selectedStudent.free_account !== false; // Por defecto true
        
        // Calcular montos
        const amountToDeduct = total;
        
        // Si es cuenta libre, no descontamos del saldo, solo registramos como pendiente
        const newBalance = isFreeAccount ? selectedStudent.balance : selectedStudent.balance - amountToDeduct;

        console.log('💳 PROCESANDO VENTA ESTUDIANTE', {
          studentId: selectedStudent.id,
          isFreeAccount,
          total,
          amountToDeduct,
          balanceActual: selectedStudent.balance,
          newBalance
        });

        // Crear transacción
        const studentPaymentDetails: any = {};
        if (!isFreeAccount && paymentMethod) {
          studentPaymentDetails.payment_method_detail = paymentMethod;
          if (transactionCode) studentPaymentDetails.operation_number = transactionCode;
          if (yapeNumber) studentPaymentDetails.yape_number = yapeNumber;
          if (plinNumber) studentPaymentDetails.plin_number = plinNumber;
          if (cashGiven) studentPaymentDetails.cash_given = parseFloat(cashGiven);
          if (paymentSplits.length > 0) studentPaymentDetails.payment_splits = paymentSplits;
        }

        const { data: transaction, error: transError} = await supabase
          .from('transactions')
          .insert({
            student_id: selectedStudent.id,
            school_id: selectedStudent.school_id, // ✅ Agregar school_id
            type: 'purchase',
            amount: -total,
            description: `Compra POS${isFreeAccount ? ' (Cuenta Libre)' : ''} - Total: S/ ${total.toFixed(2)}`,
            balance_after: newBalance,
            created_by: user?.id,
            ticket_code: ticketCode,
            payment_status: isFreeAccount ? 'pending' : 'paid', // Si es cuenta libre, queda pendiente
            payment_method: isFreeAccount ? null : (paymentMethod || 'efectivo'),
            metadata: Object.keys(studentPaymentDetails).length > 0 ? { source: 'pos', ...studentPaymentDetails } : { source: 'pos' },
          })
          .select()
          .single();

        if (transError) {
          console.error('❌ Error creando transacción:', transError);
          throw transError;
        }
        console.log('✅ Transacción creada:', transaction.id);

        // Crear items
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

        // **NUEVO: Registrar en tabla SALES para módulo de Finanzas**
        const salesItems = cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          barcode: item.product.barcode || null,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));

        await supabase
          .from('sales')
          .insert({
            transaction_id: ticketCode,
            student_id: selectedStudent.id,
            school_id: selectedStudent.school_id,
            cashier_id: user?.id,
            total: total,
            subtotal: total,
            discount: 0,
            payment_method: isFreeAccount ? 'debt' : 'cash', // Si es cuenta libre, es "fiado"
            cash_received: isFreeAccount ? null : parseFloat(cashGiven) || total,
            change_given: isFreeAccount ? null : (parseFloat(cashGiven) || total) - total,
            items: salesItems,
          });
        
        console.log('✅ Venta registrada en tabla sales');

        // Actualizar saldo solo si NO es cuenta libre y hubo descuento
        if (!isFreeAccount && amountToDeduct > 0) {
          const { error: updateError } = await supabase
            .from('students')
            .update({ balance: newBalance })
            .eq('id', selectedStudent.id);

          if (updateError) throw updateError;
          
          // Actualizar estado local
          setSelectedStudent({
            ...selectedStudent,
            balance: newBalance
          });
        }

        ticketInfo.newBalance = newBalance;
        ticketInfo.amountToDeduct = amountToDeduct;
        ticketInfo.isFreeAccount = isFreeAccount;
      } else if (clientMode === 'teacher' && selectedTeacher) {
        // Profesor - Cuenta libre sin límites
        console.log('👨‍🏫 Procesando compra de profesor');

        // Crear transacción
        const { data: transaction, error: transError } = await supabase
          .from('transactions')
          .insert({
            student_id: null,
            teacher_id: selectedTeacher.id,
            school_id: selectedTeacher.school_1_id || null, // ✅ Corregido: la vista usa school_1_id (no school_id_1)
            type: 'purchase',
            amount: -total,
            description: `Compra Profesor: ${selectedTeacher.full_name} - ${cart.length} items`,
            balance_after: 0, // Profesores no tienen balance
            created_by: user?.id,
            ticket_code: ticketCode,
            payment_status: 'pending', // 🔥 CRÉDITO: Iniciar como pending
            payment_method: null, // Sin método de pago inicial
          })
          .select()
          .single();

        if (transError) {
          console.error('❌ Error creando transacción de profesor:', transError);
          throw transError;
        }

        console.log('✅ Transacción creada:', transaction.id);

        // Insertar items de la transacción
        const items = cart.map(item => ({
          transaction_id: transaction.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));

        await supabase.from('transaction_items').insert(items);

        // Registrar en tabla SALES para módulo de Finanzas
        const salesItems = cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          barcode: item.product.barcode || null,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));

        await supabase
          .from('sales')
          .insert({
            transaction_id: ticketCode,
            teacher_id: selectedTeacher.id,
            school_id: selectedTeacher.school_1_id || null, // ✅ Corregido: la vista usa school_1_id
            cashier_id: user?.id,
            total: total,
            subtotal: total,
            discount: 0,
            payment_method: 'teacher_account', // Identificador especial para profesores
            cash_received: null,
            change_given: null,
            items: salesItems,
          });
        
        console.log('✅ Venta de profesor registrada en tabla sales');

        ticketInfo.isFreeAccount = true;
        ticketInfo.teacherName = selectedTeacher.full_name;
      } else {
        // Cliente genérico - Solo registrar la venta (PAGADA)
        const genericPaymentDetails: any = { source: 'pos' };
        if (transactionCode) genericPaymentDetails.operation_number = transactionCode;
        if (yapeNumber) genericPaymentDetails.yape_number = yapeNumber;
        if (plinNumber) genericPaymentDetails.plin_number = plinNumber;
        if (cashGiven) genericPaymentDetails.cash_given = parseFloat(cashGiven);
        if (paymentSplits.length > 0) genericPaymentDetails.payment_splits = paymentSplits;

        const { data: transaction, error: transError } = await supabase
          .from('transactions')
          .insert({
            student_id: null,
            school_id: userSchoolId, // ✅ Agregar school_id del cajero
            type: 'purchase',
            amount: -total,
            description: `Compra Cliente Genérico - ${cart.length} items`,
            balance_after: 0,
            created_by: user?.id,
            ticket_code: ticketCode,
            payment_status: 'paid', // 🔥 Cliente genérico PAGA en el momento
            payment_method: paymentMethod || 'efectivo', // Método de pago real
            metadata: genericPaymentDetails,
          })
          .select()
          .single();

        if (transError) throw transError;

        const items = cart.map(item => ({
          transaction_id: transaction.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));

        await supabase.from('transaction_items').insert(items);

        // **NUEVO: Registrar en tabla SALES para módulo de Finanzas**
        const salesItems = cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          barcode: item.product.barcode || null,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));

        await supabase
          .from('sales')
          .insert({
            transaction_id: ticketCode,
            student_id: null, // Cliente genérico
            school_id: cashierProfile?.school_id || null,
            cashier_id: user?.id,
            total: total,
            subtotal: total,
            discount: 0,
            payment_method: paymentMethod || 'cash',
            cash_received: parseFloat(cashGiven) || total,
            change_given: (parseFloat(cashGiven) || total) - total,
            items: salesItems,
          });
        
        console.log('✅ Venta genérica registrada en tabla sales');
      }

      // Mostrar notificación rápida (sin modal)
      console.log('🎫 VENTA COMPLETADA', {
        ticketCode,
        clientName: ticketInfo.clientName
      });

      toast({
        title: '✅ Venta Realizada',
        description: `Ticket: ${ticketCode}`,
        duration: 2000,
      });

      // 🖨️ IMPRIMIR AUTOMÁTICAMENTE según configuración
      const schoolIdForPrint = selectedStudent?.school_id || selectedTeacher?.school_1_id || cashierProfile?.school_id;
      
      if (schoolIdForPrint) {
        // Determinar tipo de venta y método de pago basado en clientMode
        let saleType: 'general' | 'credit' | 'teacher';
        let paymentMethodForPrint: 'cash' | 'card' | 'credit' | 'teacher';
        
        if (clientMode === 'teacher') {
          saleType = 'teacher';
          paymentMethodForPrint = 'teacher';
        } else if (clientMode === 'student') {
          saleType = 'credit';
          paymentMethodForPrint = 'credit';
        } else {
          saleType = 'general';
          paymentMethodForPrint = (paymentMethod === 'card' ? 'card' : 'cash') as 'cash' | 'card';
        }
        
        printPOSSale({
          ticketCode,
          clientName: ticketInfo.clientName,
          cart,
          total,
          paymentMethod: paymentMethodForPrint,
          saleType: saleType,
          schoolId: schoolIdForPrint
        }).catch(err => console.error('Error en impresión:', err));
      }

      // Guardar datos del ticket para imprimir si es necesario
      setTicketData(ticketInfo);
      
      // Cerrar modales
      setShowPaymentDialog(false);
      
      // Resetear POS automáticamente para siguiente venta
      setTimeout(() => {
        resetClient();
      }, 500);

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

  const handlePrintTicket = () => {
    window.print();
  };

  const handleContinue = () => {
    console.log('🔘 BOTÓN CONTINUAR PRESIONADO');
    console.log('🔄 CONTINUANDO - Reseteando POS para siguiente cliente');
    console.log('Estado antes del reset:', {
      clientMode,
      selectedStudent: selectedStudent?.full_name,
      cart: cart.length,
      showTicketPrint
    });
    
    // Reset y preparar para siguiente cliente
    setShowTicketPrint(false);
    setTicketData(null);
    resetClient();
    
    console.log('✅ POS reseteado - Listo para nuevo cliente');
    
    // Forzar verificación del estado después del reset
    setTimeout(() => {
      console.log('Estado después del reset:', {
        clientMode,
        showTicketPrint
      });
    }, 100);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // ⚠️ NO declarar total como constante - calcularlo dinámicamente con getTotal()
  
  // Verificar saldo insuficiente en useEffect
  useEffect(() => {
    const insufficient = selectedStudent && !selectedStudent.free_account && (selectedStudent.balance < getTotal());
    setInsufficientBalance(insufficient);
  }, [selectedStudent, cart]); // ✅ Dependencia en 'cart' en lugar de 'total'

  // ─── GUARD: Bloquear POS si no hay caja abierta ─────────────────
  const needsCashDeclaration =
    !cashGuardLoading &&
    userSchoolId &&
    !posOpenRegister &&
    !posHasUnclosed;

  return (
    <>
    {/* Modal bloqueante de apertura de caja */}
    {userSchoolId && !cashGuardLoading && (!posOpenRegister || posHasUnclosed) && (
      <CashOpeningModal
        schoolId={userSchoolId}
        lastClosedAmount={posLastClosedAmount}
        hasUnclosedPrevious={posHasUnclosed}
        previousUnclosed={posPreviousUnclosed}
        onOpened={() => {
          setPosHasUnclosed(false);
          setPosPreviousUnclosed(null);
          // Recargar estado de caja
          supabase
            .from('cash_registers')
            .select('*')
            .eq('school_id', userSchoolId)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => setPosOpenRegister(data));
        }}
      />
    )}
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-slate-900 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 flex justify-between items-center shadow-lg print:hidden">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg">PUNTO DE VENTA</h1>
            <p className="text-xs text-gray-400 hidden sm:block">{user?.email}</p>
          </div>
        </div>
        {/* Botones de navegación - Updated */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToDashboard}
            className="text-white hover:bg-slate-800 px-2 sm:px-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="hidden sm:inline">Volver al Panel</span>
          </Button>
          <div className="text-white">
            <UserProfileMenu
              userEmail={user?.email || ''}
              userName={full_name || undefined}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </header>

      {/* Modal de Selección de Cliente (Solo si no hay cliente) */}
      {!clientMode && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">Seleccionar Tipo de Cliente</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleBackToDashboard}
                  className="text-blue-600 hover:bg-blue-50 border-blue-300 flex-1 sm:flex-none text-sm sm:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="hidden sm:inline">Volver al Panel</span>
                  <span className="sm:hidden">Panel</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-red-600 hover:bg-red-50 flex-1 sm:flex-none text-sm sm:text-base"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                  <span className="sm:hidden">Salir</span>
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Cliente Genérico */}
              <button
                onClick={selectGenericClient}
                className="p-4 sm:p-8 border-2 border-gray-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
              >
                <Users className="h-10 w-10 sm:h-16 sm:w-16 mx-auto mb-2 sm:mb-4 text-gray-400 group-hover:text-emerald-600" />
                <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">Cliente Genérico</h3>
                <p className="text-xs sm:text-sm text-gray-600">Venta al contado (Efectivo/Yape/Tarjeta)</p>
              </button>

              {/* Crédito */}
              <button
                onClick={selectStudentMode}
                className="p-4 sm:p-8 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <User className="h-10 w-10 sm:h-16 sm:w-16 mx-auto mb-2 sm:mb-4 text-gray-400 group-hover:text-blue-600" />
                <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">Crédito</h3>
                <p className="text-xs sm:text-sm text-gray-600">Compra a crédito (Descuenta de saldo)</p>
              </button>

              {/* Profesor */}
              <button
                onClick={selectTeacherMode}
                className="p-4 sm:p-8 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <UtensilsCrossed className="h-10 w-10 sm:h-16 sm:w-16 mx-auto mb-2 sm:mb-4 text-gray-400 group-hover:text-purple-600" />
                <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">Profesor</h3>
                <p className="text-xs sm:text-sm text-gray-600">Cuenta libre (Sin límites)</p>
              </button>
            </div>

            {/* ── Sección NFC ── */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  nfcScanning
                    ? 'border-blue-400 bg-blue-50'
                    : nfcError
                    ? 'border-red-300 bg-red-50'
                    : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => { setNfcError(null); }}
              >
                <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  nfcScanning ? 'bg-blue-200' : nfcError ? 'bg-red-100' : 'bg-gray-200'
                }`}>
                  {nfcScanning ? (
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                  ) : nfcError ? (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  ) : (
                    <Smartphone className="h-6 w-6 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className={`font-bold text-sm ${
                    nfcScanning ? 'text-blue-700' : nfcError ? 'text-red-700' : 'text-gray-600'
                  }`}>
                    {nfcScanning ? 'Leyendo tarjeta...' : nfcError ? nfcError : '📡 Pasar tarjeta NFC'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {nfcScanning
                      ? 'Acerca la tarjeta al lector'
                      : 'Acerca la tarjeta al lector USB para identificar al alumno o profesor automáticamente'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Búsqueda de Estudiante */}
      {clientMode === 'student' && !selectedStudent && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Buscar Estudiante</h2>
              <Button 
                variant="ghost" 
                onClick={resetClient}
                className="text-gray-600 hover:bg-gray-100"
              >
                Volver
              </Button>
            </div>
            
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
                {students.map((student) => {
                  const accountStatus = studentAccountStatuses.get(student.id);
                  const canPurchase = accountStatus?.canPurchase ?? true;
                  const statusText = accountStatus?.statusText || `💰 Saldo: S/ ${student.balance.toFixed(2)}`;
                  const statusColor = accountStatus?.statusColor || 'text-emerald-600';
                  const limitInfo = accountStatus?.limitInfo;
                  
                  return (
                    <button
                      key={student.id}
                      onClick={() => canPurchase && selectStudent(student)}
                      disabled={!canPurchase}
                      className={cn(
                        "w-full p-4 border-2 rounded-xl text-left transition-all",
                        canPurchase 
                          ? "hover:bg-emerald-50 border-gray-200 hover:border-emerald-500 cursor-pointer"
                          : "bg-gray-50 border-red-200 cursor-not-allowed opacity-70"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-bold text-lg", !canPurchase && "text-gray-500")}>
                            {student.full_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {student.grade} - {student.section}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-sm font-bold", statusColor)}>
                            {statusText}
                          </p>
                        </div>
                      </div>
                      
                      {/* Info detallada del tope */}
                      {limitInfo?.hasLimit && (
                        <div className={cn(
                          "mt-2 p-2 rounded-lg border text-xs",
                          limitInfo.remaining <= 0 
                            ? "bg-red-50 border-red-200" 
                            : limitInfo.remaining < limitInfo.limitAmount * 0.3 
                              ? "bg-orange-50 border-orange-200"
                              : "bg-blue-50 border-blue-200"
                        )}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold">
                              {limitInfo.periodText === 'Diario' ? '📅 Tope Diario' : limitInfo.periodText === 'Semanal' ? '📆 Tope Semanal' : '📊 Tope Mensual'}
                            </span>
                            <span className="font-bold">
                              S/ {limitInfo.remaining.toFixed(2)} restante
                            </span>
                          </div>
                          {/* Barra de progreso */}
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div 
                              className={cn(
                                "h-2 rounded-full transition-all",
                                limitInfo.remaining <= 0 ? "bg-red-500" : 
                                limitInfo.spentAmount / limitInfo.limitAmount >= 0.8 ? "bg-orange-500" : "bg-blue-500"
                              )}
                              style={{ width: `${Math.min(100, (limitInfo.spentAmount / limitInfo.limitAmount) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Gastado: S/ {limitInfo.spentAmount.toFixed(2)}</span>
                            <span>Límite: S/ {limitInfo.limitAmount.toFixed(2)}</span>
                          </div>
                          <p className="text-gray-400 mt-0.5">⏰ {limitInfo.renewalText}</p>
                        </div>
                      )}
                      
                      {!canPurchase && accountStatus?.reason && !limitInfo?.hasLimit && (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          {accountStatus.reason}
                        </p>
                      )}
                    </button>
                  );
                })}
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

      {/* Modal de Búsqueda de Profesor */}
      {clientMode === 'teacher' && !selectedTeacher && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Buscar Profesor</h2>
              <Button 
                variant="ghost" 
                onClick={resetClient}
                className="text-gray-600 hover:bg-gray-100"
              >
                Volver
              </Button>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Escribe el nombre del profesor..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="pl-12 text-lg h-14 border-2"
                autoFocus
              />
            </div>

            {showTeacherResults && teachers.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => selectTeacher(teacher)}
                    className="w-full p-4 border-2 rounded-xl text-left flex items-center gap-4 transition-all hover:bg-purple-50 border-gray-200 hover:border-purple-500 cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-lg">
                        {teacher.full_name || '(Sin nombre)'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {teacher.area ? `${teacher.area.charAt(0).toUpperCase() + teacher.area.slice(1)}` : ''}
                        {teacher.school_1_name ? ` • ${teacher.school_1_name}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Estado</p>
                      <p className="text-sm font-bold text-purple-600">
                        ✅ Cuenta Libre
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {teacherSearch.length >= 2 && teachers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p>No se encontraron profesores</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layout de 3 Zonas (Solo si hay cliente seleccionado) */}
      {(clientMode === 'generic' || (clientMode === 'student' && selectedStudent) || (clientMode === 'teacher' && selectedTeacher)) && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden print:hidden h-[calc(100vh-64px)]">
          
          {/* ZONA 1: CATEGORÍAS - Compacto en móvil */}
          <aside className="w-full lg:w-[15%] bg-slate-800 p-1 sm:p-2 lg:p-4 flex lg:flex-col gap-1 sm:gap-2 overflow-x-auto lg:overflow-y-auto scrollbar-thin flex-shrink-0">
            {orderedCategories.map((cat, index) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => onDragOver(e, index)}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 sm:py-4 sm:px-4 lg:py-8 lg:px-6 rounded-md sm:rounded-xl font-semibold transition-all cursor-move select-none touch-manipulation shrink-0",
                    "hover:bg-slate-700 active:scale-95",
                    isActive 
                      ? "bg-emerald-500 text-white shadow-lg" 
                      : "bg-slate-700 text-gray-300"
                  )}
                  style={{ minHeight: '50px' }}
                >
                  <Icon className="h-4 w-4 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                  <span className="text-[9px] sm:text-xs lg:text-sm whitespace-nowrap">{cat.label}</span>
                </button>
              );
            })}
          </aside>

          {/* ZONA 2: PRODUCTOS - Más compacto en móvil */}
          <main className="w-full lg:w-[55%] bg-white flex flex-col overflow-hidden">
            <div className="p-1.5 sm:p-2 border-b bg-gray-50 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar productos..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-7 sm:pl-9 h-7 sm:h-10 lg:h-12 text-xs sm:text-base border-2"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1 sm:p-2">
              {filteredProducts.length === 0 && combos.length === 0 && selectedCategory !== 'combos' ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Search className="h-8 w-8 sm:h-16 sm:w-16 mb-2 sm:mb-4 opacity-30" />
                  <p className="text-xs sm:text-lg font-semibold">No hay productos disponibles</p>
                </div>
              ) : selectedCategory === 'combos' ? (
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-1 sm:gap-2">
                  {combos.map((combo) => (
                    <button
                      key={combo.id}
                      onClick={() => addComboToCart(combo)}
                      className="group bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-md sm:rounded-xl overflow-hidden transition-all hover:shadow-xl hover:border-purple-400 active:scale-95 p-1 sm:p-3 min-h-[65px] sm:min-h-[120px] flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-0.5 sm:gap-2 mb-0.5 sm:mb-1">
                        <Gift className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                        <h3 className="font-bold text-[8px] sm:text-base line-clamp-2 leading-tight text-left">
                          {combo.name}
                        </h3>
                      </div>
                      <p className="text-[10px] sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                        S/ {combo.combo_price.toFixed(2)}
                      </p>
                      <p className="text-[8px] sm:text-xs text-gray-500 mt-0.5">
                        {combo.combo_items?.length || 0} productos
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-1 sm:gap-2">{filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="group bg-white border-2 rounded-md sm:rounded-xl overflow-hidden transition-all hover:shadow-xl hover:border-emerald-500 active:scale-95 p-1 sm:p-3 min-h-[65px] sm:min-h-[130px] flex flex-col justify-between"
                    >
                      <div>
                        <h3 className="font-bold text-[8px] sm:text-base mb-0.5 sm:mb-1 line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-[7px] sm:text-xs text-gray-500 mb-0.5 sm:mb-2 line-clamp-1">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <p className="text-[9px] sm:text-base font-semibold text-emerald-600">
                        S/ {product.price.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* ZONA 3: CARRITO - Más compacto y visible en móvil */}
          <aside className="w-full lg:w-[30%] bg-slate-50 flex flex-col border-t-2 lg:border-t-0 lg:border-l-2 border-slate-200 max-h-[45vh] lg:max-h-none">
            {/* Info del Cliente - Compacta en móvil */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-2 sm:p-3">
              {clientMode === 'generic' ? (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs sm:text-base text-white">CLIENTE GENÉRICO</h3>
                    <button
                      onClick={resetClient}
                      className="hover:bg-emerald-700 px-2 py-1 rounded-lg transition-colors font-semibold text-[10px] sm:text-xs text-white border border-emerald-400"
                    >
                      CAMBIAR
                    </button>
                  </div>
                </div>
              ) : clientMode === 'student' && selectedStudent ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {/* Foto del estudiante - más pequeña en móvil */}
                    {selectedStudent.photo_url && (
                      <div 
                        className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 cursor-pointer group"
                        onClick={() => setShowPhotoModal(true)}
                      >
                        <img 
                          src={selectedStudent.photo_url} 
                          alt={selectedStudent.full_name}
                          className="w-full h-full object-cover rounded-lg border-2 border-white shadow-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Maximize2 className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xs sm:text-lg text-white leading-tight truncate">{selectedStudent.full_name}</h3>
                      <p className="text-[10px] sm:text-xs text-emerald-100 font-medium">{selectedStudent.grade} - {selectedStudent.section}</p>
                      {selectedStudentLimitInfo?.hasLimit ? (
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <span className={`text-[8px] sm:text-xs px-2 py-0.5 rounded-full font-bold shadow-md ${
                            selectedStudentLimitInfo.remaining <= 0 
                              ? 'bg-red-400 text-red-900' 
                              : selectedStudentLimitInfo.remaining < selectedStudentLimitInfo.limitAmount * 0.3 
                                ? 'bg-orange-400 text-orange-900' 
                                : 'bg-blue-400 text-blue-900'
                          }`}>
                            {selectedStudentLimitInfo.periodText === 'Diario' ? '📅' : selectedStudentLimitInfo.periodText === 'Semanal' ? '📆' : '📊'} Tope {selectedStudentLimitInfo.periodText}: S/ {selectedStudentLimitInfo.remaining.toFixed(2)} restante
                          </span>
                        </div>
                      ) : selectedStudent.free_account !== false ? (
                        <div className="mt-1">
                          <span className="text-[8px] sm:text-xs bg-green-400 text-green-900 px-2 py-0.5 rounded-full font-bold shadow-md">
                            ✓ CUENTA LIBRE
                          </span>
                        </div>
                      ) : null}
                    </div>
                    
                    {/* Botón CAMBIAR más pequeño en móvil */}
                    <button
                      onClick={resetClient}
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/20 hover:bg-white/30 border-2 border-white/40 flex items-center justify-center transition-all hover:scale-105 shadow-lg backdrop-blur-sm shrink-0"
                      title="Cambiar estudiante"
                    >
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="text-[7px] sm:text-[9px] font-bold text-white uppercase">Cambiar</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : clientMode === 'teacher' && selectedTeacher ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xs sm:text-lg text-white leading-tight truncate">{selectedTeacher.full_name}</h3>
                      <p className="text-[10px] sm:text-xs text-purple-100 font-medium">
                        {selectedTeacher.area && `${selectedTeacher.area.charAt(0).toUpperCase() + selectedTeacher.area.slice(1)}`}
                      </p>
                      <div className="mt-1">
                        <span className="text-[8px] sm:text-xs bg-purple-400 text-purple-900 px-2 py-0.5 rounded-full font-bold shadow-md">
                          ✓ CUENTA LIBRE
                        </span>
                      </div>
                    </div>
                    
                    {/* Botón CAMBIAR más pequeño en móvil */}
                    <button
                      onClick={resetClient}
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/20 hover:bg-white/30 border-2 border-white/40 flex items-center justify-center transition-all hover:scale-105 shadow-lg backdrop-blur-sm shrink-0"
                      title="Cambiar profesor"
                    >
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="text-[7px] sm:text-[9px] font-bold text-white uppercase">Cambiar</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Items del Carrito - Más compacto en móvil */}
            <div className="flex-1 overflow-y-auto p-1.5 sm:p-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart className="h-8 w-8 sm:h-16 sm:w-16 mb-2 opacity-30" />
                  <p className="font-semibold text-xs sm:text-sm">Carrito vacío</p>
                </div>
              ) : (
                <div className="space-y-1 sm:space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-white border-2 border-gray-200 rounded-lg p-1 sm:p-2"
                    >
                      <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                        <p className="font-bold text-[9px] sm:text-sm flex-1 leading-tight">{item.product.name}</p>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-600 hover:bg-red-50 p-0.5 sm:p-1 rounded-full shrink-0"
                          title="Eliminar del carrito"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Minus className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                          </button>
                          <span className="w-7 sm:w-10 text-center font-bold text-[10px] sm:text-base">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          >
                            <Plus className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                        <p className="text-[10px] sm:text-sm font-bold text-emerald-600">
                          S/ {(item.product.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total y Botón */}
            <div className="bg-white border-t-2 border-slate-300 p-1.5 sm:p-3 lg:p-4 space-y-1.5 sm:space-y-3">
              {cart.length > 0 ? (
                <>
                  <div className="bg-slate-900 text-white rounded-xl p-2 sm:p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[9px] sm:text-sm mb-0.5 sm:mb-1 uppercase font-bold text-gray-400">Total Compra</p>
                        <p className="text-lg sm:text-3xl lg:text-4xl font-black">S/ {getTotal().toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-[9px] sm:text-xs text-gray-400 mt-1 sm:mt-2">{cart.length} productos</p>
                  </div>

                  {selectedStudent && insufficientBalance && !selectedStudent.free_account && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-1.5 sm:p-3 flex items-center gap-1.5 sm:gap-2">
                      <AlertCircle className="h-3 w-3 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-red-800 text-[9px] sm:text-sm">Saldo Insuficiente</p>
                        <p className="text-[8px] sm:text-xs text-red-600">
                          Falta: S/ {(getTotal() - selectedStudent.balance).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedStudent && selectedStudentLimitInfo?.hasLimit && (
                    <div className={`border-2 rounded-xl p-1.5 sm:p-3 ${
                      selectedStudentLimitInfo.remaining <= 0 
                        ? 'bg-red-50 border-red-300' 
                        : getTotal() > selectedStudentLimitInfo.remaining 
                          ? 'bg-orange-50 border-orange-300' 
                          : 'bg-blue-50 border-blue-300'
                    }`}>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <AlertCircle className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${
                          selectedStudentLimitInfo.remaining <= 0 ? 'text-red-600' : 
                          getTotal() > selectedStudentLimitInfo.remaining ? 'text-orange-600' : 'text-blue-600'
                        }`} />
                        <p className={`font-bold text-[9px] sm:text-sm ${
                          selectedStudentLimitInfo.remaining <= 0 ? 'text-red-800' : 
                          getTotal() > selectedStudentLimitInfo.remaining ? 'text-orange-800' : 'text-blue-800'
                        }`}>
                          {selectedStudentLimitInfo.remaining <= 0 
                            ? `🚫 Tope ${selectedStudentLimitInfo.periodText} Alcanzado`
                            : getTotal() > selectedStudentLimitInfo.remaining 
                              ? `⚠️ Compra excede tope (máx S/ ${selectedStudentLimitInfo.remaining.toFixed(2)})`
                              : `📊 Tope ${selectedStudentLimitInfo.periodText}: S/ ${selectedStudentLimitInfo.remaining.toFixed(2)} disponible`
                          }
                        </p>
                      </div>
                      {/* Mini barra de progreso */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                        <div 
                          className={`h-1.5 rounded-full ${
                            selectedStudentLimitInfo.remaining <= 0 ? 'bg-red-500' : 
                            selectedStudentLimitInfo.spentAmount / selectedStudentLimitInfo.limitAmount >= 0.8 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, (selectedStudentLimitInfo.spentAmount / selectedStudentLimitInfo.limitAmount) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[7px] sm:text-xs text-gray-500">
                        Gastado S/ {selectedStudentLimitInfo.spentAmount.toFixed(2)} de S/ {selectedStudentLimitInfo.limitAmount.toFixed(2)} • ⏰ {selectedStudentLimitInfo.renewalText}
                      </p>
                    </div>
                  )}

                  {selectedStudent && selectedStudent.free_account && !selectedStudentLimitInfo?.hasLimit && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-1.5 sm:p-3 flex items-center gap-1.5 sm:gap-2">
                      <Check className="h-3 w-3 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-green-800 text-[9px] sm:text-sm">✓ Cuenta Libre</p>
                        <p className="text-[8px] sm:text-xs text-green-700">
                          La compra se registrará como deuda para pagar después
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCheckoutClick}
                    disabled={!canCheckout() || isProcessing}
                    className="w-full h-12 sm:h-16 lg:h-20 text-base sm:text-xl lg:text-2xl font-black rounded-xl shadow-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:bg-gray-300"
                  >
                    {isProcessing ? 'PROCESANDO...' : 'COBRAR'}
                  </Button>
                </>
              ) : (
                <div className="text-center py-4 sm:py-8 text-gray-400">
                  <p className="text-xs sm:text-sm">Agrega productos para continuar</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* MODAL DE MEDIOS DE PAGO (CLIENTE GENÉRICO) */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-7 w-7 text-emerald-600" />
              Selecciona Método de Pago
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Resumen de Compra */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-300 uppercase font-semibold mb-1">Total a Cobrar</p>
                  <p className="text-5xl font-black">S/ {getTotal().toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{cart.length} productos</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">
                    {clientMode === 'generic' ? 'Cliente Genérico' : selectedStudent?.full_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Medios de Pago - Botones Grandes */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">💳 Medios de Pago</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Efectivo */}
                <button
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`p-6 border-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg ${
                    paymentMethod === 'efectivo'
                      ? 'border-emerald-500 bg-emerald-50 shadow-emerald-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Banknote className={`h-12 w-12 ${paymentMethod === 'efectivo' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`text-lg font-bold ${paymentMethod === 'efectivo' ? 'text-emerald-700' : 'text-gray-700'}`}>
                      Efectivo
                    </span>
                  </div>
                </button>

                {/* Yape QR */}
                <button
                  onClick={() => setPaymentMethod('yape_qr')}
                  className={`p-6 border-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg ${
                    paymentMethod === 'yape_qr'
                      ? 'border-purple-500 bg-purple-50 shadow-purple-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <QrCode className={`h-12 w-12 ${paymentMethod === 'yape_qr' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className={`text-lg font-bold ${paymentMethod === 'yape_qr' ? 'text-purple-700' : 'text-gray-700'}`}>
                      Yape (QR)
                    </span>
                  </div>
                </button>

                {/* Yape Número */}
                <button
                  onClick={() => setPaymentMethod('yape_numero')}
                  className={`p-6 border-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg ${
                    paymentMethod === 'yape_numero'
                      ? 'border-purple-500 bg-purple-50 shadow-purple-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Smartphone className={`h-12 w-12 ${paymentMethod === 'yape_numero' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className={`text-lg font-bold ${paymentMethod === 'yape_numero' ? 'text-purple-700' : 'text-gray-700'}`}>
                      Yape (Número)
                    </span>
                  </div>
                </button>

                {/* Plin QR */}
                <button
                  onClick={() => setPaymentMethod('plin_qr')}
                  className={`p-6 border-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg ${
                    paymentMethod === 'plin_qr'
                      ? 'border-pink-500 bg-pink-50 shadow-pink-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <QrCode className={`h-12 w-12 ${paymentMethod === 'plin_qr' ? 'text-pink-600' : 'text-gray-400'}`} />
                    <span className={`text-lg font-bold ${paymentMethod === 'plin_qr' ? 'text-pink-700' : 'text-gray-700'}`}>
                      Plin (QR)
                    </span>
                  </div>
                </button>

                {/* Plin Número */}
                <button
                  onClick={() => setPaymentMethod('plin_numero')}
                  className={`p-6 border-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg ${
                    paymentMethod === 'plin_numero'
                      ? 'border-pink-500 bg-pink-50 shadow-pink-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Smartphone className={`h-12 w-12 ${paymentMethod === 'plin_numero' ? 'text-pink-600' : 'text-gray-400'}`} />
                    <span className={`text-lg font-bold ${paymentMethod === 'plin_numero' ? 'text-pink-700' : 'text-gray-700'}`}>
                      Plin (Número)
                    </span>
                  </div>
                </button>

                {/* Tarjeta */}
                <button
                  onClick={() => setPaymentMethod('tarjeta')}
                  className={`p-6 border-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg ${
                    paymentMethod === 'tarjeta'
                      ? 'border-blue-500 bg-blue-50 shadow-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <CreditCard className={`h-12 w-12 ${paymentMethod === 'tarjeta' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-lg font-bold ${paymentMethod === 'tarjeta' ? 'text-blue-700' : 'text-gray-700'}`}>
                      Tarjeta
                    </span>
                    <span className="text-xs text-gray-500">Visa/Mastercard</span>
                  </div>
                </button>

                {/* Transferencia Bancaria */}
                <button
                  onClick={() => setPaymentMethod('transferencia')}
                  className={`p-6 border-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg ${
                    paymentMethod === 'transferencia'
                      ? 'border-cyan-500 bg-cyan-50 shadow-cyan-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Building2 className={`h-12 w-12 ${paymentMethod === 'transferencia' ? 'text-cyan-600' : 'text-gray-400'}`} />
                    <span className={`text-lg font-bold ${paymentMethod === 'transferencia' ? 'text-cyan-700' : 'text-gray-700'}`}>
                      Transferencia
                    </span>
                  </div>
                </button>

                {/* PAGO MIXTO */}
                <button
                  onClick={() => setPaymentMethod('mixto')}
                  className={`p-6 border-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg ${
                    paymentMethod === 'mixto'
                      ? 'border-orange-500 bg-orange-50 shadow-orange-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <CreditCard className={`h-12 w-12 ${paymentMethod === 'mixto' ? 'text-orange-600' : 'text-gray-400'}`} />
                      <Banknote className={`h-6 w-6 absolute -bottom-1 -right-1 ${paymentMethod === 'mixto' ? 'text-orange-500' : 'text-gray-300'}`} />
                    </div>
                    <span className={`text-lg font-bold ${paymentMethod === 'mixto' ? 'text-orange-700' : 'text-gray-700'}`}>
                      Pago Mixto
                    </span>
                    <span className="text-xs text-gray-500">Efectivo + Tarjeta</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Campos adicionales según método seleccionado */}
            
            {/* EFECTIVO: Con cuánto paga */}
            {paymentMethod === 'efectivo' && (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 space-y-4">
                <div className="bg-white rounded-lg p-4 border-2 border-emerald-200">
                  <p className="text-sm font-bold text-emerald-900 uppercase mb-1">Total a Cobrar</p>
                  <p className="text-4xl font-black text-emerald-600">S/ {getTotal().toFixed(2)}</p>
                </div>
                
                <div>
                  <Label className="text-base font-bold text-emerald-900 mb-2 block">¿Con cuánto paga el cliente?</Label>
                  <Input
                    type="number"
                    step="0.50"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    onKeyDown={(e) => {
                      // ENTER → Continuar (si el monto es suficiente)
                      if (e.key === 'Enter' && parseFloat(cashGiven) >= getTotal()) {
                        e.preventDefault();
                        // Simular click en el botón CONTINUAR
                        setShowConfirmDialog(false);
                        setShowDocumentTypeDialog(true);
                      }
                    }}
                    placeholder="Ej: 50.00"
                    className="h-20 text-3xl font-bold text-center border-emerald-300"
                    autoFocus
                  />
                  <p className="text-xs text-emerald-700 mt-2 text-center">
                    💡 Ingresa el monto en efectivo que entrega el cliente
                  </p>
                </div>
                
                {parseFloat(cashGiven) > 0 && (
                  <>
                    {parseFloat(cashGiven) >= getTotal() ? (
                      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl">
                        <p className="text-sm font-bold uppercase mb-2 opacity-90">💵 Vuelto a Entregar</p>
                        <p className="text-5xl font-black">
                          S/ {(parseFloat(cashGiven) - getTotal()).toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                        <p className="text-sm font-bold text-red-900">⚠️ Monto Insuficiente</p>
                        <p className="text-sm text-red-700 mt-1">
                          Falta: S/ {(getTotal() - parseFloat(cashGiven)).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* PAGO MIXTO: Dividir entre métodos */}
            {paymentMethod === 'mixto' && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-5 space-y-4">
                <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-orange-900 uppercase">Total a Cobrar</p>
                      <p className="text-3xl font-black text-orange-600">S/ {getTotal().toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-600">Pagado</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        S/ {paymentSplits.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                      </p>
                      <p className="text-xs font-bold text-red-600 mt-1">
                        Falta: S/ {(getTotal() - paymentSplits.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de pagos agregados */}
                {paymentSplits.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-orange-900">Métodos Agregados:</p>
                    {paymentSplits.map((split, index) => (
                      <div key={index} className="bg-white border-2 border-orange-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {split.method === 'efectivo' && <Banknote className="h-5 w-5 text-emerald-600" />}
                          {split.method === 'tarjeta' && <CreditCard className="h-5 w-5 text-blue-600" />}
                          {split.method === 'yape' && <Smartphone className="h-5 w-5 text-purple-600" />}
                          {split.method === 'plin' && <Smartphone className="h-5 w-5 text-pink-600" />}
                          <span className="font-bold text-sm capitalize">{split.method}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-lg">S/ {split.amount.toFixed(2)}</span>
                          <button
                            onClick={() => setPaymentSplits(paymentSplits.filter((_, i) => i !== index))}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario para agregar método */}
                {paymentSplits.reduce((sum, p) => sum + p.amount, 0) < getTotal() && (
                  <div className="bg-white border-2 border-orange-300 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-bold text-orange-900">Agregar Método de Pago</p>
                    
                    <div className="grid grid-cols-4 gap-2">
                      {['efectivo', 'tarjeta', 'yape', 'plin'].map((method) => (
                        <button
                          key={method}
                          onClick={() => setCurrentSplitMethod(method)}
                          className={`p-3 border-2 rounded-lg text-xs font-bold capitalize transition-all ${
                            currentSplitMethod === method
                              ? 'border-orange-500 bg-orange-100 text-orange-900'
                              : 'border-gray-200 text-gray-600 hover:border-orange-300'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>

                    <div>
                      <Label className="text-sm font-bold text-gray-700">Monto</Label>
                      <Input
                        type="number"
                        step="0.50"
                        value={currentSplitAmount}
                        onChange={(e) => setCurrentSplitAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-12 text-xl font-bold text-center"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        if (currentSplitMethod && parseFloat(currentSplitAmount) > 0) {
                          const amount = parseFloat(currentSplitAmount);
                          const totalPaid = paymentSplits.reduce((sum, p) => sum + p.amount, 0);
                          
                          if (totalPaid + amount <= getTotal()) {
                            setPaymentSplits([...paymentSplits, { method: currentSplitMethod, amount }]);
                            setCurrentSplitMethod('');
                            setCurrentSplitAmount('');
                          } else {
                            toast({
                              variant: 'destructive',
                              title: 'Error',
                              description: 'El monto total no puede exceder el total a pagar',
                            });
                          }
                        }
                      }}
                      disabled={!currentSplitMethod || !currentSplitAmount || parseFloat(currentSplitAmount) <= 0}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Agregar
                    </Button>
                  </div>
                )}

                {paymentSplits.reduce((sum, p) => sum + p.amount, 0) === getTotal() && (
                  <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="font-bold text-emerald-900">¡Pago Completo!</p>
                    <p className="text-sm text-emerald-700">Puedes proceder con la venta</p>
                  </div>
                )}
              </div>
            )}
            
            {paymentMethod === 'yape_numero' && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <Label className="text-sm font-bold text-purple-900 mb-2 block">Número de Celular (Yape)</Label>
                <Input
                  type="text"
                  value={yapeNumber}
                  onChange={(e) => setYapeNumber(e.target.value)}
                  placeholder="999 999 999"
                  className="h-14 text-lg font-semibold"
                  maxLength={9}
                />
              </div>
            )}

            {paymentMethod === 'plin_numero' && (
              <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
                <Label className="text-sm font-bold text-pink-900 mb-2 block">Número de Celular (Plin)</Label>
                <Input
                  type="text"
                  value={plinNumber}
                  onChange={(e) => setPlinNumber(e.target.value)}
                  placeholder="999 999 999"
                  className="h-14 text-lg font-semibold"
                  maxLength={9}
                />
              </div>
            )}

            {(paymentMethod === 'transferencia' || paymentMethod === 'yape_qr' || paymentMethod === 'plin_qr' || paymentMethod === 'tarjeta') && (
              <div className={`border-2 rounded-xl p-4 ${
                paymentMethod === 'tarjeta' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <Label className={`text-sm font-bold mb-2 block ${
                  paymentMethod === 'tarjeta' ? 'text-blue-900' : 'text-amber-900'
                }`}>
                  {paymentMethod === 'tarjeta' ? 'Nº de Operación (Voucher)' : 'Código de Operación'}
                </Label>
                <Input
                  type="text"
                  value={transactionCode}
                  onChange={(e) => setTransactionCode(e.target.value)}
                  placeholder={paymentMethod === 'tarjeta' ? 'Ej: 123456' : 'Ej: OP12345678'}
                  className="h-14 text-lg font-semibold uppercase"
                />
                <p className={`text-xs mt-2 ${
                  paymentMethod === 'tarjeta' ? 'text-blue-700' : 'text-amber-700'
                }`}>
                  {paymentMethod === 'tarjeta' 
                    ? 'Ingresa el número de operación del voucher de la tarjeta' 
                    : 'Ingresa el código de la transacción para validar el pago'}
                </p>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="space-y-3">
              <Button
                onClick={() => {
                  // Validar según método de pago
                  if (paymentMethod === 'efectivo') {
                    if (!cashGiven || parseFloat(cashGiven) < getTotal()) {
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Ingresa el monto en efectivo que entrega el cliente',
                      });
                      return;
                    }
                  }
                  
                  if (paymentMethod === 'mixto') {
                    const totalPaid = paymentSplits.reduce((sum, p) => sum + p.amount, 0);
                    if (totalPaid < getTotal()) {
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: `Faltan S/ ${(getTotal() - totalPaid).toFixed(2)} por asignar`,
                      });
                      return;
                    }
                  }
                  
                  // Abrir modal de selección de comprobante
                  setShowConfirmDialog(false);
                  setShowDocumentTypeDialog(true);
                }}
                disabled={!paymentMethod || isProcessing}
                className="w-full h-16 text-xl font-black bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                    PROCESANDO...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    CONTINUAR
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPaymentMethod(null);
                  setYapeNumber('');
                  setPlinNumber('');
                  setTransactionCode('');
                  setRequiresInvoice(false);
                }}
                className="w-full h-12 text-base"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMACIÓN PARA CUENTA DE CRÉDITO */}
      <Dialog open={showCreditConfirmDialog} onOpenChange={setShowCreditConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              Confirmar Compra a Crédito
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Resumen de Compra */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-6">
              <div className="text-center">
                <p className="text-sm text-gray-300 uppercase font-semibold mb-2">Total a Cobrar</p>
                <p className="text-5xl font-black mb-3">S/ {getTotal().toFixed(2)}</p>
                <div className="bg-emerald-500 text-white px-4 py-2 rounded-full inline-block">
                  <p className="text-sm font-bold">PAGO A CRÉDITO</p>
                </div>
              </div>
            </div>

            {/* Información del Cliente */}
            {selectedStudent && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Cliente</p>
                    <p className="text-lg font-bold text-gray-900">{selectedStudent.full_name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Detalle de Productos */}
            <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
              <p className="text-sm font-bold text-gray-700 mb-3">Productos ({cart.length})</p>
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="font-bold text-gray-900">
                      S/ {(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={async () => {
                  await handleConfirmCheckout(false); // Sin imprimir
                }}
                disabled={isProcessing}
                className="h-14 text-base font-bold bg-emerald-500 hover:bg-emerald-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Confirmar
                  </>
                )}
              </Button>

              <Button
                onClick={async () => {
                  await handleConfirmCheckout(true); // Con impresión
                }}
                disabled={isProcessing}
                variant="outline"
                className="h-14 text-base font-bold border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Printer className="h-5 w-5 mr-2" />
                    Confirmar e Imprimir
                  </>
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setShowCreditConfirmDialog(false);
              }}
              disabled={isProcessing}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TICKET TÉRMICO 80MM (Para impresión directa si se necesita) */}
      {ticketData && (
        <div className="hidden print:block">
          <style>{`
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                width: 80mm;
                margin: 0;
                padding: 0;
              }
            }
          `}</style>
          <div style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px', padding: '10px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <h2 style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>MARACUYÁ</h2>
              <p style={{ margin: '2px 0', fontSize: '10px' }}>Tiendas y Concesionarias Saludables</p>
              <p style={{ margin: '2px 0', fontSize: '10px' }}>RUC: 20XXXXXXXXX</p>
              <p style={{ margin: '2px 0', fontSize: '10px' }}>──────────────────────</p>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <p style={{ margin: '2px 0' }}><strong>TICKET:</strong> {ticketData.code}</p>
              <p style={{ margin: '2px 0' }}><strong>FECHA:</strong> {ticketData.timestamp.toLocaleDateString('es-PE')} {ticketData.timestamp.toLocaleTimeString('es-PE')}</p>
              <p style={{ margin: '2px 0' }}><strong>CAJERO:</strong> {ticketData.cashierEmail}</p>
              <p style={{ margin: '2px 0' }}><strong>CLIENTE:</strong> {ticketData.clientName}</p>
              {ticketData.documentType !== 'ticket' && (
                <p style={{ margin: '2px 0' }}><strong>DOC:</strong> {ticketData.documentType.toUpperCase()}</p>
              )}
            </div>

            <p style={{ margin: '10px 0', fontSize: '10px' }}>──────────────────────</p>

            <div style={{ marginBottom: '10px' }}>
              {ticketData.items.map((item: CartItem, idx: number) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  <p style={{ margin: '0', fontWeight: 'bold' }}>{item.product.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.quantity} x S/ {item.product.price.toFixed(2)}</span>
                    <span style={{ fontWeight: 'bold' }}>S/ {(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ margin: '10px 0', fontSize: '10px' }}>──────────────────────</p>

            <div style={{ textAlign: 'right', marginBottom: '10px' }}>
              <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold' }}>
                TOTAL: S/ {ticketData.total.toFixed(2)}
              </p>
              {ticketData.paymentMethod && (
                <p style={{ margin: '2px 0', fontSize: '10px' }}>
                  Pago: {ticketData.paymentMethod.toUpperCase()}
                </p>
              )}
              {ticketData.newBalance !== undefined && (
                <p style={{ margin: '2px 0', fontSize: '10px' }}>
                  Saldo restante: S/ {ticketData.newBalance.toFixed(2)}
                </p>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <p style={{ margin: '2px 0', fontSize: '10px' }}>¡Gracias por su compra!</p>
              <p style={{ margin: '2px 0', fontSize: '10px' }}>──────────────────────</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver foto ampliada del estudiante */}
      {selectedStudent?.photo_url && (
        <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Foto de {selectedStudent.full_name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 p-4">
              <img 
                src={selectedStudent.photo_url} 
                alt={selectedStudent.full_name}
                className="w-full max-w-md h-auto object-contain rounded-lg border-4 border-gray-200 shadow-xl"
              />
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{selectedStudent.full_name}</p>
                <p className="text-sm text-gray-600">{selectedStudent.grade} - {selectedStudent.section}</p>
                <p className="text-sm text-gray-500 mt-2">Saldo: S/ {selectedStudent.balance.toFixed(2)}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE SELECCIÓN DE COMPROBANTE */}
      <Dialog open={showDocumentTypeDialog} onOpenChange={setShowDocumentTypeDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Selecciona Tipo de Comprobante
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-6 py-8">
            {/* TICKET - DISPONIBLE */}
            <button
              onClick={() => {
                setSelectedDocumentType('ticket');
                setShowDocumentTypeDialog(false);
                handleConfirmCheckout(true); // Procesar venta e imprimir
              }}
              className="flex flex-col items-center gap-4 p-8 border-4 border-emerald-300 bg-emerald-50 rounded-2xl hover:bg-emerald-100 hover:border-emerald-400 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Receipt className="h-20 w-20 text-emerald-600" />
              <div className="text-center">
                <p className="font-black text-xl text-emerald-900">TICKET</p>
                <p className="text-xs text-emerald-700 mt-2">Sin datos fiscales</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Disponible</p>
              </div>
            </button>
            
            {/* BOLETA - PRÓXIMAMENTE */}
            <button
              disabled
              className="flex flex-col items-center gap-4 p-8 border-4 border-gray-200 bg-gray-50 rounded-2xl opacity-50 cursor-not-allowed"
            >
              <Printer className="h-20 w-20 text-gray-400" />
              <div className="text-center">
                <p className="font-black text-xl text-gray-600">BOLETA</p>
                <Badge variant="secondary" className="mt-2">Próximamente</Badge>
                <p className="text-xs text-gray-500 mt-1">Requiere SUNAT</p>
              </div>
            </button>
            
            {/* FACTURA - PRÓXIMAMENTE */}
            <button
              disabled
              className="flex flex-col items-center gap-4 p-8 border-4 border-gray-200 bg-gray-50 rounded-2xl opacity-50 cursor-not-allowed"
            >
              <FileText className="h-20 w-20 text-gray-400" />
              <div className="text-center">
                <p className="font-black text-xl text-gray-600">FACTURA</p>
                <Badge variant="secondary" className="mt-2">Próximamente</Badge>
                <p className="text-xs text-gray-500 mt-1">Requiere SUNAT</p>
              </div>
            </button>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              <strong>ℹ️ Nota:</strong> Por ahora solo está disponible la impresión de tickets. 
              Boleta y Factura electrónicas estarán disponibles una vez conectado a SUNAT.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setShowDocumentTypeDialog(false);
              setShowConfirmDialog(true); // Volver al modal de pago
            }}
            className="w-full"
          >
            ← Volver a Métodos de Pago
          </Button>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default POS;
