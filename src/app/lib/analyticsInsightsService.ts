/**
 * Client-side service that calls /api/analytics/insights
 * and provides typed results including seasonal, area-wise, and recommendation data.
 */

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SeasonalDataPoint {
  season: 'Winter' | 'Spring' | 'Summer' | 'Autumn';
  revenue: number;
  orders: number;
}

export interface AreaDataPoint {
  city: string;
  revenue: number;
  orders: number;
}

export interface Recommendations {
  stockIncrease: string[];
  lowPerforming: string[];
  trending: string[];
  aiSummary: string;
  aiActions: string[];
}

export interface AnalyticsInsights {
  seasonal: SeasonalDataPoint[];
  areaWise: AreaDataPoint[];
  recommendations: Recommendations;
  blogTopicSuggestions: string[];
  provider: 'groq' | 'huggingface' | 'static';
}

// ── Input shape (matches AdminAnalytics data) ─────────────────────────────────

export interface InsightsInput {
  orders: Array<{
    id: string;
    total: number;
    status: string;
    city?: string;
    createdAt: string;
    items?: Array<{ productId: string; name: string; quantity: number; price: number }>;
  }>;
  products: Array<{
    id: string;
    name: string;
    category: string | null;
    revenue: number;
    ordersCount: number;
  }>;
}

// ── Service function ──────────────────────────────────────────────────────────

export async function fetchAnalyticsInsights(input: InsightsInput): Promise<AnalyticsInsights> {
  const res = await fetch(`${API_BASE}/api/analytics/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<AnalyticsInsights>;
}
