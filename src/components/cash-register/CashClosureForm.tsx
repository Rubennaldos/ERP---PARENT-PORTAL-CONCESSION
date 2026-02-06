import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Lock, AlertTriangle, CheckCircle2, Printer, Download, Send } from 'lucide-react';
import type { CashRegisterClosure, CashRegisterSummary } from '@/types/cashRegister';

interface CashClosureFormProps {
  closure: CashRegisterClosure;
  summary: CashRegisterSummary | null;
  onClose: () => void;
}

export function CashClosureForm({ closure, summary, onClose }: CashClosureFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [actualBalance, setActualBalance] = useState('');
  const [pettyCash, setPettyCash] = useState('');
  const [safeCash, setSafeCash] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [notes, setNotes] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'closed'>('input');

  const difference = actualBalance ? parseFloat(actualBalance) - (summary?.expectedBalance || 0) : 0;
  const hasDifference = Math.abs(difference) > 0.01;
  const differenceColor = difference > 0 ? 'text-green-600' : 'text-red-600';

  const validateInputs = (): boolean => {
    if (!actualBalance || parseFloat(actualBalance) < 0) {
      setError('Debe ingresar el saldo real de caja');
      return false;
    }

    const total = (parseFloat(pettyCash) || 0) + (parseFloat(safeCash) || 0);
    if (Math.abs(total - parseFloat(actualBalance)) > 0.01) {
      setError('La suma de caja chica y caja fuerte debe ser igual al saldo real');
      return false;
    }

    if (hasDifference && !adjustmentReason.trim()) {
      setError('Debe especificar el motivo de la diferencia');
      return false;
    }

    if (!adminPassword) {
      setError('Debe ingresar la contraseña del administrador');
      return false;
    }

    return true;
  };

  const validateAdminPassword = async (): Promise<boolean> => {
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

  const handleSubmit = async () => {
    setError('');

    if (!validateInputs()) return;

    if (step === 'input') {
      setStep('confirm');
      return;
    }

    // Validar contraseña del admin
    const isValid = await validateAdminPassword();
    if (!isValid) return;

    try {
      setLoading(true);

      // Actualizar el cierre
      const { error: updateError } = await supabase
        .from('cash_register_closures')
        .update({
          status: 'closed',
          closure_time: new Date().toISOString(),
          actual_balance: parseFloat(actualBalance),
          petty_cash: parseFloat(pettyCash) || 0,
          safe_cash: parseFloat(safeCash) || 0,
          adjustment_reason: hasDifference ? adjustmentReason.trim() : null,
          adjustment_approved_by: user!.id,
          adjustment_approved_at: hasDifference ? new Date().toISOString() : null,
          notes: notes.trim() || null,
        })
        .eq('id', closure.id);

      if (updateError) throw updateError;

      // Si hay diferencia, registrar como movimiento
      if (hasDifference) {
        await supabase.from('cash_movements').insert({
          closure_id: closure.id,
          school_id: profile!.school_id,
          movement_type: 'adjustment',
          amount: Math.abs(difference),
          reason: `Ajuste de cierre: ${adjustmentReason}`,
          category: difference > 0 ? 'Sobrante' : 'Faltante',
          registered_by: user!.id,
          authorized_by: user!.id,
          authorized_at: new Date().toISOString(),
        });
      }

      setStep('closed');
    } catch (error) {
      console.error('Error closing register:', error);
      setError('Error al cerrar la caja');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // TODO: Implementar impresión de reporte
    alert('Imprimiendo reporte de cierre...');
  };

  const handleExport = () => {
    // TODO: Implementar exportación a Excel/PDF
    alert('Exportando reporte...');
  };

  const handleWhatsApp = () => {
    // TODO: Implementar envío por WhatsApp
    alert('Enviando por WhatsApp...');
  };

  if (step === 'closed') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            Caja Cerrada Exitosamente
          </CardTitle>
          <CardDescription>
            El cierre de caja se ha completado correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <div className="space-y-3">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Saldo Esperado:</span>
                  <span>S/ {summary?.expectedBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Saldo Real:</span>
                  <span>S/ {parseFloat(actualBalance).toFixed(2)}</span>
                </div>
                {hasDifference && (
                  <div className={`flex justify-between text-lg font-bold ${differenceColor}`}>
                    <span>Diferencia:</span>
                    <span>S/ {Math.abs(difference).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Caja Chica:</span>
                    <p>S/ {parseFloat(pettyCash).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Caja Fuerte:</span>
                    <p>S/ {parseFloat(safeCash).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Ticket
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel/PDF
            </Button>
            <Button onClick={handleWhatsApp} variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Enviar WhatsApp
            </Button>
          </div>

          <Button onClick={onClose} className="w-full">
            Finalizar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'confirm') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirmar Cierre de Caja</CardTitle>
          <CardDescription>
            Revise los datos antes de confirmar el cierre
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Esperado</p>
                    <p className="text-2xl font-bold">S/ {summary?.expectedBalance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Real</p>
                    <p className="text-2xl font-bold">S/ {parseFloat(actualBalance).toFixed(2)}</p>
                  </div>
                </div>
                {hasDifference && (
                  <>
                    <Separator />
                    <div className={`${differenceColor} font-bold`}>
                      <p className="text-sm">DIFERENCIA</p>
                      <p className="text-3xl">S/ {Math.abs(difference).toFixed(2)}</p>
                      <p className="text-sm mt-2">{difference > 0 ? 'SOBRANTE' : 'FALTANTE'}</p>
                    </div>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-semibold mb-1">Motivo del ajuste:</p>
                      <p className="text-sm">{adjustmentReason}</p>
                    </div>
                  </>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Caja Chica</p>
                    <p className="font-semibold">S/ {parseFloat(pettyCash).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Caja Fuerte/Extracción</p>
                    <p className="font-semibold">S/ {parseFloat(safeCash).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {hasDifference && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Se registrará un ajuste de caja por S/ {Math.abs(difference).toFixed(2)} 
                {difference > 0 ? ' (sobrante)' : ' (faltante)'}. 
                Este movimiento quedará registrado en el historial de auditoría.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('input')}
              disabled={loading}
              className="flex-1"
            >
              Volver
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              <Lock className="mr-2 h-4 w-4" />
              {loading ? 'Cerrando...' : 'Confirmar Cierre'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cerrar Caja del Día</CardTitle>
        <CardDescription>
          Ingrese el efectivo real y complete la información
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Resumen del día */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Resumen del Día</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Caja Inicial:</p>
                <p className="font-semibold">S/ {summary?.openingBalance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Ventas:</p>
                <p className="font-semibold">
                  S/ {((summary?.posTotal || 0) + (summary?.lunchTotal || 0)).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ingresos:</p>
                <p className="font-semibold text-green-600">S/ {summary?.totalIncome.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Egresos:</p>
                <p className="font-semibold text-red-600">S/ {summary?.totalExpenses.toFixed(2)}</p>
              </div>
            </div>
            <Separator />
            <div className="text-lg font-bold flex justify-between">
              <span>Saldo Esperado:</span>
              <span>S/ {summary?.expectedBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Conteo de efectivo */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="actualBalance">Efectivo Real en Caja *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">S/</span>
                <Input
                  id="actualBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualBalance}
                  onChange={(e) => setActualBalance(e.target.value)}
                  className="pl-10"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cuente todo el efectivo físico en caja (solo billetes)
              </p>
            </div>

            {actualBalance && (
              <Alert variant={hasDifference ? 'destructive' : 'default'}>
                <AlertDescription className="flex justify-between items-center">
                  <span className="font-semibold">Diferencia:</span>
                  <span className={`text-xl font-bold ${differenceColor}`}>
                    S/ {Math.abs(difference).toFixed(2)}
                    {difference > 0 ? ' (Sobrante)' : difference < 0 ? ' (Faltante)' : ' (Exacto)'}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* División de efectivo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pettyCash">Caja Chica *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">S/</span>
                <Input
                  id="pettyCash"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pettyCash}
                  onChange={(e) => setPettyCash(e.target.value)}
                  className="pl-10"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Efectivo que queda en caja chica
              </p>
            </div>

            <div>
              <Label htmlFor="safeCash">Caja Fuerte / Extracción *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">S/</span>
                <Input
                  id="safeCash"
                  type="number"
                  step="0.01"
                  min="0"
                  value={safeCash}
                  onChange={(e) => setSafeCash(e.target.value)}
                  className="pl-10"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Efectivo a guardar o extraer
              </p>
            </div>
          </div>

          {/* Motivo de diferencia */}
          {hasDifference && (
            <div>
              <Label htmlFor="adjustmentReason">Motivo de la Diferencia *</Label>
              <Textarea
                id="adjustmentReason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Explique el motivo de la diferencia..."
                rows={3}
                required
              />
            </div>
          )}

          {/* Observaciones */}
          <div>
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional sobre el cierre (opcional)"
              rows={2}
            />
          </div>

          {/* Contraseña del admin */}
          <div>
            <Label htmlFor="password">Contraseña del Administrador *</Label>
            <Input
              id="password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Ingrese la contraseña"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Se requiere autorización del administrador para cerrar la caja
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" size="lg">
            <Lock className="mr-2 h-5 w-5" />
            Continuar con el Cierre
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
