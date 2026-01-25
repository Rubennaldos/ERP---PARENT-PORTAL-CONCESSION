import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, LogIn } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error("❌ 404 Error: User attempted to access non-existent route:", location.pathname);
    console.log("🔍 User authenticated:", !!user);
    console.log("📧 User email:", user?.email || "Not logged in");
  }, [location.pathname, user]);

  const handleGoHome = () => {
    if (user) {
      // Si está autenticado, ir al dashboard o inicio según su rol
      navigate('/dashboard');
    } else {
      // Si NO está autenticado, ir al login
      navigate('/auth');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="text-center p-8 bg-white rounded-2xl shadow-2xl max-w-md">
        <div className="mb-6">
          <h1 className="text-8xl font-black text-slate-800 mb-2">404</h1>
          <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto mb-4"></div>
        </div>
        
        <p className="text-2xl font-bold text-slate-700 mb-2">
          ¡Página no encontrada!
        </p>
        <p className="text-slate-500 mb-6">
          La página que buscas no existe o fue movida.
        </p>

        <div className="space-y-3">
          <Button 
            onClick={handleGoHome}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            {user ? (
              <>
                <Home className="mr-2 h-5 w-5" />
                Ir al Inicio
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Iniciar Sesión
              </>
            )}
          </Button>

          <p className="text-xs text-slate-400">
            Ruta intentada: <code className="bg-slate-100 px-2 py-1 rounded">{location.pathname}</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
