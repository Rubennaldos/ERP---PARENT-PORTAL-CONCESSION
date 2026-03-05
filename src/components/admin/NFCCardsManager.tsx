import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  Plus,
  Search,
  Smartphone,
  User,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface NFCCardsManagerProps {
  schoolId: string | null;
}

interface NFCCard {
  id: string;
  card_uid: string;
  card_number: string | null;
  holder_type: 'student' | 'teacher' | null;
  student_id: string | null;
  teacher_id: string | null;
  school_id: string;
  is_active: boolean;
  notes: string | null;
  assigned_at: string | null;
  created_at: string;
  // Joined fields
  student_name?: string;
  student_grade?: string;
  student_section?: string;
  teacher_name?: string;
  school_name?: string;
}

interface School {
  id: string;
  name: string;
}

interface HolderOption {
  id: string;
  full_name: string;
  grade?: string;
  section?: string;
  school_id?: string;
}

export function NFCCardsManager({ schoolId }: NFCCardsManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // ── Estado general ──
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [filterSchoolId, setFilterSchoolId] = useState<string>(schoolId || 'all');
  const [searchText, setSearchText] = useState('');

  // ── Modal de asignación ──
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingCard, setEditingCard] = useState<NFCCard | null>(null);

  // ── Campos del modal ──
  const [scannedUID, setScannedUID] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [holderType, setHolderType] = useState<'student' | 'teacher'>('student');
  const [holderSearch, setHolderSearch] = useState('');
  const [holderResults, setHolderResults] = useState<HolderOption[]>([]);
  const [selectedHolder, setSelectedHolder] = useState<HolderOption | null>(null);
  const [modalSchoolId, setModalSchoolId] = useState<string>(schoolId || '');
  const [cardNotes, setCardNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ── NFC Scanner Refs ──
  const nfcBuffer = useRef('');
  const nfcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyTime = useRef<number>(0);
  const [scanWaiting, setScanWaiting] = useState(false);

  // ══════════════════════════════════════════════════
  // Cargar datos
  // ══════════════════════════════════════════════════
  useEffect(() => {
    loadCards();
    loadSchools();
  }, [filterSchoolId]);

  const loadCards = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('nfc_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterSchoolId && filterSchoolId !== 'all') {
        query = query.eq('school_id', filterSchoolId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enriquecer con nombres
      const enriched: NFCCard[] = [];
      for (const card of data || []) {
        const enrichedCard: NFCCard = { ...card };

        if (card.student_id) {
          const { data: s } = await supabase
            .from('students')
            .select('full_name, grade, section')
            .eq('id', card.student_id)
            .maybeSingle();
          if (s) {
            enrichedCard.student_name = s.full_name;
            enrichedCard.student_grade = s.grade;
            enrichedCard.student_section = s.section;
          }
        }

        if (card.teacher_id) {
          const { data: t } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', card.teacher_id)
            .maybeSingle();
          if (t) enrichedCard.teacher_name = t.full_name;
        }

        // Nombre de sede
        const { data: sch } = await supabase
          .from('schools')
          .select('name')
          .eq('id', card.school_id)
          .maybeSingle();
        if (sch) enrichedCard.school_name = sch.name;

        enriched.push(enrichedCard);
      }

      setCards(enriched);
    } catch (err: any) {
      console.error('Error loading NFC cards:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name');
    setSchools(data || []);
  };

  // ══════════════════════════════════════════════════
  // NFC Listener global (solo cuando el modal esta abierto)
  // ══════════════════════════════════════════════════
  useEffect(() => {
    if (!showAssignModal) return;
    nfcBuffer.current = '';

    const handleKey = (e: KeyboardEvent) => {
      if (!scanWaiting) return;

      const now = Date.now();
      const timeSinceLast = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        const uid = nfcBuffer.current.trim();
        nfcBuffer.current = '';
        if (nfcTimer.current) clearTimeout(nfcTimer.current);

        if (uid.length >= 4 && timeSinceLast < 200) {
          setScannedUID(uid.toUpperCase());
          setScanWaiting(false);
          toast({ title: '✅ Tarjeta detectada', description: `UID: ${uid.toUpperCase()}` });
        }
        return;
      }

      if (e.key.length === 1) {
        if (timeSinceLast < 80 || nfcBuffer.current.length === 0) {
          nfcBuffer.current += e.key;
          if (nfcTimer.current) clearTimeout(nfcTimer.current);
          nfcTimer.current = setTimeout(() => { nfcBuffer.current = ''; }, 200);
        }
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => {
      window.removeEventListener('keydown', handleKey, true);
      if (nfcTimer.current) clearTimeout(nfcTimer.current);
    };
  }, [showAssignModal, scanWaiting]);

  // ══════════════════════════════════════════════════
  // Buscar titulares (alumnos o profesores)
  // ══════════════════════════════════════════════════
  useEffect(() => {
    if (holderSearch.trim().length < 2) {
      setHolderResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (holderType === 'student') {
          let q = supabase
            .from('students')
            .select('id, full_name, grade, section, school_id')
            .ilike('full_name', `%${holderSearch}%`)
            .limit(8);

          if (modalSchoolId) q = q.eq('school_id', modalSchoolId);

          const { data } = await q;
          setHolderResults(data || []);
        } else {
          // Profesores
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, school_id')
            .ilike('full_name', `%${holderSearch}%`)
            .in('role', ['teacher', 'profesor'])
            .limit(8);

          setHolderResults(data || []);
        }
      } catch (err) {
        console.error('Error searching holders:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [holderSearch, holderType, modalSchoolId]);

  // ══════════════════════════════════════════════════
  // Abrir modal para nueva tarjeta
  // ══════════════════════════════════════════════════
  const openNewCardModal = () => {
    setEditingCard(null);
    setScannedUID('');
    setCardNumber('');
    setHolderType('student');
    setHolderSearch('');
    setHolderResults([]);
    setSelectedHolder(null);
    setModalSchoolId(schoolId || (schools.length === 1 ? schools[0].id : ''));
    setCardNotes('');
    setScanWaiting(true);
    setShowAssignModal(true);
  };

  // ══════════════════════════════════════════════════
  // Abrir modal para editar tarjeta
  // ══════════════════════════════════════════════════
  const openEditCardModal = (card: NFCCard) => {
    setEditingCard(card);
    setScannedUID(card.card_uid);
    setCardNumber(card.card_number || '');
    setHolderType(card.holder_type || 'student');
    setModalSchoolId(card.school_id);
    setCardNotes(card.notes || '');
    setScanWaiting(false);

    if (card.holder_type === 'student' && card.student_name) {
      setSelectedHolder({
        id: card.student_id!,
        full_name: card.student_name,
        grade: card.student_grade,
        section: card.student_section,
      });
      setHolderSearch(card.student_name);
    } else if (card.holder_type === 'teacher' && card.teacher_name) {
      setSelectedHolder({
        id: card.teacher_id!,
        full_name: card.teacher_name,
      });
      setHolderSearch(card.teacher_name);
    } else {
      setSelectedHolder(null);
      setHolderSearch('');
    }

    setHolderResults([]);
    setShowAssignModal(true);
  };

  // ══════════════════════════════════════════════════
  // Guardar tarjeta (crear o editar)
  // ══════════════════════════════════════════════════
  const handleSaveCard = async () => {
    if (!scannedUID.trim()) {
      toast({ variant: 'destructive', title: 'Falta el UID', description: 'Pasa la tarjeta por el lector o escribe el UID manualmente.' });
      return;
    }
    if (!selectedHolder) {
      toast({ variant: 'destructive', title: 'Falta el titular', description: 'Busca y selecciona un alumno o profesor.' });
      return;
    }
    if (!modalSchoolId) {
      toast({ variant: 'destructive', title: 'Falta la sede', description: 'Selecciona una sede.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        card_uid: scannedUID.trim().toUpperCase(),
        card_number: cardNumber.trim() || null,
        holder_type: holderType,
        student_id: holderType === 'student' ? selectedHolder.id : null,
        teacher_id: holderType === 'teacher' ? selectedHolder.id : null,
        school_id: modalSchoolId,
        is_active: true,
        notes: cardNotes.trim() || null,
        assigned_at: new Date().toISOString(),
        assigned_by: user?.id ?? null,
      };

      if (editingCard) {
        // Editar
        const { error } = await supabase
          .from('nfc_cards')
          .update(payload)
          .eq('id', editingCard.id);
        if (error) throw error;
        toast({ title: '✅ Tarjeta actualizada' });
      } else {
        // Crear
        const { error } = await supabase
          .from('nfc_cards')
          .insert(payload);
        if (error) {
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            toast({ variant: 'destructive', title: 'UID duplicado', description: 'Esta tarjeta ya está registrada en el sistema.' });
            return;
          }
          throw error;
        }
        toast({ title: '✅ Tarjeta registrada correctamente' });
      }

      setShowAssignModal(false);
      loadCards();
    } catch (err: any) {
      console.error('Error saving NFC card:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════
  // Activar/Desactivar tarjeta
  // ══════════════════════════════════════════════════
  const toggleCardActive = async (card: NFCCard) => {
    try {
      const { error } = await supabase
        .from('nfc_cards')
        .update({ is_active: !card.is_active })
        .eq('id', card.id);
      if (error) throw error;
      toast({ title: card.is_active ? '🔴 Tarjeta desactivada' : '🟢 Tarjeta activada' });
      loadCards();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // ══════════════════════════════════════════════════
  // Eliminar tarjeta
  // ══════════════════════════════════════════════════
  const deleteCard = async (card: NFCCard) => {
    if (!confirm(`¿Eliminar tarjeta ${card.card_number || card.card_uid}?`)) return;
    try {
      const { error } = await supabase.from('nfc_cards').delete().eq('id', card.id);
      if (error) throw error;
      toast({ title: '🗑️ Tarjeta eliminada' });
      loadCards();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // ══════════════════════════════════════════════════
  // Filtrar tarjetas por texto de búsqueda
  // ══════════════════════════════════════════════════
  const filteredCards = cards.filter(c => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      c.card_uid.toLowerCase().includes(q) ||
      (c.card_number || '').toLowerCase().includes(q) ||
      (c.student_name || '').toLowerCase().includes(q) ||
      (c.teacher_name || '').toLowerCase().includes(q) ||
      (c.school_name || '').toLowerCase().includes(q)
    );
  });

  // ══════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════
  return (
    <Card className="border-2 border-[#9E4D68]/20">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-5 w-5 text-[#9E4D68]" />
            Tarjetas NFC
            <Badge variant="secondary" className="ml-2">{cards.length}</Badge>
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCards}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              size="sm"
              onClick={openNewCardModal}
              className="bg-[#9E4D68] hover:bg-[#8B4159] text-white flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-1" />
              Registrar Tarjeta
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          {!schoolId && (
            <Select value={filterSchoolId} onValueChange={setFilterSchoolId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sedes</SelectItem>
                {schools.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, UID o número..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#9E4D68]" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {cards.length === 0 ? 'No hay tarjetas registradas' : 'No se encontraron resultados'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {cards.length === 0 ? 'Haz clic en "Registrar Tarjeta" para empezar' : 'Intenta con otra búsqueda'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCards.map(card => (
              <div
                key={card.id}
                className={`p-3 sm:p-4 border-2 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-all ${
                  card.is_active ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50/50 opacity-70'
                }`}
              >
                {/* Icono */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  card.is_active ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {card.holder_type === 'student' ? (
                    <User className={`h-5 w-5 ${card.is_active ? 'text-emerald-600' : 'text-red-500'}`} />
                  ) : card.holder_type === 'teacher' ? (
                    <Users className={`h-5 w-5 ${card.is_active ? 'text-purple-600' : 'text-red-500'}`} />
                  ) : (
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base truncate">
                    {card.student_name || card.teacher_name || 'Sin asignar'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {card.card_number && (
                      <Badge variant="outline" className="text-[10px]">#{card.card_number}</Badge>
                    )}
                    {card.holder_type === 'student' && card.student_grade && (
                      <Badge variant="secondary" className="text-[10px]">{card.student_grade} - {card.student_section}</Badge>
                    )}
                    {card.holder_type && (
                      <Badge className={`text-[10px] ${card.holder_type === 'student' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {card.holder_type === 'student' ? 'Alumno' : 'Profesor'}
                      </Badge>
                    )}
                    {card.school_name && !schoolId && (
                      <Badge variant="outline" className="text-[10px]">{card.school_name}</Badge>
                    )}
                    <Badge className={`text-[10px] ${card.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {card.is_active ? '✓ Activa' : '✗ Inactiva'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">UID: {card.card_uid}</p>
                </div>

                {/* Acciones */}
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEditCardModal(card)} title="Editar">
                    <Edit3 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCardActive(card)}
                    title={card.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {card.is_active ? (
                      <XCircle className="h-4 w-4 text-orange-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteCard(card)} title="Eliminar">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ══════════════════════════════════════════════════
          MODAL: Registrar / Editar Tarjeta
         ══════════════════════════════════════════════════ */}
      <Dialog open={showAssignModal} onOpenChange={(open) => {
        setShowAssignModal(open);
        if (!open) setScanWaiting(false);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#9E4D68]" />
              {editingCard ? 'Editar Tarjeta' : 'Registrar Tarjeta NFC'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 1. Escaneo de tarjeta */}
            <div>
              <Label className="text-xs font-bold uppercase text-gray-600 mb-2 block">
                1. UID de la Tarjeta
              </Label>
              {!scannedUID ? (
                <div
                  className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                    scanWaiting
                      ? 'border-blue-400 bg-blue-50 animate-pulse'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400'
                  }`}
                  onClick={() => setScanWaiting(true)}
                >
                  <Smartphone className={`h-10 w-10 mx-auto mb-2 ${scanWaiting ? 'text-blue-500' : 'text-gray-400'}`} />
                  <p className={`font-bold text-sm ${scanWaiting ? 'text-blue-700' : 'text-gray-600'}`}>
                    {scanWaiting ? '📡 Esperando tarjeta...' : 'Haz clic y pasa la tarjeta por el lector'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {scanWaiting ? 'Acerca la tarjeta al lector USB' : 'O escribe el UID manualmente abajo'}
                  </p>
                </div>
              ) : (
                <div className="p-4 border-2 border-green-300 bg-green-50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-bold text-green-800 text-sm">Tarjeta detectada</p>
                      <p className="font-mono text-green-700 text-xs">{scannedUID}</p>
                    </div>
                  </div>
                  {!editingCard && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setScannedUID(''); setScanWaiting(true); }}
                      className="text-green-700"
                    >
                      Cambiar
                    </Button>
                  )}
                </div>
              )}

              {/* Input manual */}
              {!scannedUID && (
                <div className="mt-2">
                  <Input
                    placeholder="O escribe el UID manualmente..."
                    value={scannedUID}
                    onChange={e => setScannedUID(e.target.value.toUpperCase())}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>

            {/* 2. Numero de tarjeta (visual) */}
            <div>
              <Label className="text-xs font-bold uppercase text-gray-600 mb-1 block">
                2. Número de Tarjeta (impreso en la tarjeta)
              </Label>
              <Input
                placeholder="Ej: 001, 042..."
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* 3. Sede */}
            {!schoolId && (
              <div>
                <Label className="text-xs font-bold uppercase text-gray-600 mb-1 block">
                  3. Sede
                </Label>
                <Select value={modalSchoolId} onValueChange={setModalSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 4. Tipo de titular */}
            <div>
              <Label className="text-xs font-bold uppercase text-gray-600 mb-2 block">
                {schoolId ? '3' : '4'}. Tipo de Titular
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setHolderType('student'); setSelectedHolder(null); setHolderSearch(''); setHolderResults([]); }}
                  className={`p-3 border-2 rounded-xl flex items-center gap-2 transition-all ${
                    holderType === 'student' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <User className={`h-5 w-5 ${holderType === 'student' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-bold ${holderType === 'student' ? 'text-blue-700' : 'text-gray-600'}`}>Alumno</span>
                </button>
                <button
                  onClick={() => { setHolderType('teacher'); setSelectedHolder(null); setHolderSearch(''); setHolderResults([]); }}
                  className={`p-3 border-2 rounded-xl flex items-center gap-2 transition-all ${
                    holderType === 'teacher' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  <Users className={`h-5 w-5 ${holderType === 'teacher' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-bold ${holderType === 'teacher' ? 'text-purple-700' : 'text-gray-600'}`}>Profesor</span>
                </button>
              </div>
            </div>

            {/* 5. Buscar titular */}
            <div>
              <Label className="text-xs font-bold uppercase text-gray-600 mb-1 block">
                {schoolId ? '4' : '5'}. Buscar {holderType === 'student' ? 'Alumno' : 'Profesor'}
              </Label>

              {selectedHolder ? (
                <div className="p-3 border-2 border-green-300 bg-green-50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-bold text-sm text-green-800">{selectedHolder.full_name}</p>
                      {selectedHolder.grade && (
                        <p className="text-xs text-green-600">{selectedHolder.grade} - {selectedHolder.section}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedHolder(null); setHolderSearch(''); }}
                    className="text-green-700"
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={`Buscar ${holderType === 'student' ? 'alumno' : 'profesor'} por nombre...`}
                      value={holderSearch}
                      onChange={e => setHolderSearch(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                  {holderResults.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1 border rounded-lg p-1">
                      {holderResults.map(h => (
                        <button
                          key={h.id}
                          onClick={() => { setSelectedHolder(h); setHolderSearch(h.full_name); setHolderResults([]); }}
                          className="w-full text-left p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <p className="font-bold text-sm">{h.full_name}</p>
                          {h.grade && <p className="text-xs text-gray-500">{h.grade} - {h.section}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 6. Notas */}
            <div>
              <Label className="text-xs font-bold uppercase text-gray-600 mb-1 block">
                Notas (opcional)
              </Label>
              <Input
                placeholder="Observaciones..."
                value={cardNotes}
                onChange={e => setCardNotes(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCard}
                disabled={saving || !scannedUID || !selectedHolder}
                className="flex-1 bg-[#9E4D68] hover:bg-[#8B4159] text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingCard ? 'Guardar Cambios' : 'Registrar Tarjeta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
