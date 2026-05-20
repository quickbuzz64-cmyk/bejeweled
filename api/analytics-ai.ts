/**
 * POST /api/analytics-ai
 *
 * Generate AI-powered insights from a live analytics snapshot.
 * All AI calls go through the multi-layer aiRouter (Groq → HuggingFace → static).
 *
 * Request body:
 *   {
 *     filter: '7d' | '30d' | '3mo' | 'all',
 *     metrics: { revenue, count, avg, cancelledRate },
 *     topProducts: { name, revenue, qty }[],
 *     topCities: { city, revenue, orders }[],
 *     statusBreakdown: { status, count }[],
 *     monthlyRevenue: { month, revenue }[],
 *   }
 *
 * Response:
 *   { insights: string, trends: string, recommendations: string[], provider }
 */

import { generateAIResponse } from './lib/aiRouter';

export const config = { runtime: 'edge' };

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface AnalyticsPayload {
  filter: string;
  metrics: {
    revenue: number;
    count: number;
    avg: number;
    cancelledRate: number;
  };
  topProducts?: { name: string; revenue: number; qty: number }[];
  topCities?: { city: string; revenue: number; orders: number }[];
  statusBreakdown?: { status: string; count: number }[];
  monthlyRevenue?: { month: string; revenue: number }[];
}

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

  const body = await req.json().catch(() => null) as AnalyticsPayload | null;

  if (!body?.metrics) {
    return new Response(JSON.stringify({ error: '`metrics` field is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const prompt = buildAnalyticsPrompt(body);
  const { text, provider } = await generateAIResponse(prompt, 'analytics');

  // Try to parse a structured JSON response; fall back to plain text sections
  let parsed: {
    insights?: string;
    trends?: string;
    recommendations?: unknown;
  } | null = null;

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
  } catch {
    // fall through
  }

  const rawRec = parsed?.recommendations;
  const recommendations: string[] = Array.isArray(rawRec)
    ? (rawRec as string[]).map(String)
    : typeof rawRec === 'string'
    ? rawRec.split('\n').map((s: string) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
    : extractBullets(text);

  return new Response(
    JSON.stringify({
      insights: parsed?.insights ?? extractSection(text, 'insights') ?? text.slice(0, 400),
      trends: parsed?.trends ?? extractSection(text, 'trends') ?? '',
      recommendations,
      provider,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    },
  );
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildAnalyticsPrompt(data: AnalyticsPayload): string {
  const { filter, metrics, topProducts = [], topCities = [], statusBreakdown = [], monthlyRevenue = [] } = data;

  const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK')}`;

  const productLines = topProducts
    .slice(0, 5)
    .map((p, i) => `  ${i + 1}. ${p.name}: ${fmt(p.revenue)} (${p.qty} units)`)
    .join('\n');

  const cityLines = topCities
    .slice(0, 5)
    .map((c, i) => `  ${i + 1}. ${c.city}: ${fmt(c.revenue)} (${c.orders} orders)`)
    .join('\n');

  const statusLines = statusBreakdown
    .map((s) => `  ${s.status}: ${s.count}`)
    .join('\n');

  const monthlyLines = monthlyRevenue
    .slice(-6)
    .map((m) => `  ${m.month}: ${fmt(m.revenue)}`)
    .join('\n');

  return `You are a senior ecommerce analytics consultant for Bejeweled — a Pakistani online store selling rings, necklaces, bracelets, and earrings.

Analyse the following real performance data for the period: ${filter}

METRICS:
- Total Revenue: ${fmt(metrics.revenue)}
- Total Orders: ${metrics.count}
- Average Order Value: ${fmt(metrics.avg)}
- Cancellation Rate: ${metrics.cancelledRate.toFixed(1)}%

TOP PRODUCTS:
${productLines || '  (no data)'}

TOP CITIES:
${cityLines || '  (no data)'}

ORDER STATUS BREAKDOWN:
${statusLines || '  (no data)'}

MONTHLY REVENUE TREND:
${monthlyLines || '  (no data)'}

Provide a concise, actionable analysis.

Return ONLY valid JSON — no markdown fences, no extra text:
{
  "insights": "2–3 sentence summary of key performance highlights and concerns",
  "trends": "1–2 sentence description of revenue and order trends",
  "recommendations": [
    "Specific action 1",
    "Specific action 2",
    "Specific action 3",
    "Specific action 4"
  ]
}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractSection(text: string, key: string): string | null {
  const re = new RegExp(`${key}[:\\s]*([^\\n]{10,})`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function extractBullets(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^[\d.)\-•*]+\s*/, '').trim())
    .filter((l) => l.length > 15)
    .slice(0, 5);
}
