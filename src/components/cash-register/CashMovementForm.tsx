import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Printer } from 'lucide-react';

interface CashMovementFormProps {
  closureId: string;
  movementType: 'income' | 'expense';
  onClose: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'proveedores', label: 'Pago a Proveedores' },
  { value: 'servicios', label: 'Servicios (luz, agua, etc.)' },
  { value: 'suministros', label: 'Suministros' },
  { value: 'personal', label: 'Personal' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otros', label: 'Otros' },
];

const INCOME_CATEGORIES = [
  { value: 'deposito', label: 'Depósito Adicional' },
  { value: 'cobro_credito', label: 'Cobro de Crédito' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'otros', label: 'Otros' },
];

export function CashMovementForm({ closureId, movementType, onClose }: CashMovementFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [movementId, setMovementId] = useState<string | null>(null);

  const categories = movementType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const title = movementType === 'expense' ? 'Registrar Egreso' : 'Registrar Ingreso';
  const colorClass = movementType === 'expense' ? 'text-red-600' : 'text-green-600';

  const validateAdminPassword = async (): Promise<boolean> => {
    if (!adminPassword) {
      setError('Debe ingresar la contraseña del administrador');
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('validate_admin_password', {
        p_school_id: profile!.school_id,
        p_password: adminPassword
      });

      if (error || !data) {
        setError('Contraseña de administrador incorrecta');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating password:', error);
      setError('Error al validar la contraseña');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (!reason.trim()) {
      setError('Debe ingresar un motivo');
      return;
    }

    if (!category) {
      setError('Debe seleccionar una categoría');
      return;
    }

    // Validar contraseña del admin
    const isValid = await validateAdminPassword();
    if (!isValid) return;

    try {
      setLoading(true);

      // Registrar el movimiento
      const { data: movement, error: movementError } = await supabase
        .from('cash_movements')
        .insert({
          closure_id: closureId,
          school_id: profile!.school_id,
          movement_type: movementType,
          amount: parseFloat(amount),
          reason: reason.trim(),
          category,
          notes: notes.trim() || null,
          registered_by: user!.id,
          authorized_by: user!.id, // El admin que autoriza
          authorized_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (movementError) throw movementError;

      setMovementId(movement.id);

      alert(`${movementType === 'expense' ? 'Egreso' : 'Ingreso'} registrado correctamente`);
      
    } catch (error) {
      console.error('Error registering movement:', error);
      setError('Error al registrar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!movementId) return;

    try {
      // Marcar como impreso
      await supabase
        .from('cash_movements')
        .update({
          voucher_printed: true,
          voucher_printed_at: new Date().toISOString(),
        })
        .eq('id', movementId);

      // TODO: Implementar impresión de comprobante
      alert('Imprimiendo comprobante...');
      
      onClose();
    } catch (error) {
      console.error('Error printing voucher:', error);
      alert('Error al imprimir el comprobante');
    }
  };

  if (movementId) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimiento Registrado</DialogTitle>
            <DialogDescription>
              El {movementType === 'expense' ? 'egreso' : 'ingreso'} ha sido registrado correctamente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Tipo:</span>
                    <span className={colorClass}>
                      {movementType === 'expense' ? 'EGRESO' : 'INGRESO'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Monto:</span>
                    <span className={`text-xl font-bold ${colorClass}`}>
                      S/ {parseFloat(amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Motivo:</span>
                    <span>{reason}</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className={colorClass}>{title}</DialogTitle>
            <DialogDescription>
              Registre el movimiento de efectivo con todos los detalles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">S/</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describa el motivo del movimiento..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional (opcional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña del Administrador *</Label>
              <Input
                id="password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Ingrese la contraseña"
                required
              />
              <p className="text-xs text-muted-foreground">
                Se requiere autorización del administrador para registrar movimientos
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
