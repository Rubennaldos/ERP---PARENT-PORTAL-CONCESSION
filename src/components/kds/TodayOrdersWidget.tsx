import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Peru está en UTC-5 y no observa horario de verano.
// Calculamos el rango "hoy en Lima" expresado como instantes UTC para que
// los filtros de Supabase (que almacena en UTC) sean correctos incluso si
// el padre hace un pedido a las 8 PM hora local (= 1 AM UTC del día siguiente).
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-5 → sumar 5h para pasar a UTC

function getTodayRangeUTC(): { todayPeruDate: string; startUTC: string; endUTC: string } {
  // Hora actual desplazada al "reloj de Lima"
  const nowInPeru   = new Date(Date.now() - PERU_OFFSET_MS);
  // Fecha local en Lima  →  "YYYY-MM-DD"
  const todayPeruDate = nowInPeru.toISOString().slice(0, 10);
  // Medianoche Lima (00:00) en UTC = misma fecha pero 05:00 UTC
  const startUTC = `${todayPeruDate}T05:00:00.000Z`;
  // Fin del día Lima (23:59:59) en UTC = siguiente día 04:59:59 UTC
  const endUTC   = new Date(new Date(startUTC).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
  return { todayPeruDate, startUTC, endUTC };
}

const ALLOWED_ROLES = ['admin_general', 'admin_sede', 'cajero', 'operador_caja', 'operador_cocina', 'supervisor_red'];
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ChefHat,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── tipos ──────────────────────────────────────────────────────────────────

interface LunchOrderItem {
  id: string;
  source: 'lunch';
  studentName: string;
  grade: string;
  section: string;
  schoolName: string;
  menu: string;           // "Sopa + Pollo + Chicha + Mazamorra"
  notes: string | null;
  status: string;
}

interface StoreOrderItem {
  id: string;
  source: 'store';
  requesterName: string;
  requesterType: 'parent' | 'teacher';
  grade: string;
  section: string;
  schoolName: string;
  products: string;       // "2× Coca Cola, 1× Papas Fritas"
  notes: string | null;
  status: string;
  totalAmount: number;
}

type KDSItem = LunchOrderItem | StoreOrderItem;

// ─── helpers ────────────────────────────────────────────────────────────────

function buildMenuString(order: any): string {
  const parts: string[] = [];
  if (order.chosen_starter)     parts.push(order.chosen_starter);
  if (order.chosen_main_course) parts.push(order.chosen_main_course);
  if (order.chosen_beverage)    parts.push(order.chosen_beverage);
  if (order.chosen_dessert)     parts.push(order.chosen_dessert);
  // Addons
  if (order.lunch_order_addons?.length) {
    const addons = order.lunch_order_addons.map((a: any) =>
      `${a.quantity}× ${a.addon_name}`
    ).join(', ');
    parts.push(addons);
  }
  // Fallback al menú base
  if (parts.length === 0 && order.lunch_menus) {
    const m = order.lunch_menus;
    if (m.main_course) parts.push(m.main_course);
    if (m.starter)     parts.push(m.starter);
    if (m.beverage)    parts.push(m.beverage);
  }
  return parts.join(' · ') || 'Menú del día';
}

function buildProductsString(items: any[]): string {
  if (!Array.isArray(items) || items.length === 0) return 'Sin detalle';
  return items.map(i => `${i.qty}× ${i.productName}`).join(', ');
}

const statusColor: Record<string, string> = {
  pending:         'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed:       'bg-blue-100   text-blue-800   border-blue-300',
  pending_kitchen: 'bg-orange-100 text-orange-800 border-orange-300',
  ready:           'bg-violet-100 text-violet-800 border-violet-300',
  delivered:       'bg-green-100  text-green-800  border-green-300',
  cancelled:       'bg-gray-100   text-gray-500   border-gray-300',
};

const statusLabel: Record<string, string> = {
  pending:         'Pendiente',
  confirmed:       'Confirmado',
  pending_kitchen: 'En Cocina',
  ready:           'Listo',
  delivered:       'Entregado',
  cancelled:       'Cancelado',
};

// ─── componente principal ────────────────────────────────────────────────────

export function TodayOrdersWidget() {
  const { user } = useAuth();
  const { role } = useRole();
  const { toast } = useToast();

  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [lunchOrders, setLunchOrders]   = useState<LunchOrderItem[]>([]);
  const [storeOrders, setStoreOrders]   = useState<StoreOrderItem[]>([]);
  const [delivering, setDelivering]     = useState<Set<string>>(new Set());

  // Drag state for floating button
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
  const isDragging   = useRef(false);
  const hasMoved     = useRef(false);
  const dragOrigin   = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  const onFabPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    hasMoved.current   = false;
    dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, posX: fabPos.x, posY: fabPos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };
  const onFabPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragOrigin.current.mouseX;
    const dy = e.clientY - dragOrigin.current.mouseY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
    setFabPos({ x: dragOrigin.current.posX + dx, y: dragOrigin.current.posY + dy });
  };
  const onFabPointerUp = () => {
    if (!hasMoved.current) setOpen(true);
    isDragging.current = false;
  };

  const isAllowed = !!role && ALLOWED_ROLES.includes(role);

  // Contador de badge: almuerzos activos + pedidos tienda pendientes/listos
  const pendingCount =
    lunchOrders.filter(o => !['cancelled'].includes(o.status)).length +
    storeOrders.filter(o => ['pending_kitchen', 'ready'].includes(o.status)).length;

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user || !isAllowed) return;
    setLoading(true);
    const { todayPeruDate, startUTC, endUTC } = getTodayRangeUTC();

    try {
      // ── A. Almuerzos de hoy ───────────────────────────────────────────────
      // lunch_orders usa una columna DATE (order_date) comparada con la fecha
      // en Lima, no con UTC — por eso usamos todayPeruDate directamente.
      const { data: lunchData, error: lunchErr } = await supabase
        .from('lunch_orders')
        .select(`
          id,
          status,
          notes,
          chosen_starter,
          chosen_main_course,
          chosen_beverage,
          chosen_dessert,
          student:students (
            full_name,
            grade,
            section
          ),
          school:schools (
            name
          ),
          lunch_menus (
            starter,
            main_course,
            beverage,
            dessert
          ),
          lunch_order_addons (
            addon_name,
            addon_price,
            quantity
          )
        `)
        .eq('order_date', todayPeruDate)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: true });

      if (lunchErr) throw lunchErr;

      const mapped: LunchOrderItem[] = (lunchData || []).map((o: any) => ({
        id:          o.id,
        source:      'lunch',
        studentName: o.student?.full_name  ?? 'Alumno',
        grade:       o.student?.grade      ?? '',
        section:     o.student?.section    ?? '',
        schoolName:  o.school?.name        ?? '',
        menu:        buildMenuString(o),
        notes:       o.notes ?? null,
        status:      o.status,
      }));
      setLunchOrders(mapped);

      // ── B. Pedidos de Tienda Virtual de hoy ───────────────────────────────
      // online_orders usa TIMESTAMPTZ (UTC). Usamos el rango startUTC–endUTC
      // que equivale exactamente a 00:00–23:59 hora Lima, evitando que los
      // pedidos hechos después de las 7 PM desaparezcan del KDS.
      const { data: storeData, error: storeErr } = await supabase
        .from('online_orders')
        .select(`
          id,
          status,
          total_amount,
          items,
          notes,
          student_id,
          teacher_id,
          student:students (
            full_name,
            grade,
            section
          ),
          teacher:teacher_profiles (
            full_name
          ),
          school:schools (
            name
          )
        `)
        .in('status', ['pending_kitchen', 'ready'])
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .order('created_at', { ascending: true });

      if (storeErr) throw storeErr;

      const mappedStore: StoreOrderItem[] = (storeData || []).map((o: any) => ({
        id:            o.id,
        source:        'store',
        requesterName: o.student?.full_name ?? o.teacher?.full_name ?? 'Usuario',
        requesterType: o.teacher_id ? 'teacher' : 'parent',
        grade:         o.student?.grade   ?? '',
        section:       o.student?.section ?? '',
        schoolName:    o.school?.name     ?? '',
        products:      buildProductsString(o.items),
        notes:         o.notes ?? null,
        status:        o.status,
        totalAmount:   o.total_amount,
      }));
      setStoreOrders(mappedStore);

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al cargar pedidos', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [user, isAllowed]);

  // Cargar al abrir y cada 60 s mientras está abierto
  useEffect(() => {
    if (!open) return;
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [open, fetchData]);

  // Badge: cargar contador en background sin abrir el panel
  useEffect(() => {
    if (!isAllowed) return;
    fetchData();
    const interval = setInterval(fetchData, 120_000);
    return () => clearInterval(interval);
  }, [isAllowed, fetchData]);

  // ── marcar entregado ───────────────────────────────────────────────────────

  const handleDeliver = async (orderId: string) => {
    setDelivering(prev => new Set(prev).add(orderId));
    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      if (error) throw error;

      setStoreOrders(prev => prev.filter(o => o.id !== orderId));
      toast({ title: '✅ Pedido entregado', description: 'El estado se actualizó a "Entregado".' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setDelivering(prev => { const next = new Set(prev); next.delete(orderId); return next; });
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  // El guard condicional va AQUÍ, después de todos los hooks
  if (!isAllowed) return null;

  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const activeLunch = lunchOrders.filter(o => !['cancelled'].includes(o.status));
  const activeStore = storeOrders.filter(o => ['pending_kitchen', 'ready'].includes(o.status));

  return (
    <>
      {/* ── FAB circular arrastrable ──────────────────────────────────── */}
      <div
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={onFabPointerUp}
        style={{
          transform: `translate(${fabPos.x}px, ${fabPos.y}px)`,
          touchAction: 'none',
          cursor: isDragging.current ? 'grabbing' : 'grab',
        }}
        className={`fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center select-none transition-shadow duration-200 hover:shadow-orange-300 ${
          pendingCount > 0
            ? 'bg-gradient-to-br from-orange-500 to-red-500'
            : 'bg-gradient-to-br from-slate-600 to-slate-700'
        }`}
        title="Pedidos de Hoy"
      >
        <ChefHat className="h-6 w-6 text-white" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center bg-white text-orange-600 font-black text-[10px] min-w-[20px] h-5 rounded-full px-1 shadow-md border border-orange-200">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </div>

      {/* ── Panel lateral (Sheet) ─────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg flex flex-col p-0 gap-0"
        >
          {/* Cabecera del panel */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b bg-gradient-to-r from-orange-50 to-red-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <ChefHat className="h-5 w-5 text-orange-500" />
                  KDS — Pedidos de Hoy
                </SheetTitle>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{todayLabel}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchData}
                disabled={loading}
                title="Actualizar"
                className="text-gray-500 hover:text-orange-600"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Resumen rápido */}
            <div className="flex gap-2 mt-3">
              <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-orange-200 shadow-sm">
                <UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-bold text-gray-800">{activeLunch.length}</span>
                <span className="text-xs text-gray-500">almuerzos</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-violet-200 shadow-sm">
                <ShoppingBag className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-bold text-gray-800">{activeStore.length}</span>
                <span className="text-xs text-gray-500">tienda</span>
              </div>
            </div>
          </SheetHeader>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto">
            {loading && lunchOrders.length === 0 && storeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
                <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
              </div>
            ) : (
              <>
                {/* ── Sección: Almuerzos ─────────────────────────────────── */}
                <div className="px-4 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100">
                      <UtensilsCrossed className="h-4 w-4 text-orange-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">🍱 Menús de Hoy</h3>
                    <Badge variant="secondary" className="text-xs ml-auto">{activeLunch.length}</Badge>
                  </div>

                  {activeLunch.length === 0 ? (
                    <EmptyState label="No hay almuerzos pendientes para hoy." />
                  ) : (
                    <div className="space-y-2 mb-6">
                      {activeLunch.map(order => (
                        <LunchCard key={order.id} order={order} />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Sección: Pedidos Tienda ────────────────────────────── */}
                <div className="px-4 pt-2 pb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100">
                      <ShoppingBag className="h-4 w-4 text-violet-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">🛍️ Pedidos de Tienda</h3>
                    <Badge variant="secondary" className="text-xs ml-auto">{activeStore.length}</Badge>
                  </div>

                  {activeStore.length === 0 ? (
                    <EmptyState label="No hay pedidos de tienda pendientes." />
                  ) : (
                    <div className="space-y-2">
                      {activeStore.map(order => (
                        <StoreCard
                          key={order.id}
                          order={order}
                          delivering={delivering.has(order.id)}
                          onDeliver={() => handleDeliver(order.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── sub-componentes ─────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/60">
      <Clock className="h-8 w-8 text-gray-300" />
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

function StudentMeta({ grade, section, schoolName }: { grade: string; section: string; schoolName: string }) {
  if (!grade && !section && !schoolName) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap mt-0.5">
      {(grade || section) && (
        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
          {[grade, section].filter(Boolean).join(' · ')}
        </span>
      )}
      {schoolName && (
        <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{schoolName}</span>
      )}
    </div>
  );
}

function LunchCard({ order }: { order: LunchOrderItem }) {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 shrink-0 mt-0.5">
        <UtensilsCrossed className="h-4 w-4 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{order.studentName}</p>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${statusColor[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {statusLabel[order.status] ?? order.status}
          </span>
        </div>
        <StudentMeta grade={order.grade} section={order.section} schoolName={order.schoolName} />
        <p className="text-xs text-gray-600 mt-1 leading-snug">{order.menu}</p>
        {order.notes && (
          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 mt-1">
            📝 {order.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function StoreCard({
  order,
  delivering,
  onDeliver,
}: {
  order:     StoreOrderItem;
  delivering: boolean;
  onDeliver:  () => void;
}) {
  return (
    <div className={`flex gap-3 p-3 rounded-xl border shadow-sm hover:shadow-md transition-all ${
      order.status === 'ready' ? 'bg-violet-50 border-violet-200' : 'bg-white border-violet-100'
    }`}>
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 shrink-0 mt-0.5">
        {order.requesterType === 'teacher'
          ? <User className="h-4 w-4 text-violet-600" />
          : <ShoppingBag className="h-4 w-4 text-violet-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{order.requesterName}</p>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${statusColor[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {statusLabel[order.status] ?? order.status}
          </span>
        </div>

        {order.requesterType === 'parent' && (
          <StudentMeta grade={order.grade} section={order.section} schoolName={order.schoolName} />
        )}
        {order.requesterType === 'teacher' && order.schoolName && (
          <span className="text-[10px] text-gray-400">{order.schoolName}</span>
        )}

        <p className="text-xs text-gray-600 mt-1 leading-snug">{order.products}</p>

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs font-black text-violet-700">S/ {order.totalAmount.toFixed(2)}</p>
          <Button
            size="sm"
            onClick={onDeliver}
            disabled={delivering}
            className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            {delivering ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Marcar Entregado
              </>
            )}
          </Button>
        </div>

        {order.notes && (
          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 mt-1.5">
            📝 {order.notes}
          </p>
        )}
      </div>
    </div>
  );
}
