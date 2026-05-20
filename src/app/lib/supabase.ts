import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let supabaseClient: SupabaseClient<Database> | null = null;

// In-process mutex to replace navigator.locks, preventing lock contention
// warnings when multiple components call auth.getUser()/getSession() on mount.
function inProcessLock<R>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> {
  return fn();
}

export function getSupabaseClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        lock: inProcessLock,
      },
    });
  }

  return supabaseClient;
}