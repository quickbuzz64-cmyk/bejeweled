/**
 * POST /api/seo/bulk
 *
 * Sequential (not parallel) bulk SEO generation for multiple products.
 * Processes each item one at a time to avoid rate-limiting the AI providers.
 *
 * Request body:
 *   {
 *     products: Array<{ id: string; name: string; category?: string; description?: string }>,
 *     mode: 'generate' | 'improve'   // 'improve' skips items that already have SEO unless overridden
 *   }
 *
 * Response (streaming NDJSON — one JSON object per line as each item completes):
 *   { index: number, id: string, status: 'ok'|'error', seo?: {...}, error?: string, provider?: string }
 * Final line:
 *   { done: true, total: number, succeeded: number, failed: number }
 */

import { generateAIResponse } from '../lib/aiRouter';
import { getSupabaseAdmin } from '../lib/supabaseServer';

export const config = { runtime: 'edge' };

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface BulkProduct {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

interface SeoResult {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  tags: string[];
  ogTitle: string;
  ogDescription: string;
}

function buildPrompt(
  name: string,
  category: string,
  description: string,
  mode: 'generate' | 'improve',
  currentTitle?: string,
  currentDescription?: string,
): string {
  const context = [
    `Name: ${name}`,
    category    && `Category: ${category}`,
    description && `Description: ${description.slice(0, 250)}`,
  ].filter(Boolean).join('\n');

  const improveBlock = mode === 'improve' && currentTitle
    ? `\nIMPROVE MODE — current SEO to SURPASS (reconstruct completely, do NOT reuse):
  Current title: "${currentTitle}"
  Current description: "${currentDescription ?? 'none'}"
  Goal: produce significantly more optimised output.\n`
    : '';

  return `You are a senior SEO strategist for Bejeweled — a premium Pakistani ecommerce store selling rings, necklaces, bracelets, and earrings. Produce output that scores 90+ on SEO quality (exact lengths + keyword richness matter).
${improveBlock}
PRODUCT:
${context}

REQUIREMENTS:
1. "title": EXACTLY 50–60 characters. Start with primary keyword. Format: [Keyword] [Descriptor] | [Brand]
2. "metaDescription": EXACTLY 140–160 characters. Include primary keyword + value proposition + call-to-action.
3. "keywords": Array of MINIMUM 10, MAXIMUM 15 items. Must include:
   - Long-tail phrases: "best [product] Pakistan", "buy [product] online", "[product] for gifting"
   - Intent keywords: buy, best, premium, gift, shop, order
   - Local SEO: "Pakistan", "Karachi", "Lahore", "online shopping Pakistan"
   - Brand: "Bejeweled", "bejeweled.store"
   No single-word generics; no duplicates.
4. "tags": 3–6 semantic cluster tags (category + intent + location).
5. "ogTitle": 50–65 chars, more emotional/engaging than title, MUST differ from title.
6. "ogDescription": 160–200 chars, marketing tone, MUST differ from metaDescription.

Return ONLY valid JSON — no markdown, no explanations:
{"title":"...","metaDescription":"...","keywords":["...","...","...","...","...","...","...","...","...","..."],"tags":["...","...","...","..."],"ogTitle":"...","ogDescription":"..."}`;
}

function parseSeoResponse(text: string, name: string): SeoResult {
  let parsed: Record<string, unknown> | null = null;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]) as Record<string, unknown>;
  } catch { /* fall through */ }

  const toStrArr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).map(String) : typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

  return {
    metaTitle:       String(parsed?.title ?? `${name} | Shop Online at Bejeweled Pakistan`),
    metaDescription: String(parsed?.metaDescription ?? `Shop ${name} at Bejeweled Pakistan. Premium quality jewelry delivered fast. Order online today!`),
    keywords: toStrArr(parsed?.keywords).length >= 3 ? toStrArr(parsed?.keywords) : [name, category, 'Pakistan', 'buy online', 'Bejeweled', 'online shopping Pakistan'].filter(Boolean),
    tags:     toStrArr(parsed?.tags).length >= 2     ? toStrArr(parsed?.tags)     : [category, 'jewelry', 'gifting', 'Pakistan'].filter(Boolean),
    ogTitle:      String(parsed?.ogTitle      ?? parsed?.title         ?? `✨ ${name} | Bejeweled Pakistan`),
    ogDescription: String(parsed?.ogDescription ?? parsed?.metaDescription ?? `Discover ${name} at Bejeweled — Pakistan's top jewelry store. Premium rings, necklaces & bracelets, fast delivery, great prices.`),
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const body = await req.json().catch(() => null) as {
    products?: BulkProduct[];
    mode?: 'generate' | 'improve';
  } | null;

  const products = body?.products;
  const mode = body?.mode ?? 'generate';

  if (!Array.isArray(products) || products.length === 0) {
    return new Response(JSON.stringify({ error: '`products` array is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
  if (products.length > 50) {
    return new Response(JSON.stringify({ error: 'Maximum 50 products per batch' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const supabase = getSupabaseAdmin();

  // Load existing SEO for 'improve' mode — fetch both title and description
  const existingMap = new Map<string, { title: string; description: string }>();
  if (mode === 'improve') {
    const ids = products.map((p) => p.id);
    const { data } = await supabase
      .from('seo_metadata')
      .select('entity_id, meta_title, meta_description')
      .eq('entity_type', 'product')
      .in('entity_id', ids);
    if (data) {
      for (const row of data) {
        if (row.meta_title) {
          existingMap.set(row.entity_id as string, {
            title:       (row.meta_title as string) ?? '',
            description: (row.meta_description as string) ?? '',
          });
        }
      }
    }
  }

  // Stream results as NDJSON
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const existing = existingMap.get(product.id);

        try {
          const prompt = buildPrompt(
            product.name,
            product.category ?? '',
            product.description ?? '',
            mode,
            existing?.title,
            existing?.description,
          );

          const { text, provider } = await generateAIResponse(prompt, 'seo');
          const seo = parseSeoResponse(text, product.name);

          // Upsert into seo_metadata
          await supabase.from('seo_metadata').upsert({
            entity_type: 'product',
            entity_id: product.id,
            meta_title: seo.metaTitle,
            meta_description: seo.metaDescription,
            keywords: seo.keywords,
            tags: seo.tags,
            og_title: seo.ogTitle,
            og_description: seo.ogDescription,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'entity_type,entity_id' });

          succeeded++;
          const line = JSON.stringify({ index: i, id: product.id, status: 'ok', seo, provider }) + '\n';
          controller.enqueue(encoder.encode(line));
        } catch (err) {
          failed++;
          const line = JSON.stringify({
            index: i,
            id: product.id,
            status: 'error',
            error: (err as Error).message ?? 'Unknown error',
          }) + '\n';
          controller.enqueue(encoder.encode(line));
        }

        // Small yield between requests to avoid overwhelming providers
        await new Promise((r) => setTimeout(r, 300));
      }

      const summary = JSON.stringify({ done: true, total: products.length, succeeded, failed }) + '\n';
      controller.enqueue(encoder.encode(summary));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      ...CORS_HEADERS,
    },
  });
}
