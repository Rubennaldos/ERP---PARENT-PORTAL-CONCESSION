import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Users, CreditCard, Search, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PhysicalOrderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess: () => void;
}

interface LunchCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  price: number;
  target_type: 'students' | 'teachers';
}

interface LunchMenu {
  id: string;
  date: string;
  starter: string | null;
  main_course: string;
  beverage: string | null;
  dessert: string | null;
  category_id: string;
}

interface Person {
  id: string;
  full_name: string;
}

export function PhysicalOrderWizard({ isOpen, onClose, schoolId, onSuccess }: PhysicalOrderWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Datos del wizard
  const [targetType, setTargetType] = useState<'students' | 'teachers' | null>(null);
  const [paymentType, setPaymentType] = useState<'credit' | 'cash' | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [manualName, setManualName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LunchCategory | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<LunchMenu | null>(null);
  const [cashPaymentMethod, setCashPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'yape' | 'transferencia' | null>(null);

  // Listas
  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<LunchCategory[]>([]);
  const [menus, setMenus] = useState<LunchMenu[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleClose = () => {
    setStep(1);
    setTargetType(null);
    setPaymentType(null);
    setSelectedPerson(null);
    setManualName('');
    setSelectedCategory(null);
    setSelectedMenu(null);
    setCashPaymentMethod(null);
    setPeople([]);
    setCategories([]);
    setMenus([]);
    setSearchTerm('');
    onClose();
  };

  // Paso 2: Cargar personas
  useEffect(() => {
    if (step === 3 && paymentType === 'credit' && targetType) {
      fetchPeople();
    }
  }, [step, paymentType, targetType]);

  // Paso 4: Cargar categorías
  useEffect(() => {
    if (step === 4 && targetType) {
      fetchCategories();
    }
  }, [step, targetType]);

  // Paso 5: Cargar menús
  useEffect(() => {
    if (step === 5 && selectedCategory) {
      fetchMenus();
    }
  }, [step, selectedCategory]);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const table = targetType === 'students' ? 'students' : 'teacher_profiles';
      
      const { data, error } = await supabase
        .from(table)
        .select('id, full_name')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lunch_categories')
        .select('*')
        .eq('school_id', schoolId)
        .eq('target_type', targetType)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('lunch_menus')
        .select('*')
        .eq('school_id', schoolId)
        .eq('category_id', selectedCategory?.id)
        .gte('date', today)
        .order('date')
        .limit(7);

      if (error) throw error;
      setMenus(data || []);
    } catch (error) {
      console.error('Error fetching menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMenu || !selectedCategory) return;

    try {
      setLoading(true);

      // Crear pedido
      const orderData: any = {
        menu_id: selectedMenu.id,
        order_date: selectedMenu.date,
        status: 'confirmed',
        category_id: selectedCategory.id,
      };

      if (paymentType === 'credit') {
        if (targetType === 'students') {
          orderData.student_id = selectedPerson?.id;
        } else {
          orderData.teacher_id = selectedPerson?.id;
        }
      }

      const { error: orderError } = await supabase
        .from('lunch_orders')
        .insert([orderData]);

      if (orderError) throw orderError;

      // Crear transacción si es con crédito
      if (paymentType === 'credit' && selectedPerson && selectedCategory.price && selectedCategory.price > 0) {
        const transactionData: any = {
          type: 'purchase',
          amount: -Math.abs(selectedCategory.price),
          description: `Almuerzo - ${selectedCategory.name} - ${format(new Date(selectedMenu.date), "d 'de' MMMM", { locale: es })}`,
        };

        if (targetType === 'students') {
          transactionData.student_id = selectedPerson.id;
        } else {
          transactionData.teacher_id = selectedPerson.id;
        }

        await supabase.from('transactions').insert([transactionData]);
      }

      toast({
        title: '✅ Pedido registrado',
        description: `Almuerzo para ${paymentType === 'credit' ? selectedPerson?.full_name : manualName}`
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo registrar el pedido'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPeople = people.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nuevo Pedido de Almuerzo</DialogTitle>
        </DialogHeader>

        {/* PASO 1: ¿Para quién? */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <p className="text-center text-gray-600">¿Para quién es el pedido?</p>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`p-6 cursor-pointer hover:shadow-lg transition-all ${
                  targetType === 'students' ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => setTargetType('students')}
              >
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                  <h3 className="font-bold text-lg">Alumno</h3>
                </div>
              </Card>
              <Card
                className={`p-6 cursor-pointer hover:shadow-lg transition-all ${
                  targetType === 'teachers' ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => setTargetType('teachers')}
              >
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-purple-600" />
                  <h3 className="font-bold text-lg">Profesor</h3>
                </div>
              </Card>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)} disabled={!targetType}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* PASO 2: ¿Cómo paga? */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <p className="text-center text-gray-600">¿Cómo desea pagar?</p>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`p-6 cursor-pointer hover:shadow-lg transition-all ${
                  paymentType === 'credit' ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => setPaymentType('credit')}
              >
                <div className="text-center">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-orange-600" />
                  <h3 className="font-bold text-lg">Con Crédito</h3>
                  <p className="text-sm text-gray-500 mt-1">Se carga a su cuenta</p>
                </div>
              </Card>
              <Card
                className={`p-6 cursor-pointer hover:shadow-lg transition-all ${
                  paymentType === 'cash' ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => setPaymentType('cash')}
              >
                <div className="text-center">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-green-600" />
                  <h3 className="font-bold text-lg">Sin Crédito</h3>
                  <p className="text-sm text-gray-500 mt-1">Pago en efectivo/tarjeta</p>
                </div>
              </Card>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
              <Button onClick={() => setStep(3)} disabled={!paymentType}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* PASO 3: Seleccionar persona */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            {paymentType === 'credit' ? (
              <>
                <p className="text-center text-gray-600">Selecciona la persona</p>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : filteredPeople.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No se encontraron personas</p>
                  ) : (
                    filteredPeople.map((person) => (
                      <Card
                        key={person.id}
                        className={`p-3 cursor-pointer hover:bg-gray-50 ${
                          selectedPerson?.id === person.id ? 'ring-2 ring-green-500' : ''
                        }`}
                        onClick={() => setSelectedPerson(person)}
                      >
                        <p className="font-medium">{person.full_name}</p>
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-gray-600">Escribe el nombre</p>
                <div>
                  <Label>Nombre completo</Label>
                  <Input
                    placeholder="Ej: Juan Pérez"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </>
            )}
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={paymentType === 'credit' ? !selectedPerson : !manualName.trim()}
              >
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* PASO 4: Seleccionar categoría */}
        {step === 4 && (
          <div className="space-y-4 py-4">
            <p className="text-center text-gray-600">Selecciona el tipo de almuerzo</p>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay categorías disponibles</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className={`p-4 cursor-pointer hover:shadow-lg transition-all ${
                      selectedCategory?.id === category.id ? 'ring-2 ring-green-500' : ''
                    }`}
                    style={{ backgroundColor: `${category.color}15` }}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <h3 className="font-bold">{category.name}</h3>
                    {category.price && (
                      <p className="text-lg font-bold mt-2" style={{ color: category.color }}>
                        S/ {category.price.toFixed(2)}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
              <Button onClick={() => setStep(5)} disabled={!selectedCategory}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* PASO 5: Seleccionar menú */}
        {step === 5 && (
          <div className="space-y-4 py-4">
            <p className="text-center text-gray-600">Selecciona el día</p>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : menus.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay menús disponibles</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {menus.map((menu) => (
                  <Card
                    key={menu.id}
                    className={`p-4 cursor-pointer hover:shadow-lg transition-all ${
                      selectedMenu?.id === menu.id ? 'ring-2 ring-green-500' : ''
                    }`}
                    onClick={() => setSelectedMenu(menu)}
                  >
                    <p className="font-bold mb-2">
                      {format(new Date(menu.date + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <div className="text-sm space-y-1">
                      {menu.starter && <p>• Entrada: {menu.starter}</p>}
                      <p className="font-medium text-green-700">• Segundo: {menu.main_course}</p>
                      {menu.beverage && <p>• Bebida: {menu.beverage}</p>}
                      {menu.dessert && <p>• Postre: {menu.dessert}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
              <Button
                onClick={() => paymentType === 'cash' ? setStep(6) : handleSubmit()}
                disabled={!selectedMenu || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : paymentType === 'cash' ? (
                  <>
                    Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar Pedido
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* PASO 6: Método de pago (solo sin crédito) */}
        {step === 6 && paymentType === 'cash' && (
          <div className="space-y-4 py-4">
            <p className="text-center text-gray-600">¿Cómo pagó?</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'efectivo', label: 'Efectivo', icon: '💵' },
                { value: 'tarjeta', label: 'Tarjeta', icon: '💳' },
                { value: 'yape', label: 'Yape/Plin', icon: '📱' },
                { value: 'transferencia', label: 'Transferencia', icon: '🏦' },
              ].map((method) => (
                <Card
                  key={method.value}
                  className={`p-4 cursor-pointer hover:shadow-lg transition-all ${
                    cashPaymentMethod === method.value ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => setCashPaymentMethod(method.value as any)}
                >
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">{method.icon}</span>
                    <p className="font-medium">{method.label}</p>
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(5)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={!cashPaymentMethod || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar Pedido
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
