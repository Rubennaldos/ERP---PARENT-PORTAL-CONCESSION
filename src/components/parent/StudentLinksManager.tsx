import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Link2, Users as UsersIcon, Trash2, Plus, Heart, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  grade: string;
  section: string;
}

interface StudentLink {
  link_id: string;
  linked_student_id: string;
  linked_student_name: string;
  linked_student_grade: string;
  relationship_type: 'hermanos' | 'primos' | 'amigos' | 'gemelos';
}

interface StudentLinksManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  allStudents: Student[];
  onLinksUpdated: () => void;
}

const relationshipLabels = {
  hermanos: { label: 'Hermanos', icon: '👫', color: 'blue' },
  gemelos: { label: 'Gemelos', icon: '👯', color: 'purple' },
  primos: { label: 'Primos', icon: '🤝', color: 'green' },
  amigos: { label: 'Amigos', icon: '🎭', color: 'orange' },
};

export const StudentLinksManager = ({
  open,
  onOpenChange,
  student,
  allStudents,
  onLinksUpdated
}: StudentLinksManagerProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [links, setLinks] = useState<StudentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('hermanos');

  useEffect(() => {
    if (open) {
      fetchLinks();
    }
  }, [open, student.id]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_student_links', { p_student_id: student.id });

      if (error) throw error;
      setLinks(data || []);
    } catch (error: any) {
      console.error('Error fetching links:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los vínculos',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!selectedStudent) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selecciona un estudiante para vincular',
      });
      return;
    }

    if (selectedStudent === student.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No puedes vincular un estudiante consigo mismo',
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .rpc('create_student_link', {
          p_student_a_id: student.id,
          p_student_b_id: selectedStudent,
          p_relationship_type: selectedRelationship,
          p_created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: '✅ Vínculo Creado',
        description: `Los estudiantes ahora están vinculados como ${relationshipLabels[selectedRelationship as keyof typeof relationshipLabels].label.toLowerCase()}`,
      });

      setSelectedStudent('');
      setSelectedRelationship('hermanos');
      await fetchLinks();
      onLinksUpdated();
    } catch (error: any) {
      console.error('Error creating link:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el vínculo',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('student_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: '🗑️ Vínculo Eliminado',
        description: 'El vínculo entre estudiantes se eliminó correctamente',
      });

      await fetchLinks();
      onLinksUpdated();
    } catch (error: any) {
      console.error('Error deleting link:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el vínculo',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableStudents = allStudents.filter(s => 
    s.id !== student.id && 
    !links.some(link => link.linked_student_id === s.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full">
              <Link2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Vínculos Familiares</DialogTitle>
              <DialogDescription className="text-base">
                Conecta a {student.full_name} con sus hermanos, primos o amigos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sección: Crear Nuevo Vínculo */}
          <Card className="p-4 border-2 border-dashed border-blue-300 bg-blue-50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-900">
              <Plus className="h-5 w-5" />
              Crear Nuevo Vínculo
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Selecciona el Estudiante
                </label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un estudiante..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} - {s.grade} {s.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Tipo de Relación
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(relationshipLabels).map(([key, { label, icon, color }]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedRelationship(key)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        selectedRelationship === key
                          ? `border-${color}-500 bg-${color}-50 shadow-lg scale-105`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className="text-xs font-bold">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateLink}
                disabled={!selectedStudent || loading}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {loading ? 'Creando...' : 'Crear Vínculo'}
              </Button>
            </div>
          </Card>

          {/* Sección: Vínculos Existentes */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
              <Heart className="h-5 w-5 text-red-500" />
              Vínculos de {student.full_name}
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Cargando vínculos...</p>
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Link2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">No hay vínculos creados</p>
                <p className="text-xs text-gray-400 mt-1">Crea el primer vínculo usando el formulario de arriba</p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => {
                  const rel = relationshipLabels[link.relationship_type];
                  return (
                    <Card key={link.link_id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Animación de Lazo/Cuerda */}
                          <div className="relative">
                            <div className="flex items-center gap-2">
                              {/* Estudiante A */}
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {student.full_name.charAt(0)}
                              </div>
                              
                              {/* Cuerda animada */}
                              <div className="relative w-16 h-1">
                                <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 animate-pulse rounded-full"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs bg-white px-2 py-0.5 rounded-full border-2 border-gray-200 shadow-sm">
                                  {rel.icon}
                                </div>
                              </div>
                              
                              {/* Estudiante B */}
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {link.linked_student_name.charAt(0)}
                              </div>
                            </div>
                          </div>

                          {/* Info del Vínculo */}
                          <div>
                            <p className="font-bold text-gray-900">{link.linked_student_name}</p>
                            <p className="text-sm text-gray-500">{link.linked_student_grade}</p>
                          </div>

                          <Badge variant="outline" className="ml-4">
                            {rel.icon} {rel.label}
                          </Badge>
                        </div>

                        <Button
                          onClick={() => handleDeleteLink(link.link_id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

