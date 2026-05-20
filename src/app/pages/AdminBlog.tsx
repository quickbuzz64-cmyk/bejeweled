import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  Save,
  Check,
  AlertCircle,
  ChevronLeft,
  X,
  Globe,
  Share2,
} from 'lucide-react';
import {
  getAllBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  toggleBlogPostStatus,
  titleToSlug,
  type BlogPost,
  type BlogPostInput,
} from '../lib/blogService';
import { showSuccessToast, showErrorToast } from '../lib/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

// ── Shared styles ─────────────────────────────────────────────────────────────
const headingFont: React.CSSProperties = { fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 };
const card: React.CSSProperties = { backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const inputStyle: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.875rem',
  color: '#1F2937',
  backgroundColor: '#FFFFFF',
  border: '1px solid #D1D5DB',
  borderRadius: '0px',
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

// ── Chip Input ────────────────────────────────────────────────────────────────
function ChipInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [inputVal, setInputVal] = useState('');
  const add = () => {
    const t = inputVal.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setInputVal('');
  };
  return (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl min-h-[44px]" style={{ border: '1px solid #E8D5F5', backgroundColor: '#FAFAF9' }}>
      {values.map((chip) => (
        <span key={chip} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F0F7EF', color: '#3B0D4A', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          {chip}
          <button type="button" onClick={() => onChange(values.filter((v) => v !== chip))}><X className="h-3 w-3" /></button>
        </span>
      ))}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="Add tag, press Enter"
        className="flex-1 min-w-[120px] text-sm bg-transparent outline-none"
        style={{ fontFamily: 'Inter, sans-serif', color: '#1F2937' }}
      />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

const EMPTY_FORM: BlogPostInput = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  metaTitle: '',
  metaDescription: '',
  tags: [],
  featuredImage: '',
  status: 'draft',
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostInput>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [seoAiLoading, setSeoAiLoading] = useState(false);
  const [seoAiError, setSeoAiError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [slugAutoSync, setSlugAutoSync] = useState(true);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try { setPosts(await getAllBlogPosts()); }
    catch (err) { showErrorToast('Load failed', (err as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  // Auto-sync slug from title while user hasn't manually edited slug
  useEffect(() => {
    if (slugAutoSync && form.title) {
      setForm((f) => ({ ...f, slug: titleToSlug(f.title) }));
    }
  }, [form.title, slugAutoSync]);

  const openNew = () => {
    setEditingPost(null);
    setForm({ ...EMPTY_FORM });
    setSlugAutoSync(true);
    setSeoAiError(null);
    setView('edit');
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      tags: post.tags,
      featuredImage: post.featuredImage,
      status: post.status,
    });
    setSlugAutoSync(false);
    setSeoAiError(null);
    setView('edit');
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showErrorToast('Validation', 'Title is required.'); return; }
    if (!form.slug.trim()) { showErrorToast('Validation', 'Slug is required.'); return; }
    setSaving(true);
    try {
      if (editingPost) {
        await updateBlogPost(editingPost.id, form);
        showSuccessToast('Post updated', `"${form.title}" has been saved.`);
      } else {
        await createBlogPost(form);
        showSuccessToast('Post created', `"${form.title}" is now in drafts.`);
      }
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
      await loadPosts();
      setView('list');
    } catch (err) {
      showErrorToast('Save failed', (err as Error).message ?? 'Unable to save post.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    try {
      await toggleBlogPostStatus(post.id, post.status);
      showSuccessToast(post.status === 'published' ? 'Moved to drafts' : 'Published', `"${post.title}"`);
      await loadPosts();
    } catch (err) {
      showErrorToast('Status update failed', (err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBlogPost(deleteTarget.id);
      showSuccessToast('Deleted', `"${deleteTarget.title}" has been removed.`);
      setDeleteTarget(null);
      await loadPosts();
    } catch (err) {
      showErrorToast('Delete failed', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const generateSeoForBlog = async () => {
    if (!form.title.trim()) { showErrorToast('SEO', 'Enter a blog title first.'); return; }
    setSeoAiLoading(true);
    setSeoAiError(null);
    try {
      const res = await fetch(`${API_BASE}/api/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'page',
          name: form.title,
          description: form.excerpt || form.content.slice(0, 200),
          category: 'blog',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { title?: string; metaDescription?: string; keywords?: string[]; tags?: string[] };
      setForm((f) => ({
        ...f,
        metaTitle: data.title ?? f.metaTitle,
        metaDescription: data.metaDescription ?? f.metaDescription,
        tags: data.tags?.length ? data.tags : data.keywords?.slice(0, 5) ?? f.tags,
      }));
      showSuccessToast('SEO generated', 'Review and adjust the meta fields below.');
    } catch (err) {
      setSeoAiError((err as Error).message ?? 'AI SEO generation failed.');
    } finally {
      setSeoAiLoading(false);
    }
  };

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl mb-1" style={headingFont}>Blog CMS</h2>
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>
              Create and manage blog posts — published posts appear at <code className="text-xs bg-gray-100 px-1" style={{ fontFamily: 'monospace' }}>/blog</code>.
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#5B1E6E' }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3" style={{ backgroundColor: '#FAFAF9', border: '2px dashed #E8D5F5' }}>
            <Globe className="h-8 w-8" style={{ color: '#E8D5F5' }} />
            <p className="text-sm font-medium" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>No posts yet. Create your first blog post.</p>
            <button onClick={openNew} className="mt-2 text-sm font-semibold" style={{ color: '#5B1E6E', fontFamily: 'Inter, sans-serif' }}>Create post →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="p-4 flex items-center gap-4" style={card}>
                {post.featuredImage && (
                  <img src={post.featuredImage} alt={post.title} className="w-16 h-16 object-cover flex-shrink-0" style={{ borderRadius: '0px' }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1F2937', fontFamily: 'Inter, sans-serif' }}>{post.title}</p>
                    <span
                      className="text-xs px-2 py-0.5"
                      style={{
                        backgroundColor: post.status === 'published' ? '#F0FDF4' : '#F9FAFB',
                        color: post.status === 'published' ? '#059669' : '#9CA3AF',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        border: post.status === 'published' ? '1px solid #A7F3D0' : '1px solid #E5E7EB',
                      }}
                    >
                      {post.status === 'published' ? '● Published' : '○ Draft'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                    /{post.slug} · {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {post.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {post.tags.slice(0, 4).map((t) => (
                        <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F0F7EF', color: '#3B0D4A', fontFamily: 'Inter, sans-serif' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { void handleToggleStatus(post); }}
                    title={post.status === 'published' ? 'Move to drafts' : 'Publish'}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                  >
                    {post.status === 'published' ? <EyeOff className="h-4 w-4" style={{ color: '#9CA3AF' }} /> : <Eye className="h-4 w-4" style={{ color: '#5B1E6E' }} />}
                  </button>
                  <button onClick={() => openEdit(post)} className="p-2 hover:bg-gray-100 transition-colors" style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
                    <Edit2 className="h-4 w-4" style={{ color: '#5B1E6E' }} />
                  </button>
                  <button onClick={() => setDeleteTarget(post)} className="p-2 hover:bg-red-50 transition-colors" style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
                    <Trash2 className="h-4 w-4" style={{ color: '#DC2626' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirm dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete post?</DialogTitle>
              <DialogDescription>
                "{deleteTarget?.title}" will be permanently deleted. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm" style={{ border: '1px solid #E8D5F5', fontFamily: 'Inter, sans-serif', color: '#1A0A24', backgroundColor: '#FFFFFF', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => { void handleDelete(); }}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: '#DC2626', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── EDIT VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8" style={{ maxWidth: '1400px' }}>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 transition-colors" style={{ borderRadius: '3px' }}>
          <ChevronLeft className="h-5 w-5" style={{ color: '#5B1E6E' }} />
        </button>
        <div>
          <h2 className="text-xl" style={headingFont}>{editingPost ? 'Edit Post' : 'New Blog Post'}</h2>
          <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>
            {editingPost ? `Editing: ${editingPost.slug}` : 'Draft saved until you publish'}
          </p>
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-12 gap-8">

        {/* Left column — span-8: Title, Slug, Featured Image, Content */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '24px' }}>
            {/* Title */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Your compelling blog post title"
                style={inputStyle}
              />
            </div>

            {/* Slug */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => { setSlugAutoSync(false); setForm((f) => ({ ...f, slug: e.target.value })); }}
                placeholder="auto-generated-from-title"
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                URL: /blog/{form.slug || 'your-slug'}
              </p>
            </div>

            {/* Featured image */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Featured Image URL</label>
              <input
                type="url"
                value={form.featuredImage}
                onChange={(e) => setForm((f) => ({ ...f, featuredImage: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                style={inputStyle}
              />
              {form.featuredImage && (
                <img src={form.featuredImage} alt="Preview" className="mt-2 h-24 w-40 object-cover" style={{ border: '1px solid #E5E7EB' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>

            {/* Content */}
            <div>
              <label style={labelStyle}>Content *</label>
              <textarea
                rows={20}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Write your blog post content here. Markdown is supported."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace, Inter, sans-serif' } as React.CSSProperties}
              />
              <p className="text-xs mt-1" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>Markdown supported — **bold**, *italic*, # Headings, - Lists</p>
            </div>
          </div>
        </div>

        {/* Right column — span-4: Excerpt, Tags, Status, SEO */}
        <div className="col-span-12 lg:col-span-4 space-y-4">

          {/* Excerpt */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px' }}>
            <label style={labelStyle}>Excerpt</label>
            <textarea
              rows={4}
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="A short summary shown in the blog listing…"
              style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties}
            />
          </div>

          {/* Tags */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px' }}>
            <label style={labelStyle}>Tags</label>
            <ChipInput values={form.tags ?? []} onChange={(v) => setForm((f) => ({ ...f, tags: v }))} />
          </div>

          {/* Status */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px' }}>
            <label style={{ ...labelStyle, marginBottom: '10px' }}>Status</label>
            <div className="flex overflow-hidden border" style={{ borderColor: '#D1D5DB', borderRadius: '0px' }}>
              {(['draft', 'published'] as const).map((s, i) => (
                <button
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className="flex-1 px-4 py-2 text-sm capitalize transition-colors"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: form.status === s ? 600 : 400,
                    backgroundColor: form.status === s ? (s === 'published' ? '#5B1E6E' : '#1A0A24') : '#FFFFFF',
                    color: form.status === s ? '#FFFFFF' : '#5B1E6E',
                    borderRight: i === 0 ? '1px solid #D1D5DB' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* SEO section */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px' }}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>
                <Globe className="inline h-4 w-4 mr-1.5" style={{ color: '#5B1E6E' }} />
                SEO Metadata
              </h3>
              <button
                onClick={() => { void generateSeoForBlog(); }}
                disabled={seoAiLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}
              >
                {seoAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {seoAiLoading ? 'Generating…' : 'AI Generate'}
              </button>
            </div>

            {seoAiError && (
              <div className="flex items-start gap-2 p-3 mb-4" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                <p className="text-sm" style={{ color: '#DC2626', fontFamily: 'Inter, sans-serif' }}>{seoAiError}</p>
                <button onClick={() => setSeoAiError(null)} className="ml-auto"><X className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Meta Title <span className="text-xs font-normal" style={{ color: '#9CA3AF' }}>({form.metaTitle.length}/60)</span></label>
              <input type="text" value={form.metaTitle} onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))} placeholder="Blog post title for search engines" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Meta Description <span className="text-xs font-normal" style={{ color: form.metaDescription.length > 155 ? '#DC2626' : '#9CA3AF' }}>({form.metaDescription.length}/155)</span></label>
              <textarea
                rows={3}
                value={form.metaDescription}
                onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                placeholder="Search engine description…"
                style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Save bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { void handleSave(); }}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: savedOk ? '#059669' : '#1A0A24', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedOk ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : savedOk ? 'Saved!' : editingPost ? 'Save Changes' : 'Create Post'}
            </button>
            <button
              onClick={() => setView('list')}
              className="px-4 py-2.5 text-sm"
              style={{ border: '1px solid #E5E7EB', fontFamily: 'Inter, sans-serif', color: '#1A0A24', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
