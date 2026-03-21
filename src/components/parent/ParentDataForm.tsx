import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, User, Phone, MapPin, UserPlus } from 'lucide-react';

interface ParentDataFormProps {
  onSuccess: () => void;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
  isEditing?: boolean;
}

export function ParentDataForm({ onSuccess, isLoading: externalLoading, setIsLoading: setExternalLoading, isEditing }: ParentDataFormProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;
  const setIsLoading = setExternalLoading || setInternalLoading;

  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState('DNI');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [resp2FullName, setResp2FullName] = useState('');
  const [resp2DocumentType, setResp2DocumentType] = useState('DNI');
  const [resp2Dni, setResp2Dni] = useState('');
  const [resp2Phone, setResp2Phone] = useState('');
  const [resp2Address, setResp2Address] = useState('');

  const [legalAcceptance, setLegalAcceptance] = useState(false);
  const [showResp2, setShowResp2] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('parent_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || '');
        setDocumentType(data.document_type || 'DNI');
        setDni(data.dni || '');
        setPhone(data.phone_1 || '');
        setAddress(data.address || '');
        const hasResp2 = !!(data.responsible_2_full_name || data.responsible_2_phone_1);
        setResp2FullName(data.responsible_2_full_name || '');
        setResp2DocumentType(data.responsible_2_document_type || 'DNI');
        setResp2Dni(data.responsible_2_dni || '');
        setResp2Phone(data.responsible_2_phone_1 || '');
        setResp2Address(data.responsible_2_address || '');
        if (hasResp2) setShowResp2(true);
      }
    };
    load();
  }, [user?.id]);

  const captureMetadata = () => {
    try {
      return {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        registrationTimestamp: new Date().toISOString(),
        isMobile: /Mobile|Android|iPhone/i.test(navigator.userAgent),
      };
    } catch { return {}; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !dni.trim() || !phone.trim() || !address.trim()) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Completa todos los campos obligatorios.' });
      return;
    }
    if (documentType === 'DNI' && !/^\d+$/.test(dni)) {
      toast({ variant: 'destructive', title: 'DNI inválido', description: 'El DNI solo debe contener números.' });
      return;
    }
    if (!/^\d+$/.test(phone)) {
      toast({ variant: 'destructive', title: 'Teléfono inválido', description: 'Solo debe contener números.' });
      return;
    }
    if (resp2Phone.trim() && resp2Phone.trim() === phone.trim()) {
      toast({ variant: 'destructive', title: 'Teléfonos repetidos', description: 'El teléfono del 2° responsable no puede ser igual al del primero.' });
      return;
    }
    if (resp2Phone.trim() && !/^\d+$/.test(resp2Phone)) {
      toast({ variant: 'destructive', title: 'Teléfono inválido', description: 'El teléfono del 2° responsable solo debe contener números.' });
      return;
    }
    if (resp2Dni.trim() && resp2DocumentType === 'DNI' && !/^\d+$/.test(resp2Dni)) {
      toast({ variant: 'destructive', title: 'DNI inválido', description: 'El DNI del 2° responsable solo debe contener números.' });
      return;
    }
    if (!isEditing && !legalAcceptance) {
      toast({ variant: 'destructive', title: 'Aceptación requerida', description: 'Debes aceptar los términos para continuar.' });
      return;
    }
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const metadata = captureMetadata();
      const payload: Record<string, any> = {
        user_id: user.id,
        full_name: fullName.trim(),
        document_type: documentType,
        dni: dni.trim(),
        phone_1: phone.trim(),
        address: address.trim(),
        responsible_2_full_name: resp2FullName.trim() || null,
        responsible_2_document_type: resp2FullName.trim() ? resp2DocumentType : null,
        responsible_2_dni: resp2Dni.trim() || null,
        responsible_2_phone_1: resp2Phone.trim() || null,
        responsible_2_address: resp2Address.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (!isEditing) {
        payload.legal_acceptance = legalAcceptance;
        payload.legal_acceptance_timestamp = new Date().toISOString();
        payload.registration_metadata = metadata;
      }
      const { error } = await supabase.from('parent_profiles').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      sessionStorage.removeItem('parentFormStep');
      toast({ title: 'Datos guardados', description: 'Tu información fue registrada correctamente.' });
      onSuccess();
    } catch (error: any) {
      let msg = 'Hubo un problema al guardar tus datos.';
      if (error?.message?.includes('value too long')) msg = 'Uno de los campos tiene demasiados caracteres.';
      else if (error?.message?.includes('duplicate')) msg = 'Ya existe un registro con estos datos.';
      else if (error?.message?.includes('fetch') || error?.message?.includes('network')) msg = 'Error de conexión. Verifica tu internet.';
      toast({ variant: 'destructive', title: 'Error', description: msg, duration: 7000 });
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = 'h-9 text-sm rounded-lg border-stone-200 bg-white';
  const labelCls = 'text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5 block';

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-stone-200/60 overflow-hidden">

      {/* Header compacto */}
      <div className="bg-gradient-to-r from-emerald-600/90 via-[#A3566E] to-[#8B4060] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm leading-tight">
            {isEditing ? 'Actualiza tus datos' : 'Registro de Responsable'}
          </p>
          {!isEditing && (
            <p className="text-white/70 text-[10px] mt-0.5">Completa para continuar</p>
          )}
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={async () => { await signOut(); }}
            className="flex items-center gap-1 text-white/60 hover:text-white text-[11px] transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">

        {/* ── RESPONSABLE PRINCIPAL ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Responsable principal</span>
            <span className="text-[9px] text-red-500 ml-1">* obligatorio</span>
          </div>

          {/* Nombre */}
          <div>
            <label className={labelCls}>Nombre completo</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Carlos Pérez"
              maxLength={255}
              className={inputCls}
              disabled={isLoading}
            />
          </div>

          {/* Doc + N° en una fila */}
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2">
              <label className={labelCls}>Tipo doc.</label>
              <Select value={documentType} onValueChange={setDocumentType} disabled={isLoading}>
                <SelectTrigger className={`${inputCls} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <label className={labelCls}>N° documento</label>
              <Input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="12345678"
                maxLength={20}
                className={inputCls}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Teléfono + Dirección en una fila */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`${labelCls} flex items-center gap-1`}>
                <Phone className="h-2.5 w-2.5" /> Teléfono
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="987654321"
                maxLength={20}
                className={inputCls}
                disabled={isLoading}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={`${labelCls} flex items-center gap-1`}>
                <MapPin className="h-2.5 w-2.5" /> Dirección
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. Principal 123"
                className={`${inputCls} ${!address.trim() ? 'border-red-300' : ''}`}
                disabled={isLoading}
              />
            </div>
          </div>
          <p className="text-[9px] text-stone-400 -mt-1">
            Dirección usada solo para correspondencia administrativa.
          </p>
        </div>

        {/* ── SEGUNDO RESPONSABLE (colapsable) ── */}
        <div className="border-t border-dashed border-stone-200 pt-2">
          <button
            type="button"
            onClick={() => setShowResp2(!showResp2)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-500 hover:text-emerald-700 transition-colors uppercase tracking-widest w-full"
          >
            <UserPlus className="h-3.5 w-3.5" />
            2° Responsable (opcional)
            <span className="ml-auto text-stone-400 normal-case font-normal">{showResp2 ? '▲ ocultar' : '▼ agregar'}</span>
          </button>

          {showResp2 && (
            <div className="space-y-2 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Nombre</label>
                  <Input
                    value={resp2FullName}
                    onChange={(e) => setResp2FullName(e.target.value)}
                    placeholder="María Elena"
                    maxLength={255}
                    className={inputCls}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <Input
                    value={resp2Phone}
                    onChange={(e) => setResp2Phone(e.target.value)}
                    placeholder="912345678"
                    maxLength={20}
                    inputMode="numeric"
                    className={`${inputCls} ${resp2Phone.trim() && resp2Phone.trim() === phone.trim() ? 'border-red-400 bg-red-50' : ''}`}
                    disabled={isLoading}
                  />
                  {resp2Phone.trim() && resp2Phone.trim() === phone.trim() && (
                    <p className="text-[9px] text-red-500 mt-0.5">No puede ser igual al del 1° responsable</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <label className={labelCls}>Tipo doc.</label>
                  <Select value={resp2DocumentType} onValueChange={setResp2DocumentType} disabled={isLoading}>
                    <SelectTrigger className={`${inputCls} w-full`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <label className={labelCls}>N° documento</label>
                  <Input
                    value={resp2Dni}
                    onChange={(e) => setResp2Dni(e.target.value)}
                    placeholder="87654321"
                    maxLength={20}
                    className={inputCls}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className={`${labelCls} flex items-center gap-1`}>
                  <MapPin className="h-2.5 w-2.5" /> Dirección (opcional)
                </label>
                <Input
                  value={resp2Address}
                  onChange={(e) => setResp2Address(e.target.value)}
                  placeholder="Av. Secundaria 456"
                  className={inputCls}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── LEGAL + BOTÓN ── */}
        <div className="border-t border-stone-200 pt-2 space-y-2">
          {!isEditing && (
            <div className="flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-lg p-2">
              <Checkbox
                id="legal"
                checked={legalAcceptance}
                onCheckedChange={(c) => setLegalAcceptance(c as boolean)}
                className="mt-0.5 shrink-0"
                disabled={isLoading}
              />
              <label htmlFor="legal" className="text-[10px] text-stone-600 leading-snug cursor-pointer">
                Acepto la cláusula de cobranza judicial y confirmo que mis datos son correctos.
                Los datos serán usados exclusivamente para gestión de pagos conforme a la Ley de Protección de Datos.
              </label>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-emerald-600/90 via-[#A3566E] to-[#8B4060] hover:from-emerald-700/90 hover:via-[#8B4060] hover:to-[#7A3755] text-white shadow-md rounded-xl"
            disabled={isLoading || (!isEditing && !legalAcceptance)}
          >
            {isLoading ? (
              <><Loader2 className="animate-spin mr-2 h-4 w-4" />Guardando...</>
            ) : (
              isEditing ? 'Guardar Cambios' : 'Confirmar y Continuar'
            )}
          </Button>
        </div>

      </form>
    </div>
  );
}
