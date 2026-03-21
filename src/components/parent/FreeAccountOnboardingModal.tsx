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
      <DialogContent className="sm:max-w-lg border border-stone-200/50 bg-white shadow-2xl p-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[95dvh] p-4 sm:p-5">
        <DialogHeader className="pb-2">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-11 h-11 bg-gradient-to-br from-[#A3566E]/10 to-[#8B4060]/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-[#A3566E]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-light text-stone-800 tracking-wide">
                ¡Bienvenido, {parentName}!
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 mt-1 font-normal">
                Autorización de Cuenta Libre
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Explicación */}
          <div className="bg-stone-50/50 border border-stone-200/50 rounded-lg p-3">
            <h3 className="font-medium text-stone-800 mb-1.5 flex items-center gap-1.5 text-xs">
              <Check className="h-4 w-4 text-[#A3566E]" />
              ¿Qué es una Cuenta Libre?
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed font-normal">
              Todos tus hijos están en modo <span className="font-semibold text-stone-800">Cuenta Libre</span> por defecto. 
              Pueden consumir en el kiosco sin recargar saldo previamente y pagas al final del mes.
            </p>
          </div>

          {/* Ventajas */}
          <div>
            <h4 className="font-medium text-stone-700 mb-2 text-[10px] uppercase tracking-wider">Ventajas</h4>
            <ul className="space-y-1.5">
              {[
                ['Sin recargas anticipadas', 'No necesitas transferir dinero constantemente'],
                ['Acceso inmediato', 'Tus hijos pueden comprar al instante'],
                ['Control total', 'Establece límites diarios, semanales o mensuales'],
                ['Historial completo', 'Ve todos los consumos con retraso de 2 días'],
              ].map(([title, desc]) => (
                <li key={title} className="flex items-start gap-2 text-xs text-stone-600">
                  <div className="w-4 h-4 rounded bg-[#A3566E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-2.5 w-2.5 text-[#A3566E]" />
                  </div>
                  <span><strong className="font-medium text-stone-800">{title}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Información importante */}
          <div className="bg-amber-50/30 border border-amber-200/50 rounded-lg p-2.5 flex gap-2">
            <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
              <strong className="font-medium">Importante:</strong> Puedes cambiar entre <strong className="font-medium">Cuenta Libre</strong> y <strong className="font-medium">Cuenta Prepago</strong> en cualquier momento desde la configuración de cada hijo.
            </p>
          </div>

          {/* Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer group p-3 bg-white border border-stone-200 rounded-xl hover:border-[#A3566E]/30 transition-colors">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-stone-300 text-[#A3566E] focus:ring-[#A3566E]"
            />
            <span className="text-xs font-normal text-stone-700 group-hover:text-stone-900">
              Entiendo y acepto que mis hijos están en Cuenta Libre
            </span>
          </label>

          {/* Botón */}
          <Button
            onClick={handleAccept}
            disabled={!understood}
            className="w-full h-11 text-sm font-medium bg-gradient-to-r from-[#A3566E] to-[#8B4060] hover:from-[#8B4060] hover:to-[#7A3755] text-white shadow-md rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Comenzar a Usar el Portal
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
