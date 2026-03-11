import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, MapPin } from 'lucide-react';

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

  // Responsable principal
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState('DNI');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Segundo responsable (opcional)
  const [resp2FullName, setResp2FullName] = useState('');
  const [resp2DocumentType, setResp2DocumentType] = useState('DNI');
  const [resp2Dni, setResp2Dni] = useState('');
  const [resp2Phone, setResp2Phone] = useState('');
  const [resp2Address, setResp2Address] = useState('');

  // Legal
  const [legalAcceptance, setLegalAcceptance] = useState(false);

  // Cargar datos existentes
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
        setResp2FullName(data.responsible_2_full_name || '');
        setResp2DocumentType(data.responsible_2_document_type || 'DNI');
        setResp2Dni(data.responsible_2_dni || '');
        setResp2Phone(data.responsible_2_phone_1 || '');
        setResp2Address(data.responsible_2_address || '');
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
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !dni.trim() || !phone.trim() || !address.trim()) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Completa todos los campos obligatorios del responsable principal.' });
      return;
    }

    if (documentType === 'DNI' && !/^\d+$/.test(dni)) {
      toast({ variant: 'destructive', title: 'DNI inválido', description: 'El DNI solo debe contener números.' });
      return;
    }

    if (!/^\d+$/.test(phone)) {
      toast({ variant: 'destructive', title: 'Teléfono inválido', description: 'El teléfono solo debe contener números.' });
      return;
    }

    if (resp2Phone.trim() && resp2Phone.trim() === phone.trim()) {
      toast({ variant: 'destructive', title: 'Teléfonos repetidos', description: 'El teléfono del segundo responsable no puede ser igual al del primero.' });
      return;
    }

    if (resp2Phone.trim() && !/^\d+$/.test(resp2Phone)) {
      toast({ variant: 'destructive', title: 'Teléfono inválido', description: 'El teléfono del segundo responsable solo debe contener números.' });
      return;
    }

    if (resp2Dni.trim() && resp2DocumentType === 'DNI' && !/^\d+$/.test(resp2Dni)) {
      toast({ variant: 'destructive', title: 'DNI inválido', description: 'El DNI del segundo responsable solo debe contener números.' });
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

      const { error } = await supabase
        .from('parent_profiles')
        .upsert(payload, { onConflict: 'user_id' });

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

  const requiredMark = <span className="text-red-500 text-[10px] ml-0.5">obligatorio</span>;

  return (
    <Card className="w-full shadow-xl border border-stone-200/50 bg-white relative">
      <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
        {!isEditing && (
          <div className="absolute top-3 right-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => { await signOut(); }}
              className="text-stone-400 hover:text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Salir
            </Button>
          </div>
        )}
        <CardTitle className="text-base sm:text-lg font-semibold text-stone-800 text-center">
          {isEditing ? 'Actualiza tus datos' : 'Completa tus datos para continuar'}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-4">
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* --- RESPONSABLE PRINCIPAL --- */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Responsable Principal</p>

            <div className="space-y-1">
              <Label className="text-[10px] text-stone-500 uppercase tracking-wider">
                Nombre completo {requiredMark}
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Carlos Pérez"
                maxLength={255}
                className="h-9 text-sm rounded-lg border-stone-200"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] text-stone-500 uppercase tracking-wider">Doc. {requiredMark}</Label>
                <Select value={documentType} onValueChange={setDocumentType} disabled={isLoading}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-stone-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-[10px] text-stone-500 uppercase tracking-wider">N° Documento {requiredMark}</Label>
                <Input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="12345678"
                  maxLength={20}
                  className="h-9 text-sm rounded-lg border-stone-200"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-stone-500 uppercase tracking-wider">Teléfono {requiredMark}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="987654321"
                maxLength={20}
                className="h-9 text-sm rounded-lg border-stone-200"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Dirección {requiredMark}
              </Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. Principal 123, Distrito, Lima"
                className={`h-9 text-sm rounded-lg ${!address.trim() ? 'border-red-300' : 'border-stone-200'}`}
                disabled={isLoading}
              />
              <p className="text-[9px] text-stone-400 leading-tight">
                Utilizada exclusivamente para correspondencia administrativa en caso de cuentas pendientes.
              </p>
            </div>
          </div>

          {/* --- SEPARADOR --- */}
          <div className="border-t border-dashed border-stone-200 pt-2" />

          {/* --- SEGUNDO RESPONSABLE (OPCIONAL) --- */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              Segundo Responsable <span className="text-stone-400 normal-case font-normal">(opcional)</span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-stone-500 uppercase tracking-wider">Nombre</Label>
                <Input
                  value={resp2FullName}
                  onChange={(e) => setResp2FullName(e.target.value)}
                  placeholder="María Elena"
                  maxLength={255}
                  className="h-9 text-sm rounded-lg border-stone-200"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-stone-500 uppercase tracking-wider">Teléfono</Label>
                <Input
                  value={resp2Phone}
                  onChange={(e) => setResp2Phone(e.target.value)}
                  placeholder="912345678"
                  maxLength={20}
                  className={`h-9 text-sm rounded-lg ${resp2Phone.trim() && resp2Phone.trim() === phone.trim() ? 'border-red-400 bg-red-50' : 'border-stone-200'}`}
                  disabled={isLoading}
                />
                {resp2Phone.trim() && resp2Phone.trim() === phone.trim() && (
                  <p className="text-[9px] text-red-500">No puede ser igual al del primer responsable</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] text-stone-500 uppercase tracking-wider">Doc.</Label>
                <Select value={resp2DocumentType} onValueChange={setResp2DocumentType} disabled={isLoading}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-stone-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-[10px] text-stone-500 uppercase tracking-wider">N° Documento</Label>
                <Input
                  value={resp2Dni}
                  onChange={(e) => setResp2Dni(e.target.value)}
                  placeholder="87654321"
                  maxLength={20}
                  className="h-9 text-sm rounded-lg border-stone-200"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Dirección <span className="text-stone-400 normal-case font-normal">(opcional)</span>
              </Label>
              <Input
                value={resp2Address}
                onChange={(e) => setResp2Address(e.target.value)}
                placeholder="Av. Secundaria 456"
                className="h-9 text-sm rounded-lg border-stone-200"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* --- LEGAL + SUBMIT --- */}
          <div className="border-t border-stone-200 pt-2 space-y-2">
            {!isEditing && (
              <div className="flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-lg p-2.5">
                <Checkbox
                  id="legal"
                  checked={legalAcceptance}
                  onCheckedChange={(c) => setLegalAcceptance(c as boolean)}
                  className="mt-0.5"
                  disabled={isLoading}
                />
                <label htmlFor="legal" className="text-[10px] sm:text-[11px] text-stone-600 leading-snug cursor-pointer">
                  Acepto la cláusula de cobranza judicial y confirmo que mis datos son correctos. Los datos serán usados
                  exclusivamente para gestión de pagos conforme a la Ley de Protección de Datos.
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium bg-gradient-to-r from-emerald-600/90 via-[#A3566E] to-[#8B4060] hover:from-emerald-700/90 hover:via-[#8B4060] hover:to-[#7A3755] text-white shadow-md rounded-xl"
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
      </CardContent>
    </Card>
  );
}
