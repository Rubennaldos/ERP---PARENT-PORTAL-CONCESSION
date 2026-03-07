import { Wrench, Clock, Bell } from 'lucide-react';

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
}

export function MaintenanceScreen({
  title = '🔧 Módulo en Mantenimiento',
  message = 'Estamos trabajando para mejorar esta sección. Estará disponible pronto.',
}: MaintenanceScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center">
      {/* Icono animado */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-4 border-amber-200 flex items-center justify-center shadow-lg">
          <Wrench className="h-12 w-12 text-amber-600 animate-[spin_3s_linear_infinite]" style={{ animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' }} />
        </div>
        {/* Puntitos decorativos */}
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
      </div>

      {/* Título */}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 leading-tight">
        {title}
      </h2>

      {/* Mensaje */}
      <p className="text-sm sm:text-base text-gray-500 max-w-sm leading-relaxed mb-6">
        {message}
      </p>

      {/* Tarjetas informativas */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col items-center gap-1">
          <Clock className="h-5 w-5 text-blue-500" />
          <p className="text-xs font-semibold text-blue-700">Disponible pronto</p>
          <p className="text-[10px] text-blue-500">Trabajando en ello</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-col items-center gap-1">
          <Bell className="h-5 w-5 text-green-500" />
          <p className="text-xs font-semibold text-green-700">Sin cambios</p>
          <p className="text-[10px] text-green-500">Tus datos están seguros</p>
        </div>
      </div>

      {/* Barra de progreso animada decorativa */}
      <div className="w-full max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse"
          style={{ width: '65%' }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-2">Preparando la mejor experiencia para ti…</p>
    </div>
  );
}
