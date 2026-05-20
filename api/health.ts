// Diagnostic endpoint — returns env var presence and import status
// Hit GET https://<domain>/api/health to debug FUNCTION_INVOCATION_FAILED

export const config = { runtime: 'edge' };

export default async function handler(_req: Request): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const result: Record<string, unknown> = {
    ok: false,
    time: new Date().toISOString(),
    node: process.version,
    env: {
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      GROQ_MODEL: process.env.GROQ_MODEL ?? '(not set)',
      HUGGINGFACE_API_TOKEN: !!process.env.HUGGINGFACE_API_TOKEN,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      VERCEL: !!process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
    },
    imports: {} as Record<string, boolean | string>,
  };

  const imports = result.imports as Record<string, boolean | string>;

  try {
    await import('./lib/supabaseServer');
    imports.supabaseServer = true;
  } catch (e) {
    imports.supabaseServer = String(e);
  }

  try {
    await import('./lib/openrouter');
    imports.openrouter = true;
  } catch (e) {
    imports.openrouter = String(e);
  }

  try {
    await import('ai');
    imports.ai = true;
  } catch (e) {
    imports.ai = String(e);
  }

  result.ok = imports.supabaseServer === true && imports.openrouter === true && imports.ai === true;

  return new Response(JSON.stringify(result, null, 2), { status: 200, headers });
}
