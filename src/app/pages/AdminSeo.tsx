import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Loader2,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  Globe,
  Share2,
  Package,
  BookOpen,
  X,
  ChevronDown,
  Zap,
  CheckCircle2,
  XCircle,
  Square,
  CheckSquare,
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { getSeoMetadata, saveSeoMetadata, computeSeoScore, EMPTY_SEO, type SeoMetadata } from '../lib/seo';
import { showSuccessToast, showErrorToast } from '../lib/notifications';

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

const STATIC_PAGES = [
  { id: 'home', label: 'Homepage', description: 'Main landing page' },
  { id: 'about', label: 'About Us', description: 'Our story and values' },
  { id: 'shop', label: 'Shop', description: 'Product listing page' },
  { id: 'contact', label: 'Contact', description: 'Contact information page' },
  { id: 'faq', label: 'FAQ', description: 'Frequently asked questions' },
  { id: 'legal', label: 'Legal / Terms', description: 'Terms and privacy policy' },
] as const;

type StaticPageId = (typeof STATIC_PAGES)[number]['id'];
type EntityTab = 'product' | 'page';
type AiProvider = 'groq' | 'huggingface' | 'static';

const PROVIDER_BADGE: Record<AiProvider, { bg: string; text: string; label: string }> = {
  groq: { bg: '#F0FDF4', text: '#059669', label: 'Groq AI' },
  huggingface: { bg: '#FEF3C7', text: '#D97706', label: 'HuggingFace AI' },
  static: { bg: '#F3F4F6', text: '#6B7280', label: 'Fallback Template' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? '#059669' : score >= 70 ? '#D97706' : '#DC2626';
  const label = score >= 95 ? 'Exceptional' : score >= 85 ? 'Strong' : score >= 70 ? 'Good' : 'Weak';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold w-32 text-right" style={{ color, fontFamily: 'Inter, sans-serif' }}>
        {score}/100 — {label}
      </span>
    </div>
  );
}

function CharCounter({ value, max, warn }: { value: string; max: number; warn?: number }) {
  const len = value.length;
  const threshold = warn ?? max;
  const color = len > max ? '#DC2626' : len >= threshold ? '#D97706' : '#9CA3AF';
  return (
    <span className="text-xs ml-1" style={{ color, fontFamily: 'Inter, sans-serif' }}>
      {len}/{max}
    </span>
  );
}

function ChipInput({
  label,
  values,
  onChange,
  placeholder,
  error,
}: {
  label: React.ReactNode;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  error?: string;
}) {
  const [inputVal, setInputVal] = useState('');

  const add = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputVal('');
  };

  const remove = (chip: string) => onChange(values.filter((v) => v !== chip));

  return (
    <div>
      <label className="block mb-1.5 text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>
        {label}
      </label>
      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-xl min-h-[44px]"
        style={{ border: `1px solid ${error ? '#FCA5A5' : '#E8D5F5'}`, backgroundColor: '#FAFAF9' }}
      >
        {values.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#F0F7EF', color: '#3B0D4A', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
          >
            {chip}
            <button type="button" onClick={() => remove(chip)} className="hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={placeholder ?? 'Type and press Enter'}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none"
          style={{ fontFamily: 'Inter, sans-serif', color: '#1F2937' }}
        />
      </div>
      {error ? (
        <p className="text-xs mt-1" style={{ color: '#DC2626', fontFamily: 'Inter, sans-serif' }}>{error}</p>
      ) : (
        <p className="text-xs mt-1" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
          Press Enter or comma to add
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminSeo() {
  const { data: products, loading: productsLoading } = useProducts();
  const [topMode, setTopMode] = useState<'single' | 'bulk'>('single');

  // Entity selection
  const [entityTab, setEntityTab] = useState<EntityTab>('product');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedPageId, setSelectedPageId] = useState<StaticPageId>('home');

  // SEO form
  const [seoForm, setSeoForm] = useState<Omit<SeoMetadata, 'updatedAt'>>({ ...EMPTY_SEO });
  const [seoLastUpdated, setSeoLastUpdated] = useState<string | null>(null);

  // UI state
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const score = computeSeoScore(seoForm);

  // ── Load existing SEO when entity changes ────────────────────────────────
  const loadForEntity = useCallback(async (type: EntityTab, id: string) => {
    if (!id) {
      setSeoForm({ ...EMPTY_SEO });
      setSeoLastUpdated(null);
      return;
    }
    setLoadingExisting(true);
    try {
      const existing = await getSeoMetadata(type, id);
      if (existing) {
        const { updatedAt, ...fields } = existing;
        setSeoForm(fields);
        setSeoLastUpdated(updatedAt ?? null);
      } else {
        setSeoForm({ ...EMPTY_SEO });
        setSeoLastUpdated(null);
      }
    } finally {
      setLoadingExisting(false);
    }
  }, []);

  useEffect(() => {
    const id = entityTab === 'product' ? selectedProductId : selectedPageId;
    void loadForEntity(entityTab, id);
  }, [entityTab, selectedProductId, selectedPageId, loadForEntity]);

  // ── Build AI request context ─────────────────────────────────────────────
  const getAiContext = () => {
    if (entityTab === 'product') {
      const p = products.find((x) => x.id === selectedProductId);
      if (!p) return null;
      return { pageType: 'product' as const, name: p.name, category: p.category ?? '', description: '' };
    }
    const page = STATIC_PAGES.find((p) => p.id === selectedPageId);
    return {
      pageType: 'page' as const,
      name: page?.label ?? selectedPageId,
      category: '',
      description: page?.description ?? '',
    };
  };

  // ── AI generation ────────────────────────────────────────────────────────
  const generateSeo = async (mode: 'generate' | 'improve') => {
    const ctx = getAiContext();
    if (!ctx) return;
    setAiLoading(true);
    setAiError(null);
    setAiProvider(null);

    try {
      const body: Record<string, unknown> = {
        pageType: ctx.pageType,
        name: ctx.name,
        category: ctx.category,
        description: ctx.description,
        mode,
      };

      // Pass current SEO to improve mode so AI can reconstruct meaningfully
      if (mode === 'improve' && (seoForm.metaTitle || seoForm.metaDescription)) {
        body.currentSeo = {
          metaTitle:       seoForm.metaTitle,
          metaDescription: seoForm.metaDescription,
          keywords:        seoForm.keywords,
        };
      }

      const res = await fetch(`${API_BASE}/api/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: 'Request failed' }))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        title: string;
        metaDescription: string;
        keywords: string[];
        tags: string[];
        ogTitle: string;
        ogDescription: string;
        provider: AiProvider;
      };

      setSeoForm({
        metaTitle: data.title ?? '',
        metaDescription: data.metaDescription ?? '',
        keywords: data.keywords ?? [],
        tags: data.tags ?? [],
        ogTitle: data.ogTitle ?? '',
        ogDescription: data.ogDescription ?? '',
      });
      setAiProvider(data.provider);
    } catch (err) {
      setAiError((err as Error).message ?? 'AI generation failed. You can enter SEO manually.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!seoForm.metaTitle.trim()) errs.metaTitle = 'Meta title is required.';
    else if (seoForm.metaTitle.length > 70) errs.metaTitle = 'Title should be 50–60 characters for best score.';
    if (seoForm.metaDescription && seoForm.metaDescription.length > 160)
      errs.metaDescription = 'Meta description must be 160 characters or fewer.';
    if (seoForm.keywords.length === 0) errs.keywords = 'Add at least one keyword.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    const id = entityTab === 'product' ? selectedProductId : selectedPageId;
    if (!id) return;

    setSaving(true);
    try {
      await saveSeoMetadata(entityTab, id, seoForm);
      setSeoLastUpdated(new Date().toISOString());
      setSavedOk(true);
      showSuccessToast('SEO saved', 'Metadata has been stored successfully.');
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err) {
      showErrorToast('Save failed', (err as Error).message ?? 'Unable to save SEO data.');
    } finally {
      setSaving(false);
    }
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const headingFont: React.CSSProperties = { fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 };
  const card: React.CSSProperties = { backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
  const inputStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.875rem',
    color: '#1F2937',
    backgroundColor: '#FAFAF9',
    border: '1px solid #E8D5F5',
    borderRadius: '0.75rem',
    padding: '0.625rem 0.875rem',
    width: '100%',
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    color: '#1A0A24',
    fontWeight: 600,
    fontSize: '0.875rem',
    display: 'block',
    marginBottom: '0.375rem',
  };

  const entityId = entityTab === 'product' ? selectedProductId : selectedPageId;
  const hasEntity = Boolean(entityId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const hasAnyData = Object.values(seoForm).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));

  // ── Bulk SEO state ───────────────────────────────────────────────────────
  const [bulkMode, setBulkMode] = useState<'generate' | 'improve'>('generate');
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; succeeded: number; failed: number } | null>(null);
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, 'pending' | 'running' | 'ok' | 'error'>>({});
  const abortRef = useRef<AbortController | null>(null);

  const toggleBulkProduct = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllBulk = () => setBulkSelected(new Set(products.map((p) => p.id)));
  const deselectAllBulk = () => setBulkSelected(new Set());

  const startBulk = async () => {
    if (bulkSelected.size === 0) return;
    const selectedProducts = products.filter((p) => bulkSelected.has(p.id)).map((p) => ({ id: p.id, name: p.name, category: p.category ?? undefined }));
    const initStatuses: Record<string, 'pending' | 'running' | 'ok' | 'error'> = {};
    selectedProducts.forEach((p) => { initStatuses[p.id] = 'pending'; });
    setBulkStatuses(initStatuses);
    setBulkProgress({ done: 0, total: selectedProducts.length, succeeded: 0, failed: 0 });
    setBulkRunning(true);

    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const res = await fetch(`${API_BASE}/api/seo/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: selectedProducts, mode: bulkMode }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed) as {
              index?: number; id?: string; status?: 'ok' | 'error';
              done?: boolean; total?: number; succeeded?: number; failed?: number;
            };
            if (msg.done) {
              setBulkProgress({ done: msg.total ?? 0, total: msg.total ?? 0, succeeded: msg.succeeded ?? 0, failed: msg.failed ?? 0 });
              showSuccessToast('Bulk SEO complete', `${msg.succeeded ?? 0} succeeded, ${msg.failed ?? 0} failed.`);
            } else if (msg.id) {
              setBulkStatuses((prev) => ({ ...prev, [msg.id!]: msg.status === 'ok' ? 'ok' : 'error' }));
              setBulkProgress((prev) => prev ? { ...prev, done: prev.done + 1, succeeded: prev.succeeded + (msg.status === 'ok' ? 1 : 0), failed: prev.failed + (msg.status === 'error' ? 1 : 0) } : prev);
            }
          } catch { /* skip malformed line */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') showErrorToast('Bulk SEO failed', (err as Error).message);
    } finally {
      setBulkRunning(false);
      abortRef.current = null;
    }
  };

  const stopBulk = () => { abortRef.current?.abort(); setBulkRunning(false); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top mode toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl mb-1" style={headingFont}>AI SEO Manager</h2>
        </div>
        <div className="flex rounded-xl overflow-hidden border ml-auto" style={{ borderColor: '#E8D5F5' }}>
          {([['single', 'Single Entity SEO'], ['bulk', 'Bulk SEO Generator']] as const).map(([mode, label], i) => (
            <button
              key={mode}
              onClick={() => setTopMode(mode)}
              className="px-4 py-2 text-sm transition-colors"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: topMode === mode ? 600 : 400,
                backgroundColor: topMode === mode ? '#1A0A24' : '#FFFFFF',
                color: topMode === mode ? '#FFFFFF' : '#5B1E6E',
                borderRight: i === 0 ? '1px solid #E8D5F5' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BULK MODE ─────────────────────────────────────────────────────── */}
      {topMode === 'bulk' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5 space-y-4" style={card}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>
                <Zap className="inline h-4 w-4 mr-1.5" style={{ color: '#5B1E6E' }} />
                Bulk SEO Generation
              </h3>
              {/* Mode toggle */}
              <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#E8D5F5' }}>
                {([['generate', 'Generate Fresh'], ['improve', 'Improve Existing']] as const).map(([m, lbl], i) => (
                  <button key={m} onClick={() => setBulkMode(m)} disabled={bulkRunning}
                    className="px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'Inter, sans-serif', fontWeight: bulkMode === m ? 600 : 400, backgroundColor: bulkMode === m ? '#5B1E6E' : '#FFFFFF', color: bulkMode === m ? '#FFFFFF' : '#5B1E6E', borderRight: i === 0 ? '1px solid #E8D5F5' : 'none' }}
                  >{lbl}</button>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            {bulkProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>
                  <span>{bulkProgress.done}/{bulkProgress.total} processed</span>
                  <span style={{ color: '#059669' }}>{bulkProgress.succeeded} ok</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%`, backgroundColor: '#5B1E6E' }} />
                </div>
              </div>
            )}

            {/* Select all + start */}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={bulkSelected.size === products.length ? deselectAllBulk : selectAllBulk} disabled={bulkRunning} className="flex items-center gap-1.5 text-sm disabled:opacity-50" style={{ color: '#5B1E6E', fontFamily: 'Inter, sans-serif' }}>
                {bulkSelected.size === products.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                {bulkSelected.size === products.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs ml-auto" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{bulkSelected.size} selected</span>
              {!bulkRunning ? (
                <button
                  onClick={() => { void startBulk(); }}
                  disabled={bulkSelected.size === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}
                >
                  <Zap className="h-4 w-4" />
                  Generate SEO for Selected ({bulkSelected.size})
                </button>
              ) : (
                <button onClick={stopBulk} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#DC2626', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                  <X className="h-4 w-4" />
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Product list */}
          {productsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#5B1E6E' }} /></div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={card}>
              {products.map((product, idx) => {
                const status = bulkStatuses[product.id];
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderTop: idx > 0 ? '1px solid #F3F4F6' : 'none' }}
                    onClick={() => !bulkRunning && toggleBulkProduct(product.id)}
                  >
                    <div className="flex-shrink-0">
                      {bulkSelected.has(product.id) ? (
                        <CheckSquare className="h-5 w-5" style={{ color: '#5B1E6E' }} />
                      ) : (
                        <Square className="h-5 w-5" style={{ color: '#E8D5F5' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1F2937', fontFamily: 'Inter, sans-serif' }}>{product.name}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{product.category ?? 'Uncategorized'}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {status === 'pending' && bulkRunning && <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#9CA3AF' }} />}
                      {status === 'ok' && <CheckCircle2 className="h-4 w-4" style={{ color: '#059669' }} />}
                      {status === 'error' && <XCircle className="h-4 w-4" style={{ color: '#DC2626' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SINGLE ENTITY MODE ───────────────────────────────────────────── */}
      {topMode === 'single' && (<>
      
      {/* Top row: selectors (left) + last saved (right) */}
      <div className="flex items-start gap-4 flex-wrap">
        {/* Entity selector — inline, left-aligned */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '16px 20px', flex: '1 1 auto', minWidth: '280px' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="text-sm font-semibold flex-shrink-0" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', margin: 0 }}>Select Page / Entity</h3>
            {/* Tab toggle inline */}
            <div className="flex overflow-hidden border" style={{ borderColor: '#E8D5F5', borderRadius: '0px' }}>
              {([
                { id: 'product' as const, label: 'Product', Icon: Package },
                { id: 'page' as const, label: 'Static Page', Icon: BookOpen },
              ]).map(({ id, label, Icon }, i) => (
                <button
                  key={id}
                  onClick={() => setEntityTab(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: entityTab === id ? 600 : 400,
                    backgroundColor: entityTab === id ? '#5B1E6E' : '#FFFFFF',
                    color: entityTab === id ? '#FFFFFF' : '#5B1E6E',
                    borderRight: i === 0 ? '1px solid #E8D5F5' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {/* Product dropdown inline */}
            {entityTab === 'product' && (
              <div className="relative" style={{ minWidth: '220px' }}>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '2.5rem', appearance: 'none', borderRadius: '0px' } as React.CSSProperties}
                  disabled={productsLoading}
                >
                  <option value="">— Choose a product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.category ? ` (${p.category})` : ''}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#5B1E6E' }} />
              </div>
            )}
            {selectedProduct && (
              <p className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                {loadingExisting && <span className="text-amber-500">Loading…</span>}
                {!loadingExisting && seoLastUpdated && <span className="text-green-600">✓ SEO loaded</span>}
                {!loadingExisting && !seoLastUpdated && <span>No SEO saved yet</span>}
              </p>
            )}
          </div>
          {/* Static page picker */}
          {entityTab === 'page' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
              {STATIC_PAGES.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                  className="text-left p-2 border transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: selectedPageId === page.id ? '#F0F7EF' : '#FFFFFF',
                    borderColor: selectedPageId === page.id ? '#5B1E6E' : '#E5E7EB',
                    borderWidth: selectedPageId === page.id ? '2px' : '1px',
                    borderRadius: '0px',
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: '#1A0A24', fontFamily: 'Inter, sans-serif' }}>{page.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {seoLastUpdated && (
          <p className="text-xs flex-shrink-0 self-center" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
            Last saved: {new Date(seoLastUpdated).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* SEO Editor — 2-column: left = fields, right = score */}
      {hasEntity && (
        <div className="grid grid-cols-12 gap-6">

          {/* Left column — form fields */}
          <div className="col-span-12 lg:col-span-8 space-y-5">
            {/* AI Action bar */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { void generateSeo('generate'); }}
                disabled={aiLoading}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? 'Generating…' : 'Generate SEO with AI'}
              </button>

              {hasAnyData && (
                <button
                  onClick={() => { void generateSeo('improve'); }}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#F0F7EF', color: '#3B0D4A', border: '1px solid #E8D5F5', fontFamily: 'Inter, sans-serif', fontWeight: 500, cursor: 'pointer' }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Improve SEO
                </button>
              )}

              {aiProvider && (
                <span className="text-xs px-3 py-1.5 font-medium" style={{ backgroundColor: PROVIDER_BADGE[aiProvider].bg, color: PROVIDER_BADGE[aiProvider].text, fontFamily: 'Inter, sans-serif' }}>
                  via {PROVIDER_BADGE[aiProvider].label}
                </span>
              )}
            </div>

            {/* AI Error banner */}
            {aiError && (
              <div className="flex items-start gap-3 p-4" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#DC2626', fontFamily: 'Inter, sans-serif' }}>{aiError}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>You can still enter SEO manually below.</p>
                </div>
                <button onClick={() => setAiError(null)} className="hover:opacity-70"><X className="h-4 w-4" style={{ color: '#DC2626' }} /></button>
              </div>
            )}

            {/* Search engine fields */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px 24px' }}>
              <h3 className="text-sm font-semibold border-b pb-3 mb-4" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', borderColor: '#F3F4F6' }}>
                <Globe className="inline h-4 w-4 mr-1.5" style={{ color: '#5B1E6E' }} />
                Search Engine Metadata
              </h3>

              <div className="space-y-5">
                {/* Meta Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label style={labelStyle}>Meta Title <span style={{ color: '#DC2626' }}>*</span></label>
                    <CharCounter value={seoForm.metaTitle} max={60} warn={50} />
                  </div>
                  <input
                    type="text"
                    value={seoForm.metaTitle}
                    onChange={(e) => { setSeoForm((f) => ({ ...f, metaTitle: e.target.value })); setFieldErrors((fe) => ({ ...fe, metaTitle: '' })); }}
                    placeholder="e.g. Premium Gold Ring | Bejeweled Store"
                    style={{ ...inputStyle, borderColor: fieldErrors.metaTitle ? '#FCA5A5' : '#E8D5F5' }}
                  />
                  {fieldErrors.metaTitle && <p className="text-xs mt-1" style={{ color: '#DC2626', fontFamily: 'Inter, sans-serif' }}>{fieldErrors.metaTitle}</p>}
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>Shown in browser tab and search results. Ideal: 30–60 characters.</p>
                </div>

                {/* Meta Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label style={labelStyle}>Meta Description</label>
                    <CharCounter value={seoForm.metaDescription} max={155} warn={130} />
                  </div>
                  <textarea
                    rows={3}
                    value={seoForm.metaDescription}
                    onChange={(e) => { setSeoForm((f) => ({ ...f, metaDescription: e.target.value })); setFieldErrors((fe) => ({ ...fe, metaDescription: '' })); }}
                    placeholder="A concise, enticing description for search engine result pages…"
                    style={{ ...inputStyle, resize: 'vertical', borderColor: fieldErrors.metaDescription ? '#FCA5A5' : '#E8D5F5' } as React.CSSProperties}
                  />
                  {fieldErrors.metaDescription && <p className="text-xs mt-1" style={{ color: '#DC2626', fontFamily: 'Inter, sans-serif' }}>{fieldErrors.metaDescription}</p>}
                </div>

                {/* Keywords */}
                <ChipInput
                  label={<>Keywords <span style={{ color: '#DC2626' }}>*</span></>}
                  values={seoForm.keywords}
                  onChange={(v) => { setSeoForm((f) => ({ ...f, keywords: v })); setFieldErrors((fe) => ({ ...fe, keywords: '' })); }}
                  placeholder="Type keyword, press Enter"
                  error={fieldErrors.keywords}
                />

                {/* Tags */}
                <ChipInput
                  label="Tags"
                  values={seoForm.tags}
                  onChange={(v) => setSeoForm((f) => ({ ...f, tags: v }))}
                  placeholder="Type tag, press Enter"
                />
              </div>
            </div>

            {/* OG / Social fields */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px 24px' }}>
              <h3 className="text-sm font-semibold border-b pb-3 mb-4" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', borderColor: '#F3F4F6' }}>
                <Share2 className="inline h-4 w-4 mr-1.5" style={{ color: '#5B1E6E' }} />
                Social / Open Graph Metadata
              </h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label style={labelStyle}>OG Title</label>
                    <CharCounter value={seoForm.ogTitle} max={60} />
                  </div>
                  <input type="text" value={seoForm.ogTitle} onChange={(e) => setSeoForm((f) => ({ ...f, ogTitle: e.target.value }))} placeholder="Shown when shared on social media…" style={inputStyle} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label style={labelStyle}>OG Description</label>
                    <CharCounter value={seoForm.ogDescription} max={200} />
                  </div>
                  <textarea rows={3} value={seoForm.ogDescription} onChange={(e) => setSeoForm((f) => ({ ...f, ogDescription: e.target.value }))} placeholder="Engaging description for social shares…" style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties} />
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>Shown when the page is shared on Facebook, X, WhatsApp, etc.</p>
                </div>
              </div>
            </div>

            {/* Save bar */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => { void handleSave(); }}
                disabled={saving || !hasEntity}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: savedOk ? '#059669' : '#1A0A24', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedOk ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : savedOk ? 'Saved!' : 'Save SEO'}
              </button>
              <p className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                {entityTab === 'product'
                  ? `Saving for product: ${selectedProduct?.name ?? ''}`
                  : `Saving for page: ${STATIC_PAGES.find((p) => p.id === selectedPageId)?.label ?? ''}`}
              </p>
            </div>
          </div>

          {/* Right column — SEO Score */}
          <div className="col-span-12 lg:col-span-4">
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px 24px', position: 'sticky', top: '20px' }}>
              <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>
                SEO Score
              </p>
              <ScoreBar score={score} />
              <p className="text-xs mt-4" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                Score updates as you fill in metadata. Aim for 80+.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Empty state */}
      {!hasEntity && !loadingExisting && (
        <div className="p-12 flex flex-col items-center gap-3" style={{ backgroundColor: '#FAFAF9', border: '2px dashed #E8D5F5' }}>
          <Sparkles className="h-8 w-8" style={{ color: '#E8D5F5' }} />
          <p className="text-sm font-medium" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
            {entityTab === 'product' ? 'Select a product above to edit its SEO' : 'Select a page above to edit its SEO'}
          </p>
        </div>
      )}
      </>)}
    </div>
  );
}
