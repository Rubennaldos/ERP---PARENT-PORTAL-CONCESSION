import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ShieldCheck, Info } from 'lucide-react';
import { useState } from 'react';

interface FreeAccountOnboardingModalProps {
  open: boolean;
  onAccept: () => void;
  parentName: string;
}

export function FreeAccountOnboardingModal({ 
  open, 
  onAccept,
  parentName
}: FreeAccountOnboardingModalProps) {
  const [understood, setUnderstood] = useState(false);

  const handleAccept = () => {
    if (understood) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border border-stone-200/50 bg-white shadow-2xl">
        <DialogHeader className="pb-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8B7355]/10 to-[#6B5744]/10 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="h-9 w-9 text-[#8B7355]" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-light text-stone-800 tracking-wide">
                ¡Bienvenido, {parentName}!
              </DialogTitle>
              <DialogDescription className="text-sm text-stone-500 mt-2 font-normal">
                Autorización de Cuenta Libre
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Explicación */}
          <div className="bg-stone-50/50 border border-stone-200/50 rounded-xl p-6">
            <h3 className="font-medium text-stone-800 mb-3 flex items-center gap-2 text-sm">
              <Check className="h-5 w-5 text-[#8B7355]" />
              ¿Qué es una Cuenta Libre?
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed font-normal">
              Todos tus hijos están en modo <span className="font-semibold text-stone-800">Cuenta Libre</span> por defecto. 
              Esto significa que pueden consumir en el kiosco sin necesidad de recargar saldo previamente, 
              y tú pagarás al final del mes por sus consumos.
            </p>
          </div>

          {/* Ventajas */}
          <div>
            <h4 className="font-medium text-stone-700 mb-4 text-xs uppercase tracking-wider">Ventajas</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-stone-600">
                <div className="w-5 h-5 rounded-lg bg-[#8B7355]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3.5 w-3.5 text-[#8B7355]" />
                </div>
                <span className="font-normal"><strong className="font-medium text-stone-800">Sin recargas anticipadas:</strong> No necesitas estar transfiriendo dinero constantemente</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-stone-600">
                <div className="w-5 h-5 rounded-lg bg-[#8B7355]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3.5 w-3.5 text-[#8B7355]" />
                </div>
                <span className="font-normal"><strong className="font-medium text-stone-800">Acceso inmediato:</strong> Tus hijos pueden comprar lo que necesiten al instante</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-stone-600">
                <div className="w-5 h-5 rounded-lg bg-[#8B7355]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3.5 w-3.5 text-[#8B7355]" />
                </div>
                <span className="font-normal"><strong className="font-medium text-stone-800">Control total:</strong> Puedes establecer límites diarios, semanales o mensuales</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-stone-600">
                <div className="w-5 h-5 rounded-lg bg-[#8B7355]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3.5 w-3.5 text-[#8B7355]" />
                </div>
                <span className="font-normal"><strong className="font-medium text-stone-800">Historial completo:</strong> Ve todos los consumos con un retraso de 2 días (tiempo de registro manual del kiosco)</span>
              </li>
            </ul>
          </div>

          {/* Información importante */}
          <div className="bg-amber-50/30 border border-amber-200/50 rounded-xl p-4 flex gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 text-sm mb-1.5">Importante</h4>
              <p className="text-xs text-amber-800 leading-relaxed font-normal">
                Puedes cambiar entre <strong className="font-medium">Cuenta Libre</strong> y <strong className="font-medium">Cuenta Prepago</strong> 
                cuando lo desees desde la configuración de cada hijo. Los límites de gasto los puedes ajustar en cualquier momento.
              </p>
            </div>
          </div>

          {/* Checkbox de entendimiento */}
          <label className="flex items-start gap-3 cursor-pointer group p-4 bg-white border border-stone-200 rounded-xl hover:border-[#8B7355]/30 transition-colors">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-stone-300 text-[#8B7355] focus:ring-[#8B7355] mt-0.5"
            />
            <span className="text-sm font-normal text-stone-700 leading-relaxed group-hover:text-stone-900">
              Entiendo y acepto que mis hijos están en Cuenta Libre
            </span>
          </label>

          {/* Botón de aceptar */}
          <Button
            onClick={handleAccept}
            disabled={!understood}
            className="w-full h-14 text-base font-medium bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5B4734] text-white shadow-md rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed tracking-wide"
          >
            Comenzar a Usar el Portal
          </Button>

          <p className="text-xs text-center text-stone-400 font-normal pt-2">
            Esta autorización es solo informativa. Puedes modificar la configuración en cualquier momento.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
