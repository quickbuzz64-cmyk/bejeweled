import { useEffect, useState } from 'react';
import { getSupabaseClient } from './supabase';

export interface AuthSession {
  isAuthenticated: boolean;
  firstName: string;
  lastName?: string;
  email: string;
}

export type AuthSessionState = AuthSession | null | undefined;

function userToAuthSession(user: { email?: string; user_metadata?: Record<string, unknown> } | null): AuthSession | null {
  if (!user || !user.email) {
    return null;
  }

  const meta = user.user_metadata ?? {};
  const firstName = (meta.first_name as string) || user.email.split('@')[0]?.split(/[._-]/)[0] || 'User';

  return {
    isAuthenticated: true,
    firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    lastName: (meta.last_name as string) || undefined,
    email: user.email,
  };
}

function getEmailRedirectUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  return 'https://bejeweled.store/auth/callback';
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return userToAuthSession(data.user);
}

export async function signUp(email: string, password: string, metadata?: { firstName?: string; lastName?: string }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
      data: {
        first_name: metadata?.firstName ?? '',
        last_name: metadata?.lastName ?? '',
      },
    },
  });

  if (error) {
    throw error;
  }

  // If data.session is null, Supabase requires email confirmation before the user is signed in.
  // If data.session exists, the user is immediately authenticated (email confirmation disabled).
  return {
    user: userToAuthSession(data.user),
    requiresConfirmation: data.session === null,
  };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return userToAuthSession(data.session?.user ?? null);
}

export async function getUserRole(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as string;
}

/** Keep old names working for existing consumers */
export function saveAuthSession(_session: AuthSession) {
  // No-op — Supabase manages sessions automatically
}

export function clearAuthSession() {
  void signOut();
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSessionState>(() => {
    // Synchronously read the cached Supabase session from localStorage so the
    // header renders with the correct auth state on first paint (prevents flicker).
    if (typeof window === 'undefined') return undefined;
    try {
      const keys = Object.keys(localStorage);
      const authKey = keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!authKey) return null; // No stored token → definitely logged out
      const raw = localStorage.getItem(authKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { user?: { email?: string; user_metadata?: Record<string, unknown> } } | null;
      return userToAuthSession(parsed?.user ?? null);
    } catch {
      return undefined; // Can't read — resolve asynchronously as normal
    }
  });

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Read current session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(userToAuthSession(data.session?.user ?? null));
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      setSession(userToAuthSession(supabaseSession?.user ?? null));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return session;
}