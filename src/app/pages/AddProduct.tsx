import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Upload, X, ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { createProduct, uploadProductImages } from '../lib/products';
import { PageSeo } from '../components/PageSeo';
import { showErrorToast, showSuccessToast } from '../lib/notifications';

type DraftImage = {
  id: string;
  file: File;
  preview: string;
};

type ProductFormState = {
  productName: string;
  price: string;
  stock: string;
  description: string;
  care: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  isFeatured: boolean;
};

const initialFormState: ProductFormState = {
  productName: '',
  price: '',
  stock: '',
  description: '',
  care: '',
  slug: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  ogTitle: '',
  ogDescription: '',
  isFeatured: false,
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #E8D5F5',
  backgroundColor: '#FAFAFA',
  color: '#1A0A24',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.875rem',
  outline: 'none',
  borderRadius: '3px',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6B4F7A',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E8D5F5',
  borderRadius: '4px',
  padding: '28px 32px',
  marginBottom: '20px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'Playfair Display, serif',
  fontSize: '1rem',
  color: '#1A0A24',
  fontWeight: 600,
  margin: '0 0 4px',
};

const sectionSubStyle: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.78rem',
  color: '#9B8FAA',
  margin: '0 0 20px',
};

export default function AddProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductFormState>(initialFormState);
  const [draftImages, setDraftImages] = useState<DraftImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeoGenerating, setIsSeoGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateForm = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleFilesChange = (files: FileList | File[]) => {
    const nextFiles = Array.from(files);
    if (nextFiles.length === 0) return;

    const invalid = nextFiles.find((f) => !f.type.startsWith('image/'));
    if (invalid) {
      setSubmitError('Please upload valid image files only.');
      return;
    }

    setSubmitError(null);
    void Promise.all(
      nextFiles.map(
        (file) =>
          new Promise<DraftImage>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
                file,
                preview: reader.result as string,
              });
            };
            reader.readAsDataURL(file);
          })
      )
    ).then((imgs) => setDraftImages((cur) => [...cur, ...imgs]));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesChange(e.dataTransfer.files);
  };

  const handleGenerateSeo = async () => {
    if (!form.productName.trim()) {
      setSubmitError('Please enter a product name before generating SEO.');
      return;
    }
    setIsSeoGenerating(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'product',
          name: form.productName,
          description: form.description,
          mode: 'generate',
        }),
      });
      if (!res.ok) throw new Error('SEO generation failed');
      const data = await res.json() as {
        title?: string;
        metaDescription?: string;
        keywords?: string[];
        ogTitle?: string;
        ogDescription?: string;
      };
      setForm((f) => ({
        ...f,
        slug: f.slug || form.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        metaTitle: data.title ?? f.metaTitle,
        metaDescription: data.metaDescription ?? f.metaDescription,
        metaKeywords: Array.isArray(data.keywords) ? data.keywords.join(', ') : f.metaKeywords,
        ogTitle: data.ogTitle ?? f.ogTitle,
        ogDescription: data.ogDescription ?? f.ogDescription,
      }));
      showSuccessToast('SEO generated', 'AI-powered SEO fields have been filled in.');
    } catch {
      setSubmitError('Could not generate SEO. Please fill in the fields manually.');
    } finally {
      setIsSeoGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.productName || !form.price || !form.stock || !form.description) {
      setSubmitError('Please fill in all required fields (name, price, stock, description).');
      return;
    }

    if (draftImages.length === 0) {
      setSubmitError('Please upload at least one product image.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedImages = await uploadProductImages(draftImages.map((img) => img.file));
      await createProduct({
        name: form.productName,
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        images: uploadedImages,
        isFeatured: form.isFeatured,
        care: form.care,
        slug: form.slug,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        metaKeywords: form.metaKeywords,
        ogTitle: form.ogTitle,
        ogDescription: form.ogDescription,
      });
      showSuccessToast('Product added', 'Your new product is now live in the catalog.');
      navigate('/admin', { replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to add product right now.';
      setSubmitError(msg);
      showErrorToast('Product error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0FA' }}>
      <PageSeo title="Add Product" />

      {/* Header */}
      <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8D5F5', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/admin"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#5B1E6E', fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none' }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back
          </Link>
          <span style={{ color: '#E8D5F5' }}>|</span>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.125rem', color: '#1A0A24', fontWeight: 600, margin: 0 }}>Add New Product</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to="/admin"
            style={{ padding: '8px 18px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#5B1E6E', fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            Cancel
          </Link>
          <button
            form="add-product-form"
            type="submit"
            disabled={isSubmitting}
            style={{ padding: '8px 22px', borderRadius: '3px', backgroundColor: isSubmitting ? '#9B8FAA' : '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem', fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
        {submitError && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '3px', color: '#B91C1C', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
            {submitError}
          </div>
        )}

        <form id="add-product-form" onSubmit={handleSubmit}>

          {/* ── SECTION 1: Basic Info ── */}
          <section style={sectionStyle}>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>01 — Basic Info</p>
              <h2 style={sectionTitleStyle}>Product Details</h2>
              <p style={sectionSubStyle}>Name, pricing, stock, and core description.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="productName" style={labelStyle}>Product Name <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                type="text"
                id="productName"
                value={form.productName}
                onChange={(e) => updateForm('productName', e.target.value)}
                placeholder="e.g. Gold Plated Bracelet, Diamond Stud Earrings, Pearl Necklace"
                className="w-full px-4 py-3"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '16px' }}>
              <div>
                <label htmlFor="price" style={labelStyle}>Price (PKR) <span style={{ color: '#DC2626' }}>*</span></label>
                <input
                  type="number"
                  id="price"
                  value={form.price}
                  onChange={(e) => updateForm('price', e.target.value)}
                  placeholder="1500"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                  onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
                  required
                />
              </div>
              <div>
                <label htmlFor="stock" style={labelStyle}>Stock Quantity <span style={{ color: '#DC2626' }}>*</span></label>
                <input
                  type="number"
                  id="stock"
                  value={form.stock}
                  onChange={(e) => updateForm('stock', e.target.value)}
                  placeholder="100"
                  min="0"
                  className="w-full px-4 py-3"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                  onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="description" style={labelStyle}>Description <span style={{ color: '#DC2626' }}>*</span></label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Describe your jewelry piece, craftsmanship, and design inspiration…"
                rows={5}
                className="w-full px-4 py-3"
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
                required
              />
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem', color: '#1A0A24', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => updateForm('isFeatured', e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#5B1E6E', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 500 }}>Feature this product on the home page</span>
            </label>
          </section>

          {/* ── SECTION 2: Images ── */}
          <section style={sectionStyle}>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>02 — Media</p>
              <h2 style={sectionTitleStyle}>Product Images</h2>
              <p style={sectionSubStyle}>The first image becomes the primary cover. Drag to reorder.</p>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging ? '2px dashed #5B1E6E' : '2px dashed #D1C4DF',
                borderRadius: '3px',
                backgroundColor: isDragging ? '#F5F0FA' : '#FAFAFA',
                minHeight: draftImages.length > 0 ? 'auto' : '180px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: draftImages.length > 0 ? 'flex-start' : 'center',
                padding: draftImages.length > 0 ? '20px' : '40px 20px',
                transition: 'all 0.15s',
              }}
            >
              {draftImages.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3 w-full" style={{ marginBottom: '16px' }}>
                    {draftImages.map((img, index) => (
                      <div key={img.id} style={{ position: 'relative', borderRadius: '3px', overflow: 'hidden', border: index === 0 ? '2px solid #5B1E6E' : '1px solid #E8D5F5' }}>
                        <img
                          src={img.preview}
                          alt={`Product preview ${index + 1}`}
                          style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                        />
                        {index === 0 && (
                          <span style={{ position: 'absolute', top: '6px', left: '6px', backgroundColor: '#5B1E6E', color: '#FFFFFF', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '2px', fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setDraftImages((cur) => cur.filter((_, i) => i !== index))}
                          style={{ position: 'absolute', top: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '2px', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <X size={11} aria-hidden="true" />
                        </button>
                        <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setDraftImages((cur) => moveItem(cur, index, index - 1))}
                            disabled={index === 0}
                            style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '2px', width: '22px', height: '22px', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A0A24' }}
                            aria-label="Move left"
                          >
                            <ChevronLeft size={12} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftImages((cur) => moveItem(cur, index, index + 1))}
                            disabled={index === draftImages.length - 1}
                            style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '2px', width: '22px', height: '22px', cursor: index === draftImages.length - 1 ? 'not-allowed' : 'pointer', opacity: index === draftImages.length - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A0A24' }}
                            aria-label="Move right"
                          >
                            <ChevronRight size={12} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <label htmlFor="imageUpload" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#5B1E6E', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                    <Upload size={13} aria-hidden="true" />
                    Add more images
                  </label>
                </>
              ) : (
                <label htmlFor="imageUpload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '3px', backgroundColor: '#F0E8F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={20} style={{ color: '#5B1E6E' }} aria-hidden="true" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600, fontSize: '0.875rem', margin: '0 0 3px' }}>
                      {isDragging ? 'Drop images here' : 'Upload Product Images'}
                    </p>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.78rem', margin: 0 }}>Drag & drop or click to browse — PNG, JPG, WEBP</p>
                  </div>
                </label>
              )}
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                multiple
                onChange={(e) => handleFilesChange(e.target.files || [])}
                style={{ display: 'none' }}
              />
            </div>
          </section>

          {/* ── SECTION 3: SEO ── */}
          <section style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>03 — Discovery</p>
                <h2 style={sectionTitleStyle}>SEO & Metadata</h2>
                <p style={sectionSubStyle}>Optimise search visibility and social sharing previews.</p>
              </div>
              <button
                type="button"
                onClick={() => void handleGenerateSeo()}
                disabled={isSeoGenerating || !form.productName.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '3px',
                  backgroundColor: isSeoGenerating || !form.productName.trim() ? '#E8D5F5' : '#5B1E6E',
                  color: isSeoGenerating || !form.productName.trim() ? '#9B8FAA' : '#FFFFFF',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: isSeoGenerating || !form.productName.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {isSeoGenerating ? (
                  <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Generating...</>
                ) : (
                  <><Sparkles size={13} aria-hidden="true" /> AI Generate SEO</>
                )}
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="slug" style={labelStyle}>URL Slug</label>
              <input
                type="text"
                id="slug"
                value={form.slug}
                onChange={(e) => updateForm('slug', e.target.value)}
                placeholder="e.g. gold-plated-bracelet"
                className="w-full px-4 py-3"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4" style={{ marginBottom: '16px' }}>
              <div>
                <label htmlFor="metaTitle" style={labelStyle}>
                  Meta Title
                  <span style={{ marginLeft: '8px', fontWeight: 400, fontSize: '0.68rem', color: '#9B8FAA', textTransform: 'none', letterSpacing: 0 }}>
                    ({form.metaTitle.length}/60 chars)
                  </span>
                </label>
                <input
                  type="text"
                  id="metaTitle"
                  value={form.metaTitle}
                  onChange={(e) => updateForm('metaTitle', e.target.value)}
                  placeholder="Statement Gold Ring | Bejeweled Pakistan"
                  className="w-full px-4 py-3"
                  style={{ ...inputStyle, borderColor: form.metaTitle.length > 60 ? '#DC2626' : '#E8D5F5' }}
                  onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                  onBlur={(e) => (e.target.style.borderColor = form.metaTitle.length > 60 ? '#DC2626' : '#E8D5F5')}
                />
              </div>
              <div>
                <label htmlFor="metaDescription" style={labelStyle}>
                  Meta Description
                  <span style={{ marginLeft: '8px', fontWeight: 400, fontSize: '0.68rem', color: form.metaDescription.length > 160 ? '#DC2626' : '#9B8FAA', textTransform: 'none', letterSpacing: 0 }}>
                    ({form.metaDescription.length}/160 chars)
                  </span>
                </label>
                <textarea
                  id="metaDescription"
                  value={form.metaDescription}
                  onChange={(e) => updateForm('metaDescription', e.target.value)}
                  placeholder="e.g. Discover handcrafted earrings, bracelets, and luxury jewelry pieces…"
                  rows={3}
                  className="w-full px-4 py-3"
                  style={{ ...inputStyle, resize: 'vertical', borderColor: form.metaDescription.length > 160 ? '#DC2626' : '#E8D5F5' }}
                  onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                  onBlur={(e) => (e.target.style.borderColor = form.metaDescription.length > 160 ? '#DC2626' : '#E8D5F5')}
                />
              </div>
              <div>
                <label htmlFor="metaKeywords" style={labelStyle}>Meta Keywords</label>
                <input
                  type="text"
                  id="metaKeywords"
                  value={form.metaKeywords}
                  onChange={(e) => updateForm('metaKeywords', e.target.value)}
                  placeholder="e.g. gold bracelet, diamond earrings, luxury jewelry, bridal set"
                  className="w-full px-4 py-3"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                  onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F0E8F5', paddingTop: '16px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', margin: '0 0 12px' }}>Open Graph (Social Sharing)</p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="ogTitle" style={labelStyle}>OG Title</label>
                  <input
                    type="text"
                    id="ogTitle"
                    value={form.ogTitle}
                    onChange={(e) => updateForm('ogTitle', e.target.value)}
                    placeholder="e.g. Handcrafted Gold Bracelet – Discover Luxury Jewelry at Bejeweled"
                    className="w-full px-4 py-3"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                    onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
                  />
                </div>
                <div>
                  <label htmlFor="ogDescription" style={labelStyle}>OG Description</label>
                  <textarea
                    id="ogDescription"
                    value={form.ogDescription}
                    onChange={(e) => updateForm('ogDescription', e.target.value)}
                    placeholder="e.g. Shop our exclusive handcrafted jewelry collection — gold, diamonds, and pearls."
                    rows={2}
                    className="w-full px-4 py-3"
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                    onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 4: Care Instructions ── */}
          <section style={{ ...sectionStyle, marginBottom: '32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 4px', fontFamily: 'Inter, sans-serif' }}>04 — Care</p>
              <h2 style={sectionTitleStyle}>Care Instructions</h2>
              <p style={sectionSubStyle}>How customers should maintain and store this product.</p>
            </div>

            <div>
              <label htmlFor="care" style={labelStyle}>Care Instructions</label>
              <textarea
                id="care"
                value={form.care}
                onChange={(e) => updateForm('care', e.target.value)}
                placeholder="e.g. Keep away from water and chemicals. Store in a soft jewelry box. Avoid direct sunlight."
                rows={3}
                className="w-full px-4 py-3"
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) => (e.target.style.borderColor = '#5B1E6E')}
                onBlur={(e) => (e.target.style.borderColor = '#E8D5F5')}
              />
            </div>
          </section>

          {/* Bottom Save Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingBottom: '40px' }}>
            <Link
              to="/admin"
              style={{ padding: '10px 22px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#5B1E6E', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 28px',
                borderRadius: '3px',
                backgroundColor: isSubmitting ? '#9B8FAA' : '#5B1E6E',
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 2px 8px rgba(91,30,110,0.25)',
              }}
            >
              {isSubmitting ? 'Saving Product...' : 'Save & Publish Product'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
