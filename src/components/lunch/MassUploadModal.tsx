import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Calendar, Copy, CopyCheck, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MenuAlternativesEditor } from './MenuAlternativesEditor';
import { format, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface School {
  id: string;
  name: string;
  color?: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  target_type: string;
  price?: number;
}

interface MassUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  onSuccess: () => void;
}

interface MenuEntry {
  id: string;
  date: string;
  category_id: string;
  starter: string;
  main_course: string;
  beverage: string;
  dessert: string;
  notes: string;
  starter_alternatives: string[];
  main_course_alternatives: string[];
  beverage_alternatives: string[];
  dessert_alternatives: string[];
  showOptions: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  starter: '🥗 Entrada',
  main_course: '🍲 Segundo',
  beverage: '🥤 Bebida',
  dessert: '🍰 Postre',
};

const emptyEntry = (categoryId = 'none'): MenuEntry => ({
  id: crypto.randomUUID(),
  date: '',
  category_id: categoryId,
  starter: '',
  main_course: '',
  beverage: '',
  dessert: '',
  notes: '',
  starter_alternatives: [],
  main_course_alternatives: [],
  beverage_alternatives: [],
  dessert_alternatives: [],
  showOptions: false,
});

export const MassUploadModal = ({
  isOpen,
  onClose,
  schools,
  onSuccess,
}: MassUploadModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [entries, setEntries] = useState<MenuEntry[]>([emptyEntry()]);

  // Propagación de campo: rellenar un campo específico a todos los días
  const [propagateField, setPropagateField] = useState<keyof MenuEntry>('starter');
  const [propagateValue, setPropagateValue] = useState('');
  const [showPropagate, setShowPropagate] = useState(false);

  // Reset completo al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setSelectedSchools([]);
      setDateStart('');
      setDateEnd('');
      setEntries([emptyEntry()]);
      setPropagateValue('');
      setShowPropagate(false);
    }
  }, [isOpen]);

  // Cargar categorías cuando cambian las sedes seleccionadas
  useEffect(() => {
    if (!isOpen || selectedSchools.length === 0) {
      setCategories([]);
      return;
    }
    const loadCategories = async () => {
      const { data } = await supabase
        .from('lunch_categories')
        .select('id, name, icon, color, target_type, price')
        .in('school_id', selectedSchools)
        .eq('is_active', true)
        .eq('is_kitchen_sale', false)
        .order('display_order', { ascending: true });
      setCategories(data || []);
    };
    loadCategories();
  }, [selectedSchools, isOpen]);

  const toggleSchool = (schoolId: string) => {
    setSelectedSchools((prev) =>
      prev.includes(schoolId)
        ? prev.filter((id) => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const addEntry = () => setEntries((prev) => [...prev, emptyEntry()]);

  const removeEntry = (id: string) => {
    if (entries.length === 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof MenuEntry, value: string | string[] | boolean) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const toggleEntryOptions = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, showOptions: !e.showOptions } : e))
    );
  };

  const copyFromPrevious = (index: number) => {
    if (index <= 0) return;
    setEntries((prev) => {
      const updated = [...prev];
      const source = updated[index - 1];
      updated[index] = {
        ...updated[index],
        category_id: source.category_id,
        starter: source.starter,
        main_course: source.main_course,
        beverage: source.beverage,
        dessert: source.dessert,
        notes: source.notes,
        starter_alternatives: [...source.starter_alternatives],
        main_course_alternatives: [...source.main_course_alternatives],
        beverage_alternatives: [...source.beverage_alternatives],
        dessert_alternatives: [...source.dessert_alternatives],
      };
      return updated;
    });
    toast({ title: 'Copiado', description: 'Menú copiado del día anterior' });
  };

  const fillAllFromFirst = () => {
    if (entries.length < 2) return;
    const source = entries[0];
    if (!source.main_course.trim()) {
      toast({ title: 'Sin datos', description: 'Completa el segundo plato del primer día antes', variant: 'destructive' });
      return;
    }
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === 0
          ? entry
          : {
              ...entry,
              category_id: source.category_id,
              starter: source.starter,
              main_course: source.main_course,
              beverage: source.beverage,
              dessert: source.dessert,
              notes: source.notes,
              starter_alternatives: [...source.starter_alternatives],
              main_course_alternatives: [...source.main_course_alternatives],
              beverage_alternatives: [...source.beverage_alternatives],
              dessert_alternatives: [...source.dessert_alternatives],
            }
      )
    );
    toast({ title: 'Rellenado', description: `Primer día copiado a los otros ${entries.length - 1} días` });
  };

  // Propagar un campo específico a todos los días
  const applyPropagation = () => {
    if (!propagateValue.trim()) {
      toast({ title: 'Sin valor', description: 'Escribe el valor a propagar', variant: 'destructive' });
      return;
    }
    setEntries((prev) =>
      prev.map((entry) => ({ ...entry, [propagateField]: propagateValue.trim() }))
    );
    toast({ title: 'Propagado', description: `${FIELD_LABELS[propagateField as string]} aplicado a todos los días` });
    setPropagateValue('');
  };

  const generateDays = () => {
    if (!dateStart || !dateEnd) {
      toast({ title: 'Fechas incompletas', description: 'Selecciona fecha de inicio y fin', variant: 'destructive' });
      return;
    }
    // Fix UTC: construir fechas con componentes locales
    const [sy, sm, sd] = dateStart.split('-').map(Number);
    const [ey, em, ed] = dateEnd.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);

    if (start > endDate) {
      toast({ title: 'Rango inválido', description: 'La fecha de inicio debe ser anterior al fin', variant: 'destructive' });
      return;
    }

    // Tomar la categoría de la primera entrada ya cargada (si existe)
    const defaultCatId = entries[0]?.category_id || 'none';

    const newEntries: MenuEntry[] = [];
    const current = new Date(start);
    while (current <= endDate) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) { // solo lunes a viernes
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        newEntries.push({ ...emptyEntry(defaultCatId), date: `${y}-${m}-${d}` });
      }
      current.setDate(current.getDate() + 1);
    }

    if (newEntries.length === 0) {
      toast({ title: 'Sin días', description: 'No hay días de semana en ese rango', variant: 'destructive' });
      return;
    }

    setEntries(newEntries);
    toast({ title: 'Días generados', description: `${newEntries.length} días hábiles (lunes a viernes)` });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return format(date, "EEE d MMM", { locale: es });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSchools.length === 0) {
      toast({ title: 'Sin sede', description: 'Selecciona al menos una sede', variant: 'destructive' });
      return;
    }

    const invalid = entries.filter((e) => !e.date || !e.main_course.trim());
    if (invalid.length > 0) {
      toast({ title: 'Faltan datos', description: `${invalid.length} fila(s) sin fecha o segundo plato`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const menusToInsert = [];
      for (const schoolId of selectedSchools) {
        for (const entry of entries) {
          const cat = categories.find(c => c.id === entry.category_id);
          const targetType = cat?.target_type || 'both';
          menusToInsert.push({
            school_id: schoolId,
            date: entry.date,
            starter: entry.starter.trim() || null,
            main_course: entry.main_course.trim(),
            beverage: entry.beverage.trim() || null,
            dessert: entry.dessert.trim() || null,
            notes: entry.notes.trim() || null,
            category_id: entry.category_id !== 'none' ? entry.category_id : null,
            target_type: targetType,
            created_by: user?.id ?? null,
            starter_alternatives: entry.starter_alternatives.filter(a => a.trim()),
            main_course_alternatives: entry.main_course_alternatives.filter(a => a.trim()),
            beverage_alternatives: entry.beverage_alternatives.filter(a => a.trim()),
            dessert_alternatives: entry.dessert_alternatives.filter(a => a.trim()),
          });
        }
      }

      const { error } = await supabase
        .from('lunch_menus')
        .upsert(menusToInsert, {
          onConflict: 'school_id,date,category_id',
          ignoreDuplicates: false,
        });

      if (error) {
        if (error.code === '23505') throw new Error('Ya existen menús para alguna de las fechas seleccionadas. Verifica que no haya duplicados.');
        if (error.code === '23503') throw new Error('La categoría o sede seleccionada ya no existe. Recarga la página.');
        throw error;
      }

      toast({ title: 'Menús guardados', description: `${menusToInsert.length} menú(s) para ${selectedSchools.length} sede(s)` });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Error al guardar', description: error.message || 'No se pudieron guardar los menús', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalMenus = entries.length * selectedSchools.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Carga masiva de menús</DialogTitle>
          <DialogDescription>
            Crea varios menús de una vez. Elige la sede, la categoría y los días.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* PASO 1: SEDES */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <span className="bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px]">1</span>
                ¿A qué sede(s) aplica?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              {schools.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay sedes disponibles.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {schools.map((school) => (
                    <label key={school.id} className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded-lg border hover:bg-stone-50 transition-colors">
                      <Checkbox
                        checked={selectedSchools.includes(school.id)}
                        onCheckedChange={() => toggleSchool(school.id)}
                      />
                      {school.color && (
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: school.color }} />
                      )}
                      <span className="truncate">{school.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PASO 2: GENERAR DÍAS */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <span className="bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px]">2</span>
                ¿Qué días quieres cargar?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4 space-y-2">
              <p className="text-xs text-stone-500">Elige un rango y se generarán automáticamente solo los días de lunes a viernes.</p>
              <div className="flex gap-2 items-end flex-wrap">
                <div>
                  <Label className="text-xs text-stone-500">Desde</Label>
                  <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="h-9 text-sm w-40" />
                </div>
                <div>
                  <Label className="text-xs text-stone-500">Hasta</Label>
                  <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="h-9 text-sm w-40" />
                </div>
                <Button type="button" variant="secondary" onClick={generateDays} className="h-9 gap-2">
                  <Calendar className="h-4 w-4" />
                  Generar días
                </Button>
                <Button type="button" variant="outline" onClick={addEntry} className="h-9 gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir día manualmente
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* HERRAMIENTA DE PROPAGACIÓN */}
          {entries.length >= 2 && (
            <div className="border border-dashed border-blue-300 rounded-xl p-3 bg-blue-50/40">
              <button
                type="button"
                onClick={() => setShowPropagate(!showPropagate)}
                className="flex items-center gap-2 text-sm font-medium text-blue-700 w-full"
              >
                <Wand2 className="h-4 w-4" />
                Herramientas rápidas de relleno
                {showPropagate ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
              </button>

              {showPropagate && (
                <div className="mt-3 space-y-3">
                  {/* Rellenar todos igual al primero */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button type="button" variant="outline" size="sm" onClick={fillAllFromFirst} className="text-blue-700 border-blue-300 bg-white hover:bg-blue-50 gap-2">
                      <CopyCheck className="h-4 w-4" />
                      Copiar primer día a todos los demás
                    </Button>
                    <span className="text-xs text-stone-400">— copia entrada, segundo, bebida y postre del día 1 a todos</span>
                  </div>

                  {/* Propagar un campo específico */}
                  <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-800">Repetir un campo específico en todos los días:</p>
                    <div className="flex gap-2 items-end flex-wrap">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-stone-500">Campo</Label>
                        <Select value={propagateField as string} onValueChange={(v) => setPropagateField(v as keyof MenuEntry)}>
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">🥗 Entrada</SelectItem>
                            <SelectItem value="main_course">🍲 Segundo</SelectItem>
                            <SelectItem value="beverage">🥤 Bebida</SelectItem>
                            <SelectItem value="dessert">🍰 Postre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 flex-1 min-w-40">
                        <Label className="text-[10px] text-stone-500">Valor</Label>
                        <Input
                          value={propagateValue}
                          onChange={(e) => setPropagateValue(e.target.value)}
                          placeholder={`Ej: ${propagateField === 'starter' ? 'Ensalada fresca' : propagateField === 'main_course' ? 'Arroz con pollo' : propagateField === 'beverage' ? 'Refresco' : 'Fruta'}`}
                          className="h-8 text-xs"
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPropagation(); } }}
                        />
                      </div>
                      <Button type="button" size="sm" onClick={applyPropagation} className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                        <Wand2 className="h-3.5 w-3.5" />
                        Aplicar a todos
                      </Button>
                    </div>
                    <p className="text-[10px] text-stone-400">Presiona Enter o el botón para aplicar este valor a todos los días de la lista.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: LISTA DE MENÚS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <span className="bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px]">3</span>
                Menús ({entries.length} {entries.length === 1 ? 'fila' : 'filas'}) — la categoría va en cada fila
              </Label>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {entries.map((entry, index) => (
                <Card key={entry.id} className="border-stone-200">
                  <CardContent className="pt-3 pb-2 px-3">
                    {/* Fila principal */}
                    <div className="grid grid-cols-12 gap-2 items-end">
                      {/* Fecha */}
                      <div className="col-span-2">
                        <Label className="text-[10px] text-stone-500 uppercase tracking-wider">Fecha *</Label>
                        <Input
                          type="date"
                          value={entry.date}
                          onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                          disabled={loading}
                          className="h-8 text-xs"
                        />
                        {entry.date && (
                          <p className="text-[10px] text-emerald-700 font-medium mt-0.5 capitalize">
                            {formatDate(entry.date)}
                          </p>
                        )}
                      </div>

                      {/* Categoría */}
                      <div className="col-span-3">
                        <Label className="text-[10px] text-stone-500 uppercase tracking-wider">🗂 Categoría</Label>
                        {selectedSchools.length === 0 ? (
                          <p className="text-[10px] text-amber-500 mt-1">Selecciona una sede</p>
                        ) : categories.length === 0 ? (
                          <p className="text-[10px] text-stone-400 mt-1">Sin categorías</p>
                        ) : (
                          <Select
                            value={entry.category_id}
                            onValueChange={(v) => updateEntry(entry.id, 'category_id', v)}
                            disabled={loading}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Sin categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-stone-400">Sin categoría</span>
                              </SelectItem>
                              {categories.map((cat) => {
                                const targetLabel = cat.target_type === 'students' ? 'Alumnos' : cat.target_type === 'teachers' ? 'Profesores' : 'Todos';
                                return (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-1.5">
                                      {cat.icon && <span>{cat.icon}</span>}
                                      <span className="font-medium">{cat.name}</span>
                                      <span className="text-[10px] text-stone-400">· {targetLabel}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Entrada */}
                      <div className="col-span-1">
                        <Label className="text-[10px] text-stone-500 uppercase tracking-wider">🥗 Entrada</Label>
                        <Input
                          value={entry.starter}
                          onChange={(e) => updateEntry(entry.id, 'starter', e.target.value)}
                          disabled={loading}
                          placeholder="Entrada..."
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Segundo */}
                      <div className="col-span-2">
                        <Label className="text-[10px] text-stone-500 uppercase tracking-wider">🍲 Segundo *</Label>
                        <Input
                          value={entry.main_course}
                          onChange={(e) => updateEntry(entry.id, 'main_course', e.target.value)}
                          disabled={loading}
                          placeholder="Segundo plato..."
                          className="h-8 text-xs"
                          required
                        />
                      </div>

                      {/* Bebida */}
                      <div className="col-span-1">
                        <Label className="text-[10px] text-stone-500 uppercase tracking-wider">🥤 Bebida</Label>
                        <Input
                          value={entry.beverage}
                          onChange={(e) => updateEntry(entry.id, 'beverage', e.target.value)}
                          disabled={loading}
                          placeholder="Bebida..."
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Postre */}
                      <div className="col-span-1">
                        <Label className="text-[10px] text-stone-500 uppercase tracking-wider">🍰 Postre</Label>
                        <Input
                          value={entry.dessert}
                          onChange={(e) => updateEntry(entry.id, 'dessert', e.target.value)}
                          disabled={loading}
                          placeholder="Postre..."
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Acciones */}
                      <div className="col-span-1 flex items-end justify-end gap-0.5 pb-0.5">
                        <button
                          type="button"
                          onClick={() => toggleEntryOptions(entry.id)}
                          className="text-[10px] text-blue-500 hover:text-blue-700 px-1 py-1 rounded"
                          title="Opciones adicionales"
                        >
                          {entry.showOptions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        {index > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => copyFromPrevious(index)}
                                  disabled={loading}
                                  className="p-1 rounded text-blue-400 hover:text-blue-700"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Copiar menú del día anterior</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          disabled={loading || entries.length === 1}
                          className="p-1 rounded text-red-400 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Opciones adicionales expandibles */}
                    {entry.showOptions && (
                      <div className="mt-2 pt-2 border-t border-dashed border-stone-200 grid grid-cols-2 gap-3">
                        <MenuAlternativesEditor
                          label="Entrada"
                          icon="🥗"
                          alternatives={entry.starter_alternatives}
                          onChange={(alts) => updateEntry(entry.id, 'starter_alternatives' as keyof MenuEntry, alts as any)}
                          defaultValue={entry.starter}
                          placeholder="Opción alternativa de entrada..."
                        />
                        <MenuAlternativesEditor
                          label="Segundo"
                          icon="🍲"
                          alternatives={entry.main_course_alternatives}
                          onChange={(alts) => updateEntry(entry.id, 'main_course_alternatives' as keyof MenuEntry, alts as any)}
                          defaultValue={entry.main_course}
                          placeholder="Opción alternativa de segundo..."
                        />
                        <MenuAlternativesEditor
                          label="Bebida"
                          icon="🥤"
                          alternatives={entry.beverage_alternatives}
                          onChange={(alts) => updateEntry(entry.id, 'beverage_alternatives' as keyof MenuEntry, alts as any)}
                          defaultValue={entry.beverage}
                          placeholder="Opción alternativa de bebida..."
                        />
                        <MenuAlternativesEditor
                          label="Postre"
                          icon="🍰"
                          alternatives={entry.dessert_alternatives}
                          onChange={(alts) => updateEntry(entry.id, 'dessert_alternatives' as keyof MenuEntry, alts as any)}
                          defaultValue={entry.dessert}
                          placeholder="Opción alternativa de postre..."
                        />
                      </div>
                    )}

                    {/* Indicador de opciones cargadas */}
                    {!entry.showOptions && (
                      [entry.starter_alternatives, entry.main_course_alternatives, entry.beverage_alternatives, entry.dessert_alternatives]
                        .some(arr => arr.length > 0)
                    ) && (
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          Con opciones alternativas
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <DialogFooter className="gap-2 flex-wrap">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || totalMenus === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
              ) : totalMenus === 0 ? (
                'Selecciona sedes primero'
              ) : (
                `Guardar ${totalMenus} menú${totalMenus !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
