/**
 * POST /api/analytics/insights
 *
 * Generates AI-powered analytics insights: seasonal trends, area-wise analysis,
 * product recommendations (rule-based + AI summarisation).
 *
 * Request body:
 *   { orders: AnalyticsOrder[], products: ProductSummary[] }
 *
 * Response:
 *   { seasonal, areaWise, recommendations, provider }
 */

import { generateAIResponse } from '../lib/aiRouter';

export const config = { runtime: 'edge' };

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  total: number;
  status: string;
  city?: string;
  createdAt: string;
  items?: OrderItem[];
}

interface ProductSummary {
  id: string;
  name: string;
  category: string | null;
  revenue: number;
  ordersCount: number;
}

function getSeason(dateStr: string): 'Winter' | 'Spring' | 'Summer' | 'Autumn' {
  const month = new Date(dateStr).getMonth() + 1; // 1-12
  if (month >= 12 || month <= 2) return 'Winter';
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  return 'Autumn';
}

function computeSeasonalBreakdown(orders: Order[]) {
  const seasons: Record<string, { revenue: number; orders: number }> = {
    Winter: { revenue: 0, orders: 0 },
    Spring: { revenue: 0, orders: 0 },
    Summer: { revenue: 0, orders: 0 },
    Autumn: { revenue: 0, orders: 0 },
  };
  for (const o of orders) {
    const s = getSeason(o.createdAt);
    seasons[s].revenue += Number(o.total);
    seasons[s].orders += 1;
  }
  return Object.entries(seasons).map(([season, data]) => ({ season, ...data }));
}

function computeAreaBreakdown(orders: Order[]) {
  const cityMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const city = (o.city?.trim() || 'Unknown').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const existing = cityMap.get(city) ?? { revenue: 0, orders: 0 };
    cityMap.set(city, { revenue: existing.revenue + Number(o.total), orders: existing.orders + 1 });
  }
  return Array.from(cityMap.entries())
    .map(([city, data]) => ({ city, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

function computeRuleBasedRecommendations(products: ProductSummary[]) {
  if (!products.length) return { stockIncrease: [], lowPerforming: [], trending: [] };

  const sorted = [...products].sort((a, b) => b.revenue - a.revenue);
  const avgRevenue = sorted.reduce((s, p) => s + p.revenue, 0) / sorted.length;

  const stockIncrease = sorted.filter((p) => p.revenue > avgRevenue * 1.5).slice(0, 5).map((p) => p.name);
  const lowPerforming = sorted.filter((p) => p.revenue < avgRevenue * 0.3 && p.ordersCount < 3).slice(0, 5).map((p) => p.name);
  const trending = sorted.filter((p) => p.revenue >= avgRevenue && p.ordersCount >= 3).slice(0, 5).map((p) => p.name);

  return { stockIncrease, lowPerforming, trending };
}

function buildInsightsPrompt(
  seasonal: ReturnType<typeof computeSeasonalBreakdown>,
  areaWise: ReturnType<typeof computeAreaBreakdown>,
  ruleRecs: ReturnType<typeof computeRuleBasedRecommendations>,
): string {
  return `You are an expert e-commerce analytics advisor for Bejeweled, a Pakistani online store.

Seasonal Sales Data:
${seasonal.map((s) => `${s.season}: ${s.orders} orders, PKR ${Math.round(s.revenue).toLocaleString()}`).join('\n')}

Top Cities:
${areaWise.slice(0, 5).map((a) => `${a.city}: ${a.orders} orders, PKR ${Math.round(a.revenue).toLocaleString()}`).join('\n')}

Rule-based insights:
- Top performers (stock increase recommended): ${ruleRecs.stockIncrease.join(', ') || 'None'}
- Low performers: ${ruleRecs.lowPerforming.join(', ') || 'None'}
- Trending products: ${ruleRecs.trending.join(', ') || 'None'}

Write a concise analytics summary (3-4 sentences) covering seasonal trends, geographic insights, and actionable recommendations. Then list 3 specific actions the business should take. Be practical and Pakistan-market aware.

Return ONLY valid JSON:
{"summary":"...","actions":["...","...","..."],"blogTopicSuggestions":["...","...","..."]}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const body = await req.json().catch(() => null) as {
    orders?: Order[];
    products?: ProductSummary[];
  } | null;

  const orders = body?.orders ?? [];
  const products = body?.products ?? [];

  const seasonal = computeSeasonalBreakdown(orders);
  const areaWise = computeAreaBreakdown(orders);
  const ruleRecs = computeRuleBasedRecommendations(products);

  let aiSummary = '';
  let aiActions: string[] = [];
  let blogTopicSuggestions: string[] = [];
  let provider = 'static';

  try {
    const prompt = buildInsightsPrompt(seasonal, areaWise, ruleRecs);
    const result = await generateAIResponse(prompt, 'analytics');
    provider = result.provider;

    let parsed: Record<string, unknown> | null = null;
    try {
      const m = result.text.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]) as Record<string, unknown>;
    } catch { /* fall through */ }

    aiSummary = String(parsed?.summary ?? result.text.slice(0, 300));
    aiActions = Array.isArray(parsed?.actions) ? (parsed.actions as unknown[]).map(String) : [];
    blogTopicSuggestions = Array.isArray(parsed?.blogTopicSuggestions)
      ? (parsed.blogTopicSuggestions as unknown[]).map(String)
      : [];
  } catch {
    aiSummary = 'AI insights temporarily unavailable. Review the data tables for current trends.';
  }

  return new Response(
    JSON.stringify({
      seasonal,
      areaWise,
      recommendations: {
        stockIncrease: ruleRecs.stockIncrease,
        lowPerforming: ruleRecs.lowPerforming,
        trending: ruleRecs.trending,
        aiSummary,
        aiActions,
      },
      blogTopicSuggestions,
      provider,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
  );
}
