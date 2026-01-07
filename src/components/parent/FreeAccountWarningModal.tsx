import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert, CreditCard, TrendingUp, Lock } from 'lucide-react';

interface FreeAccountWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDisable: () => void;
  studentName: string;
}

export const FreeAccountWarningModal = ({ 
  open, 
  onOpenChange, 
  onConfirmDisable,
  studentName 
}: FreeAccountWarningModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">¿Desactivar Cuenta Libre?</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Para {studentName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl p-4">
            <h3 className="font-bold text-emerald-900 text-lg mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Ventajas de mantener la Cuenta Libre ACTIVA
            </h3>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span><strong>Sin preocupaciones:</strong> Tu hijo puede consumir lo que necesite sin quedarse sin saldo en el kiosco.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span><strong>Flexibilidad total:</strong> Pagas al final del mes según el consumo real, sin anticipar dinero.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span><strong>Sin recargas constantes:</strong> Olvídate de estar pendiente del saldo cada semana.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span><strong>Control visual:</strong> Ves el historial completo de consumo en tiempo real desde tu portal.</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4">
            <h3 className="font-bold text-red-900 text-lg mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Desventajas de desactivar la Cuenta Libre
            </h3>
            <ul className="space-y-2 text-sm text-red-800">
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold mt-0.5">✗</span>
                <span><strong>Saldo bloqueado:</strong> Si tu hijo se queda sin saldo, no podrá comprar hasta que recargues.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold mt-0.5">✗</span>
                <span><strong>Recargas frecuentes:</strong> Tendrás que anticipar dinero y recargar constantemente.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold mt-0.5">✗</span>
                <span><strong>Menos práctico:</strong> Más gestión manual para ti y riesgo de que tu hijo pase hambre si olvidas recargar.</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-blue-900 text-sm mb-1">💡 Recomendación:</h4>
                <p className="text-sm text-blue-800">
                  Si tu preocupación es el <strong>control del gasto</strong>, te recomendamos mantener la Cuenta Libre activa 
                  y usar los <strong>Topes Diarios</strong> para limitar cuánto puede gastar tu hijo por día. 
                  Así combinas la comodidad con el control.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="flex-1 h-12 text-base font-bold"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirmDisable();
              onOpenChange(false);
            }}
            variant="destructive"
            className="flex-1 h-12 text-base font-bold bg-red-600 hover:bg-red-700"
          >
            Sí, desactivar Cuenta Libre
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

