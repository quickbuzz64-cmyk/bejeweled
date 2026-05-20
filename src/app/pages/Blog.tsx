import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Calendar, Tag } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PageSeo } from '../components/PageSeo';
import { getPublishedBlogPosts, type BlogPost } from '../lib/blogService';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublishedBlogPosts()
      .then(setPosts)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
      <PageSeo
        title="Blog"
        description="Read our latest articles on home decor, gifting ideas, tableware trends, and tips for the Pakistani home."
        keywords={['blog', 'jewelry', 'gifting', 'Bejeweled', 'rings', 'necklaces', 'Pakistan']}
      />
      <Header />

      <main className="store-section">
        <section className="store-shell">

          <div className="mb-10">
            <h1 className="text-4xl mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}>
              Our Blog
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', lineHeight: 1.8 }}>
              Stories, inspiration, and ideas for every home.
            </p>
          </div>

          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="overflow-hidden animate-pulse" style={{ backgroundColor: '#EEF2EE', borderRadius: '4px' }}>
                  <div className="h-48 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-3/4 bg-gray-200" />
                    <div className="h-3 w-full bg-gray-200" />
                    <div className="h-3 w-2/3 bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', color: '#DC2626' }}>{error}</p>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="p-12 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <p className="text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}>Coming soon</p>
              <p style={{ fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>We're working on our first articles. Check back shortly!</p>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '4px', display: 'block' }}
                >
                  {post.featuredImage ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center" style={{ backgroundColor: '#F0F7EF' }}>
                      <span className="text-5xl">📝</span>
                    </div>
                  )}
                  <div className="p-5 space-y-2">
                    {post.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {post.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F0F7EF', color: '#3B0D4A', fontFamily: 'Inter, sans-serif' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <h2 className="text-base font-semibold leading-snug group-hover:text-green-700 transition-colors" style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24' }}>
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280', lineHeight: 1.6 }}>
                        {post.excerpt}
                      </p>
                    )}
                    <p className="text-xs pt-1" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
