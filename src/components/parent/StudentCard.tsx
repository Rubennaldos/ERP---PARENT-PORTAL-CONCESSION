import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  History,
  Camera,
  Info,
  CreditCard,
  Nfc,
  ShoppingBag,
  AlertTriangle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  balance: number;
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  limit_type: string;
  grade: string;
  section: string;
  is_active: boolean;
  free_account?: boolean;
  school?: { id: string; name: string } | null;
}

interface StudentCardProps {
  student: Student;
  totalDebt?: number;
  onViewHistory: () => void;
  onPayDebt?: () => void;
  onPhotoClick: () => void;
  onActivateNFC?: () => void;
  onOpenKiosk?: () => void;
}

export function StudentCard({
  student,
  totalDebt = 0,
  onViewHistory,
  onPayDebt,
  onPhotoClick,
  onActivateNFC,
  onOpenKiosk,
}: StudentCardProps) {
  const hasDebt = totalDebt > 0;
  const debtExceedsLimit = totalDebt > 100;
  const isRecarga = student.free_account === false;
  const isLibre = !isRecarga;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-stone-200/50 bg-white group">
      {/* Header bar */}
      <div className={`h-1.5 relative transition-colors duration-500 ${
        debtExceedsLimit ? 'bg-red-500'
        : hasDebt ? 'bg-rose-400' 
        : 'bg-gradient-to-r from-emerald-500/70 via-[#A3566E] to-[#8B4060]'
      }`} />

      {/* Perfil */}
      <div className="px-6 pt-8 pb-4 relative">
        <div className="flex items-start gap-4">
          <div 
            className="w-20 h-20 rounded-2xl border border-stone-200/50 bg-gradient-to-br from-stone-50/50 to-emerald-50/20 overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 shadow-sm flex-shrink-0"
            onClick={onPhotoClick}
          >
            {student.photo_url ? (
              <img 
                src={student.photo_url} 
                alt={student.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100/50 to-emerald-50/30">
                <span className="text-2xl font-light text-stone-400">
                  {student.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 pt-1">
            <h3 className="text-xl font-normal text-stone-800 leading-tight group-hover:text-emerald-700 transition-colors tracking-wide">
              {student.full_name}
            </h3>
            {student.school?.name && (
              <p className="text-xs font-semibold text-emerald-700 mt-1.5 tracking-wide">
                🏫 {student.school.name}
              </p>
            )}
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.2em] mt-1">
              {student.grade} <span className="text-stone-300">·</span> {student.section}
            </p>
            
            <div className="flex flex-wrap gap-1.5 mt-3">
              {/* Badge modo kiosco */}
              {isRecarga ? (
                <Badge className="bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200/30 py-0.5 px-2 rounded-lg font-medium text-[9px] uppercase tracking-wider">
                  <RefreshCw className="h-2.5 w-2.5 mr-1" />
                  Recarga
                </Badge>
              ) : (
                <Badge className="bg-blue-50/80 text-blue-700 hover:bg-blue-100/80 border border-blue-200/30 py-0.5 px-2 rounded-lg font-medium text-[9px] uppercase tracking-wider">
                  <Zap className="h-2.5 w-2.5 mr-1" />
                  Libre
                </Badge>
              )}
              {/* Badge deuda */}
              {debtExceedsLimit ? (
                <Badge className="bg-red-50 text-red-600 border border-red-200 py-0.5 px-2 rounded-lg font-medium text-[9px] uppercase tracking-wider animate-pulse">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  Deuda alta
                </Badge>
              ) : hasDebt ? (
                <Badge className="bg-rose-50 text-rose-600 border-0 py-0.5 px-2.5 rounded-lg font-medium text-[9px] uppercase tracking-wider">
                  Deuda
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {/* Icono de cámara */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPhotoClick();
          }}
          className="absolute top-20 left-20 w-8 h-8 bg-white rounded-xl shadow-sm border border-emerald-200/20 flex items-center justify-center hover:bg-emerald-50/30 transition-all active:scale-90"
        >
          <Camera className="h-4 w-4 text-stone-400 hover:text-emerald-600" />
        </button>
      </div>

      {/* Contenido */}
      <CardContent className="pb-6 px-6 pt-2">

        {/* ═══════ SALDO KIOSCO (modo Recarga) ═══════ */}
        {isRecarga && (
          <div className="rounded-2xl p-4 mb-3 border bg-emerald-50/40 border-emerald-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-emerald-600 mb-1">
                  Saldo Kiosco
                </p>
                <p className="text-2xl font-light text-emerald-700">
                  S/ {(student.balance || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-emerald-100/60 p-2.5 rounded-xl">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ DEUDA / AL DÍA ═══════════════════ */}
        <div className={`rounded-2xl p-5 mb-4 border transition-all duration-300 ${
          debtExceedsLimit
            ? 'bg-red-50/40 border-red-200/60'
            : hasDebt
              ? 'bg-rose-50/30 border-rose-200/50'
              : 'bg-gradient-to-br from-stone-50/30 to-emerald-50/20 border-emerald-200/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[9px] font-medium uppercase tracking-[0.2em] ${
                  debtExceedsLimit ? 'text-red-500' : hasDebt ? 'text-rose-500' : 'text-stone-400'
                }`}>
                  {hasDebt ? 'Monto Adeudado' : 'Sin Deudas'}
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-stone-300 hover:text-emerald-500 transition-colors">
                      <Info className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 shadow-lg border border-stone-200/50 rounded-2xl p-4" side="top" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-stone-800">
                        {hasDebt
                          ? debtExceedsLimit ? '⚠️ Deuda alta' : '💳 Cuenta Kiosco - Deuda'
                          : '✅ Sin Deudas'
                        }
                      </h4>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        {isLibre
                          ? hasDebt
                            ? `Consumos pendientes de pago. ${student.full_name} puede seguir comprando y pagas al final del período.`
                            : `${student.full_name} no tiene consumos pendientes. Puede comprar libremente en el kiosco.`
                          : hasDebt
                            ? `Consumos que superaron el saldo disponible.`
                            : `${student.full_name} está al día.`
                        }
                      </p>
                      {debtExceedsLimit && (
                        <p className="text-xs text-red-600 font-medium">
                          La deuda ha superado S/ 100. Te recomendamos pagarla pronto.
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <p className={`text-3xl font-light tracking-tight ${
                debtExceedsLimit ? 'text-red-600' : hasDebt ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {hasDebt ? `S/ ${totalDebt.toFixed(2)}` : '✓ Al día'}
              </p>
              {/* Alerta visible cuando deuda > S/100 */}
              {debtExceedsLimit && (
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Deuda alta — te recomendamos pagar pronto
                </p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${
              debtExceedsLimit ? 'bg-red-100/50 text-red-500'
              : hasDebt ? 'bg-rose-100/50 text-rose-500'
              : 'bg-emerald-100/60 text-emerald-600'
            }`}>
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          {/* Botón Pagar Deudas — solo si hay deuda */}
          {hasDebt && onPayDebt && (
            <Button
              onClick={onPayDebt}
              variant="outline"
              className={`w-full h-12 rounded-xl font-medium text-sm tracking-wide transition-all active:scale-95 ${
                debtExceedsLimit
                  ? 'border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 animate-pulse'
                  : 'border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300'
              }`}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {debtExceedsLimit ? '⚠️ Pagar Deuda (monto alto)' : 'Pagar Deudas'}
            </Button>
          )}

          {/* Cuenta Kiosco */}
          {onOpenKiosk && (
            <Button
              onClick={onOpenKiosk}
              variant="outline"
              className="w-full h-12 rounded-xl font-medium text-sm tracking-wide transition-all active:scale-95 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Cuenta Kiosco
              {isRecarga && (
                <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-semibold">
                  S/ {(student.balance || 0).toFixed(2)}
                </span>
              )}
            </Button>
          )}

          {/* Activar NFC */}
          {onActivateNFC && (
            <Button
              onClick={onActivateNFC}
              variant="outline"
              className="w-full h-12 rounded-xl font-medium text-sm tracking-wide transition-all active:scale-95 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
            >
              <Nfc className="h-4 w-4 mr-2" />
              Activar NFC
            </Button>
          )}

          {/* Historial */}
          <Button
            onClick={onViewHistory}
            variant="ghost"
            className="w-full h-11 rounded-xl text-stone-500 font-normal hover:bg-emerald-50/30 hover:text-emerald-700 transition-all text-xs tracking-wide"
          >
            <History className="h-4 w-4 mr-1.5" />
            Historial de Consumos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
