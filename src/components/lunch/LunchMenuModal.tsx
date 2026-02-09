import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface School {
  id: string;
  name: string;
  color?: string;
}

interface LunchMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuId?: string | null;
  initialDate?: Date;
  schools: School[];
  userSchoolId?: string | null;
  onSuccess: () => void;
  preSelectedCategoryId?: string; // Nueva prop desde wizard
  preSelectedTargetType?: 'students' | 'teachers'; // Nueva prop desde wizard
  preSelectedCategoryName?: string; // Nueva prop desde wizard
}

export const LunchMenuModal = ({
  isOpen,
  onClose,
  menuId,
  initialDate,
  schools,
  userSchoolId,
  onSuccess,
  preSelectedCategoryId,
  preSelectedTargetType,
  preSelectedCategoryName,
}: LunchMenuModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [isKitchenProduct, setIsKitchenProduct] = useState(false);
  const [formData, setFormData] = useState({
    school_id: userSchoolId || '',
    date: initialDate ? initialDate.toISOString().split('T')[0] : '',
    starter: '',
    main_course: '',
    beverage: '',
    dessert: '',
    notes: '',
    category_id: preSelectedCategoryId || '',
    target_type: preSelectedTargetType || 'students',
    // Campos para productos de cocina
    product_name: '',
    product_price: '',
  });

  // Cargar datos del menú si es edición o inicializar formulario para creación
  useEffect(() => {
    if (!isOpen) return;
    
    if (menuId) {
      // Modo edición: cargar datos del menú
      loadMenuData();
    } else {
      // Modo creación: resetear formulario con datos del wizard
      console.log('🎨 Inicializando nuevo menú con datos del wizard:', {
        preSelectedCategoryId,
        preSelectedTargetType,
        preSelectedCategoryName
      });
      
      setFormData({
        school_id: userSchoolId || '',
        date: initialDate ? initialDate.toISOString().split('T')[0] : '',
        starter: '',
        main_course: '',
        beverage: '',
        dessert: '',
        notes: '',
        category_id: preSelectedCategoryId || '',
        target_type: preSelectedTargetType || 'students',
        product_name: '',
        product_price: '',
      });
      
      // Verificar si es una categoría de venta de cocina
      if (preSelectedCategoryId) {
        checkIfKitchenCategory(preSelectedCategoryId);
      }
    }
  }, [menuId, isOpen, preSelectedCategoryId]);

  const checkIfKitchenCategory = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('lunch_categories')
        .select('is_kitchen_sale')
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      setIsKitchenProduct(data?.is_kitchen_sale === true);
    } catch (error) {
      console.error('Error checking category type:', error);
      setIsKitchenProduct(false);
    }
  };

  const loadMenuData = async () => {
    if (!menuId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lunch_menus')
        .select('*')
        .eq('id', menuId)
        .single();

      if (error) throw error;

      setFormData({
        school_id: data.school_id,
        date: data.date,
        starter: data.starter || '',
        main_course: data.main_course || '',
        beverage: data.beverage || '',
        dessert: data.dessert || '',
        notes: data.notes || '',
        category_id: data.category_id || '',
        target_type: data.target_type || 'students',
      });
    } catch (error) {
      console.error('Error loading menu:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el menú',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación diferente según el tipo
    if (isKitchenProduct) {
      // Para productos de cocina: nombre y precio obligatorios
      if (!formData.school_id || !formData.date || !formData.product_name.trim() || !formData.product_price) {
        toast({
          title: 'Campos incompletos',
          description: 'Por favor completa la sede, fecha, nombre del producto y precio',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Para menús normales: segundo plato obligatorio
      if (!formData.school_id || !formData.date || !formData.main_course.trim()) {
        toast({
          title: 'Campos incompletos',
          description: 'Por favor completa la sede, fecha y segundo plato',
          variant: 'destructive',
        });
        return;
      }
    }

    console.log('📝 FormData al guardar:', formData);

    setLoading(true);
    try {
      // 1. Guardar platos en la librería para futuro autocomplete (solo si NO es producto de cocina)
      if (!isKitchenProduct) {
        const libraryPromises = [
          supabase.rpc('upsert_lunch_item', { p_type: 'entrada', p_name: formData.starter.trim() }),
          supabase.rpc('upsert_lunch_item', { p_type: 'segundo', p_name: formData.main_course.trim() }),
          supabase.rpc('upsert_lunch_item', { p_type: 'bebida', p_name: formData.beverage.trim() }),
          supabase.rpc('upsert_lunch_item', { p_type: 'postre', p_name: formData.dessert.trim() }),
        ];
        await Promise.all(libraryPromises);
      }

      // 2. Guardar el menú/producto
      const payload: any = {
        school_id: formData.school_id,
        date: formData.date,
        created_by: user?.id,
      };

      if (isKitchenProduct) {
        // Es un producto de cocina
        payload.is_kitchen_product = true;
        payload.product_name = formData.product_name.trim();
        payload.product_price = parseFloat(formData.product_price);
        payload.main_course = formData.product_name.trim(); // Por compatibilidad
        payload.starter = null;
        payload.beverage = null;
        payload.dessert = null;
        payload.notes = formData.notes.trim() || null;
      } else {
        // Es un menú normal
        payload.is_kitchen_product = false;
        payload.starter = formData.starter.trim() || null;
        payload.main_course = formData.main_course.trim();
        payload.beverage = formData.beverage.trim() || null;
        payload.dessert = formData.dessert.trim() || null;
        payload.notes = formData.notes.trim() || null;
        payload.product_name = null;
        payload.product_price = null;
      }

      // Agregar category_id y target_type (convertir string vacío a null)
      if (formData.category_id && formData.category_id.trim() !== '') {
        payload.category_id = formData.category_id;
        payload.target_type = formData.target_type || 'students';
      } else {
        // Si no hay categoría, asegurarse de que sean null explícitamente
        payload.category_id = null;
        payload.target_type = 'students';
      }

      if (menuId) {
        // Actualizar
        const { error } = await supabase
          .from('lunch_menus')
          .update(payload)
          .eq('id', menuId);

        if (error) throw error;

        toast({
          title: isKitchenProduct ? 'Producto actualizado' : 'Menú actualizado',
          description: isKitchenProduct ? 'El producto se actualizó correctamente' : 'El menú se actualizó correctamente',
        });
      } else {
        // Crear
        const { error } = await supabase
          .from('lunch_menus')
          .insert([payload]);

        if (error) throw error;

        toast({
          title: isKitchenProduct ? 'Producto creado' : 'Menú creado',
          description: isKitchenProduct ? 'El producto se creó correctamente' : 'El menú se creó correctamente',
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving menu:', error);
      
      let errorMessage = isKitchenProduct ? 'No se pudo guardar el producto' : 'No se pudo guardar el menú';
      if (error.code === '23505') {
        errorMessage = 'Ya existe un menú/producto para esta sede en esta fecha';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!menuId) return;

    const confirmDelete = window.confirm('¿Estás seguro de eliminar este menú?');
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('lunch_menus')
        .delete()
        .eq('id', menuId);

      if (error) throw error;

      toast({
        title: 'Menú eliminado',
        description: 'El menú se eliminó correctamente',
      });

      onSuccess();
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el menú',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = initialDate ? format(initialDate, "EEEE d 'de' MMMM, yyyy", { locale: es }) : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-green-600" />
            {menuId ? (isKitchenProduct ? 'Editar Producto de Cocina' : 'Editar Menú') : (isKitchenProduct ? 'Nuevo Producto de Cocina' : 'Nuevo Menú de Almuerzo')}
          </DialogTitle>
          <div className="space-y-2 pt-1">
            {formattedDate && (
              <p className="font-bold text-green-700 capitalize text-sm">{formattedDate}</p>
            )}
            {preSelectedCategoryName && (
              <Badge variant="outline" className="gap-1">
                <Tag className="h-3 w-3" />
                {preSelectedCategoryName} - {preSelectedTargetType === 'students' ? 'Alumnos' : 'Profesores'}
              </Badge>
            )}
            <DialogDescription>
              {isKitchenProduct 
                ? 'Configura el producto individual disponible en cocina (arroz, bebida, ensalada, etc.)'
                : 'Completa los platos del día. Solo el segundo es obligatorio.'
              }
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="school_id">Sede *</Label>
              <Select
                value={formData.school_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, school_id: value }))
                }
                disabled={loading || !!userSchoolId}
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      <div className="flex items-center gap-2">
                        {school.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: school.color }}
                          />
                        )}
                        {school.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!initialDate && (
              <div>
                <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  disabled={loading}
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isKitchenProduct ? (
              // Formulario para productos de cocina
              <>
                <div>
                  <Label htmlFor="product_name">🍽️ Nombre del Producto *</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData(p => ({ ...p, product_name: e.target.value }))}
                    placeholder="Ej: Arroz blanco, Ensalada verde, Refresco"
                    disabled={loading}
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="product_price">💰 Precio (S/) *</Label>
                  <Input
                    id="product_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.product_price}
                    onChange={(e) => setFormData(p => ({ ...p, product_price: e.target.value }))}
                    placeholder="0.00"
                    disabled={loading}
                    className="mt-2"
                    required
                  />
                </div>
              </>
            ) : (
              // Formulario para menús normales
              <>
                <div>
                  <Label htmlFor="starter">🥗 Entrada</Label>
                  <Input
                    id="starter"
                    value={formData.starter}
                    onChange={(e) => setFormData(p => ({ ...p, starter: e.target.value }))}
                    placeholder="Ej: Ensalada de verduras frescas"
                    disabled={loading}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="main_course">🍲 Segundo Plato *</Label>
                  <Input
                    id="main_course"
                    value={formData.main_course}
                    onChange={(e) => setFormData(p => ({ ...p, main_course: e.target.value }))}
                    placeholder="Ej: Arroz con pollo"
                    disabled={loading}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="beverage">🥤 Bebida</Label>
                  <Input
                    id="beverage"
                    value={formData.beverage}
                    onChange={(e) => setFormData(p => ({ ...p, beverage: e.target.value }))}
                    placeholder="Ej: Refresco de maracuyá"
                    disabled={loading}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="dessert">🍰 Postre</Label>
                  <Input
                    id="dessert"
                    value={formData.dessert}
                    onChange={(e) => setFormData(p => ({ ...p, dessert: e.target.value }))}
                    placeholder="Ej: Gelatina de fresa"
                    disabled={loading}
                    className="mt-2"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <Label htmlFor="notes">📝 Notas adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones, alergias, etc."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              disabled={loading}
              rows={3}
              className="mt-2"
            />
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            {menuId && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Eliminar'
                )}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : menuId ? (
                'Actualizar'
              ) : (
                isKitchenProduct ? 'Crear Producto' : 'Crear Menú'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
