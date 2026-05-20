/**
 * POST /api/seo
 *
 * Generate highly-optimised SEO metadata (target: 90+ score) for a product,
 * category, or page.  All AI calls go through the multi-layer aiRouter
 * (Groq → HuggingFace → static).
 *
 * Request body:
 *   {
 *     pageType:    'product' | 'category' | 'page' | 'homepage',
 *     name:        string,
 *     description?: string,
 *     category?:   string,
 *     mode?:       'generate' | 'improve',           // default: 'generate'
 *     currentSeo?: {                                  // present when mode='improve'
 *       metaTitle?:       string,
 *       metaDescription?: string,
 *       keywords?:        string[],
 *     }
 *   }
 *
 * Response:
 *   { title, metaDescription, keywords: string[], tags: string[],
 *     ogTitle, ogDescription, provider }
 */

import { generateAIResponse } from './lib/aiRouter';

export const config = { runtime: 'edge' };

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const body = await req.json().catch(() => null) as {
    pageType?: string;
    name?: string;
    description?: string;
    category?: string;
    mode?: 'generate' | 'improve';
    currentSeo?: { metaTitle?: string; metaDescription?: string; keywords?: string[] };
  } | null;

  if (!body?.name?.trim()) {
    return new Response(JSON.stringify({ error: '`name` field is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const {
    pageType   = 'product',
    name,
    description = '',
    category    = '',
    mode        = 'generate',
    currentSeo,
  } = body;

  const prompt = buildSeoPrompt(
    pageType,
    name.trim(),
    description.trim(),
    category.trim(),
    mode,
    currentSeo,
  );

  const { text, provider } = await generateAIResponse(prompt, 'seo');

  // Extract the first JSON object from the AI response
  let parsed: {
    title?: string;
    metaDescription?: string;
    keywords?: unknown;
    ogDescription?: string;
    ogTitle?: string;
    tags?: unknown;
  } | null = null;

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
  } catch {
    // fall through to graceful defaults
  }

  const toStrArr = (v: unknown): string[] =>
    Array.isArray(v)
      ? (v as unknown[]).map(String).filter(Boolean)
      : typeof v === 'string'
      ? v.split(',').map((k) => k.trim()).filter(Boolean)
      : [];

  const keywords = toStrArr(parsed?.keywords).length >= 3
    ? toStrArr(parsed?.keywords)
    : [name, category, 'Pakistan', 'online shopping', 'buy online', 'Bejeweled'].filter(Boolean);

  const tags = toStrArr(parsed?.tags).length >= 2
    ? toStrArr(parsed?.tags)
    : [category, 'tableware', 'gifting', 'Pakistan'].filter(Boolean);

  const fallbackTitle = `${name} | Shop Online at Bejeweled Pakistan`;
  const fallbackDesc  = `Shop ${name} at Bejeweled — Pakistan's premium jewelry store. High-quality rings, necklaces, bracelets & earrings with fast delivery across Pakistan. Order online today!`;

  return new Response(
    JSON.stringify({
      title:           parsed?.title           ?? fallbackTitle,
      metaDescription: parsed?.metaDescription ?? fallbackDesc,
      keywords,
      tags,
      ogTitle:         parsed?.ogTitle         ?? parsed?.title ?? fallbackTitle,
      ogDescription:   parsed?.ogDescription   ?? parsed?.metaDescription ?? fallbackDesc,
      provider,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    },
  );
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildSeoPrompt(
  pageType: string,
  name: string,
  description: string,
  category: string,
  mode: 'generate' | 'improve',
  currentSeo?: { metaTitle?: string; metaDescription?: string; keywords?: string[] },
): string {
  const context = [
    `Type: ${pageType}`,
    `Name: ${name}`,
    category    && `Category: ${category}`,
    description && `Description: ${description.slice(0, 300)}`,
  ].filter(Boolean).join('\n');

  const improveBlock = mode === 'improve' && currentSeo
    ? `\nIMPROVE MODE — current SEO to SURPASS (do NOT reuse, reconstruct from scratch):
  Current title: "${currentSeo.metaTitle ?? 'none'}"
  Current description: "${currentSeo.metaDescription ?? 'none'}"
  Current keywords: ${JSON.stringify(currentSeo.keywords ?? [])}
  Goal: produce significantly more optimised output than the above.\n`
    : '';

  return `You are a senior SEO strategist for Bejeweled — a premium Pakistani ecommerce store specialising in rings, necklaces, bracelets, and earrings. Your output MUST score 90+ on an SEO quality rubric that awards points for exact character lengths and keyword richness.
${improveBlock}
PRODUCT CONTEXT:
${context}

MANDATORY FIELD REQUIREMENTS — every single rule must be satisfied:

1. "title" — META TITLE
   • EXACTLY 50–60 characters (count spaces and punctuation)
   • Begin with the PRIMARY KEYWORD
   • Format: [Primary Keyword] [Product Descriptor] | [Brand/Market Signal]
   • Good example (54 chars): "Premium Gold Ring Pakistan | Bejeweled"

2. "metaDescription" — META DESCRIPTION
   • EXACTLY 140–160 characters (count every character)
   • Include: primary keyword → value proposition → call-to-action
   • Must sound persuasive, not robotic
   • Good example (151 chars): "Shop premium gold rings at Bejeweled Pakistan. Ideal for gifting & special occasions. Fast delivery across Pakistan. Browse our full collection today!"

3. "keywords" — KEYWORD ARRAY (MINIMUM 10, MAXIMUM 15 items)
   • MUST include all of these types:
     - Primary keyword (exact product name variant)
     - 3+ long-tail phrases: "best [product] Pakistan", "buy [product] online", "[product] for gifting"
     - 3+ intent keywords using: buy, best, cheap, premium, gift, shop, order
     - 2+ local SEO: "Pakistan", "Karachi", "Lahore", "online shopping Pakistan"
     - 1+ brand keyword: "Bejeweled", "bejeweled.store"
   • No duplicates; no single generic words (e.g. "shop" alone is invalid)

4. "tags" — SEMANTIC CLUSTER TAGS (3–6 items)
   • Category cluster: e.g. "rings", "necklaces", "jewelry"
   • Intent cluster: e.g. "gifting", "premium"
   • Location: "pakistan"

5. "ogTitle" — OPEN GRAPH TITLE (50–65 characters)
   • MORE engaging and emotional than meta title
   • Include social proof or urgency signal
   • MUST differ from "title"

6. "ogDescription" — OPEN GRAPH DESCRIPTION (160–200 characters)
   • Marketing tone — benefit-focused, persuasive
   • MUST differ from "metaDescription"

SELF-CHECK before outputting:
  ✓ title length between 50–60 chars?
  ✓ metaDescription length between 140–160 chars?
  ✓ keywords array has 10–15 items with no duplicates?
  ✓ ogTitle differs from title?
  ✓ ogDescription differs from metaDescription?

Return ONLY valid JSON — no markdown fences, no explanations, no extra keys:
{"title":"...","metaDescription":"...","keywords":["...","...","...","...","...","...","...","...","...","..."],"tags":["...","...","...","..."],"ogTitle":"...","ogDescription":"..."}`;
}
