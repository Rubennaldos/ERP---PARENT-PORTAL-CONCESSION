import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Minus,
  Calendar as CalendarIcon,
  Clock,
  Lock,
  Sparkles,
  Users,
  Package,
  ShoppingCart,
  XCircle,
  Eye,
  Check,
  Ban,
  Trash2,
  CreditCard as CreditCardIcon,
} from 'lucide-react';
import { RechargeModal } from '@/components/parent/RechargeModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
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
  category?: LunchCategory | null;
}

interface SpecialDay {
  date: string;
  type: string;
  title: string;
}

// FIXED: Column names match ACTUAL database columns
interface LunchConfig {
  lunch_price: number;
  orders_enabled: boolean;
  order_deadline_time: string;   // "HH:MM:SS"
  order_deadline_days: number;
  cancellation_deadline_time: string;  // FIXED: was "cancel_deadline_time"
  cancellation_deadline_days: number;  // FIXED: was "cancel_deadline_days"
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
// ICON MAP
// ==========================================
const ICON_MAP: Record<string, any> = {
  utensils: UtensilsCrossed,
  salad: Sparkles,
  coins: ShoppingCart,
  leaf: Sparkles,
  briefcase: Users,
  sparkles: Sparkles,
  package: Package,
};

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// ==========================================
// TIMEZONE HELPERS (Peru UTC-5) - FIXED
// ==========================================

/**
 * Returns a Date whose .getHours(), .getDate(), etc. return Peru local values.
 * Works by formatting current time in Peru timezone and parsing back.
 * This creates a "fake local" Date that's safe for comparison with
 * dates created via `new Date(year, month, day, ...)`.
 */
const getPeruNow = (): Date => {
  const peruStr = new Date().toLocaleString('en-US', { timeZone: 'America/Lima' });
  return new Date(peruStr);
};

/**
 * Returns a Date from "YYYY-MM-DD" using local Date constructor.
 * Compatible with getPeruNow() for deadline comparisons.
 */
const getPeruDateOnly = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/** Get today's date string in Peru timezone as "YYYY-MM-DD" */
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

  // Navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Data
  const [menus, setMenus] = useState<Map<string, LunchMenu[]>>(new Map());
  const [specialDays, setSpecialDays] = useState<Map<string, SpecialDay>>(new Map());
  const [existingOrders, setExistingOrders] = useState<ExistingOrder[]>([]);
  const [config, setConfig] = useState<LunchConfig | null>(null);

  // Parent-specific
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ── TAP & ORDER: Modal rápido de pedido ──
  const [orderModalDate, setOrderModalDate] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<LunchMenu | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [orderComments, setOrderComments] = useState('');
  const [showComments, setShowComments] = useState(false);

  // ── MULTI-DAY: Selección de múltiples días ──
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [multiOrderModalOpen, setMultiOrderModalOpen] = useState(false);
  const [multiOrderProcessing, setMultiOrderProcessing] = useState(false);
  const [multiOrderResults, setMultiOrderResults] = useState<{ date: string; success: boolean; desc?: string }[]>([]);

  // View existing orders modal
  const [viewOrdersModal, setViewOrdersModal] = useState(false);
  const [viewOrdersDate, setViewOrdersDate] = useState<string | null>(null);

  // Cancellation
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Payment flow (parents only)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrderIds, setCreatedOrderIds] = useState<string[]>([]);
  const [totalOrderAmount, setTotalOrderAmount] = useState(0);
  const [orderDescriptions, setOrderDescriptions] = useState<string[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // COMPUTED
  // ==========================================
  const effectiveSchoolId = userType === 'parent' && selectedStudent ? selectedStudent.school_id : userSchoolId;

  // ==========================================
  // DATA FETCHING
  // ==========================================

  useEffect(() => {
    if (userType === 'parent') fetchStudents();
  }, [userType, userId]);

  useEffect(() => {
    if (effectiveSchoolId) fetchMonthlyData();
  }, [currentDate, effectiveSchoolId]);

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
      console.error('Error fetching students:', error);
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
        .select('lunch_price, orders_enabled, order_deadline_time, order_deadline_days, cancellation_deadline_time, cancellation_deadline_days')
        .eq('school_id', effectiveSchoolId)
        .maybeSingle();

      setConfig(configData);

      // 2. Menus - FIXED: include target_type='both' AND target_type IS NULL
      // NULL = menú creado sin target_type (carga masiva), visible para todos
      const targetType = userType === 'parent' ? 'students' : 'teachers';
      const { data: menusData, error: menusError } = await supabase
        .from('lunch_menus')
        .select('id, date, starter, main_course, beverage, dessert, notes, category_id, target_type')
        .eq('school_id', effectiveSchoolId)
        .or(`target_type.eq.${targetType},target_type.eq.both,target_type.is.null`)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      if (menusError) throw menusError;

      // 3. Categories - Cargamos TODAS las categorías (activas e inactivas) para
      //    mostrar menús y pedidos existentes. El filtro de is_active solo aplica
      //    al wizard de creación de nuevos pedidos (LunchCategoryWizard).
      const categoryIds = [...new Set((menusData || []).map(m => m.category_id).filter(Boolean))] as string[];
      let categoriesMap = new Map<string, LunchCategory>();

      if (categoryIds.length > 0) {
        const { data: categoriesData, error: catError } = await supabase
          .from('lunch_categories')
          .select('*')
          .in('id', categoryIds)
          .eq('school_id', effectiveSchoolId);
        // ⚠️ NO filtramos por is_active aquí: si una categoría está desactivada,
        //    los menús y pedidos existentes deben seguir siendo visibles.

        if (catError) {
          console.error('❌ [V2-DEBUG] Error loading categories:', catError);
        }

        // Filter out kitchen-sale categories (POS products, not lunch menus)
        const lunchCategories = (categoriesData || []).filter(
          (cat: any) => cat.is_kitchen_sale !== true
        );

        lunchCategories.forEach((cat: any) => {
          categoriesMap.set(cat.id, cat);
        });
      }

      // Build menus map - skip menus whose categories don't belong to this school
      // (but NOT skip inactive categories — they stay visible)
      const menusMap = new Map<string, LunchMenu[]>();
      let menusIncluded = 0;
      let menusSkipped = 0;
      (menusData || []).forEach(menu => {
        if (menu.category_id && !categoriesMap.has(menu.category_id)) {
          menusSkipped++;
          return;
        }

        menusIncluded++;
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
          cancelled_by: o.cancelled_by
        }));
        setExistingOrders(orders);
      }

    } catch (error: any) {
      console.error('❌ [UnifiedCalendarV2] Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del mes' });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // DEADLINE VALIDATION - COMPLETELY FIXED
  // ==========================================

  /**
   * Checks if ordering is allowed for a given date.
   * Both getPeruNow() and the deadline Date use the same "fake local" timezone frame,
   * so the comparison is always correct regardless of the user's actual timezone.
   */
  const canOrderForDate = useCallback((dateStr: string): { canOrder: boolean; reason?: string } => {
    if (!config) return { canOrder: true };
    if (!config.orders_enabled) return { canOrder: false, reason: 'Pedidos deshabilitados' };
    if (!config.order_deadline_time) return { canOrder: true };

    const peruNow = getPeruNow();
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = config.order_deadline_time.split(':').map(Number);
    const deadlineDays = config.order_deadline_days ?? 0;

    // Deadline: (target day - deadlineDays) at HH:MM
    // Example: target = Feb 12, deadlineDays = 0, time = 10:30
    //   → deadline = Feb 12 at 10:30
    // Example: target = Feb 12, deadlineDays = 1, time = 20:00
    //   → deadline = Feb 11 at 20:00
    const deadlineDate = new Date(year, month - 1, day - deadlineDays, hours, minutes, 0, 0);

    const canOrder = peruNow <= deadlineDate;

    if (!canOrder) {
      // Show user-friendly message with the exact deadline
      const deadlineDateFormatted = format(deadlineDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
      return {
        canOrder: false,
        reason: `El plazo venció el ${deadlineDateFormatted}. Config: ${deadlineDays}d antes a las ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      };
    }

    return { canOrder: true };
  }, [config]);

  /**
   * Checks if cancellation is allowed for a given date.
   * Uses cancellation_deadline_time and cancellation_deadline_days from config.
   */
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
  // TAP & ORDER: 1-tap date → order modal
  // ==========================================

  const handleDateClick = (dateStr: string) => {
    // Days with existing orders → open view modal (siempre, en cualquier modo)
    const dayOrders = existingOrders.filter(o => o.date === dateStr && !o.is_cancelled);
    if (dayOrders.length > 0 && !multiSelectMode) {
      setViewOrdersDate(dateStr);
      setViewOrdersModal(true);
      return;
    }

    // Special days → info toast
    if (specialDays.has(dateStr)) {
      toast({ title: 'Día especial', description: specialDays.get(dateStr)?.title || 'No disponible' });
      return;
    }

    // No menus → ignore
    if (!menus.has(dateStr)) return;

    // Check deadline
    const validation = canOrderForDate(dateStr);
    if (!validation.canOrder) {
      toast({ title: '🔒 Bloqueado', description: validation.reason || 'No se puede pedir', variant: 'destructive' });
      return;
    }

    // ── MULTI-SELECT MODE: toggle selección ──
    if (multiSelectMode) {
      // No seleccionar días que ya tienen pedido
      if (dayOrders.length > 0) {
        toast({ title: '⚠️ Ya tienes pedido', description: 'Este día ya tiene un pedido registrado.' });
        return;
      }
      setSelectedDates(prev => {
        const next = new Set(prev);
        if (next.has(dateStr)) next.delete(dateStr);
        else next.add(dateStr);
        return next;
      });
      return;
    }

    // ── MODO NORMAL: Abrir modal de pedido directo ──
    openOrderModal(dateStr);
  };

  const openOrderModal = (dateStr: string) => {
    const dayMenus = menus.get(dateStr) || [];
    setOrderModalDate(dateStr);
    setSelectedMenu(null);
    setQuantity(1);
    setOrderComments('');
    setShowComments(false);

    // Auto-select si solo hay 1 menú en total
    if (dayMenus.length === 1) {
      setSelectedMenu(dayMenus[0]);
    }
  };

  const closeOrderModal = () => {
    setOrderModalDate(null);
    setSelectedMenu(null);
    setQuantity(1);
    setOrderComments('');
    setShowComments(false);
  };

  // ==========================================
  // CONFIRM ORDER (TAP & ORDER)
  // ==========================================

  const handleConfirmOrder = async () => {
    if (!config) {
      toast({ variant: 'destructive', title: 'Error', description: 'Configuración no cargada. Recarga la página.' });
      return;
    }
    if (!selectedMenu) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona un plato primero.' });
      return;
    }
    if (!orderModalDate) return;

    const selectedCategory = selectedMenu.category;
    if (!selectedCategory) {
      toast({ variant: 'destructive', title: 'Error', description: 'El plato no tiene categoría asignada.' });
      return;
    }

    setSubmitting(true);

    try {
      const personField = userType === 'parent' ? 'student_id' : 'teacher_id';
      const personId = userType === 'parent' ? selectedStudent?.id : userId;

      if (!personId) {
        toast({ variant: 'destructive', title: 'Error', description: userType === 'parent' ? 'Selecciona un alumno primero.' : 'No se encontró el usuario.' });
        setSubmitting(false);
        return;
      }

      // ── Verificar pedido duplicado ──
      const { data: existingOrder } = await supabase
        .from('lunch_orders')
        .select('id')
        .eq(personField, personId)
        .eq('order_date', orderModalDate)
        .eq('category_id', selectedCategory.id)
        .eq('is_cancelled', false)
        .maybeSingle();

      if (existingOrder) {
        toast({
          variant: 'destructive',
          title: '⚠️ Pedido duplicado',
          description: `Ya tienes un pedido de "${selectedCategory.name}" para este día.`,
        });
        setSubmitting(false);
        return;
      }

      const unitPrice = selectedCategory.price || config.lunch_price;

      // 1. Create lunch_order
      const orderPayload: any = {
        [personField]: personId,
        order_date: orderModalDate,
        status: 'pending',
        category_id: selectedCategory.id,
        menu_id: selectedMenu.id,
        school_id: effectiveSchoolId,
        quantity,
        base_price: unitPrice,
        addons_total: 0,
        final_price: unitPrice * quantity,
        created_by: userId,
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
          toast({ variant: 'destructive', title: '⚠️ Pedido duplicado', description: 'Ya existe un pedido para esta categoría en este día.' });
          setSubmitting(false);
          return;
        }
        throw orderError;
      }

      // 2. Create transaction
      const dateFormatted = format(getPeruDateOnly(orderModalDate), "d 'de' MMMM", { locale: es });
      const description = `Almuerzo - ${selectedCategory.name} - ${dateFormatted}`;

      let ticketCode: string | null = null;
      try {
        const { data: ticketNumber, error: ticketErr } = await supabase
          .rpc('get_next_ticket_number', { p_user_id: userId });
        if (!ticketErr && ticketNumber) ticketCode = ticketNumber;
      } catch {}

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
            order_date: orderModalDate,
            category_name: selectedCategory.name,
            quantity,
          }
        }]);

      if (txError) console.error('Error creating transaction:', txError);

      // Track for payment (parents)
      if (userType === 'parent' && insertedOrder?.id) {
        setCreatedOrderIds(prev => [...prev, insertedOrder.id]);
        setTotalOrderAmount(prev => prev + (unitPrice * quantity));
        setOrderDescriptions(prev => [...prev, `${quantity}x ${selectedCategory.name} - ${dateFormatted}`]);
      }

      toast({
        title: '✅ Pedido registrado',
        description: `${selectedMenu.main_course} — S/ ${(unitPrice * quantity).toFixed(2)}`,
      });

      // Cerrar y refrescar
      closeOrderModal();
      fetchMonthlyData();

    } catch (error: any) {
      console.error('Error confirmando pedido:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo registrar el pedido' });
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // MULTI-DAY ORDER: Pedir varios días a la vez
  // ==========================================

  const handleMultiDayOrder = async () => {
    if (!config || selectedDates.size === 0) return;

    const personField = userType === 'parent' ? 'student_id' : 'teacher_id';
    const personId = userType === 'parent' ? selectedStudent?.id : userId;
    if (!personId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona un alumno primero.' });
      return;
    }

    setMultiOrderProcessing(true);
    const results: { date: string; success: boolean; desc?: string }[] = [];

    const sortedDates = Array.from(selectedDates).sort();

    for (const dateStr of sortedDates) {
      const dayMenus = menus.get(dateStr) || [];

      // Buscar el primer menú con categoría válida
      const menu = dayMenus.find(m => m.category_id && m.category);
      if (!menu || !menu.category) {
        results.push({ date: dateStr, success: false, desc: 'Sin menú disponible' });
        continue;
      }

      const cat = menu.category;
      const unitPrice = cat.price || config.lunch_price;

      try {
        // Verificar duplicado
        const { data: existing } = await supabase
          .from('lunch_orders')
          .select('id')
          .eq(personField, personId)
          .eq('order_date', dateStr)
          .eq('category_id', cat.id)
          .eq('is_cancelled', false)
          .maybeSingle();

        if (existing) {
          results.push({ date: dateStr, success: false, desc: 'Ya tiene pedido' });
          continue;
        }

        // Crear lunch_order
        const { data: insertedOrder, error: orderError } = await supabase
          .from('lunch_orders')
          .insert([{
            [personField]: personId,
            order_date: dateStr,
            status: 'pending',
            category_id: cat.id,
            menu_id: menu.id,
            school_id: effectiveSchoolId,
            quantity: 1,
            base_price: unitPrice,
            addons_total: 0,
            final_price: unitPrice,
            created_by: userId,
          }])
          .select('id')
          .single();

        if (orderError) throw orderError;

        // Crear transacción
        const dateFormatted = format(getPeruDateOnly(dateStr), "d 'de' MMMM", { locale: es });

        let ticketCode: string | null = null;
        try {
          const { data: tn } = await supabase.rpc('get_next_ticket_number', { p_user_id: userId });
          if (tn) ticketCode = tn;
        } catch {}

        await supabase.from('transactions').insert([{
          [personField]: personId,
          type: 'purchase',
          amount: -Math.abs(unitPrice),
          description: `Almuerzo - ${cat.name} - ${dateFormatted}`,
          payment_status: 'pending',
          payment_method: null,
          school_id: effectiveSchoolId,
          created_by: userId,
          ticket_code: ticketCode,
          metadata: {
            lunch_order_id: insertedOrder.id,
            source: `unified_calendar_v2_multi_${userType}`,
            order_date: dateStr,
            category_name: cat.name,
            quantity: 1,
          }
        }]);

        if (userType === 'parent' && insertedOrder?.id) {
          setCreatedOrderIds(prev => [...prev, insertedOrder.id]);
          setTotalOrderAmount(prev => prev + unitPrice);
          setOrderDescriptions(prev => [...prev, `${cat.name} - ${dateFormatted}`]);
        }

        results.push({ date: dateStr, success: true, desc: `${menu.main_course} — S/ ${unitPrice.toFixed(2)}` });
      } catch (err: any) {
        results.push({ date: dateStr, success: false, desc: err.message || 'Error' });
      }
    }

    setMultiOrderResults(results);
    setMultiOrderProcessing(false);

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      toast({
        title: `✅ ${successCount} pedido(s) registrado(s)`,
        description: `De ${sortedDates.length} día(s) seleccionado(s)`,
      });
      fetchMonthlyData();
    }
  };

  const closeMultiOrderModal = () => {
    setMultiOrderModalOpen(false);
    setMultiOrderResults([]);
    setSelectedDates(new Set());
    setMultiSelectMode(false);
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
      // 1. Update lunch_order
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

      // 2. Update related transaction (find by metadata.lunch_order_id)
      const { error: txError } = await supabase
        .from('transactions')
        .update({ payment_status: 'cancelled' })
        .contains('metadata', { lunch_order_id: orderId });

      if (txError) console.error('⚠️ Error updating transaction:', txError);

      toast({ title: '✅ Pedido cancelado', description: 'El pedido fue anulado correctamente' });

      // Refresh data
      await fetchMonthlyData();

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo cancelar el pedido' });
    } finally {
      setCancellingOrderId(null);
    }
  };

  // ==========================================
  // CALENDAR RENDERING
  // ==========================================

  const getDayStatus = (dateStr: string): 'available' | 'has_orders' | 'special' | 'unavailable' | 'blocked' => {
    if (specialDays.has(dateStr)) return 'special';
    if (!menus.has(dateStr)) return 'unavailable';

    const validation = canOrderForDate(dateStr);
    if (!validation.canOrder) return 'blocked';

    const dayOrders = existingOrders.filter(o => o.date === dateStr && !o.is_cancelled);
    if (dayOrders.length > 0) return 'has_orders';

    return 'available';
  };

  const renderCalendar = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    const startDayOfWeek = start.getDay();
    const peruTodayStr = getPeruTodayStr();

    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-gray-500 p-1 sm:p-2">{day}</div>
        ))}

        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const status = getDayStatus(dateStr);
          const isToday = dateStr === peruTodayStr;
          const isSelected = multiSelectMode && selectedDates.has(dateStr);
          const dayOrders = existingOrders.filter(o => o.date === dateStr && !o.is_cancelled);
          const dayMenus = menus.get(dateStr) || [];

          const isDisabled = status === 'unavailable' || status === 'special' ||
                             (status === 'blocked' && dayOrders.length === 0);

          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(dateStr)}
              disabled={isDisabled}
              className={cn(
                "aspect-square p-0.5 sm:p-1 rounded-lg border-2 transition-all relative flex flex-col items-center justify-start",
                "hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                isToday && "ring-2 ring-blue-400",
                isSelected && "bg-purple-100 border-purple-500 ring-2 ring-purple-300",
                !isSelected && status === 'available' && "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50",
                !isSelected && status === 'has_orders' && "bg-green-50 border-green-300 hover:border-green-400",
                !isSelected && status === 'special' && "bg-gray-100 border-gray-300",
                !isSelected && status === 'unavailable' && "bg-gray-50 border-gray-200",
                !isSelected && status === 'blocked' && "bg-red-50 border-red-200",
              )}
            >
              <span className={cn(
                "text-xs sm:text-sm font-medium",
                isSelected && "text-purple-700 font-bold",
                !isSelected && status === 'blocked' && "text-red-400",
                !isSelected && status === 'unavailable' && "text-gray-400",
                !isSelected && status === 'has_orders' && "text-green-700 font-bold",
                !isSelected && status === 'available' && "text-gray-800",
              )}>
                {format(date, 'd')}
              </span>

              {isSelected && (
                <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-purple-600 mt-0.5" />
              )}

              {!isSelected && status === 'blocked' && (
                <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400 mt-0.5" />
              )}

              {!isSelected && status === 'available' && dayMenus.length > 0 && (
                <UtensilsCrossed className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500 mt-0.5" />
              )}

              {dayOrders.length > 0 && (
                <Badge className="absolute top-0 right-0 h-3.5 w-3.5 sm:h-4 sm:w-4 p-0 flex items-center justify-center text-[8px] sm:text-[9px] bg-green-500">
                  {dayOrders.reduce((sum, o) => sum + o.quantity, 0)}
                </Badge>
              )}

              {!isSelected && dayMenus.length > 0 && status !== 'has_orders' && status !== 'blocked' && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from(new Set(dayMenus.map(m => m.category?.color || '#3B82F6'))).slice(0, 3).map((color, idx) => (
                    <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // ==========================================
  // TAP & ORDER MODAL (nuevo diseño compacto)
  // ==========================================

  const renderOrderModal = () => {
    if (!orderModalDate) return null;

    const dayMenus = menus.get(orderModalDate) || [];
    const dateLabel = format(getPeruDateOnly(orderModalDate), "EEEE d 'de' MMMM", { locale: es });

    // Agrupar menús por categoría
    const categoriesWithMenus = new Map<string, { category: LunchCategory; menuItems: LunchMenu[] }>();
    dayMenus.forEach(menu => {
      if (!menu.category_id || !menu.category) return;
      const existing = categoriesWithMenus.get(menu.category_id);
      if (existing) {
        existing.menuItems.push(menu);
      } else {
        categoriesWithMenus.set(menu.category_id, {
          category: menu.category,
          menuItems: [menu],
        });
      }
    });

    const categories = Array.from(categoriesWithMenus.values());
    const selectedCategory = selectedMenu?.category;
    const unitPrice = selectedCategory?.price || config?.lunch_price || 0;
    const totalPrice = unitPrice * quantity;

    return (
      <Dialog open={!!orderModalDate} onOpenChange={(open) => !open && closeOrderModal()}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto p-0">
          {/* Header compacto */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
            <DialogHeader>
              <DialogTitle className="text-white text-base sm:text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 flex-shrink-0" />
                {dateLabel}
              </DialogTitle>
              <DialogDescription className="text-purple-100 text-xs sm:text-sm">
                {selectedMenu ? 'Confirma tu pedido' : 'Elige tu plato'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay menús disponibles para este día</p>
              </div>
            ) : (
              categories.map(({ category, menuItems }) => {
                const IconComponent = ICON_MAP[category.icon || 'utensils'] || UtensilsCrossed;
                const catPrice = category.price || config?.lunch_price || 0;

                return (
                  <div key={category.id}>
                    {/* Header de categoría (solo si hay más de 1 categoría) */}
                    {categories.length > 1 && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <div
                          className="h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: (category.color || '#8B5CF6') + '20' }}
                        >
                          <IconComponent className="h-4 w-4" style={{ color: category.color || '#8B5CF6' }} />
                        </div>
                        <span className="font-bold text-sm text-gray-800">{category.name}</span>
                        <span className="text-xs text-gray-500 ml-auto font-semibold">S/ {catPrice.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Lista de platos */}
                    <div className="space-y-2">
                      {menuItems.map(menu => {
                        const isSelected = selectedMenu?.id === menu.id;
                        return (
                          <button
                            key={menu.id}
                            onClick={() => setSelectedMenu(isSelected ? null : menu)}
                            className={cn(
                              "w-full text-left p-3 rounded-xl border-2 transition-all",
                              isSelected
                                ? "border-purple-500 bg-purple-50 ring-2 ring-purple-300 shadow-md"
                                : "border-gray-200 hover:border-purple-300 hover:bg-gray-50 active:bg-purple-50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {/* Radio visual */}
                              <div className={cn(
                                "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                isSelected ? "border-purple-600 bg-purple-600" : "border-gray-300"
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>

                              {/* Info del plato */}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "font-bold text-sm sm:text-base leading-tight",
                                  isSelected ? "text-purple-800" : "text-gray-900"
                                )}>
                                  {menu.main_course}
                                </p>
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                  {menu.starter && (
                                    <span className="text-xs text-gray-500">🥣 {menu.starter}</span>
                                  )}
                                  {menu.beverage && (
                                    <span className="text-xs text-gray-500">🥤 {menu.beverage}</span>
                                  )}
                                  {menu.dessert && (
                                    <span className="text-xs text-gray-500">🍮 {menu.dessert}</span>
                                  )}
                                </div>
                              </div>

                              {/* Precio */}
                              {categories.length <= 1 && (
                                <span className={cn(
                                  "font-bold text-sm flex-shrink-0",
                                  isSelected ? "text-purple-700" : "text-gray-700"
                                )}>
                                  S/ {catPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {/* ── Zona de confirmación (aparece al seleccionar un plato) ── */}
            {selectedMenu && (
              <div className="pt-2 space-y-3 border-t border-gray-200">
                {/* Cantidad + Nota (compacto, en una línea) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Cantidad:</span>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-bold text-base w-6 text-center">{quantity}</span>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setQuantity(Math.min(10, quantity + 1))}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <button
                    onClick={() => setShowComments(!showComments)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                  >
                    📝 {showComments ? 'Ocultar nota' : '¿Agregar nota?'}
                  </button>
                </div>

                {/* Comentarios (colapsable) */}
                {showComments && (
                  <Textarea
                    placeholder="Ej: Sin ensalada, alergia al maní..."
                    value={orderComments}
                    onChange={(e) => setOrderComments(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                    autoFocus
                  />
                )}

                {/* Botón PEDIR (grande, prominente) */}
                <Button
                  onClick={handleConfirmOrder}
                  disabled={submitting}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base rounded-xl shadow-lg active:scale-[0.98] transition-transform"
                >
                  {submitting ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Registrando...</>
                  ) : (
                    <>🛒 Pedir — S/ {totalPrice.toFixed(2)}</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ==========================================
  // VIEW EXISTING ORDERS MODAL
  // ==========================================

  const renderViewOrdersModal = () => {
    if (!viewOrdersDate) return null;

    const dayOrders = existingOrders.filter(o => o.date === viewOrdersDate);
    const activeOrders = dayOrders.filter(o => !o.is_cancelled);
    const canAddMore = canOrderForDate(viewOrdersDate).canOrder;
    const canCancel = canCancelForDate(viewOrdersDate);

    return (
      <Dialog open={viewOrdersModal} onOpenChange={setViewOrdersModal}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Pedidos del {format(getPeruDateOnly(viewOrdersDate), "EEEE d 'de' MMMM", { locale: es })}
            </DialogTitle>
            <DialogDescription>
              {activeOrders.length} pedido(s) activo(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {dayOrders.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay pedidos para este día</p>
              </div>
            )}

            {dayOrders.map(order => (
              <Card key={order.id} className={cn(
                "border-2",
                order.is_cancelled ? "border-red-200 bg-red-50 opacity-60" : "border-blue-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-lg">{order.categoryName || 'Sin categoría'}</p>
                      <p className="text-sm text-gray-600">Cantidad: {order.quantity}</p>
                    </div>
                    <Badge className={cn(
                      order.is_cancelled && 'bg-red-500',
                      order.status === 'pending' && !order.is_cancelled && 'bg-yellow-500',
                      order.status === 'confirmed' && !order.is_cancelled && 'bg-blue-500',
                      order.status === 'delivered' && !order.is_cancelled && 'bg-green-500',
                    )}>
                      {order.is_cancelled ? 'Anulado' :
                       order.status === 'pending' ? 'Pendiente' :
                       order.status === 'confirmed' ? 'Confirmado' :
                       order.status === 'delivered' ? 'Entregado' : order.status}
                    </Badge>
                  </div>

                  {/* 💬 Comentarios del pedido */}
                  {order.comments && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-1 mb-1">
                      <p className="text-xs text-amber-700 font-medium">💬 {order.comments}</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Creado: {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>

                  {/* Cancel button - only for pending orders within cancellation deadline */}
                  {!order.is_cancelled && order.status === 'pending' && canCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleCancelOrder(order.id, order.date)}
                      disabled={cancellingOrderId === order.id}
                    >
                      {cancellingOrderId === order.id ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cancelando...</>
                      ) : (
                        <><Trash2 className="h-3 w-3 mr-1" />Cancelar Pedido</>
                      )}
                    </Button>
                  )}

                  {!order.is_cancelled && order.status === 'pending' && !canCancel && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Ya pasó el plazo de cancelación
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setViewOrdersModal(false)}>
              Cerrar
            </Button>
            {canAddMore && (
              <Button
                onClick={() => {
                  setViewOrdersModal(false);
                  openOrderModal(viewOrdersDate!);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Pedido
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Orders disabled by admin
  if (config && !config.orders_enabled) {
    return (
      <Card className="bg-amber-50 border-amber-300">
        <CardContent className="py-8 text-center">
          <Ban className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <p className="text-amber-800 font-medium text-lg">Pedidos deshabilitados</p>
          <p className="text-amber-600 text-sm mt-1">
            El administrador ha deshabilitado temporalmente los pedidos de almuerzos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* DEBUG INFO BANNER - Shows config being used (helps diagnose issues) */}
      {config && (
        <div className="text-[10px] text-gray-400 bg-gray-50 rounded px-2 py-1 flex flex-wrap gap-x-3">
          <span>🏫 Sede: {effectiveSchoolId?.substring(0, 8)}...</span>
          <span>⏰ Límite: {config.order_deadline_time?.substring(0, 5)} | {config.order_deadline_days ?? '?'}d antes</span>
          <span>🕐 Perú: {format(getPeruNow(), 'dd/MM HH:mm')}</span>
          <span>📋 Menús: {menus.size} días</span>
        </div>
      )}

      {/* STUDENT SELECTOR (parents only) */}
      {userType === 'parent' && students.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Selecciona tu hijo(a):</p>
            <div className="flex gap-2 flex-wrap">
              {students.map(student => (
                <Button
                  key={student.id}
                  variant={selectedStudent?.id === student.id ? "default" : "outline"}
                  size="sm"
                  className={cn("gap-2", selectedStudent?.id === student.id && "bg-purple-600 hover:bg-purple-700")}
                  onClick={() => {
                    setSelectedStudent(student);
                    setExistingOrders([]);
                    setSelectedDates(new Set());
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  {student.full_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CALENDAR */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => { setCurrentDate(subMonths(currentDate, 1)); setSelectedDates(new Set()); }}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <CardTitle className="text-base sm:text-lg">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {multiSelectMode
                  ? `Selecciona los días — ${selectedDates.size} elegido(s)`
                  : 'Toca un día disponible para hacer tu pedido'
                }
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setCurrentDate(addMonths(currentDate, 1)); setSelectedDates(new Set()); }}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Toggle: modo normal / selección múltiple */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <Button
              variant={multiSelectMode ? "default" : "outline"}
              size="sm"
              className={cn(
                "text-xs gap-1.5 h-8",
                multiSelectMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"
              )}
              onClick={() => {
                setMultiSelectMode(!multiSelectMode);
                if (multiSelectMode) setSelectedDates(new Set());
              }}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {multiSelectMode ? '✓ Selección múltiple' : 'Seleccionar varios días'}
            </Button>
            {multiSelectMode && selectedDates.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 h-8"
                onClick={() => setSelectedDates(new Set())}
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {renderCalendar()}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-[10px] sm:text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <UtensilsCrossed className="h-3 w-3 text-blue-500" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="h-3.5 w-3.5 p-0 flex items-center justify-center text-[7px] bg-green-500">1</Badge>
              <span>Ya pedido</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-red-400" />
              <span>Bloqueado</span>
            </div>
            {multiSelectMode && (
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-purple-600" />
                <span className="text-purple-600 font-medium">Seleccionado</span>
              </div>
            )}
          </div>

          {/* Deadline info - Enhanced with concrete example */}
          {config?.order_deadline_time && (
            <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5 border border-amber-200">
              <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <p>
                  Hora límite para pedir: <strong>{config.order_deadline_time.substring(0, 5)}</strong>
                  {(config.order_deadline_days ?? 0) > 0
                    ? <>, <strong>{config.order_deadline_days} día(s) antes</strong> del día del pedido</>
                    : <> <strong>del mismo día</strong></>
                  }
                </p>
                <p className="text-amber-600 mt-0.5">
                  {(() => {
                    const peruNow = getPeruNow();
                    const tomorrow = new Date(peruNow.getFullYear(), peruNow.getMonth(), peruNow.getDate() + 1);
                    const tomorrowStr = format(tomorrow, "EEEE d", { locale: es });
                    const deadlineDays = config.order_deadline_days ?? 0;
                    const deadlineForTomorrow = new Date(
                      tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() - deadlineDays,
                      ...config.order_deadline_time.split(':').slice(0, 2).map(Number), 0
                    );
                    return `Ej: Para pedir el ${tomorrowStr}, el límite es ${format(deadlineForTomorrow, "EEEE d 'a las' HH:mm", { locale: es })}`;
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Cancellation info */}
          {config?.cancellation_deadline_time && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg p-2.5 border border-blue-200">
              <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Cancelar hasta: <strong>{config.cancellation_deadline_time.substring(0, 5)}</strong>
                {config.cancellation_deadline_days > 0 && <>, {config.cancellation_deadline_days} día(s) antes</>}
                {' '}del día del pedido
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TAP & ORDER MODAL */}
      {renderOrderModal()}

      {/* VIEW ORDERS MODAL */}
      {renderViewOrdersModal()}

      {/* MULTI-SELECT FLOATING BAR */}
      {multiSelectMode && selectedDates.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="mx-auto max-w-md bg-purple-700 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                📋 {selectedDates.size} día{selectedDates.size > 1 ? 's' : ''} seleccionado{selectedDates.size > 1 ? 's' : ''}
              </p>
              <p className="text-purple-200 text-xs truncate">
                {Array.from(selectedDates).sort().slice(0, 3).map(d => {
                  const date = new Date(d + 'T12:00:00');
                  return format(date, 'd MMM', { locale: es });
                }).join(', ')}
                {selectedDates.size > 3 && ` +${selectedDates.size - 3} más`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-purple-600 text-xs h-9"
                onClick={() => setSelectedDates(new Set())}
              >
                Limpiar
              </Button>
              <Button
                size="sm"
                className="bg-white text-purple-700 hover:bg-purple-100 font-semibold text-xs h-9 gap-1.5"
                onClick={() => setMultiOrderModalOpen(true)}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Ver y Pedir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-ORDER CONFIRMATION MODAL */}
      <Dialog open={multiOrderModalOpen} onOpenChange={(open) => { if (!open && !multiOrderProcessing) closeMultiOrderModal(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              {multiOrderResults.length > 0 ? 'Resultado del pedido' : 'Confirmar pedido múltiple'}
            </DialogTitle>
          </DialogHeader>

          {multiOrderResults.length === 0 ? (
            <>
              <div className="space-y-2 mt-2">
                <p className="text-sm text-gray-600 mb-3">
                  Se pedirá <strong>1 unidad del primer plato disponible</strong> para cada día:
                </p>
                {Array.from(selectedDates).sort().map(dateStr => {
                  const dayMenus = menus.get(dateStr) || [];
                  const menu = dayMenus.find(m => m.category_id && m.category);
                  const date = new Date(dateStr + 'T12:00:00');
                  return (
                    <div key={dateStr} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border">
                      <div className="flex-shrink-0 text-center bg-purple-100 rounded-lg w-12 h-12 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold text-purple-700">{format(date, 'd')}</span>
                        <span className="text-[10px] text-purple-500 -mt-1">{format(date, 'EEE', { locale: es })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {menu ? (
                          <>
                            <p className="text-sm font-medium text-gray-800 truncate">{menu.main_course}</p>
                            <p className="text-xs text-gray-500">{menu.category?.name} — S/ {(menu.category?.price || config?.lunch_price || 0).toFixed(2)}</p>
                          </>
                        ) : (
                          <p className="text-xs text-red-500">Sin menú disponible</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-500"
                        onClick={() => {
                          setSelectedDates(prev => {
                            const next = new Set(prev);
                            next.delete(dateStr);
                            if (next.size === 0) closeMultiOrderModal();
                            return next;
                          });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}

                {/* Total */}
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total estimado:</span>
                  <span className="text-lg font-bold text-purple-700">
                    S/ {Array.from(selectedDates).reduce((total, dateStr) => {
                      const dayMenus = menus.get(dateStr) || [];
                      const menu = dayMenus.find(m => m.category_id && m.category);
                      return total + (menu?.category?.price || config?.lunch_price || 0);
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setMultiOrderModalOpen(false)}>
                  Volver
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={handleMultiDayOrder}
                  disabled={multiOrderProcessing}
                >
                  {multiOrderProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                  {multiOrderProcessing ? 'Procesando...' : `Pedir ${selectedDates.size} día(s)`}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 mt-2">
                {multiOrderResults.map((r, i) => {
                  const date = new Date(r.date + 'T12:00:00');
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border",
                      r.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    )}>
                      <div className={cn(
                        "flex-shrink-0 text-center rounded-lg w-10 h-10 flex flex-col items-center justify-center",
                        r.success ? "bg-green-100" : "bg-red-100"
                      )}>
                        <span className={cn("text-sm font-bold", r.success ? "text-green-700" : "text-red-700")}>
                          {format(date, 'd')}
                        </span>
                      </div>
                      <div className="flex-1">
                        {r.success ? (
                          <>
                            <p className="text-xs text-green-700 font-medium">✅ Pedido registrado</p>
                            <p className="text-xs text-green-600">{r.desc}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-red-700 font-medium">❌ No se pudo pedir</p>
                            <p className="text-xs text-red-600">{r.desc}</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="mt-3 pt-3 border-t text-center">
                  <p className="text-sm font-medium">
                    ✅ {multiOrderResults.filter(r => r.success).length} exitoso(s)
                    {multiOrderResults.some(r => !r.success) && (
                      <span className="text-red-600 ml-2">
                        ❌ {multiOrderResults.filter(r => !r.success).length} fallido(s)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700" onClick={closeMultiOrderModal}>
                Cerrar
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* EMPTY STATE */}
      {!loading && menus.size === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-8 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No hay menús disponibles este mes</p>
          </CardContent>
        </Card>
      )}

      {/* INFO CARD */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-medium text-gray-900">¿Cómo pedir?</p>
              <ol className="text-gray-600 mt-1 space-y-0.5 list-decimal list-inside">
                <li>Toca un día con 🍴 para ver los platos y pedir</li>
                <li>Usa <strong>"Seleccionar varios días"</strong> para pedir varios de una vez</li>
                <li>Toca días <span className="text-green-600 font-semibold">verdes</span> para ver o cancelar pedidos</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PAYMENT MODAL (parents only) */}
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
            // El RechargeModal maneja todo internamente
            toast({ title: '✅ Comprobante enviado', description: 'Tu pago será revisado por el administrador.' });
          }}
        />
      )}
    </div>
  );
}
