import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isVisitor: boolean;
  signOut: () => Promise<void>;
  signInAsVisitor: () => Promise<void>;
}

const VISITOR_EMAIL = 'admin@openband.app';
const VISITOR_ID = '00000000-0000-0000-0000-000000000000';

function createVisitorUser(): User {
  return {
    id: VISITOR_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: VISITOR_EMAIL,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: 'Admin' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  } as User;
}

function createVisitorSession(): Session {
  return {
    access_token: 'visitor-token',
    refresh_token: 'visitor-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: createVisitorUser(),
  } as Session;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isVisitor: false,
  signOut: async () => {},
  signInAsVisitor: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isVisitor, setIsVisitor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    }).catch(() => {
      setSession(null);
      setUser(null);
    }).finally(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (isVisitor) {
      setIsVisitor(false);
      setSession(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const signInAsVisitor = useCallback(async () => {
    const s = createVisitorSession();
    setSession(s);
    setUser(s.user);
    setIsVisitor(true);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, isVisitor, signOut, signInAsVisitor }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
