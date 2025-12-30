import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';

interface School {
  id: string;
  name: string;
  code: string;
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const { toast } = useToast();

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    dni: '',
    address: '',
    phone_1: '',
    phone_2: '',
    school_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Si ya está logueado, redirigir
  useEffect(() => {
    if (user) {
      navigate('/onboarding');
    }
  }, [user, navigate]);

  // Cargar colegios
  useEffect(() => {
    fetchSchools();
  }, []);

  // Pre-seleccionar sede del QR
  useEffect(() => {
    const sedeCode = searchParams.get('sede');
    if (sedeCode && schools.length > 0) {
      const school = schools.find(s => s.code === sedeCode);
      if (school) {
        setFormData(prev => ({ ...prev, school_id: school.id }));
      }
    }
  }, [searchParams, schools]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.includes('@')) {
      newErrors.email = 'Email inválido';
    }
    if (formData.password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (formData.full_name.trim().length < 3) {
      newErrors.full_name = 'Nombre muy corto';
    }
    if (!/^\d{8}$/.test(formData.dni)) {
      newErrors.dni = 'DNI debe tener 8 dígitos';
    }
    if (!/^9\d{8}$/.test(formData.phone_1)) {
      newErrors.phone_1 = 'Teléfono inválido (ej: 999888777)';
    }
    if (formData.phone_2 && !/^9\d{8}$/.test(formData.phone_2)) {
      newErrors.phone_2 = 'Teléfono inválido';
    }
    if (!formData.school_id) {
      newErrors.school_id = 'Selecciona un colegio';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Dirección requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;
    if (!acceptedTerms) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes aceptar los Términos y Condiciones',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await signUp(formData.email, formData.password);

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // 2. Crear perfil de padre
      const { error: profileError } = await supabase
        .from('parent_profiles')
        .insert({
          user_id: authData.user.id,
          school_id: formData.school_id,
          full_name: formData.full_name,
          dni: formData.dni,
          address: formData.address,
          phone_1: formData.phone_1,
          phone_2: formData.phone_2 || null,
          payment_responsible: true,
          onboarding_completed: false,
        });

      if (profileError) throw profileError;

      // 3. Guardar términos aceptados
      const { error: termsError } = await supabase
        .from('terms_and_conditions')
        .insert({
          user_id: authData.user.id,
          version: '1.0',
          content: 'Términos y Condiciones - Lima Café 28',
          accepted_at: new Date().toISOString(),
        });

      if (termsError) console.error('Error saving terms:', termsError);

      toast({
        title: '✅ ¡Registro Exitoso!',
        description: 'Ahora registra a tus hijos',
      });

      navigate('/onboarding');

    } catch (error: any) {
      console.error('Error registering:', error);
      toast({
        variant: 'destructive',
        title: 'Error en el Registro',
        description: error.message || 'No se pudo completar el registro',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Registro de Padres</CardTitle>
          <CardDescription className="text-blue-100">
            Lima Café 28 - Sistema de Kiosco Escolar
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <div className={`w-24 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* STEP 1: Credenciales */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">Paso 1: Crea tu Cuenta</h3>

                <div>
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tu@email.com"
                    required
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repite tu contraseña"
                    required
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button type="button" onClick={handleNextStep} className="w-full">
                  Siguiente →
                </Button>
              </div>
            )}

            {/* STEP 2: Datos Personales */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">Paso 2: Tus Datos</h3>

                <div>
                  <Label htmlFor="full_name">Nombre Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nombres y Apellidos"
                    required
                  />
                  {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
                </div>

                <div>
                  <Label htmlFor="dni">DNI *</Label>
                  <Input
                    id="dni"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                    placeholder="12345678"
                    maxLength={8}
                    required
                  />
                  {errors.dni && <p className="text-xs text-red-600 mt-1">{errors.dni}</p>}
                </div>

                <div>
                  <Label htmlFor="phone_1">Teléfono Principal *</Label>
                  <Input
                    id="phone_1"
                    value={formData.phone_1}
                    onChange={(e) => setFormData({ ...formData, phone_1: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="999888777"
                    maxLength={9}
                    required
                  />
                  {errors.phone_1 && <p className="text-xs text-red-600 mt-1">{errors.phone_1}</p>}
                </div>

                <div>
                  <Label htmlFor="phone_2">Teléfono Secundario (Opcional)</Label>
                  <Input
                    id="phone_2"
                    value={formData.phone_2}
                    onChange={(e) => setFormData({ ...formData, phone_2: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="999888666"
                    maxLength={9}
                  />
                  {errors.phone_2 && <p className="text-xs text-red-600 mt-1">{errors.phone_2}</p>}
                </div>

                <div>
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Av/Jr/Calle, Nro, Distrito"
                    required
                  />
                  {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
                </div>

                <div>
                  <Label htmlFor="school_id">Colegio/Sede *</Label>
                  <Select value={formData.school_id} onValueChange={(value) => setFormData({ ...formData, school_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el colegio" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.school_id && <p className="text-xs text-red-600 mt-1">{errors.school_id}</p>}
                </div>

                {/* Términos */}
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    Acepto los{' '}
                    <a href="/terminos" target="_blank" className="text-blue-600 underline">
                      Términos y Condiciones
                    </a>{' '}
                    y autorizo el tratamiento de mis datos personales según la Ley N° 29733.
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    ← Atrás
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <a href="/auth" className="text-blue-600 hover:underline">
              Iniciar Sesión
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

