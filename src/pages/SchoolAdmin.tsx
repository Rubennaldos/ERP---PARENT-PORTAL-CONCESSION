import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const SchoolAdmin = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Cargar datos necesarios
    } catch (error: any) {
      console.error('Error loading school admin data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar la información',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B4513] mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando administración de sede...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-[#8B4513]" />
            Administración de Sede
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Gestión de pedidos, calendarios y tarjetas de identificación
          </p>
        </div>

        {/* Tabs Principales */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white border rounded-xl p-1">
            <TabsTrigger value="requests" className="data-[state=active]:bg-[#8B4513] data-[state=active]:text-white">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[#8B4513] data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-2" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="cards" className="data-[state=active]:bg-[#8B4513] data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" />
              Tarjetas ID
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Pedidos */}
          <TabsContent value="requests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6 text-[#8B4513]" />
                  Solicitar Suministros
                </CardTitle>
                <CardDescription>
                  Crea pedidos de mercadería e ingredientes para tu sede
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-center py-12">Próximamente: Sistema de pedidos inteligente</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Calendario */}
          <TabsContent value="calendar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-[#8B4513]" />
                  Calendarios
                </CardTitle>
                <CardDescription>
                  Eventos académicos e internos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-center py-12">Próximamente: Gestión de eventos</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Tarjetas ID */}
          <TabsContent value="cards" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-[#8B4513]" />
                  Tarjetas de Identificación
                </CardTitle>
                <CardDescription>
                  Activar y vincular tarjetas a estudiantes y padres
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-center py-12">Próximamente: Sistema de activación de tarjetas</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SchoolAdmin;
