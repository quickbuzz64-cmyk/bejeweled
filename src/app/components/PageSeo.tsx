import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getSeoMetadata, type SeoMetadata } from '../lib/seo';

// ── Base PageSeo ──────────────────────────────────────────────────────────────

type PageSeoProps = {
  title: string;
  description?: string;
  keywords?: string | string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
};

function toFullTitle(title: string) {
  return title.includes('Bejeweled') ? title : `${title} | Bejeweled`;
}

export function PageSeo({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  canonical,
}: PageSeoProps) {
  const fullTitle = toFullTitle(title);
  const kw = Array.isArray(keywords) ? keywords.join(', ') : keywords;
  const resolvedOgTitle = ogTitle || fullTitle;
  const resolvedOgDesc = ogDescription || description;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {kw && <meta name="keywords" content={kw} />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={resolvedOgTitle} />
      {resolvedOgDesc && <meta property="og:description" content={resolvedOgDesc} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedOgTitle} />
      {resolvedOgDesc && <meta name="twitter:description" content={resolvedOgDesc} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
}

// ── DynamicPageSeo ────────────────────────────────────────────────────────────
// Fetches SEO metadata from the seo_metadata table and injects it into <head>.
// Falls back to the provided defaults if no DB record exists.

type DynamicPageSeoProps = {
  entityType: 'product' | 'page';
  entityId: string;
  fallbackTitle: string;
  fallbackDescription?: string;
  fallbackKeywords?: string | string[];
  ogImage?: string;
  canonical?: string;
};

export function DynamicPageSeo({
  entityType,
  entityId,
  fallbackTitle,
  fallbackDescription,
  fallbackKeywords,
  ogImage,
  canonical,
}: DynamicPageSeoProps) {
  const [seo, setSeo] = useState<SeoMetadata | null>(null);

  useEffect(() => {
    getSeoMetadata(entityType, entityId)
      .then(setSeo)
      .catch(() => setSeo(null));
  }, [entityType, entityId]);

  return (
    <PageSeo
      title={seo?.metaTitle || fallbackTitle}
      description={seo?.metaDescription || fallbackDescription}
      keywords={seo?.keywords.length ? seo.keywords : fallbackKeywords}
      ogTitle={seo?.ogTitle || undefined}
      ogDescription={seo?.ogDescription || undefined}
      ogImage={ogImage}
      canonical={canonical}
    />
  );
}
