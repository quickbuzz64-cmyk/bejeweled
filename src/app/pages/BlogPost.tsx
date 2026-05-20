import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Calendar, ArrowLeft, Tag } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PageSeo } from '../components/PageSeo';
import { getBlogPostBySlug, type BlogPost } from '../lib/blogService';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Minimal Markdown to HTML renderer (no external deps)
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-6 mb-2" style="font-family:Playfair Display,serif;color:#1A0A24">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold mt-8 mb-3" style="font-family:Playfair Display,serif;color:#1A0A24">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-semibold mt-8 mb-3" style="font-family:Playfair Display,serif;color:#1A0A24">$1</h1>')
    // Bold / Italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc mb-1">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-5 list-decimal mb-1">$2</li>')
    // Paragraphs (blank-line separated)
    .replace(/\n{2,}/g, '</p><p class="mb-4 leading-relaxed" style="font-family:Inter,sans-serif;color:#374151">')
    // Wrap start
    .replace(/^/, '<p class="mb-4 leading-relaxed" style="font-family:Inter,sans-serif;color:#374151">')
    .replace(/$/, '</p>');
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getBlogPostBySlug(slug)
      .then((p) => {
        if (!p || p.status !== 'published') setNotFound(true);
        else setPost(p);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
        <Header />
        <main className="store-section">
          <div className="store-shell space-y-6">
            <div className="h-10 w-2/3 animate-pulse rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
            <div className="h-80 animate-pulse rounded-3xl" style={{ backgroundColor: '#EEF2EE' }} />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 rounded-full animate-pulse" style={{ backgroundColor: '#EEF2EE', width: `${85 - i * 5}%` }} />)}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
        <PageSeo title="Post not found" />
        <Header />
        <main className="store-section">
          <div className="store-shell rounded-3xl p-10 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <h1 className="text-3xl mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}>Post not found</h1>
            <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>This post doesn't exist or has been unpublished.</p>
            <Link to="/blog" className="text-sm font-semibold" style={{ color: '#5B1E6E', fontFamily: 'Inter, sans-serif' }}>← Back to Blog</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const seoTitle = post.metaTitle || `${post.title} | Bejeweled Blog`;
  const seoDesc = post.metaDescription || post.excerpt;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
      <PageSeo
        title={seoTitle}
        description={seoDesc}
        keywords={post.tags}
        ogTitle={seoTitle}
        ogDescription={seoDesc}
        ogImage={post.featuredImage || undefined}
        canonical={`https://bejeweled.store/blog/${post.slug}`}
      />
      <Header />

      <main className="store-section">
        <article className="store-shell max-w-3xl mx-auto">

          {/* Featured image */}
          {post.featuredImage && (
            <div className="mb-8 rounded-3xl overflow-hidden" style={{ maxHeight: '420px' }}>
              <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {post.tags.map((t) => (
                <span key={t} className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#F0F7EF', color: '#3B0D4A', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                  <Tag className="inline h-3 w-3 mr-1" />{t}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl mb-4 leading-tight" style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}>
            {post.title}
          </h1>

          {/* Date */}
          <p className="text-sm mb-8" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
            <Calendar className="inline h-3.5 w-3.5 mr-1" />
            {formatDate(post.createdAt)}
          </p>

          {/* Content */}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          {/* Back link */}
          <div className="mt-12 pt-8" style={{ borderTop: '1px solid #E5E7EB' }}>
            <Link to="/blog" className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#5B1E6E', fontFamily: 'Inter, sans-serif' }}>
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
