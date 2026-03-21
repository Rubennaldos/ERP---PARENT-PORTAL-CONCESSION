import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Edit, Loader2, GraduationCap, Users, School } from 'lucide-react';
import { normalizeSearch } from '@/lib/utils';

interface Student {
  id: string;
  full_name: string;
  grade: string;
  section: string;
  level_id: string | null;
  classroom_id: string | null;
  school_id: string;
  school_name?: string;
  parent_name?: string;
  is_active: boolean;
  free_account: boolean;
  balance: number;
}

interface SchoolOption { id: string; name: string; }
interface Level       { id: string; name: string; }
interface Classroom   { id: string; name: string; level_id: string; }

interface Props {
  userSchoolId: string | null;
  canViewAllSchools: boolean;
}

export function StudentsManagementTab({ userSchoolId, canViewAllSchools }: Props) {
  const { toast } = useToast();

  const [students, setStudents]       = useState<Student[]>([]);
  const [schools,  setSchools]        = useState<SchoolOption[]>([]);
  const [loading,  setLoading]        = useState(true);
  const [search,   setSearch]         = useState('');
  const [filterSchool, setFilterSchool] = useState<string>('all');

  // Modal de edición
  const [editOpen,   setEditOpen]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName,   setEditName]   = useState('');

  // Selectores de nivel/aula en el modal
  const [levels,    setLevels]    = useState<Level[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [editLevelId,    setEditLevelId]    = useState('');
  const [editClassroomId, setEditClassroomId] = useState('');
  const [loadingLevels, setLoadingLevels] = useState(false);

  // ── Cargar sedes ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('schools').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setSchools(data || []));
  }, []);

  // ── Cargar alumnos ────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('students')
        .select(`
          id, full_name, grade, section,
          level_id, classroom_id, school_id,
          is_active, free_account, balance,
          schools ( name ),
          profiles:parent_id ( full_name )
        `)
        .eq('is_active', true)
        .order('full_name');

      if (!canViewAllSchools && userSchoolId) {
        q = q.eq('school_id', userSchoolId);
      }

      const { data, error } = await q;
      if (error) throw error;

      const mapped: Student[] = (data || []).map((s: any) => ({
        id:           s.id,
        full_name:    s.full_name,
        grade:        s.grade || '',
        section:      s.section || '',
        level_id:     s.level_id,
        classroom_id: s.classroom_id,
        school_id:    s.school_id,
        school_name:  s.schools?.name || '—',
        parent_name:  s.profiles?.full_name || '—',
        is_active:    s.is_active,
        free_account: s.free_account,
        balance:      s.balance || 0,
      }));
      setStudents(mapped);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error cargando alumnos', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [canViewAllSchools, userSchoolId, toast]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // ── Abrir modal de edición ────────────────────────────────────────────────
  const openEdit = async (student: Student) => {
    setEditStudent(student);
    setEditName(student.full_name);
    setEditLevelId(student.level_id || '');
    setEditClassroomId(student.classroom_id || '');
    setEditOpen(true);
    await loadLevelsAndClassrooms(student.school_id);
  };

  const loadLevelsAndClassrooms = async (schoolId: string) => {
    setLoadingLevels(true);
    try {
      const [{ data: lvl }, { data: cls }] = await Promise.all([
        supabase.from('school_levels').select('id, name').eq('school_id', schoolId).eq('is_active', true).order('order_index'),
        supabase.from('school_classrooms').select('id, name, level_id').eq('school_id', schoolId).eq('is_active', true).order('order_index'),
      ]);
      setLevels(lvl || []);
      setClassrooms(cls || []);
    } finally {
      setLoadingLevels(false);
    }
  };

  // Filtrar aulas al cambiar nivel
  useEffect(() => {
    if (editLevelId) {
      const filtered = classrooms.filter(c => c.level_id === editLevelId);
      setFilteredClassrooms(filtered);
      // Limpiar aula si ya no corresponde al nivel
      if (editClassroomId && !filtered.find(c => c.id === editClassroomId)) {
        setEditClassroomId('');
      }
    } else {
      setFilteredClassrooms([]);
      setEditClassroomId('');
    }
  }, [editLevelId, classrooms]);

  // ── Guardar cambios ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editStudent) return;
    if (!editName.trim()) {
      toast({ variant: 'destructive', title: 'El nombre no puede estar vacío' });
      return;
    }

    setSaving(true);
    try {
      const selectedLevel    = levels.find(l => l.id === editLevelId);
      const selectedClassroom = classrooms.find(c => c.id === editClassroomId);

      const { error } = await supabase
        .from('students')
        .update({
          full_name:    editName.trim(),
          level_id:     editLevelId     || null,
          classroom_id: editClassroomId || null,
          grade:        selectedLevel?.name    || editStudent.grade,
          section:      selectedClassroom?.name || editStudent.section,
        })
        .eq('id', editStudent.id);

      if (error) throw error;

      toast({ title: '✅ Alumno actualizado', description: `${editName.trim()} guardado correctamente.` });
      setEditOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Filtrado en cliente ───────────────────────────────────────────────────
  const filtered = students.filter(s => {
    const q = normalizeSearch(search);
    const matchSearch = !q ||
      normalizeSearch(s.full_name).includes(q) ||
      normalizeSearch(s.grade).includes(q) ||
      normalizeSearch(s.section).includes(q) ||
      normalizeSearch(s.parent_name || '').includes(q);
    const matchSchool = filterSchool === 'all' || s.school_id === filterSchool;
    return matchSearch && matchSchool;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          <Input
            placeholder="Buscar por nombre, grado, aula o padre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 border-emerald-200 focus:border-emerald-400"
          />
        </div>
        {canViewAllSchools && (
          <Select value={filterSchool} onValueChange={setFilterSchool}>
            <SelectTrigger className="w-full sm:w-52 border-emerald-200">
              <School className="h-4 w-4 mr-2 text-emerald-500" />
              <SelectValue placeholder="Todas las sedes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {schools.map(sc => (
                <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
          <Users className="h-4 w-4" />
          <span className="font-semibold">{filtered.length}</span> alumnos
        </div>
      </div>

      {/* Tabla de alumnos */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-emerald-700">Cargando alumnos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron alumnos</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-emerald-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
                <th className="text-left px-4 py-3 font-semibold text-emerald-800">#</th>
                <th className="text-left px-4 py-3 font-semibold text-emerald-800">Nombre del Alumno</th>
                <th className="text-left px-4 py-3 font-semibold text-emerald-800">Grado</th>
                <th className="text-left px-4 py-3 font-semibold text-emerald-800">Aula / Sección</th>
                <th className="text-left px-4 py-3 font-semibold text-emerald-800">Sede</th>
                <th className="text-left px-4 py-3 font-semibold text-emerald-800">Padre / Tutor</th>
                <th className="text-left px-4 py-3 font-semibold text-emerald-800">Cuenta</th>
                <th className="text-center px-4 py-3 font-semibold text-emerald-800">Editar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr
                  key={s.id}
                  className="border-b border-emerald-100 hover:bg-emerald-50/40 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-800">{s.full_name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.grade || <span className="text-gray-300 italic text-xs">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{s.section || <span className="text-gray-300 italic text-xs">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.school_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.parent_name}</td>
                  <td className="px-4 py-3">
                    {s.free_account ? (
                      <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">Libre</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">
                        S/ {s.balance.toFixed(2)}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(s)}
                      className="h-8 w-8 p-0 hover:bg-emerald-100 text-emerald-600"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de edición */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              Editar Alumno
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre Completo *
              </Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Nombre completo del alumno"
                className="border-emerald-200 focus:border-emerald-400"
              />
            </div>

            {loadingLevels ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando grados y aulas...
              </div>
            ) : (
              <>
                {/* Grado/Nivel */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Grado / Nivel
                  </Label>
                  {levels.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No hay grados configurados para esta sede</p>
                  ) : (
                    <Select value={editLevelId} onValueChange={setEditLevelId}>
                      <SelectTrigger className="border-emerald-200 focus:border-emerald-400">
                        <SelectValue placeholder="Selecciona el grado" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Aula/Sección */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Aula / Sección
                  </Label>
                  {!editLevelId ? (
                    <div className="h-10 border border-gray-200 rounded-lg bg-gray-50 px-3 flex items-center text-xs text-gray-400">
                      Primero selecciona un grado
                    </div>
                  ) : filteredClassrooms.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No hay aulas para este grado</p>
                  ) : (
                    <Select value={editClassroomId} onValueChange={setEditClassroomId}>
                      <SelectTrigger className="border-emerald-200 focus:border-emerald-400">
                        <SelectValue placeholder="Selecciona el aula" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClassrooms.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}

            {/* Info actual */}
            {editStudent && (editStudent.grade || editStudent.section) && (
              <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                Actual: <span className="font-medium text-gray-600">{editStudent.grade} — {editStudent.section}</span>
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {saving ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Guardando...</> : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
