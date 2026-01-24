import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, MapPin, Phone, FileText, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ParentDataFormProps {
  onSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function ParentDataForm({ onSuccess, isLoading, setIsLoading }: ParentDataFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Datos de tracking (captura silenciosa)
  const [browserInfo, setBrowserInfo] = useState('');
  const [osInfo, setOsInfo] = useState('');
  const [screenResolution, setScreenResolution] = useState('');
  const [timezone, setTimezone] = useState('');
  const [language, setLanguage] = useState('');
  const [registrationIp, setRegistrationIp] = useState('');

  useEffect(() => {
    // Capturar información del navegador y sistema operativo
    setBrowserInfo(navigator.userAgent);
    setOsInfo(navigator.platform);
    setScreenResolution(`${window.screen.width}x${window.screen.height}`);
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setLanguage(navigator.language);

    // Capturar IP (requiere un servicio externo)
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setRegistrationIp(data.ip);
      } catch (error) {
        console.error('Error fetching IP:', error);
        setRegistrationIp('N/A');
      }
    };
    fetchIp();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Usuario no autenticado.' });
      setIsLoading(false);
      return;
    }

    if (!firstName || !lastName || !documentType || !documentNumber || !phone || !address) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, completa todos los campos obligatorios.' });
      setIsLoading(false);
      return;
    }

    try {
      const fullName = `${firstName} ${lastName}`;

      // Actualizar parent_profiles
      const { error: parentProfileError } = await supabase
        .from('parent_profiles')
        .update({
          full_name: fullName,
          dni: documentNumber,
          phone_1: phone,
          address: address,
          document_type: documentType,
          document_number: documentNumber,
          browser_info: browserInfo,
          os_info: osInfo,
          screen_resolution: screenResolution,
          timezone: timezone,
          language: language,
          registration_ip: registrationIp,
          registration_timestamp: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (parentProfileError) throw parentProfileError;

      // Actualizar profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_1: phone,
          address: address,
          document_type: documentType,
          document_number: documentNumber,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({ title: '✅ Datos guardados', description: 'Tu información ha sido actualizada.' });
      onSuccess();
    } catch (error: any) {
      console.error('Error al guardar datos del padre:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudieron guardar tus datos.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl border-t-4 border-t-brand-teal rounded-2xl bg-white">
      <CardHeader className="text-center space-y-2 pb-4">
        <div className="flex justify-center mb-2">
          <div className="bg-brand-teal/10 p-3 rounded-full">
            <User className="h-8 w-8 text-brand-teal" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          Datos del Responsable
        </CardTitle>
        <CardDescription className="text-muted-foreground font-medium">
          Necesitamos tu información para gestionar la cuenta de tus hijos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="font-bold text-xs uppercase tracking-wider text-gray-500 ml-1">Nombres</Label>
              <Input 
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej: Juan Carlos"
                className="h-12 border-2 focus:border-brand-teal font-medium"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="font-bold text-xs uppercase tracking-wider text-gray-500 ml-1">Apellidos</Label>
              <Input 
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej: Pérez García"
                className="h-12 border-2 focus:border-brand-teal font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="documentType" className="font-bold text-xs uppercase tracking-wider text-gray-500 ml-1">Tipo de Documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="h-12 border-2 focus:border-brand-teal font-medium">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  <SelectItem value="Carnet de Extranjería">Carnet de Extranjería</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="documentNumber" className="font-bold text-xs uppercase tracking-wider text-gray-500 ml-1">Número de Documento</Label>
              <Input 
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ej: 12345678"
                className="h-12 border-2 focus:border-brand-teal font-medium"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone" className="font-bold text-xs uppercase tracking-wider text-gray-500 ml-1">Teléfono de Contacto</Label>
            <Input 
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: +51 987 654 321"
              className="h-12 border-2 focus:border-brand-teal font-medium"
              required
            />
          </div>

          <div>
            <Label htmlFor="address" className="font-bold text-xs uppercase tracking-wider text-gray-500 ml-1">Dirección Completa</Label>
            <Input 
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. La Molina 123, Urb. Santa Patricia, Lima"
              className="h-12 border-2 focus:border-brand-teal font-medium"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-800">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              Para tu seguridad y la de tus hijos, recopilamos información básica de tu dispositivo y conexión.
            </span>
          </div>

          <div className="flex justify-between gap-4 pt-2">
            <Button 
              type="submit" 
              className="h-14 text-lg font-bold bg-brand-teal hover:bg-brand-teal/90 text-white shadow-lg rounded-xl w-full" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Guardar y Continuar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
