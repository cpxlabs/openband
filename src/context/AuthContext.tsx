import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const VISITOR_STORAGE_KEY = "openband_visitor_session";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isVisitor: boolean;
  visitorId: string | null;
  signOut: () => Promise<void>;
  signInAsVisitor: () => Promise<void>;
  convertVisitorToAccount: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
}

function generateVisitorId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadVisitorSession(): { id: string; createdAt: string } | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveVisitorSession(id: string, createdAt: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify({ id, createdAt }));
  } catch (e) {
    console.warn("Visitor session save failed:", e);
  }
}

function clearVisitorSession(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(VISITOR_STORAGE_KEY);
  } catch (e) {
    console.warn("Visitor session clear failed:", e);
  }
}

function createVisitorUser(id: string, createdAt: string): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: `visitor-${id.slice(0, 8)}@openband.local`,
    email_confirmed_at: createdAt,
    phone: "",
    confirmed_at: createdAt,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "visitor", providers: ["visitor"] },
    user_metadata: { name: "Visitante", is_visitor: true },
    created_at: createdAt,
    updated_at: createdAt,
    is_anonymous: true,
    identities: [],
    factors: [],
  };
}

function createVisitorSession(id: string, createdAt: string): Session {
  return {
    access_token: `visitor-token-${id}`,
    refresh_token: `visitor-refresh-${id}`,
    expires_in: 86400 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
    token_type: "bearer",
    provider_token: null,
    provider_refresh_token: null,
    user: createVisitorUser(id, createdAt),
  };
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isVisitor: false,
  visitorId: null,
  signOut: async () => {},
  signInAsVisitor: async () => {},
  convertVisitorToAccount: async () => ({}),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isVisitor, setIsVisitor] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const stored = loadVisitorSession();
    if (stored) {
      const s = createVisitorSession(stored.id, stored.createdAt);
      if (!cancelled) {
        setSession(s);
        setUser(s.user);
        setIsVisitor(true);
        setVisitorId(stored.id);
        setLoading(false);
      }
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        console.warn("Auth getSession failed:", e);
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (isVisitor) {
      clearVisitorSession();
      setIsVisitor(false);
      setVisitorId(null);
      setSession(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  }, [isVisitor]);

  const signInAsVisitor = useCallback(async () => {
    const stored = loadVisitorSession();
    const id = stored?.id ?? generateVisitorId();
    const createdAt = stored?.createdAt ?? new Date().toISOString();

    if (!stored) {
      saveVisitorSession(id, createdAt);
    }

    const s = createVisitorSession(id, createdAt);
    setSession(s);
    setUser(s.user);
    setIsVisitor(true);
    setVisitorId(id);
    setLoading(false);
  }, []);

  const convertVisitorToAccount = useCallback(
    async (email: string, password: string, name?: string) => {
      try {
        const response = await fetch("/api/auth/convert-visitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name,
            visitorId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { error: data.error || "Falha ao criar conta." };
        }

        clearVisitorSession();
        setIsVisitor(false);
        setVisitorId(null);

        const newUser: User = {
          id: data.user.id,
          aud: "authenticated",
          role: "authenticated",
          email: data.user.email,
          email_confirmed_at: new Date().toISOString(),
          phone: "",
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: { name: data.user.name },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_anonymous: false,
          identities: [],
          factors: [],
        };

        const newSession: Session = {
          access_token: data.token,
          refresh_token: data.token,
          expires_in: 86400 * 7,
          expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
          token_type: "bearer",
          provider_token: null,
          provider_refresh_token: null,
          user: newUser,
        };

        setSession(newSession);
        setUser(newUser);

        return {};
      } catch (e) {
        return { error: "Falha de conexão ao criar conta." };
      }
    },
    [visitorId],
  );

  return (
    <AuthContext.Provider
      value={{ session, user, loading, isVisitor, visitorId, signOut, signInAsVisitor, convertVisitorToAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
