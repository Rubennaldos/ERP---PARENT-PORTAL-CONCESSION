import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Package, 
  TruckIcon,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface RequestItem {
  id: string;
  item: {
    id: string;
    name: string;
    code: string;
    unit: string;
  };
  quantity_requested: number;
  quantity_available: number;
  quantity_approved: number;
  quantity_pending: number;
  status: string;
}

interface ProcessRequestModalProps {
  requestId: string | null;
  requestNumber: string;
  schoolName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProcessRequestModal({
  requestId,
  requestNumber,
  schoolName,
  open,
  onClose,
  onSuccess
}: ProcessRequestModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [needsPurchaseOrder, setNeedsPurchaseOrder] = useState(false);

  useEffect(() => {
    if (open && requestId) {
      loadRequestItems();
    }
  }, [open, requestId]);

  const loadRequestItems = async () => {
    if (!requestId) return;

    try {
      setLoading(true);

      // Obtener items del pedido
      const { data: requestItems, error } = await supabase
        .from('supply_request_items')
        .select(`
          *,
          item:inventory_items(id, name, code, unit)
        `)
        .eq('request_id', requestId);

      if (error) throw error;

      // Para cada item, verificar stock disponible
      const itemsWithStock = await Promise.all(
        requestItems.map(async (item) => {
          const { data: stockData } = await supabase
            .from('inventory_stock')
            .select('quantity')
            .eq('item_id', item.item_id)
            .is('school_id', null)
            .single();

          const available = stockData?.quantity || 0;
          const canFulfill = available >= item.quantity_requested;
          const pending = Math.max(0, item.quantity_requested - available);

          return {
            ...item,
            quantity_available: available,
            quantity_approved: Math.min(item.quantity_requested, available),
            quantity_pending: pending,
            status: canFulfill ? 'available' : pending > 0 ? 'partial' : 'out_of_stock'
          };
        })
      );

      setItems(itemsWithStock);

      // Verificar si hay items que requieren compra
      const hasPending = itemsWithStock.some(item => item.quantity_pending > 0);
      setNeedsPurchaseOrder(hasPending);

      // Seleccionar por defecto items con stock disponible
      const defaultSelected = new Set(
        itemsWithStock
          .filter(item => item.quantity_available > 0)
          .map(item => item.id)
      );
      setSelectedItems(defaultSelected);

    } catch (error: any) {
      console.error('Error loading request items:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los items del pedido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (itemId: string, canSelect: boolean) => {
    if (!canSelect) return;

    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleProcessRequest = async () => {
    if (!requestId || selectedItems.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes seleccionar al menos un item para procesar',
      });
      return;
    }

    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      // Preparar items aprobados
      const approvedItems = items
        .filter(item => selectedItems.has(item.id))
        .map(item => ({
          item_id: item.item.id,
          quantity_approved: item.quantity_approved
        }));

      // Llamar a la función RPC para procesar el pedido
      const { data, error } = await supabase.rpc('process_supply_request', {
        p_request_id: requestId,
        p_user_id: user.id,
        p_items: approvedItems
      });

      if (error) throw error;

      toast({
        title: '✅ Pedido Procesado',
        description: data.message,
      });

      // Si se necesita orden de compra, mostrar mensaje adicional
      if (data.needs_purchase) {
        setTimeout(() => {
          toast({
            title: '📋 Orden de Compra',
            description: 'Se requiere generar una orden de compra para los items faltantes',
          });
        }, 1000);
      }

      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo procesar el pedido',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'out_of_stock':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      available: { label: 'Disponible', color: 'bg-green-100 text-green-700' },
      partial: { label: 'Parcial', color: 'bg-orange-100 text-orange-700' },
      out_of_stock: { label: 'Agotado', color: 'bg-red-100 text-red-700' },
    };
    const { label, color } = config[status as keyof typeof config] || config.available;
    return <Badge className={color}>{label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <TruckIcon className="h-6 w-6 text-[#8B4513]" />
            Procesar Pedido: {requestNumber}
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">Sede:</span> {schoolName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B4513]"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <p className="text-sm text-slate-500">Total Items</p>
                  <p className="text-2xl font-black text-slate-800">{items.length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <p className="text-sm text-slate-500">Disponibles</p>
                  <p className="text-2xl font-black text-green-600">
                    {items.filter(i => i.status === 'available').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <p className="text-sm text-slate-500">Requieren Compra</p>
                  <p className="text-2xl font-black text-red-600">
                    {items.filter(i => i.quantity_pending > 0).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Alerta si se necesita orden de compra */}
            {needsPurchaseOrder && (
              <Alert className="bg-orange-50 border-orange-200">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                <AlertDescription className="text-orange-800 font-medium">
                  ⚠️ Algunos items requieren generar una orden de compra
                </AlertDescription>
              </Alert>
            )}

            {/* Lista de Items con Checklist */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-700">Checklist Inteligente:</h3>
              {items.map((item) => {
                const canSelect = item.quantity_available > 0;
                const isSelected = selectedItems.has(item.id);

                return (
                  <Card 
                    key={item.id} 
                    className={`border-l-4 ${
                      item.status === 'available' ? 'border-l-green-500' :
                      item.status === 'partial' ? 'border-l-orange-500' :
                      'border-l-red-500 bg-red-50'
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleItem(item.id, canSelect)}
                            disabled={!canSelect}
                            className={canSelect ? '' : 'opacity-50'}
                          />
                        </div>

                        {/* Info del Item */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(item.status)}
                            <h4 className="font-black text-slate-800">{item.item.name}</h4>
                            {getStatusBadge(item.status)}
                          </div>
                          
                          <p className="text-sm text-slate-500 mb-3">
                            Código: {item.item.code}
                          </p>

                          {/* Cantidades */}
                          <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg">
                            <div>
                              <p className="text-xs text-slate-500">Solicitado</p>
                              <p className="font-bold text-blue-600">
                                {item.quantity_requested} {item.item.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Disponible</p>
                              <p className={`font-bold ${
                                item.quantity_available >= item.quantity_requested 
                                  ? 'text-green-600' 
                                  : 'text-orange-600'
                              }`}>
                                {item.quantity_available} {item.item.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">A Entregar</p>
                              <p className="font-bold text-slate-800">
                                {item.quantity_approved} {item.item.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Faltante</p>
                              <p className="font-bold text-red-600">
                                {item.quantity_pending} {item.item.unit}
                              </p>
                            </div>
                          </div>

                          {/* Mensaje según estado */}
                          {item.status === 'available' && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>✅ Stock suficiente, listo para retirar</span>
                            </div>
                          )}
                          {item.status === 'partial' && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-orange-700">
                              <AlertTriangle className="h-4 w-4" />
                              <span>⚠️ Stock parcial. Lo demás va a orden de compra</span>
                            </div>
                          )}
                          {item.status === 'out_of_stock' && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-red-700">
                              <XCircle className="h-4 w-4" />
                              <span>❌ Sin stock. Requiere orden de compra completa</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {selectedItems.size} de {items.length} items seleccionados
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessRequest} 
              disabled={processing || selectedItems.size === 0}
              className="bg-[#8B4513] hover:bg-[#6F370F]"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Procesar Pedido
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
