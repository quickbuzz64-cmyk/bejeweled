import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Search, HelpCircle, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PageSeo } from '../components/PageSeo';
import { fetchFAQs, type FAQ as FAQItem } from '../lib/faqs';

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFAQs()
      .then(setFaqs)
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  // Filter FAQs based on search
  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
      <PageSeo title="FAQ" />
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="store-section">
        <div className="store-shell-narrow">
        {/* Page Header */}
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle 
              className="w-7 h-7 sm:w-10 sm:h-10" 
              style={{ color: '#5B1E6E' }}
              aria-hidden="true"
            />
            <h1 
              className="text-3xl sm:text-4xl lg:text-5xl"
              style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}
            >
              How can we help?
            </h1>
          </div>
          <p 
            className="text-lg"
            style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', lineHeight: 1.6 }}
          >
            Find answers to commonly asked questions about Bejeweled
          </p>
        </header>

        {/* Search Input */}
        <section className="mb-12">
          <label htmlFor="faq-search" className="sr-only">
            Search frequently asked questions
          </label>
          <div className="relative">
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: '#9CA3AF' }}
              aria-hidden="true"
            />
            <input
              type="text"
              id="faq-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for questions..."
              className="w-full pl-12 pr-6 py-4 transition-all"
              style={{
                border: '1px solid #D9C9E8',
                borderRadius: '3px',
                backgroundColor: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                color: '#1A0A24',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.07)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </section>

        {/* FAQ Accordions */}
        <section aria-label="Frequently asked questions">
          {filteredFaqs.length > 0 ? (
            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <details
                  key={faq.id}
                  className="group p-6 transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E8D5F5',
                    borderRadius: '4px',
                  }}
                >
                  <summary 
                    className="cursor-pointer list-none flex items-center justify-between transition-all"
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      color: '#1A0A24',
                      fontWeight: 600,
                      fontSize: '1.125rem',
                    }}
                  >
                    <span className="pr-4">{faq.question}</span>
                    <svg
                      className="w-5 h-5 transition-transform group-open:rotate-180"
                      style={{ color: '#5B1E6E', flexShrink: 0 }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p 
                    className="mt-4 pt-4"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      color: '#5B1E6E',
                      lineHeight: 1.7,
                      borderTop: '1px solid #F3F4F6',
                    }}
                  >
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          ) : (
            /* No Results */
            <div 
              className="py-10 text-center lg:py-16"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px' }}
            >
              <HelpCircle 
                className="w-12 h-12 mx-auto mb-4" 
                style={{ color: '#E5E7EB' }}
                aria-hidden="true"
              />
              <h2 
                className="text-xl mb-2"
                style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}
              >
                No results found
              </h2>
              <p 
                className="text-sm mb-6"
                style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}
              >
                Try a different search or browse all questions
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-2 transition-all hover:opacity-80"
                style={{
                  backgroundColor: '#5B1E6E',
                  color: '#FFFFFF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                }}
              >
                Clear Search
              </button>
            </div>
          )}
        </section>

        {/* Still Need Help */}
        <section 
          className="mt-12 p-8 text-center"
          style={{ backgroundColor: 'white', border: '1px solid #E8D5F5', borderRadius: '4px' }}
        >
          <h2 
            className="text-2xl mb-2"
            style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}
          >
            Still have questions?
          </h2>
          <p 
            className="mb-6"
            style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', lineHeight: 1.6 }}
          >
            Can't find what you're looking for? Our team is here to help.
          </p>
          <Link
            to="/contact"
            className="inline-block px-8 py-3 transition-all"
            style={{
              backgroundColor: '#5B1E6E',
              color: '#FFFFFF',
              borderRadius: '3px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Contact Us
          </Link>
        </section>
        </div>
      </main>

      {/* Custom Styles for Details/Summary */}
      <style>{`
        details[open] {
          border-color: #C9A84C !important;
        }
        
        details summary::-webkit-details-marker {
          display: none;
        }
      `}</style>

      {/* Footer */}
      <Footer />
    </div>
  );
}