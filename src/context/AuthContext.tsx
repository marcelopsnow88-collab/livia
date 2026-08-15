import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured } from "../lib/supabase/client";
import type { AuthSession } from "../services/auth.service";
import { getCurrentSession, signInAdmin, signOut as authSignOut } from "../services/auth.service";
import { DEFAULT_ORGANIZATION_ID } from "../lib/constants";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  isConfigured: boolean;
  activeOrganizationId: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setActiveOrganizationId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrganizationId, setActiveOrganizationId] = useState(DEFAULT_ORGANIZATION_ID);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    getCurrentSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (session?.organizationIds.length) {
      setActiveOrganizationId(session.organizationIds[0]);
    }
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const s = await signInAdmin(email, password);
    setSession(s);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setActiveOrganizationId(DEFAULT_ORGANIZATION_ID);
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      isConfigured,
      activeOrganizationId,
      signIn,
      signOut,
      setActiveOrganizationId,
    }),
    [session, loading, isConfigured, activeOrganizationId, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
