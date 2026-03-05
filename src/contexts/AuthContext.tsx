import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si la configuración no está lista, no bloqueamos el render.
    if (!supabase) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // 1. Escuchar cambios en el estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Solo actualizar si realmente cambió la sesión (evitar re-renders innecesarios)
      setSession((prevSession) => {
        // Si no hay cambio en el ID de usuario, no actualizar
        if (prevSession?.user?.id === session?.user?.id) {
          return prevSession;
        }
        return session;
      });
      
      setUser((prevUser) => {
        // Si no hay cambio en el ID de usuario, no actualizar
        if (prevUser?.id === session?.user?.id) {
          return prevUser;
        }
        return session?.user ?? null;
      });
      
      setLoading(false);
    });

    // 2. Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Error recuperando sesión:', error);
      }
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return {
        error: {
          name: "AuthError",
          message:
            "La autenticación no está configurada (revisa tus Secrets/variables de entorno).",
        } as AuthError,
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    if (!supabase) {
      return {
        data: { user: null, session: null },
        error: {
          name: "AuthError",
          message:
            "La autenticación no está configurada (revisa tus Secrets/variables de entorno).",
        } as AuthError,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // Sin redirección por email
        data: metadata, // Guardar rol y otros datos en user_metadata
      },
    });
    
    if (error) return { data: { user: null, session: null }, error };

    // ✅ Si Supabase devolvió usuario pero sin sesión (email confirmation activo),
    // intentamos hacer signIn automático para saltarnos la confirmación de email.
    if (data.user && !data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData.session) {
        // ✅ Login automático exitoso — el usuario entra directo al sistema
        return {
          data: {
            user: signInData.user,
            session: signInData.session,
          },
          error: null,
        };
      }
      // Si el signIn falla (email confirmation estricto en Supabase),
      // devolvemos el estado original para que Auth.tsx maneje el mensaje.
    }
    
    return { data, error };
  };

  const signOut = async () => {
    if (!supabase) return;
    
    try {
      // 1. Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
      // 2. Limpiar estado local
      setUser(null);
      setSession(null);
      
      // 3. Limpiar localStorage y sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // 4. Redirigir a login (sin hash, ahora usamos BrowserRouter)
      window.location.href = `${window.location.origin}/auth`;
    } catch (error) {
      console.error('Error signing out:', error);
      // Aún así, forzar redirección
      window.location.href = `${window.location.origin}/auth`;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
