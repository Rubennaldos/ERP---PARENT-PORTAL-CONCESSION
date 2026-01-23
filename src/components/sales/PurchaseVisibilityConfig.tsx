import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, Info, Save, Building2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface School {
  id: string;
  name: string;
}

interface VisibilityConfig {
  id?: string;
  school_id: string;
  delay_days: number;
  applies_to: string;
  school?: School;
}

export function PurchaseVisibilityConfig() {
  const { user } = useAuth();
  const { role, canViewAllSchools } = useRole();
  const { toast } = useToast();
  
  const [configs, setConfigs] = useState<VisibilityConfig[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para edición
  const [editingSchool, setEditingSchool] = useState<string | null>(null);
  const [editDelayDays, setEditDelayDays] = useState<number>(2);
  const [customDays, setCustomDays] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [user, role]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Cargar sede del usuario
      const { data: profileData } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();
      
      setUserSchoolId(profileData?.school_id || null);

      // Cargar escuelas
      let schoolsQuery = supabase
        .from('schools')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      // Si no puede ver todas, solo su sede
      if (!canViewAllSchools && profileData?.school_id) {
        schoolsQuery = schoolsQuery.eq('id', profileData.school_id);
      }
      
      const { data: schoolsData, error: schoolsError } = await schoolsQuery;
      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);

      // Cargar configuraciones
      let configQuery = supabase
        .from('purchase_visibility_delay')
        .select(`
          *,
          school:schools(id, name)
        `);
      
      // Si no puede ver todas, solo su sede
      if (!canViewAllSchools && profileData?.school_id) {
        configQuery = configQuery.eq('school_id', profileData.school_id);
      }
      
      const { data: configData, error: configError } = await configQuery;
      if (configError) throw configError;
      
      setConfigs(configData || []);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar la configuración',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schoolId: string, currentDelay: number) => {
    setEditingSchool(schoolId);
    setEditDelayDays(currentDelay);
    setCustomDays(currentDelay > 5 ? currentDelay.toString() : '');
  };

  const handleSave = async (schoolId: string) => {
    try {
      setSaving(true);
      
      const finalDelay = editDelayDays === 99 ? parseInt(customDays) : editDelayDays;
      
      if (isNaN(finalDelay) || finalDelay < 0) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Por favor ingresa un número válido de días',
        });
        return;
      }

      // Verificar si existe configuración
      const existingConfig = configs.find(c => c.school_id === schoolId);

      if (existingConfig?.id) {
        // Actualizar
        const { error } = await supabase
          .from('purchase_visibility_delay')
          .update({
            delay_days: finalDelay,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('purchase_visibility_delay')
          .insert({
            school_id: schoolId,
            delay_days: finalDelay,
            applies_to: 'purchases',
            updated_by: user?.id,
          });

        if (error) throw error;
      }

      toast({
        title: '✅ Configuración Guardada',
        description: `Los padres verán compras con ${finalDelay} día${finalDelay !== 1 ? 's' : ''} de retraso`,
      });

      setEditingSchool(null);
      loadData();
      
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la configuración',
      });
    } finally {
      setSaving(false);
    }
  };

  const getConfigForSchool = (schoolId: string): number => {
    const config = configs.find(c => c.school_id === schoolId);
    return config?.delay_days ?? 2; // Default 2 días
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explicación */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>¿Para qué sirve esto?</strong>
          <br />
          Los padres verán sus compras con un retraso de X días. Esto evita reclamos cuando las ventas del kiosco 
          se pasan del cuaderno al sistema 1-2 días después.
          <br />
          <br />
          <strong className="text-amber-600">⚠️ Esto es un PARCHE temporal.</strong> La solución definitiva es registrar 
          todas las ventas directamente en el sistema (sin cuaderno).
        </AlertDescription>
      </Alert>

      {/* Header con estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Sedes Configuradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              En Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configs.filter(c => c.delay_days === 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Con Delay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configs.filter(c => c.delay_days > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuraciones por sede */}
      <div className="space-y-4">
        {schools.map((school) => {
          const currentDelay = getConfigForSchool(school.id);
          const isEditing = editingSchool === school.id;

          return (
            <Card key={school.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{school.name}</CardTitle>
                      <CardDescription>
                        {currentDelay === 0 ? (
                          <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                            <Eye className="h-3 w-3 mr-1" />
                            En vivo - Sin delay
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200">
                            <Clock className="h-3 w-3 mr-1" />
                            {currentDelay} día{currentDelay !== 1 ? 's' : ''} de retraso
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>

                  {!isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(school.id, currentDelay)}
                    >
                      Configurar
                    </Button>
                  )}
                </div>
              </CardHeader>

              {isEditing && (
                <CardContent className="border-t pt-6">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      ¿Con cuánto retraso mostrar las compras a los padres?
                    </Label>

                    <RadioGroup
                      value={editDelayDays.toString()}
                      onValueChange={(value) => setEditDelayDays(parseInt(value))}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="0" id={`live-${school.id}`} />
                        <Label htmlFor={`live-${school.id}`} className="font-normal cursor-pointer">
                          <span className="font-semibold">En vivo</span> - Sin retraso (requiere pasar todo al sistema al momento)
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id={`1day-${school.id}`} />
                        <Label htmlFor={`1day-${school.id}`} className="font-normal cursor-pointer">
                          <span className="font-semibold">1 día atrás</span> - Padres ven hasta ayer
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id={`2days-${school.id}`} />
                        <Label htmlFor={`2days-${school.id}`} className="font-normal cursor-pointer">
                          <span className="font-semibold">2 días atrás</span> - Recomendado (predeterminado)
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3" id={`3days-${school.id}`} />
                        <Label htmlFor={`3days-${school.id}`} className="font-normal cursor-pointer">
                          <span className="font-semibold">3 días atrás</span>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="5" id={`5days-${school.id}`} />
                        <Label htmlFor={`5days-${school.id}`} className="font-normal cursor-pointer">
                          <span className="font-semibold">5 días atrás</span>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="99" id={`custom-${school.id}`} />
                        <Label htmlFor={`custom-${school.id}`} className="font-normal cursor-pointer">
                          <span className="font-semibold">Personalizado:</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="30"
                          value={customDays}
                          onChange={(e) => {
                            setCustomDays(e.target.value);
                            setEditDelayDays(99);
                          }}
                          className="w-20"
                          placeholder="días"
                        />
                        <span className="text-sm text-muted-foreground">días</span>
                      </div>
                    </RadioGroup>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => handleSave(school.id)}
                        disabled={saving}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Guardando...' : 'Guardar Configuración'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingSchool(null)}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
