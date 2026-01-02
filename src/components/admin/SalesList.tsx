import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileText, 
  ArrowUpDown,
  Eye,
  Download,
  Calendar,
  Trash2,
  AlertTriangle,
  ShoppingCart,
  User,
  Clock
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface Transaction {
  id: string;
  created_at: string;
  student_id: string | null;
  type: string;
  amount: number;
  description: string;
  balance_after: number;
  ticket_code: string;
  created_by: string;
  is_deleted?: boolean;
  has_error?: boolean;
  student?: {
    full_name: string;
    school?: {
      name: string;
    }
  };
  profiles?: {
    email: string;
  };
}

interface TransactionItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export const SalesList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    fetchTransactions();
  }, [activeTab]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Obtener rango de hoy (00:00 - 23:59)
      const today = new Date();
      const startDate = startOfDay(today).toISOString();
      const endDate = endOfDay(today).toISOString();

      let query = supabase
        .from('transactions')
        .select(`
          *,
          student:students(full_name, school:schools(name)),
          profiles:profiles!transactions_created_by_fkey(email)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      // Filtrar según la pestaña activa
      if (activeTab === 'deleted') {
        query = query.eq('is_deleted', true);
      } else if (activeTab === 'errors') {
        query = query.eq('has_error', true);
      } else {
        // Ventas del día normales (no borradas, sin errores)
        query = query.or('is_deleted.is.null,is_deleted.eq.false');
        query = query.or('has_error.is.null,has_error.eq.false');
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionItems = async (transactionId: string) => {
    try {
      const { data, error } = await supabase
        .from('transaction_items')
        .select('*')
        .eq('transaction_id', transactionId);

      if (error) throw error;
      setTransactionItems(data || []);
    } catch (error: any) {
      console.error('Error fetching items:', error);
    }
  };

  const handleViewDetails = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    await fetchTransactionItems(transaction.id);
    setShowDetails(true);
  };

  // Búsqueda inteligente: busca en ticket_code, nombre del estudiante, descripción
  const filteredTransactions = transactions.filter(t => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      t.ticket_code?.toLowerCase().includes(search) ||
      t.student?.full_name?.toLowerCase().includes(search) ||
      t.description?.toLowerCase().includes(search) ||
      t.profiles?.email?.toLowerCase().includes(search) ||
      Math.abs(t.amount).toString().includes(search)
    );
  });

  const getTotalSales = () => {
    return filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const getTransactionCount = () => filteredTransactions.length;

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
                Módulo de Ventas
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(), "EEEE, dd 'de' MMMM yyyy", { locale: es })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchTransactions}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold uppercase">Total Ventas</p>
                    <p className="text-2xl font-black text-emerald-900">S/ {getTotalSales().toFixed(2)}</p>
                  </div>
                  <FileText className="h-8 w-8 text-emerald-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase">Transacciones</p>
                    <p className="text-2xl font-black text-blue-900">{getTransactionCount()}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-semibold uppercase">Promedio</p>
                    <p className="text-2xl font-black text-purple-900">
                      S/ {getTransactionCount() > 0 ? (getTotalSales() / getTransactionCount()).toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <ArrowUpDown className="h-8 w-8 text-purple-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Buscador Inteligente */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="🔍 Búsqueda inteligente: ticket, nombre, cajero, monto..."
              className="pl-10 h-12 text-base border-2 focus:border-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Badge variant="secondary" className="text-xs">
                  {filteredTransactions.length} resultados
                </Badge>
              </div>
            )}
          </div>

          {/* Pestañas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="today" className="flex items-center gap-2 py-3">
                <Clock className="h-4 w-4" />
                <span>Ventas del Día</span>
              </TabsTrigger>
              <TabsTrigger value="deleted" className="flex items-center gap-2 py-3">
                <Trash2 className="h-4 w-4" />
                <span>Borradas</span>
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center gap-2 py-3">
                <AlertTriangle className="h-4 w-4" />
                <span>Errores</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Cargando transacciones...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay transacciones hoy'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredTransactions.map((t) => (
                    <Card 
                      key={t.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
                      style={{
                        borderLeftColor: t.is_deleted ? '#ef4444' : t.has_error ? '#f59e0b' : '#10b981'
                      }}
                      onClick={() => handleViewDetails(t)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono text-xs font-bold">
                                {t.ticket_code || '---'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(t.created_at), "HH:mm", { locale: es })}
                              </span>
                              {t.is_deleted && (
                                <Badge variant="destructive" className="text-[10px]">BORRADA</Badge>
                              )}
                              {t.has_error && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px]">ERROR</Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">
                                {t.student?.full_name || 'CLIENTE GENÉRICO'}
                              </span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground">
                              Cajero: {t.profiles?.email?.split('@')[0] || 'sistema'}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-black text-emerald-600">
                              S/ {Math.abs(t.amount).toFixed(2)}
                            </p>
                            <Button variant="ghost" size="sm" className="mt-2">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver detalle
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Detalles (igual que antes) */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Detalle de Venta
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Ticket</p>
                  <p className="font-bold font-mono">{selectedTransaction.ticket_code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Fecha</p>
                  <p className="font-medium">
                    {format(new Date(selectedTransaction.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs uppercase">Cliente</p>
                  <p className="font-bold text-blue-700">
                    {selectedTransaction.student?.full_name || 'CLIENTE GENÉRICO'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Productos</p>
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  {transactionItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-muted/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} x S/ {item.unit_price.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">
                        S/ {item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">TOTAL PAGADO</span>
                  <span className="text-2xl font-black">
                    S/ {Math.abs(selectedTransaction.amount).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" variant="outline" onClick={() => window.print()}>
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
                <Button className="flex-1 gap-2" onClick={() => setShowDetails(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

