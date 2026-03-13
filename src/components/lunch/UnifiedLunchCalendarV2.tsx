import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Loader2,
  Plus,
  Minus,
  Calendar as CalendarIcon,
  Lock,
  Users,
  ShoppingCart,
  Eye,
  Check,
  Ban,
  Trash2,
  CreditCard as CreditCardIcon,
  MessageSquare,
} from 'lucide-react';
import { RechargeModal } from '@/components/parent/RechargeModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { MenuFieldOptionSelector, hasAnyAlternatives } from '@/components/lunch/MenuFieldOptionSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// ==========================================
// INTERFACES
// ==========================================

interface UnifiedLunchCalendarV2Props {
  userType: 'teacher' | 'parent';
  userId: string;
  userSchoolId: string;
}

interface LunchCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  price: number | null;
  target_type: 'students' | 'teachers' | 'both';
}

interface LunchMenu {
  id: string;
  date: string;
  starter: string | null;
  main_course: string;
  beverage: string | null;
  dessert: string | null;
  notes: string | null;
  category_id: string | null;
  starter_alternatives?: string[];
  main_course_alternatives?: string[];
  beverage_alternatives?: string[];
  dessert_alternatives?: string[];
  category?: LunchCategory | null;
}

interface SpecialDay {
  date: string;
  type: string;
  title: string;
}

interface LunchConfig {
  lunch_price: number;
  orders_enabled: boolean;
  order_deadline_time: string;
  order_deadline_days: number;
  cancellation_deadline_time: string;
  cancellation_deadline_days: number;
  block_orders_enabled?: boolean;
  block_start_time?: string;
  block_end_time?: string;
}

interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  school_id: string;
  free_account: boolean;
  balance: number;
}

interface ExistingOrder {
  id: string;
  date: string;
  categoryName: string | null;
  categoryId: string | null;
  quantity: number;
  comments?: string | null;
  status: string;
  is_cancelled: boolean;
  created_at: string;
  created_by: string | null;
  delivered_by: string | null;
  cancelled_by: string | null;
}

// ==========================================
// CONSTANTS & HELPERS
// ==========================================

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// ==========================================
// TIMEZONE HELPERS (Peru UTC-5)
// ==========================================

const getPeruNow = (): Date => {
  const peruStr = new Date().toLocaleString('en-US', { timeZone: 'America/Lima' });
  return new Date(peruStr);
};

const getPeruDateOnly = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const getPeruTodayStr = (): string => {
  const now = getPeruNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ==========================================
// COMPONENT
// ==========================================
export function UnifiedLunchCalendarV2({ userType, userId, userSchoolId }: UnifiedLunchCalendarV2Props) {
  const { toast } = useToast();

  // ── Navigation ──
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── Data ──
  const [menus, setMenus] = useState<Map<string, LunchMenu[]>>(new Map());
  const [specialDays, setSpecialDays] = useState<Map<string, SpecialDay>>(new Map());
  const [existingOrders, setExistingOrders] = useState<ExistingOrder[]>([]);
  const [config, setConfig] = useState<LunchConfig | null>(null);

  // ── Parent-specific ──
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ── CAROUSEL ──
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselDate, setCarouselDate] = useState<string | null>(null);

  // ── Inline order state ──
  const [selectedMenu, setSelectedMenu] = useState<LunchMenu | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [orderComments, setOrderComments] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [chosenStarter, setChosenStarter] = useState<string | null>(null);
  const [chosenMainCourse, setChosenMainCourse] = useState<string | null>(null);
  const [chosenBeverage, setChosenBeverage] = useState<string | null>(null);
  const [chosenDessert, setChosenDessert] = useState<string | null>(null);

  // ── View existing orders (modal for details) ──
  const [viewOrdersModal, setViewOrdersModal] = useState(false);
  const [viewOrdersDate, setViewOrdersDate] = useState<string | null>(null);

  // ── Cancellation ──
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // ── Payment flow (parents only) ──
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrderIds, setCreatedOrderIds] = useState<string[]>([]);
  const [totalOrderAmount, setTotalOrderAmount] = useState(0);
  const [orderDescriptions, setOrderDescriptions] = useState<string[]>([]);

  // ── UI State ──
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // COMPUTED
  // ==========================================
  const effectiveSchoolId = userType === 'parent' && selectedStudent ? selectedStudent.school_id : userSchoolId;

  /** Days to show in carousel: days with menus or existing orders */
  const carouselDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    return days
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(d => {
        if (specialDays.has(d)) return false;
        if (menus.has(d)) return true;
        if (existingOrders.some(o => o.date === d && !o.is_cancelled)) return true;
        return false;
      });
  }, [currentDate, menus, existingOrders, specialDays]);

  // ==========================================
  // DATA FETCHING
  // ==========================================

  useEffect(() => {
    if (userType === 'parent') fetchStudents();
  }, [userType, userId]);

  useEffect(() => {
    if (effectiveSchoolId) fetchMonthlyData();
  }, [currentDate, effectiveSchoolId]);

  // ── Auto-select first available day when data loads ──
  useEffect(() => {
    if (!loading && carouselDays.length > 0 && !carouselDate) {
      const todayStr = getPeruTodayStr();
      // Try today first, then first available
      const todayInList = carouselDays.find(d => d >= todayStr);
      const firstDay = todayInList || carouselDays[0];
      if (firstDay) {
        setCarouselDate(firstDay);
        setTimeout(() => scrollToDay(firstDay), 150);
      }
    }
  }, [loading, carouselDays]);

  // ── Reset on month change ──
  useEffect(() => {
    setCarouselDate(null);
    setSelectedMenu(null);
    setQuantity(1);
    setOrderComments('');
    setShowComments(false);
    setChosenStarter(null);
    setChosenMainCourse(null);
    setChosenBeverage(null);
    setChosenDessert(null);
  }, [currentDate]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, photo_url, school_id, free_account, balance')
        .eq('parent_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      setStudents(data || []);
      if (data && data.length > 0) setSelectedStudent(data[0]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los estudiantes' });
    }
  };

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // 1. Configuration
      const { data: configData, error: configError } = await supabase
        .from('lunch_configuration')
        .select('lunch_price, orders_enabled, order_deadline_time, order_deadline_days, cancellation_deadline_time, cancellation_deadline_days, block_orders_enabled, block_start_time, block_end_time')
        .eq('school_id', effectiveSchoolId)
        .maybeSingle();

      if (configError) {
        console.warn('⚠️ Error cargando lunch_configuration:', configError.message);
      }

      const fallbackConfig: LunchConfig = {
        lunch_price: 15,
        orders_enabled: true,
        order_deadline_time: '20:00:00',
        order_deadline_days: 1,
        cancellation_deadline_time: '07:00:00',
        cancellation_deadline_days: 0,
      };
      setConfig(configData || fallbackConfig);

      // 2. Menus
      const targetType = userType === 'parent' ? 'students' : 'teachers';
      const { data: menusData, error: menusError } = await supabase
        .from('lunch_menus')
        .select('id, date, starter, main_course, beverage, dessert, notes, category_id, target_type, starter_alternatives, main_course_alternatives, beverage_alternatives, dessert_alternatives')
        .eq('school_id', effectiveSchoolId)
        .or(`target_type.eq.${targetType},target_type.eq.both,target_type.is.null`)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      if (menusError) throw menusError;

      // 3. Categories
      const categoryIds = [...new Set((menusData || []).map(m => m.category_id).filter(Boolean))] as string[];
      let categoriesMap = new Map<string, LunchCategory>();

      if (categoryIds.length > 0) {
        const { data: categoriesData, error: catError } = await supabase
          .from('lunch_categories')
          .select('*')
          .in('id', categoryIds)
          .eq('school_id', effectiveSchoolId);

        if (catError) console.error('Error loading categories:', catError);

        const lunchCategories = (categoriesData || []).filter(
          (cat: any) => cat.is_kitchen_sale !== true
        );
        lunchCategories.forEach((cat: any) => categoriesMap.set(cat.id, cat));
      }

      // Build menus map
      const menusMap = new Map<string, LunchMenu[]>();
      (menusData || []).forEach(menu => {
        if (menu.category_id && !categoriesMap.has(menu.category_id)) return;

        const menuWithCat = {
          ...menu,
          category: menu.category_id ? categoriesMap.get(menu.category_id) || null : null
        };
        const existing = menusMap.get(menu.date) || [];
        existing.push(menuWithCat);
        menusMap.set(menu.date, existing);
      });
      setMenus(menusMap);

      // 4. Special days
      const { data: specialDaysData } = await supabase
        .from('special_days')
        .select('date, type, title')
        .eq('school_id', effectiveSchoolId)
        .gte('date', startStr)
        .lte('date', endStr);

      const specialMap = new Map<string, SpecialDay>();
      (specialDaysData || []).forEach(day => specialMap.set(day.date, day));
      setSpecialDays(specialMap);

      // 5. Existing orders
      const personField = userType === 'parent' ? 'student_id' : 'teacher_id';
      const personId = userType === 'parent' ? selectedStudent?.id : userId;

      if (personId) {
        const { data: ordersData } = await supabase
          .from('lunch_orders')
          .select('id, order_date, status, category_id, quantity, is_cancelled, created_at, created_by, delivered_by, cancelled_by, comments')
          .eq(personField, personId)
          .gte('order_date', startStr)
          .lte('order_date', endStr)
          .order('created_at', { ascending: false });

        const orders: ExistingOrder[] = (ordersData || []).map(o => ({
          id: o.id,
          date: o.order_date,
          categoryName: o.category_id ? categoriesMap.get(o.category_id)?.name || null : null,
          categoryId: o.category_id,
          quantity: o.quantity || 1,
          comments: o.comments || null,
          status: o.status,
          is_cancelled: o.is_cancelled || false,
          created_at: o.created_at,
          created_by: o.created_by,
          delivered_by: o.delivered_by,
          cancelled_by: o.cancelled_by,
        }));
        setExistingOrders(orders);
      }

    } catch (error: any) {
      console.error('Error loading monthly data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del mes' });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // DEADLINE VALIDATION
  // ==========================================

  const canOrderForDate = useCallback((dateStr: string): { canOrder: boolean; reason?: string } => {
    if (!config) return { canOrder: true };
    if (!config.orders_enabled) return { canOrder: false, reason: 'Pedidos deshabilitados' };
    if (!config.order_deadline_time) return { canOrder: true };

    const peruNow = getPeruNow();
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = config.order_deadline_time.split(':').map(Number);
    const deadlineDays = config.order_deadline_days ?? 0;

    const deadlineDate = new Date(year, month - 1, day - deadlineDays, hours, minutes, 0, 0);
    const canOrder = peruNow <= deadlineDate;

    if (!canOrder) {
      const deadlineDateFormatted = format(deadlineDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
      return {
        canOrder: false,
        reason: `Venció el ${deadlineDateFormatted}`
      };
    }

    // Verificar bloqueo por rango horario (ej. 11:00 - 14:00)
    if (config.block_orders_enabled && config.block_start_time && config.block_end_time) {
      const nowHour = peruNow.getHours();
      const nowMin = peruNow.getMinutes();
      const nowTotal = nowHour * 60 + nowMin;

      const [bsH, bsM] = config.block_start_time.split(':').map(Number);
      const [beH, beM] = config.block_end_time.split(':').map(Number);
      const blockStart = bsH * 60 + bsM;
      const blockEnd = beH * 60 + beM;

      if (nowTotal >= blockStart && nowTotal < blockEnd) {
        const endStr = config.block_end_time.slice(0, 5);
        return {
          canOrder: false,
          reason: `Pedidos bloqueados hasta las ${endStr} (hora de entrega de almuerzos)`
        };
      }
    }

    return { canOrder: true };
  }, [config]);

  const canCancelForDate = useCallback((dateStr: string): boolean => {
    if (!config?.cancellation_deadline_time) return false;

    const peruNow = getPeruNow();
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = config.cancellation_deadline_time.split(':').map(Number);
    const cancelDays = config.cancellation_deadline_days || 0;

    const cancelDeadline = new Date(year, month - 1, day - cancelDays, hours, minutes, 0, 0);
    return peruNow <= cancelDeadline;
  }, [config]);

  // ==========================================
  // DAY STATUS
  // ==========================================

  const getDayStatus = useCallback((dateStr: string): 'available' | 'has_orders' | 'special' | 'unavailable' | 'blocked' => {
    if (specialDays.has(dateStr)) return 'special';
    if (!menus.has(dateStr)) return 'unavailable';

    const dayOrders = existingOrders.filter(o => o.date === dateStr && !o.is_cancelled);
    if (dayOrders.length > 0) return 'has_orders';

    const validation = canOrderForDate(dateStr);
    if (!validation.canOrder) return 'blocked';

    return 'available';
  }, [menus, specialDays, existingOrders, canOrderForDate]);

  // ==========================================
  // CAROUSEL HANDLERS
  // ==========================================

  const scrollToDay = useCallback((dateStr: string) => {
    const container = carouselRef.current;
    if (!container) return;
    const card = container.querySelector(`[data-date="${dateStr}"]`) as HTMLElement;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  const scrollCarousel = (direction: 'left' | 'right') => {
    const container = carouselRef.current;
    if (!container) return;
    container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const handleSelectDay = (dateStr: string) => {
    const status = getDayStatus(dateStr);

    if (status === 'blocked') {
      const validation = canOrderForDate(dateStr);
      toast({ title: '🔒 Plazo vencido', description: validation.reason || 'No disponible', variant: 'destructive' });
      return;
    }

    // Select this day
    setCarouselDate(dateStr);
    setSelectedMenu(null);
    setQuantity(1);
    setOrderComments('');
    setShowComments(false);
    setChosenStarter(null);
    setChosenMainCourse(null);
    setChosenBeverage(null);
    setChosenDessert(null);

    // Auto-select if only 1 menu
    if (status === 'available') {
      const dayMenus = menus.get(dateStr) || [];
      if (dayMenus.length === 1) {
        setSelectedMenu(dayMenus[0]);
      }
    }

    // Scroll to center this day
    setTimeout(() => scrollToDay(dateStr), 50);
  };

  // ==========================================
  // CONFIRM ORDER
  // ==========================================

  const handleConfirmOrder = async () => {
    if (!config) {
      toast({ variant: 'destructive', title: 'Error', description: 'Configuración no cargada.' });
      return;
    }
    if (!selectedMenu) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona un plato.' });
      return;
    }
    if (!carouselDate) return;

    const selectedCategory = selectedMenu.category;

    setSubmitting(true);

    try {
      const personField = userType === 'parent' ? 'student_id' : 'teacher_id';
      const personId = userType === 'parent' ? selectedStudent?.id : userId;

      if (!personId) {
        toast({ variant: 'destructive', title: 'Error', description: userType === 'parent' ? 'Selecciona un alumno.' : 'No se encontró el usuario.' });
        setSubmitting(false);
        return;
      }

      // Check duplicate — si tiene categoría, buscar por categoría; si no, por menu_id
      let duplicateQuery = supabase
        .from('lunch_orders')
        .select('id')
        .eq(personField, personId)
        .eq('order_date', carouselDate)
        .eq('is_cancelled', false);

      if (selectedCategory) {
        duplicateQuery = duplicateQuery.eq('category_id', selectedCategory.id);
      } else {
        duplicateQuery = duplicateQuery.eq('menu_id', selectedMenu.id);
      }

      const { data: existingOrder } = await duplicateQuery.maybeSingle();

      if (existingOrder) {
        toast({ variant: 'destructive', title: '⚠️ Duplicado', description: `Ya tienes un pedido de "${selectedCategory?.name || 'este menú'}" para este día.` });
        setSubmitting(false);
        return;
      }

      const unitPrice = selectedCategory?.price || config.lunch_price;

      // 1. Create lunch_order
      const orderPayload: any = {
        [personField]: personId,
        order_date: carouselDate,
        status: 'pending',
        category_id: selectedCategory?.id || null,
        menu_id: selectedMenu.id,
        school_id: effectiveSchoolId,
        quantity,
        base_price: unitPrice,
        addons_total: 0,
        final_price: unitPrice * quantity,
        created_by: userId,
        chosen_starter: chosenStarter,
        chosen_main_course: chosenMainCourse,
        chosen_beverage: chosenBeverage,
        chosen_dessert: chosenDessert,
      };
      if (orderComments.trim()) {
        orderPayload.comments = orderComments.trim();
      }

      const { data: insertedOrder, error: orderError } = await supabase
        .from('lunch_orders')
        .insert([orderPayload])
        .select('id')
        .single();

      if (orderError) {
        if (orderError.code === '23505') {
          toast({ variant: 'destructive', title: '⚠️ Duplicado', description: 'Ya existe un pedido para esta categoría en este día.' });
          setSubmitting(false);
          return;
        }
        throw orderError;
      }

      // 2. Create transaction
      const dateFormatted = format(getPeruDateOnly(carouselDate), "d 'de' MMMM", { locale: es });
      const categoryLabel = selectedCategory?.name || 'Almuerzo';
      const description = `Almuerzo - ${categoryLabel} - ${dateFormatted}`;

      let ticketCode: string | null = null;
      try {
        const { data: ticketNumber, error: ticketErr } = await supabase
          .rpc('generate_ticket_number', { p_prefix: 'ALM' });
        if (!ticketErr && ticketNumber) ticketCode = ticketNumber;
      } catch {
        // Fallback silencioso — el ticket se asignará en el backfill
      }

      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          [personField]: personId,
          type: 'purchase',
          amount: -Math.abs(unitPrice * quantity),
          description,
          payment_status: 'pending',
          payment_method: null,
          school_id: effectiveSchoolId,
          created_by: userId,
          ticket_code: ticketCode,
          metadata: {
            lunch_order_id: insertedOrder.id,
            source: `unified_calendar_v2_${userType}`,
            order_date: carouselDate,
            category_name: categoryLabel,
            quantity,
          }
        }]);

      if (txError) console.error('Error creating transaction:', txError);

      // Track for payment (parents)
      if (userType === 'parent' && insertedOrder?.id) {
        setCreatedOrderIds(prev => [...prev, insertedOrder.id]);
        setTotalOrderAmount(prev => prev + (unitPrice * quantity));
        setOrderDescriptions(prev => [...prev, `${quantity}x ${categoryLabel} - ${dateFormatted}`]);
      }

      toast({
        title: '✅ ¡Pedido listo!',
        description: `${selectedMenu.main_course} — S/ ${(unitPrice * quantity).toFixed(2)}`,
      });

      // Reset inline order
      setSelectedMenu(null);
      setQuantity(1);
      setOrderComments('');
      setShowComments(false);
      setChosenStarter(null);
      setChosenMainCourse(null);
      setChosenBeverage(null);
      setChosenDessert(null);

      // Auto-advance to next available day
      const currentIdx = carouselDays.indexOf(carouselDate);
      const nextAvailable = carouselDays.slice(currentIdx + 1).find(d => {
        const orders = existingOrders.filter(o => o.date === d && !o.is_cancelled);
        return orders.length === 0 && canOrderForDate(d).canOrder;
      });

      if (nextAvailable) {
        setCarouselDate(nextAvailable);
        setTimeout(() => {
          scrollToDay(nextAvailable);
          // Auto-select if only 1 menu
          const nextMenus = menus.get(nextAvailable) || [];
          if (nextMenus.length === 1) setSelectedMenu(nextMenus[0]);
        }, 400);
      }

      // Refresh data
      fetchMonthlyData();

    } catch (error: any) {
      console.error('Error confirmando pedido:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo registrar el pedido' });
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // CANCEL ORDER
  // ==========================================

  const handleCancelOrder = async (orderId: string, orderDate: string) => {
    if (!canCancelForDate(orderDate)) {
      toast({ variant: 'destructive', title: '🔒 No se puede cancelar', description: 'Ya pasó el plazo de cancelación' });
      return;
    }

    setCancellingOrderId(orderId);
    try {
      const { error: orderError } = await supabase
        .from('lunch_orders')
        .update({
          is_cancelled: true,
          status: 'cancelled',
          cancelled_by: userId,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      const { error: txError } = await supabase
        .from('transactions')
        .update({ payment_status: 'cancelled' })
        .contains('metadata', { lunch_order_id: orderId });

      if (txError) console.error('Error updating transaction:', txError);

      toast({ title: '✅ Pedido cancelado' });
      await fetchMonthlyData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo cancelar' });
    } finally {
      setCancellingOrderId(null);
    }
  };

  // ==========================================
  // LOADING / DISABLED STATES
  // ==========================================

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (config && !config.orders_enabled) {
    return (
      <Card className="bg-amber-50 border-amber-300">
        <CardContent className="py-8 text-center">
          <Ban className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <p className="text-amber-800 font-medium text-lg">Pedidos deshabilitados</p>
          <p className="text-amber-600 text-sm mt-1">
            El administrador ha deshabilitado temporalmente los pedidos.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  /** Current day's menus (flat list, no categories) */
  const currentDayMenus = carouselDate ? (menus.get(carouselDate) || []) : [];
  const currentDayOrders = carouselDate
    ? existingOrders.filter(o => o.date === carouselDate && !o.is_cancelled)
    : [];
  const currentDayCancelledOrders = carouselDate
    ? existingOrders.filter(o => o.date === carouselDate && o.is_cancelled)
    : [];
  const isCurrentDayAvailable = carouselDate ? canOrderForDate(carouselDate).canOrder : false;
  const isCurrentDayBlocked = carouselDate ? !isCurrentDayAvailable && menus.has(carouselDate) : false;

  const selectedPrice = selectedMenu?.category?.price || config?.lunch_price || 0;
  const totalPrice = selectedPrice * quantity;

  const peruTodayStr = getPeruTodayStr();

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className="space-y-3">

      {/* ── STUDENT SELECTOR (parents) ── */}
      {userType === 'parent' && students.length > 0 && (
        <div className="flex gap-1.5 flex-wrap px-1">
          {students.map(student => (
            <Button
              key={student.id}
              variant={selectedStudent?.id === student.id ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-1.5 h-7 text-[11px] px-2.5 rounded-full",
                selectedStudent?.id === student.id && "bg-purple-600 hover:bg-purple-700"
              )}
              onClick={() => {
                setSelectedStudent(student);
                setExistingOrders([]);
                setCarouselDate(null);
                setSelectedMenu(null);
                setChosenStarter(null);
                setChosenMainCourse(null);
                setChosenBeverage(null);
                setChosenDessert(null);
              }}
            >
              <Users className="h-3 w-3" />
              {student.full_name}
            </Button>
          ))}
        </div>
      )}

      {/* ── MONTH NAVIGATION ── */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-base font-bold text-gray-800">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* ── DAY CAROUSEL ── */}
      {carouselDays.length > 0 ? (
        <div className="relative group">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none rounded-l-xl" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none rounded-r-xl" />

          {/* Arrow left (PC) */}
          <button
            onClick={() => scrollCarousel('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 shadow-md border border-gray-200 items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all hidden sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Scroll container */}
          <div
            ref={carouselRef}
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-8 py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.carousel-days::-webkit-scrollbar { display: none; }`}</style>
            {carouselDays.map(dateStr => {
              const date = getPeruDateOnly(dateStr);
              const status = getDayStatus(dateStr);
              const isSelected = carouselDate === dateStr;
              const isToday = dateStr === peruTodayStr;
              const dayOrders = existingOrders.filter(o => o.date === dateStr && !o.is_cancelled);
              const dayName = format(date, 'EEE', { locale: es });

              return (
                <button
                  key={dateStr}
                  data-date={dateStr}
                  onClick={() => handleSelectDay(dateStr)}
                  className={cn(
                    "snap-center flex-shrink-0 w-[60px] py-2.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-0.5",
                    "active:scale-95 touch-manipulation",
                    // Selected
                    isSelected && status === 'available' && "border-purple-500 bg-purple-50 shadow-lg shadow-purple-200/50 scale-105",
                    isSelected && status === 'has_orders' && "border-green-500 bg-green-50 shadow-lg shadow-green-200/50 scale-105",
                    isSelected && status === 'blocked' && "border-red-400 bg-red-50 shadow-lg scale-105",
                    // Not selected
                    !isSelected && status === 'available' && "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30",
                    !isSelected && status === 'has_orders' && "border-green-300 bg-green-50/50",
                    !isSelected && status === 'blocked' && "border-red-200/50 bg-red-50/30 opacity-50",
                    // Today ring
                    isToday && "ring-2 ring-blue-400 ring-offset-1",
                  )}
                >
                  {/* Day number */}
                  <span className={cn(
                    "text-xl font-bold leading-none",
                    isSelected && status === 'available' && "text-purple-700",
                    isSelected && status === 'has_orders' && "text-green-700",
                    isSelected && status === 'blocked' && "text-red-500",
                    !isSelected && status === 'available' && "text-gray-800",
                    !isSelected && status === 'has_orders' && "text-green-600",
                    !isSelected && status === 'blocked' && "text-red-300",
                  )}>
                    {format(date, 'd')}
                  </span>

                  {/* Day name */}
                  <span className={cn(
                    "text-[10px] font-medium capitalize leading-none",
                    isSelected ? "text-purple-500" : "text-gray-400",
                    status === 'has_orders' && !isSelected && "text-green-500",
                  )}>
                    {dayName}
                  </span>

                  {/* Status indicator */}
                  <div className="h-1.5 flex items-center justify-center">
                    {status === 'has_orders' && (
                      <div className="flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5 text-green-500" />
                        {dayOrders.length > 1 && (
                          <span className="text-[8px] font-bold text-green-600">{dayOrders.length}</span>
                        )}
                      </div>
                    )}
                    {status === 'available' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
                    )}
                    {status === 'blocked' && (
                      <Lock className="h-2 w-2 text-red-300" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Arrow right (PC) */}
          <button
            onClick={() => scrollCarousel('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 shadow-md border border-gray-200 items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all hidden sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        !loading && (
          <div className="text-center py-8 text-gray-400">
            <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay menús disponibles este mes</p>
          </div>
        )
      )}

      {/* ── SELECTED DAY CONTENT ── */}
      {carouselDate && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Card className="overflow-hidden border-0 shadow-sm">
            {/* Day header */}
            <div className={cn(
              "px-4 py-2 flex items-center justify-between",
              currentDayOrders.length > 0
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                : isCurrentDayBlocked
                  ? "bg-gradient-to-r from-red-400 to-red-500 text-white"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
            )}>
              <div>
                <h3 className="text-sm font-bold capitalize">
                  {format(getPeruDateOnly(carouselDate), "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                <p className="text-[10px] opacity-75">
                  {currentDayOrders.length > 0
                    ? `${currentDayOrders.length} pedido(s) registrado(s)`
                    : isCurrentDayBlocked
                      ? 'Plazo vencido'
                      : `${currentDayMenus.length} opcion(es) disponible(s)`
                  }
                </p>
              </div>
              {currentDayOrders.length > 0 && (
                <Badge className="bg-white/20 text-white text-[10px]">
                  <Check className="h-3 w-3 mr-0.5" /> Pedido
                </Badge>
              )}
              {isCurrentDayBlocked && (
                <Lock className="h-4 w-4 opacity-60" />
              )}
            </div>

            <CardContent className="p-3">

              {/* ── EXISTING ORDERS (compact view) ── */}
              {currentDayOrders.length > 0 && (
                <div className="space-y-2 mb-3">
                  {currentDayOrders.map(order => (
                    <div
                      key={order.id}
                      className="flex items-center gap-3 p-2.5 bg-green-50 rounded-xl border border-green-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-800 truncate">
                          {order.categoryName || 'Almuerzo'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>x{order.quantity}</span>
                          <span>•</span>
                          <Badge variant="outline" className={cn(
                            "text-[9px] h-4 px-1",
                            order.status === 'pending' && "border-yellow-400 text-yellow-700",
                            order.status === 'confirmed' && "border-blue-400 text-blue-700",
                            order.status === 'delivered' && "border-green-400 text-green-700",
                          )}>
                            {order.status === 'pending' ? 'Pendiente' :
                             order.status === 'confirmed' ? 'Confirmado' :
                             order.status === 'delivered' ? 'Entregado' : order.status}
                          </Badge>
                        </div>
                        {order.comments && (
                          <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-0.5">
                            <MessageSquare className="h-2.5 w-2.5" /> {order.comments}
                          </p>
                        )}
                      </div>

                      {/* Cancel button */}
                      {order.status === 'pending' && canCancelForDate(order.date) && (
                        <button
                          onClick={() => handleCancelOrder(order.id, order.date)}
                          disabled={cancellingOrderId === order.id}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          {cancellingOrderId === order.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />
                          }
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Cancelled orders (small) */}
                  {currentDayCancelledOrders.length > 0 && (
                    <p className="text-[10px] text-gray-400 text-center">
                      {currentDayCancelledOrders.length} pedido(s) cancelado(s)
                    </p>
                  )}

                  {/* Option to add more if still within deadline */}
                  {isCurrentDayAvailable && currentDayMenus.length > 0 && (
                    <div className="border-t border-dashed border-gray-200 pt-2">
                      <p className="text-[10px] text-gray-500 text-center mb-2">¿Agregar otro pedido?</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── BLOCKED DAY MESSAGE ── */}
              {isCurrentDayBlocked && currentDayOrders.length === 0 && (
                <div className="text-center py-4">
                  <Lock className="h-8 w-8 text-red-300 mx-auto mb-2" />
                  <p className="text-sm text-red-500 font-medium">Plazo vencido</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {canOrderForDate(carouselDate).reason}
                  </p>
                </div>
              )}

              {/* ── MENU LIST (flat, no categories) ── */}
              {((currentDayOrders.length === 0 && !isCurrentDayBlocked) ||
                (currentDayOrders.length > 0 && isCurrentDayAvailable)) && currentDayMenus.length > 0 && (
                <div className="space-y-2">
                  {currentDayMenus.map(menu => {
                    const price = menu.category?.price || config?.lunch_price || 0;
                    const isMenuSelected = selectedMenu?.id === menu.id;

                    return (
                      <button
                        key={menu.id}
                        onClick={() => {
                          setSelectedMenu(isMenuSelected ? null : menu);
                          setChosenStarter(null);
                          setChosenMainCourse(null);
                          setChosenBeverage(null);
                          setChosenDessert(null);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border-2 transition-all active:scale-[0.98] touch-manipulation",
                          "flex items-center gap-3",
                          isMenuSelected
                            ? "border-purple-500 bg-purple-50 shadow-md shadow-purple-100"
                            : "border-gray-200 bg-white hover:border-purple-200 active:bg-purple-50/50"
                        )}
                      >
                        {/* Radio indicator */}
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                          isMenuSelected
                            ? "border-purple-600 bg-purple-600"
                            : "border-gray-300"
                        )}>
                          {isMenuSelected && <Check className="h-3 w-3 text-white" />}
                        </div>

                        {/* Menu info */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-bold text-[13px] leading-tight",
                            isMenuSelected ? "text-purple-800" : "text-gray-800"
                          )}>
                            {menu.main_course}
                          </p>
                          {/* Side items */}
                          <div className="flex flex-wrap gap-x-1.5 mt-0.5">
                            {menu.starter && <span className="text-[10px] text-gray-400">{menu.starter}</span>}
                            {menu.beverage && <span className="text-[10px] text-gray-400">· {menu.beverage}</span>}
                            {menu.dessert && <span className="text-[10px] text-gray-400">· {menu.dessert}</span>}
                          </div>
                        </div>

                        {/* Price */}
                        <span className={cn(
                          "font-bold text-sm flex-shrink-0",
                          isMenuSelected ? "text-purple-700" : "text-gray-600"
                        )}>
                          S/{price.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}

                  {/* ── ORDER CONTROLS (appears when menu selected) ── */}
                  {selectedMenu && (
                    <div className="pt-2 space-y-2.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
                      {hasAnyAlternatives(selectedMenu) && (
                        <div className="space-y-2 p-2.5 bg-purple-50/50 rounded-xl border border-purple-100">
                          <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Elige tus opciones</p>
                          {selectedMenu.starter && (
                            <MenuFieldOptionSelector
                              fieldLabel="Entrada"
                              icon="🥗"
                              defaultValue={selectedMenu.starter}
                              alternatives={selectedMenu.starter_alternatives || []}
                              selectedValue={chosenStarter}
                              onChange={setChosenStarter}
                              compact
                            />
                          )}
                          <MenuFieldOptionSelector
                            fieldLabel="Segundo"
                            icon="🍽️"
                            defaultValue={selectedMenu.main_course}
                            alternatives={selectedMenu.main_course_alternatives || []}
                            selectedValue={chosenMainCourse}
                            onChange={setChosenMainCourse}
                            compact
                          />
                          {selectedMenu.beverage && (
                            <MenuFieldOptionSelector
                              fieldLabel="Bebida"
                              icon="🥤"
                              defaultValue={selectedMenu.beverage}
                              alternatives={selectedMenu.beverage_alternatives || []}
                              selectedValue={chosenBeverage}
                              onChange={setChosenBeverage}
                              compact
                            />
                          )}
                          {selectedMenu.dessert && (
                            <MenuFieldOptionSelector
                              fieldLabel="Postre"
                              icon="🍰"
                              defaultValue={selectedMenu.dessert}
                              alternatives={selectedMenu.dessert_alternatives || []}
                              selectedValue={chosenDessert}
                              onChange={setChosenDessert}
                              compact
                            />
                          )}
                        </div>
                      )}
                      {/* Quantity + Note */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Cantidad:</span>
                          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                            <button
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              disabled={quantity <= 1}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-gray-500 disabled:opacity-30 active:bg-white transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-bold text-sm w-6 text-center">{quantity}</span>
                            <button
                              onClick={() => setQuantity(Math.min(10, quantity + 1))}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-gray-500 active:bg-white transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowComments(!showComments)}
                          className={cn(
                            "text-[11px] font-medium px-2 py-1 rounded-md transition-colors",
                            showComments
                              ? "bg-purple-100 text-purple-700"
                              : "text-gray-400 hover:text-purple-600"
                          )}
                        >
                          📝 {showComments ? 'Ocultar nota' : 'Agregar nota'}
                        </button>
                      </div>

                      {/* Comments textarea */}
                      {showComments && (
                        <Textarea
                          placeholder="Ej: Sin ensalada, sin cebolla..."
                          value={orderComments}
                          onChange={(e) => setOrderComments(e.target.value)}
                          rows={2}
                          className="resize-none text-xs h-14 rounded-xl"
                        />
                      )}

                      {/* ── PEDIR BUTTON ── */}
                      <button
                        onClick={handleConfirmOrder}
                        disabled={submitting}
                        className={cn(
                          "w-full h-12 rounded-2xl font-bold text-[15px] shadow-lg",
                          "flex items-center justify-center gap-2 transition-all active:scale-[0.97] touch-manipulation",
                          submitting
                            ? "bg-gray-400 text-white"
                            : "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200/50 hover:shadow-green-300/50"
                        )}
                      >
                        {submitting ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> Registrando...</>
                        ) : (
                          <>🛒 Pedir — S/{totalPrice.toFixed(2)}</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* No menus for this day */}
              {currentDayMenus.length === 0 && currentDayOrders.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  <UtensilsCrossed className="h-6 w-6 mx-auto mb-1 opacity-40" />
                  <p className="text-xs">Sin menú disponible para este día</p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SESSION ORDERS FLOATING BAR ── */}
      {createdOrderIds.length > 0 && !showPaymentModal && userType === 'parent' && (
        <div className="fixed bottom-16 left-2 right-2 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div className="mx-auto max-w-sm bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">
                🛒 {createdOrderIds.length} pedido{createdOrderIds.length > 1 ? 's' : ''}
              </p>
              <p className="text-purple-300 text-[10px] truncate">
                Total: S/ {totalOrderAmount.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => {
                setCreatedOrderIds([]);
                setTotalOrderAmount(0);
                setOrderDescriptions([]);
              }}
              className="text-white/50 hover:text-white/80 p-1"
            >
              ✕
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-white text-purple-700 font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform shadow-lg"
            >
              <CreditCardIcon className="h-3.5 w-3.5" />
              Pagar
            </button>
          </div>
        </div>
      )}

      {/* ── LEGEND ── */}
      <div className="px-2 py-1.5 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-center gap-3 text-[9px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400/60 inline-block" /> Disponible
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-2.5 w-2.5 text-green-500" /> Pedido
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-2.5 w-2.5 text-red-300" /> Vencido
          </span>
          {config?.order_deadline_time && (
            <span className="text-amber-500">
              ⏰ {config.order_deadline_time.substring(0, 5)}
              {(config.order_deadline_days ?? 0) > 0 && ` (${config.order_deadline_days}d antes)`}
            </span>
          )}
        </div>
      </div>

      {/* ── PAYMENT MODAL (parents only) ── */}
      {userType === 'parent' && selectedStudent && (
        <RechargeModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setCreatedOrderIds([]);
            setTotalOrderAmount(0);
            setOrderDescriptions([]);
          }}
          studentName={selectedStudent.full_name}
          studentId={selectedStudent.id}
          currentBalance={selectedStudent.balance || 0}
          accountType={selectedStudent.free_account ? 'free' : 'prepaid'}
          suggestedAmount={totalOrderAmount}
          requestType="lunch_payment"
          requestDescription={`Pago almuerzo: ${orderDescriptions.join(' | ')}`}
          lunchOrderIds={createdOrderIds}
          onRecharge={async () => {
            toast({ title: '✅ Comprobante enviado', description: 'Tu pago será revisado por el administrador.' });
          }}
        />
      )}
    </div>
  );
}
