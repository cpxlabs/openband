import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient, type Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

function createMockClient() {
  let mockSession: Session | null = makeMockSession('dev@openband.app', 'Dev');
  type AuthListener = (event: string, session: Session | null) => void;
  const listeners = new Set<AuthListener>();

  const userStore: Record<string, { email: string; name: string }> = {
    'dev@openband.app': { email: 'dev@openband.app', name: 'Dev' },
  };

  function notify(event: string, session: Session | null) {
    listeners.forEach((cb) => cb(event, session));
  }

  function makeMockSession(email: string, name?: string): Session {
    return {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      token_type: 'bearer',
      user: {
        id: 'mock-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: email,
        app_metadata: {},
        user_metadata: { name: name ?? email.split('@')[0] },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  return {
    auth: {
      getSession: async () => ({ data: { session: mockSession }, error: null }),
      onAuthStateChange: (callback: AuthListener) => {
        listeners.add(callback);
        return {
          data: { subscription: { unsubscribe: () => listeners.delete(callback) } },
        };
      },
      signOut: async () => {
        mockSession = null;
        notify('SIGNED_OUT', null);
        return { error: null };
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        const existing = userStore[email];
        const name = existing?.name;
        const session = makeMockSession(email, name);
        mockSession = session;
        notify('SIGNED_IN', session);
        return { data: { user: session.user, session }, error: null };
      },
      signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
        const name = (options?.data?.name as string) ?? email.split('@')[0];
        userStore[email] = { email, name };
        const session = makeMockSession(email, name);
        mockSession = session;
        notify('SIGNED_IN', session);
        return { data: { user: session.user, session }, error: null };
      },
      updateUser: async (attributes: { data?: { name?: string } }) => {
        if (mockSession?.user && attributes.data?.name) {
          mockSession.user.user_metadata = {
            ...mockSession.user.user_metadata,
            name: attributes.data.name,
          };
          const email = mockSession.user.email;
          if (email) {
            userStore[email] = { ...userStore[email], name: attributes.data.name };
          }
        }
        return { data: { user: mockSession?.user ?? null }, error: null };
      },
    },
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (createMockClient() as unknown as ReturnType<typeof createClient>);
