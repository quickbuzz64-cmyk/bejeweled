import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Do NOT throw at module load time — a module-level throw causes
// FUNCTION_INVOCATION_FAILED on Vercel before any error response can be sent.
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  '';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    if (!supabaseUrl) {
      throw new Error(
        '[supabaseServer] Missing Supabase URL. Set VITE_SUPABASE_URL, SUPABASE_URL, or NEXT_PUBLIC_SUPABASE_URL in your environment.',
      );
    }
    if (!serviceRoleKey) {
      throw new Error(
        '[supabaseServer] Missing SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    _client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/** @deprecated Use getSupabaseAdmin() instead — kept for backward compat */
export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : (null as unknown as SupabaseClient);
