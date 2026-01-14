import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, BarChart3, FileText } from 'lucide-react';
import { ParentAnalyticsDashboard } from '@/components/admin/ParentAnalyticsDashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Parent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  students_count: number;
}

const ParentConfiguration = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(false);

  const searchParents = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: 'Ingresa un término de búsqueda',
        description: 'Escribe un nombre, DNI o sobrenombre',
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          students:students(count)
        `)
        .eq('role', 'parent')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,dni.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;

      const formattedData = data?.map(p => ({
        id: p.id,
        full_name: p.full_name || 'Sin nombre',
        email: p.email || 'Sin email',
        phone: (p as any).phone || 'Sin teléfono',
        created_at: p.created_at,
        students_count: (p as any).students?.[0]?.count || 0
      })) || [];

      setParents(formattedData);

      if (formattedData.length === 0) {
        toast({
          title: 'Sin resultados',
          description: 'No se encontraron padres con ese criterio',
        });
      }

    } catch (error: any) {
      console.error('Error searching parents:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo realizar la búsqueda',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Users className="h-8 w-8 text-[#8B4513]" />
            Configuración de Padres
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Gestiona perfiles de padres y visualiza estadísticas del sistema
          </p>
        </div>

        {/* Tabs principales */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white border rounded-xl p-1">
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#8B4513] data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="parents" className="data-[state=active]:bg-[#8B4513] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Gestión de Padres
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#8B4513] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              Reportes
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Analytics */}
          <TabsContent value="analytics" className="mt-6">
            <ParentAnalyticsDashboard />
          </TabsContent>

          {/* Pestaña de Gestión de Padres */}
          <TabsContent value="parents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Buscar Padres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="Buscar por nombre, DNI o sobrenombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchParents()}
                    className="flex-1"
                  />
                  <Button onClick={searchParents} disabled={loading} className="bg-[#8B4513] hover:bg-[#6F370F]">
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>

                {parents.length > 0 && (
                  <div className="space-y-3">
                    {parents.map((parent) => (
                      <Card key={parent.id} className="border-l-4 border-l-[#8B4513]">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-black text-slate-800">{parent.full_name}</p>
                              <p className="text-sm text-slate-500">{parent.email}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                Registrado: {new Date(parent.created_at).toLocaleDateString('es-PE')}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-emerald-100 text-emerald-700">
                                {parent.students_count} {parent.students_count === 1 ? 'Hijo' : 'Hijos'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Reportes */}
          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Reportes Personalizados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Próximamente: Reportes avanzados con filtros personalizados</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ParentConfiguration;
