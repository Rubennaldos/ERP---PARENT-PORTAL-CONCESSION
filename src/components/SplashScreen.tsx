import { useState, useEffect } from 'react';
import maracuyaLogo from '@/assets/maracuya-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'fade-out'>('entering');

  useEffect(() => {
    // Fase 1: Logo entra con animación
    const visibleTimer = setTimeout(() => {
      setPhase('visible');
    }, 300);

    // Fase 2: Fade out
    const fadeTimer = setTimeout(() => {
      setPhase('fade-out');
    }, 3200);

    // Fase 3: Completar splash
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(visibleTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-700 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #faf7f5 0%, #fff 30%, #fdf2f0 60%, #faf5f2 100%)',
      }}
    >
      {/* Fondo con formas orgánicas suaves */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Forma orgánica superior derecha - berry pastel */}
        <div 
          className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, hsl(338, 45%, 45%) 0%, transparent 70%)',
            animation: 'glow 4s ease-in-out infinite',
          }}
        />
        {/* Forma orgánica inferior izquierda - cálida */}
        <div 
          className="absolute -bottom-32 -left-20 w-[350px] h-[350px] rounded-full opacity-[0.05]"
          style={{
            background: 'radial-gradient(circle, hsl(30, 35%, 62%) 0%, transparent 70%)',
            animation: 'glow 4s ease-in-out infinite 1.5s',
          }}
        />
        {/* Centro sutil */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, hsl(338, 45%, 45%) 0%, transparent 50%)',
          }}
        />

        {/* Partículas flotantes decorativas */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float-particle"
            style={{
              width: `${4 + i * 2}px`,
              height: `${4 + i * 2}px`,
              background: i % 2 === 0 
                ? 'hsl(338, 35%, 65%)' 
                : 'hsl(30, 30%, 70%)',
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.4}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Contenido principal */}
      <div 
        className={`relative flex flex-col items-center transition-all duration-1000 ease-out ${
          phase === 'fade-out' 
            ? 'scale-105 opacity-0 -translate-y-4' 
            : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        {/* Anillo expansivo detrás del logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%]">
          <div 
            className="w-40 h-40 rounded-full border border-[hsl(338,35%,65%)] animate-ring-expand"
            style={{ animationDelay: '0.5s' }}
          />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%]">
          <div 
            className="w-40 h-40 rounded-full border border-[hsl(338,25%,75%)] animate-ring-expand"
            style={{ animationDelay: '1.2s' }}
          />
        </div>

        {/* Logo con animación de entrada elástica */}
        <div className="relative animate-logo-entrance">
          <img 
            src={maracuyaLogo} 
            alt="Maracuyá Tiendas Concesionarias Saludables" 
            className="w-64 h-64 sm:w-72 sm:h-72 object-contain drop-shadow-sm mix-blend-multiply"
            style={{
              filter: 'drop-shadow(0 4px 20px hsla(338, 40%, 45%, 0.10))',
            }}
          />
          
          {/* Resplandor suave berry detrás del logo */}
          <div 
            className="absolute inset-0 -z-10 animate-glow rounded-full"
            style={{
              background: 'radial-gradient(circle, hsla(338, 45%, 55%, 0.12) 0%, transparent 60%)',
              transform: 'scale(1.4)',
            }}
          />
        </div>

        {/* Línea shimmer decorativa */}
        <div className="mt-6 flex items-center gap-3">
          <div 
            className="h-[1px] animate-line-expand"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(338, 35%, 70%), transparent)',
            }}
          />
          <div 
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'hsl(338, 40%, 55%)' }}
          />
          <div 
            className="h-[1px] animate-line-expand"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(338, 35%, 70%), transparent)',
            }}
          />
        </div>

        {/* Texto "Bienvenido" con reveal elegante */}
        <p 
          className="mt-5 font-light tracking-[0.2em] text-xs uppercase animate-text-fade"
          style={{ color: 'hsl(338, 25%, 50%)' }}
        >
          Bienvenido
        </p>

        {/* Powered by sutil */}
        <p 
          className="mt-10 text-[10px] tracking-widest uppercase animate-subtitle"
          style={{ color: 'hsl(338, 10%, 68%)' }}
        >
          Powered by ARQUISIA
        </p>
      </div>
    </div>
  );
}
