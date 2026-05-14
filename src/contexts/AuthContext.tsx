import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastTokenRef = useRef<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip identity-equal updates so consumers don't see new references
    // (and re-run effects) on every TOKEN_REFRESHED / window-focus event.
    const apply = (next: Session | null) => {
      const nextToken = next?.access_token ?? null;
      const nextUserId = next?.user?.id ?? null;
      if (nextToken === lastTokenRef.current && nextUserId === lastUserIdRef.current) {
        setLoading(false);
        return;
      }
      lastTokenRef.current = nextToken;
      lastUserIdRef.current = nextUserId;
      setSession(next);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => apply(s));
    supabase.auth.getSession().then(({ data: { session: s } }) => apply(s));

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
