// Minimal diagnostic endpoint — zero dependencies, cannot fail.
// GET https://<domain>/api/ping
export const config = { runtime: 'edge' };

export default function handler(_req: Request): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      time: new Date().toISOString(),
      node: process.version,
      env: {
        GROQ_API_KEY: !!process.env.GROQ_API_KEY,
        GROQ_MODEL: process.env.GROQ_MODEL || '(not set)',
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
