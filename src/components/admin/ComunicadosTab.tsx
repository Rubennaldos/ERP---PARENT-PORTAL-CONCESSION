import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bell,
  Send,
  Trash2,
  Edit3,
  MoreVertical,
  Globe,
  Building2,
  Users,
  User,
  RefreshCw,
  CalendarClock,
  AlertTriangle,
  Info,
  Clock as ClockIcon,
  CreditCard,
  Save,
  X,
} from 'lucide-react';
import { formatDistanceToNow, isPast, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface School {
  id: string;
  name: string;
  code: string;
}

interface ParentProfile {
  id: string;
  full_name: string;
}

interface Comunicado {
  id: string;
  school_id: string | null;
  type: 'informativo' | 'recordatorio' | 'alerta' | 'cobranza';
  target_type: 'all' | 'specific';
  target_parent_id: string | null;
  subject: string;
  message: string;
  expiration_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  school?: { name: string; code: string } | null;
  target_parent?: { full_name: string } | null;
  creator?: { full_name: string; email: string } | null;
}

type ComunicadoType = 'informativo' | 'recordatorio' | 'alerta' | 'cobranza';
type TargetType = 'all' | 'specific';

interface Props {
  userSchoolId: string | null;
  canViewAllSchools: boolean;
}

const TYPE_CONFIG: Record<ComunicadoType, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  informativo:  { label: 'Informativo',  icon: Info,          color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  recordatorio: { label: 'Recordatorio', icon: ClockIcon,     color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  alerta:       { label: 'Alerta',       icon: AlertTriangle, color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  cobranza:     { label: 'Cobranza',     icon: CreditCard,    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
};

const MAX_MSG = 600;

export function ComunicadosTab({ userSchoolId, canViewAllSchools }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Datos auxiliares ──────────────────────────────────────────────────────
  const [schools, setSchools]   = useState<School[]>([]);
  const [parents, setParents]   = useState<ParentProfile[]>([]);
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Lista de comunicados ──────────────────────────────────────────────────
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);

  // ── Formulario ────────────────────────────────────────────────────────────
  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [selectedSchool,  setSelectedSchool]  = useState<string>('global');
  const [selectedType,    setSelectedType]    = useState<ComunicadoType>('informativo');
  const [targetType,      setTargetType]      = useState<TargetType>('all');
  const [targetParentId,  setTargetParentId]  = useState<string>('');
  const [subject,         setSubject]         = useState('');
  const [message,         setMessage]         = useState('');
  const [expirationDate,  setExpirationDate]  = useState('');

  // ── Confirmación borrar ───────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Cargar sedes ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase.from('schools').select('id, name, code').order('name');
      if (data) setSchools(data);
    };
    fetchSchools();
  }, []);

  // ── Cargar padres (para destinatario específico) ──────────────────────────
  useEffect(() => {
    const fetchParents = async () => {
      let query = supabase.from('parent_profiles').select('id, full_name').order('full_name');
      if (!canViewAllSchools && userSchoolId) {
        // Filtrar por sede del usuario
        query = query.eq('school_id', userSchoolId);
      }
      const { data } = await query.limit(500);
      if (data) setParents(data);
    };
    fetchParents();
  }, [canViewAllSchools, userSchoolId]);

  // ── Cargar comunicados ────────────────────────────────────────────────────
  const fetchComunicados = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('school_comunicados')
        .select(`
          *,
          school:schools(name, code),
          target_parent:parent_profiles!target_parent_id(full_name),
          creator:profiles!created_by(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (!canViewAllSchools && userSchoolId) {
        query = query.or(`school_id.eq.${userSchoolId},school_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setComunicados((data as Comunicado[]) || []);
    } catch (err: unknown) {
      console.error('Error cargando comunicados:', err);
    } finally {
      setLoading(false);
    }
  }, [canViewAllSchools, userSchoolId, refreshKey]);

  useEffect(() => { fetchComunicados(); }, [fetchComunicados]);

  // ── Resetear formulario ───────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null);
    setSelectedSchool('global');
    setSelectedType('informativo');
    setTargetType('all');
    setTargetParentId('');
    setSubject('');
    setMessage('');
    setExpirationDate('');
  };

  // ── Cargar comunicado en formulario (editar) ──────────────────────────────
  const handleEdit = (c: Comunicado) => {
    setEditingId(c.id);
    setSelectedSchool(c.school_id ?? 'global');
    setSelectedType(c.type);
    setTargetType(c.target_type);
    setTargetParentId(c.target_parent_id ?? '');
    setSubject(c.subject);
    setMessage(c.message);
    setExpirationDate(
      c.expiration_date ? format(new Date(c.expiration_date), 'yyyy-MM-dd') : ''
    );
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Enviar / Guardar ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: 'Campos requeridos', description: 'Completa el asunto y el mensaje.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      // Buscar profile del usuario actual
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const payload = {
        school_id:        selectedSchool === 'global' ? null : selectedSchool,
        type:             selectedType,
        target_type:      targetType,
        target_parent_id: targetType === 'specific' && targetParentId ? targetParentId : null,
        subject:          subject.trim(),
        message:          message.trim(),
        expiration_date:  expirationDate ? new Date(expirationDate + 'T23:59:59').toISOString() : null,
        created_by:       profileData?.id ?? null,
        updated_at:       new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from('school_comunicados').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: '✅ Comunicado actualizado', description: 'Los cambios fueron guardados.' });
      } else {
        const { error } = await supabase.from('school_comunicados').insert(payload);
        if (error) throw error;
        toast({ title: '✅ Comunicado enviado', description: 'Los padres lo verán en su portal.' });
      }

      resetForm();
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      console.error('Error guardando comunicado:', err);
      toast({ title: 'Error al guardar', description: 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // ── Borrar ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('school_comunicados').delete().eq('id', id);
      if (error) throw error;
      toast({ title: '🗑️ Comunicado eliminado' });
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      console.error('Error eliminando comunicado:', err);
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // ── Helpers visuales ──────────────────────────────────────────────────────
  const isExpired = (c: Comunicado) =>
    !!c.expiration_date && isPast(new Date(c.expiration_date));

  const getSchoolLabel = (c: Comunicado) =>
    c.school_id ? (c.school?.name ?? 'Sede desconocida') : 'Global (todas las sedes)';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── PANEL IZQUIERDO: Formulario ───────────────────────────────────── */}
      <div className="space-y-5">
        <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Cabecera */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-200">
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
              <Bell className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-purple-900">
                {editingId ? 'Editar Comunicado' : 'Nuevo Comunicado'}
              </p>
              <p className="text-xs text-purple-600">Los padres verán el mensaje en su portal</p>
            </div>
            {editingId && (
              <button
                onClick={resetForm}
                className="ml-auto p-1.5 rounded-full hover:bg-purple-100 text-purple-400 hover:text-purple-700 transition-colors"
                title="Cancelar edición"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* SEDE DESTINO */}
            <div>
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Sede Destino
              </Label>
              {canViewAllSchools ? (
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger className="border-2 focus:border-purple-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-500" />
                        Todas las sedes (global)
                      </div>
                    </SelectItem>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-emerald-600" />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm text-slate-600">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  {schools.find(s => s.id === userSchoolId)?.name ?? 'Mi sede'}
                </div>
              )}
              {selectedSchool === 'global' && canViewAllSchools && (
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  ⚠️ Este comunicado será visible para todos los padres del sistema
                </p>
              )}
            </div>

            {/* TIPO */}
            <div>
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Tipo
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TYPE_CONFIG) as ComunicadoType[]).map(t => {
                  const cfg = TYPE_CONFIG[t];
                  const Icon = cfg.icon;
                  const active = selectedType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedType(t)}
                      className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                        active
                          ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm`
                          : 'border-slate-200 hover:border-slate-300 text-slate-500'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${active ? cfg.color : 'text-slate-400'}`} />
                      <div>
                        <p className={`text-xs font-bold ${active ? cfg.color : 'text-slate-700'}`}>{cfg.label}</p>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {t === 'informativo'  && 'Avisos generales del colegio'}
                          {t === 'recordatorio' && 'Fechas, eventos o tareas'}
                          {t === 'alerta'       && 'Avisos urgentes o importantes'}
                          {t === 'cobranza'     && 'Recordatorio de pagos pendientes'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DESTINATARIO */}
            <div>
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Destinatario
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTargetType('all')}
                  className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                    targetType === 'all'
                      ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <Users className={`h-4 w-4 mt-0.5 shrink-0 ${targetType === 'all' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-xs font-bold ${targetType === 'all' ? 'text-purple-700' : 'text-slate-700'}`}>Todos los padres</p>
                    <p className="text-[10px] text-slate-400">Comunicado masivo</p>
                  </div>
                </button>
                <button
                  onClick={() => setTargetType('specific')}
                  className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                    targetType === 'specific'
                      ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <User className={`h-4 w-4 mt-0.5 shrink-0 ${targetType === 'specific' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-xs font-bold ${targetType === 'specific' ? 'text-purple-700' : 'text-slate-700'}`}>Padre específico</p>
                    <p className="text-[10px] text-slate-400">Mensaje personal</p>
                  </div>
                </button>
              </div>

              {targetType === 'specific' && (
                <Select value={targetParentId} onValueChange={setTargetParentId}>
                  <SelectTrigger className="mt-2 border-2 focus:border-purple-400">
                    <SelectValue placeholder="Seleccionar padre…" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ASUNTO */}
            <div>
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                Asunto <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Ej: Recordatorio de pago de almuerzos"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="border-2 focus:border-purple-400"
              />
            </div>

            {/* MENSAJE */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Mensaje <span className="text-red-500">*</span>
                </Label>
                <span className={`text-xs font-medium ${message.length > MAX_MSG * 0.9 ? 'text-red-500' : 'text-slate-400'}`}>
                  {MAX_MSG - message.length} restantes
                </span>
              </div>
              <Textarea
                placeholder="Escribe el contenido del comunicado para los padres…"
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MAX_MSG))}
                rows={4}
                className="border-2 focus:border-purple-400 resize-none"
              />
            </div>

            {/* FECHA DE VENCIMIENTO */}
            <div>
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                <CalendarClock className="h-3.5 w-3.5 inline mr-1 text-slate-500" />
                Fecha de Vencimiento (Opcional)
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={e => setExpirationDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="border-2 focus:border-purple-400"
                />
                {expirationDate && (
                  <button
                    onClick={() => setExpirationDate('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Quitar fecha"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {expirationDate && (
                <p className="text-xs text-slate-500 mt-1">
                  El comunicado dejará de mostrarse después del {format(new Date(expirationDate + 'T23:59:59'), "d 'de' MMMM yyyy", { locale: es })}.
                </p>
              )}
            </div>

            {/* BOTÓN */}
            <Button
              onClick={handleSubmit}
              disabled={sending || !subject.trim() || !message.trim()}
              className={`w-full h-12 font-bold text-sm gap-2 ${
                editingId
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white'
              }`}
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Save className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? 'Guardando…' : editingId ? 'Guardar Cambios' : 'Enviar Comunicado'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO: Lista de comunicados enviados ──────────────────── */}
      <div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Cabecera */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <p className="font-bold text-slate-800">Comunicados enviados</p>
              <p className="text-xs text-slate-500">
                Mostrando todos los comunicados del sistema
              </p>
            </div>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Lista */}
          <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
            {loading && comunicados.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Cargando…</div>
            ) : comunicados.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 text-sm font-medium">Sin comunicados enviados</p>
                <p className="text-slate-400 text-xs mt-1">Crea el primero usando el formulario</p>
              </div>
            ) : (
              comunicados.map(c => {
                const cfg      = TYPE_CONFIG[c.type];
                const Icon     = cfg.icon;
                const expired  = isExpired(c);

                return (
                  <div
                    key={c.id}
                    className={`p-4 hover:bg-slate-50 transition-colors ${expired ? 'opacity-60' : ''}`}
                  >
                    <div className="flex gap-3">
                      {/* Icono de tipo */}
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Fila superior: asunto + menú */}
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold leading-tight ${expired ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {c.subject}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors shrink-0 -mr-1">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => handleEdit(c)}
                                className="gap-2 cursor-pointer"
                              >
                                <Edit3 className="h-4 w-4 text-amber-500" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(c.id)}
                                className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Mensaje */}
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {c.message}
                        </p>

                        {/* Badges fila inferior */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Badge className={`text-[10px] font-bold px-1.5 py-0 ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            {cfg.label}
                          </Badge>

                          {c.school_id ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                              <Building2 className="h-2.5 w-2.5" />
                              {c.school?.name ?? 'Sede'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                              <Globe className="h-2.5 w-2.5" />
                              Global (todas las sedes)
                            </Badge>
                          )}

                          {c.target_type === 'specific' && c.target_parent && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 bg-slate-50">
                              <User className="h-2.5 w-2.5" />
                              {c.target_parent.full_name}
                            </Badge>
                          )}

                          {expired ? (
                            <Badge className="text-[10px] px-1.5 py-0 bg-slate-200 text-slate-500 border-0">
                              Expirado
                            </Badge>
                          ) : c.expiration_date ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 text-amber-600 border-amber-300 bg-amber-50">
                              <CalendarClock className="h-2.5 w-2.5" />
                              Vence {format(new Date(c.expiration_date), "d MMM", { locale: es })}
                            </Badge>
                          ) : null}

                          <span className="text-[10px] text-slate-400 ml-auto">
                            Hace {formatDistanceToNow(new Date(c.created_at), { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Diálogo confirmación de borrado ───────────────────────────────── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este comunicado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El comunicado dejará de ser visible para los padres inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
