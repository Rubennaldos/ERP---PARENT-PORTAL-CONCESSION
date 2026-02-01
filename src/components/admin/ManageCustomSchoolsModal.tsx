import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Save, X, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface School {
  id: string;
  name: string;
  code: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  school_id: string | null;
  custom_schools: string[] | null;
}

interface ManageCustomSchoolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onSuccess?: () => void;
}

export function ManageCustomSchoolsModal({
  isOpen,
  onClose,
  userProfile,
  onSuccess,
}: ManageCustomSchoolsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && userProfile) {
      loadSchools();
      
      // Cargar las sedes ya asignadas + SIEMPRE incluir la sede principal
      const customSchools = userProfile.custom_schools || [];
      const mainSchool = userProfile.school_id;
      
      // Asegurar que la sede principal siempre esté en la lista
      const allSchools = mainSchool 
        ? Array.from(new Set([mainSchool, ...customSchools])) // Eliminar duplicados
        : customSchools;
      
      setSelectedSchools(allSchools);
    }
  }, [isOpen, userProfile]);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code')
        .order('name');

      if (error) throw error;

      console.log('🏫 Sedes cargadas:', data?.length || 0);
      setSchools(data || []);
    } catch (error: any) {
      console.error('❌ Error al cargar sedes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las sedes.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchool = (schoolId: string) => {
    // 🔒 NO permitir desmarcar la sede principal del usuario
    if (userProfile?.school_id === schoolId) {
      toast({
        variant: 'destructive',
        title: '🔒 Sede Principal',
        description: 'No puedes desmarcar la sede principal del usuario.',
      });
      return;
    }

    setSelectedSchools(prev => {
      if (prev.includes(schoolId)) {
        return prev.filter(id => id !== schoolId);
      } else {
        return [...prev, schoolId];
      }
    });
  };

  const handleSelectAll = () => {
    const mainSchoolId = userProfile?.school_id;
    
    if (selectedSchools.length === schools.length) {
      // Deseleccionar todas EXCEPTO la sede principal
      setSelectedSchools(mainSchoolId ? [mainSchoolId] : []);
    } else {
      // Seleccionar todas
      setSelectedSchools(schools.map(s => s.id));
    }
  };

  const handleSave = async () => {
    if (!userProfile) return;

    setSaving(true);
    try {
      console.log('💾 Guardando sedes personalizadas para usuario:', userProfile.email);
      console.log('🏫 Sedes seleccionadas:', selectedSchools);

      const { error } = await supabase
        .from('profiles')
        .update({ custom_schools: selectedSchools })
        .eq('id', userProfile.id);

      if (error) throw error;

      toast({
        title: '✅ Sedes actualizadas',
        description: `Se asignaron ${selectedSchools.length} sede(s) a ${userProfile.full_name || userProfile.email}`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('❌ Error al guardar sedes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `No se pudieron guardar las sedes: ${error.message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-blue-600" />
            Gestión de Sedes Personalizadas
          </DialogTitle>
          <DialogDescription>
            Selecciona las sedes a las que <strong>{userProfile.full_name || userProfile.email}</strong> tendrá acceso.
          </DialogDescription>
        </DialogHeader>

        {/* Información del usuario */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900">Usuario:</span>
              <span className="text-sm text-blue-700">{userProfile.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900">Nombre:</span>
              <span className="text-sm text-blue-700">{userProfile.full_name || 'Sin nombre'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900">Rol:</span>
              <Badge variant="outline" className="border-blue-400 text-blue-700">
                {userProfile.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900">Sedes Seleccionadas:</span>
              <Badge className="bg-blue-600">
                {selectedSchools.length} de {schools.length}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600">Cargando sedes...</span>
          </div>
        ) : (
          <>
            {/* Botón Seleccionar/Deseleccionar Todas */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <Label className="font-semibold text-slate-700">Seleccionar todas las sedes</Label>
              <Button
                type="button"
                variant={selectedSchools.length === schools.length ? "default" : "outline"}
                size="sm"
                onClick={handleSelectAll}
                className="gap-2"
              >
                {selectedSchools.length === schools.length ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Todas Seleccionadas
                  </>
                ) : (
                  <>Seleccionar Todas</>
                )}
              </Button>
            </div>

            {/* Lista de sedes */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {schools.map((school) => {
                  const isSelected = selectedSchools.includes(school.id);
                  const isMainSchool = userProfile?.school_id === school.id;
                  
                  return (
                    <div
                      key={school.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                        isMainSchool 
                          ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-50 border-blue-400 cursor-pointer hover:shadow-md'
                            : 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer hover:shadow-md'
                      }`}
                      onClick={() => !isMainSchool && handleToggleSchool(school.id)}
                    >
                      <Checkbox
                        id={school.id}
                        checked={isSelected}
                        disabled={isMainSchool}
                        onCheckedChange={() => !isMainSchool && handleToggleSchool(school.id)}
                      />
                      <Label
                        htmlFor={school.id}
                        className={`flex-1 ${isMainSchool ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{school.name}</span>
                            {isMainSchool && (
                              <Badge className="bg-emerald-600 text-white text-xs">
                                🏫 Sede Principal
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {school.code}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Sedes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
