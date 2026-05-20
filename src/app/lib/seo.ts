import { getSupabaseClient } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SeoMetadata {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  tags: string[];
  ogTitle: string;
  ogDescription: string;
  updatedAt?: string;
}

export const EMPTY_SEO: Omit<SeoMetadata, 'updatedAt'> = {
  metaTitle: '',
  metaDescription: '',
  keywords: [],
  tags: [],
  ogTitle: '',
  ogDescription: '',
};

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getSeoMetadata(
  entityType: 'product' | 'page',
  entityId: string,
): Promise<SeoMetadata | null> {
  const { data, error } = await getSupabaseClient()
    .from('seo_metadata')
    .select('meta_title, meta_description, keywords, tags, og_title, og_description, updated_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    metaTitle: (data.meta_title as string) ?? '',
    metaDescription: (data.meta_description as string) ?? '',
    keywords: (data.keywords as string[]) ?? [],
    tags: (data.tags as string[]) ?? [],
    ogTitle: (data.og_title as string) ?? '',
    ogDescription: (data.og_description as string) ?? '',
    updatedAt: data.updated_at as string,
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function saveSeoMetadata(
  entityType: 'product' | 'page',
  entityId: string,
  data: Omit<SeoMetadata, 'updatedAt'>,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('seo_metadata')
    .upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        meta_title: data.metaTitle.trim() || null,
        meta_description: data.metaDescription.trim() || null,
        keywords: data.keywords.length > 0 ? data.keywords : null,
        tags: data.tags.length > 0 ? data.tags : null,
        og_title: data.ogTitle.trim() || null,
        og_description: data.ogDescription.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'entity_type,entity_id' },
    );

  if (error) throw new Error(error.message);
}

// ── SEO score heuristic (0–100) ───────────────────────────────────────────────
//
// Bands: 60–70 = weak | 70–85 = good | 85–95 = strong | 95+ = exceptional
// AI-generated output targeting 90+ must satisfy ALL four fields at high quality.

export function computeSeoScore(data: Pick<SeoMetadata, 'metaTitle' | 'metaDescription' | 'keywords' | 'ogTitle' | 'ogDescription'>): number {
  let score = 0;

  // ── Title — 25 pts (ideal: 50–60 chars, CTR-optimised) ───────────────────
  const titleLen = data.metaTitle.trim().length;
  if (titleLen >= 50 && titleLen <= 60) score += 25;       // perfect
  else if (titleLen >= 45 && titleLen <= 64) score += 20;  // near-perfect
  else if (titleLen >= 35 && titleLen <= 70) score += 14;  // acceptable
  else if (titleLen >= 20) score += 7;                      // weak
  // 0 pts if empty or under 20 chars

  // ── Description — 30 pts (ideal: 140–160 chars, keyword-dense + CTA) ─────
  const descLen = data.metaDescription.trim().length;
  if (descLen >= 140 && descLen <= 160) score += 30;       // perfect
  else if (descLen >= 120 && descLen <= 170) score += 22;  // near-perfect
  else if (descLen >= 80 && descLen <= 180) score += 14;   // acceptable
  else if (descLen >= 30) score += 7;                       // weak

  // ── Keywords — 25 pts (ideal: 10–15 diverse, intent-based) ───────────────
  const kwCount = data.keywords.length;
  if (kwCount >= 10) score += 25;                           // excellent
  else if (kwCount >= 7) score += 20;                       // good
  else if (kwCount >= 5) score += 14;                       // ok
  else if (kwCount >= 2) score += 8;                        // weak
  else if (kwCount === 1) score += 4;

  // ── OG metadata — 20 pts (unique, marketing-tone) ────────────────────────
  const hasOgTitle = data.ogTitle.trim().length > 0;
  const hasOgDesc  = data.ogDescription.trim().length > 0;
  const ogDistinct =
    data.ogTitle.trim()       !== data.metaTitle.trim() ||
    data.ogDescription.trim() !== data.metaDescription.trim();
  if (hasOgTitle && hasOgDesc && ogDistinct) score += 20;  // both + unique
  else if (hasOgTitle && hasOgDesc)           score += 15;  // both but identical
  else if (hasOgTitle || hasOgDesc)           score += 8;   // only one

  return Math.min(100, score);
}
