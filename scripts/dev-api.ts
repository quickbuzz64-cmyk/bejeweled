/**
 * Local development API server — mirrors Vercel serverless function behaviour
 * so that `npm run dev:api` serves /api/* on port 3001 alongside Vite on 5173.
 *
 * Run both together: `npm run dev:all`
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import http from 'node:http';
import { Readable } from 'node:stream';
import { URL } from 'node:url';

const PORT = 3001;

// Dynamically import handlers so they pick up any edits on restart
async function getHandler(pathname: string) {
  // Strip leading /api/ to get the module path
  const rel = pathname.replace(/^\/api\//, '');
  const modulePath = new URL(`../api/${rel}.ts`, import.meta.url);
  // Clear cache by appending a bust param (tsx doesn't support HMR, restart needed)
  const mod = await import(modulePath.pathname);
  return mod.default as (req: Request) => Promise<Response>;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  // Only handle /api/* routes
  if (!url.pathname.startsWith('/api/')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Read body
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);

  // Build a Web API Request that the handlers expect
  const webReq = new Request(`http://localhost:${PORT}${url.pathname}${url.search}`, {
    method: req.method ?? 'GET',
    headers: req.headers as HeadersInit,
    body: body.length > 0 ? body : null,
  });

  try {
    const handler = await getHandler(url.pathname);
    const webRes = await handler(webReq);

    // Strip hop-by-hop headers — forwarding them conflicts with Node's own
    // chunked transfer encoding and can cause the proxy to buffer all chunks
    // before flushing, making streaming appear broken.
    const headers = Object.fromEntries(webRes.headers.entries());
    delete headers['content-length'];
    delete headers['transfer-encoding'];
    delete headers['connection'];
    res.writeHead(webRes.status, headers);

    // Pipe body stream chunk-by-chunk — Node.js HTTP response auto-uses
    // chunked transfer encoding and flushes each write immediately.
    if (webRes.body) {
      const readable = Readable.from(webRes.body as unknown as AsyncIterable<Uint8Array>);
      readable.on('error', (err) => {
        console.error('[dev-api] stream error:', err.message);
        if (!res.writableEnded) res.end();
      });
      readable.pipe(res);
    } else {
      res.end();
    }
  } catch (e) {
    console.error('[dev-api]', e);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
});

// Kill whatever is occupying the port, then start listening
async function start() {
  try {
    // Try to kill any leftover process on PORT
    const { execSync } = await import('node:child_process');
    const pids = execSync(`lsof -ti:${PORT} 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (pids) {
      for (const pid of pids.split('\n')) {
        try { process.kill(Number(pid), 'SIGKILL'); } catch {}
      }
      // Brief wait for OS to release the port
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch {
    // No process on port — fine
  }

  server.listen(PORT, () => {
    console.log(`[dev-api] Listening on http://localhost:${PORT}`);
  });
}

start();
