import { useState } from 'react';
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { showErrorToast, showSuccessToast } from '../lib/notifications';
import { DynamicPageSeo } from '../components/PageSeo';
import { submitContactMessage } from '../lib/contactMessages';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: '#FFFFFF',
  border: '1px solid #D9C9E8',
  borderRadius: '3px',
  color: '#1A0A24',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#5B1E6E';
    e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.07)';
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#D9C9E8';
    e.target.style.boxShadow = 'none';
  },
};

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      showErrorToast('Incomplete form', 'Please complete every field before submitting.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showErrorToast('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await submitContactMessage({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      showSuccessToast('Message sent', `Thank you, ${name.trim()}. We will be in touch shortly.`);
      setName(''); setEmail(''); setSubject(''); setMessage('');
    } catch {
      showErrorToast('Message not sent', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF7FF', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <DynamicPageSeo entityType="page" entityId="contact" fallbackTitle="Contact Us" fallbackDescription="Get in touch with the Bejeweled team." />
      <Header />

      <main>
        {/* ── Page header ──────────────────────────────────────── */}
        <section style={{ background: 'white', padding: '56px 48px 48px', borderBottom: '1px solid #E8D5F5' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '10px', marginTop: '16px' }}>
              BEJEWELED — LAHORE
            </p>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.875rem, 4vw, 3rem)', fontWeight: 600, color: '#1A0A24', margin: '0 0 14px', lineHeight: 1.15 }}>
              Get in Touch
            </h1>
            <p style={{ color: '#6B4F7A', fontSize: '0.95rem', lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
              Questions about an order, a piece, or just want to say hello? We respond to every message within 24 hours.
            </p>
          </div>
        </section>

        {/* ── Two-column layout ────────────────────────────────── */}
        <section style={{ padding: '64px 48px 80px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '48px', alignItems: 'start' }} className="contact-grid">

            {/* Left — Contact info ───────────────────────────── */}
            <aside>
              <div style={{ background: '#1A0A24', borderRadius: '4px', padding: '44px 36px' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '20px', marginTop: 0 }}>CONTACT DETAILS</p>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', fontWeight: 600, color: '#FAF7FF', marginBottom: '32px', marginTop: 0 }}>
                  We're Always Here
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {[
                    {
                      icon: <MapPin size={16} color="#C9A84C" />,
                      label: 'Visit Us',
                      value: 'Bahria Town, Commercial Block C\nLahore, Pakistan',
                    },
                    {
                      icon: <Phone size={16} color="#C9A84C" />,
                      label: 'Phone',
                      value: '+92 310 7700470',
                      href: 'tel:+923107700470',
                    },
                    {
                      icon: <Mail size={16} color="#C9A84C" />,
                      label: 'Email',
                      value: 'hello@bejeweled.store',
                      href: 'mailto:hello@bejeweled.store',
                    },
                    {
                      icon: <Clock size={16} color="#C9A84C" />,
                      label: 'Business Hours',
                      value: 'Mon–Sat: 10:00 AM – 8:00 PM\nSunday: Closed',
                    },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div style={{ width: '34px', height: '34px', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        {item.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '4px', marginTop: 0 }}>{item.label}</p>
                        {item.href ? (
                          <a href={item.href} style={{ color: '#FAF7FF', fontSize: '0.875rem', textDecoration: 'none', lineHeight: 1.6 }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#FAF7FF'; }}>
                            {item.value}
                          </a>
                        ) : (
                          <p style={{ color: '#FAF7FF', fontSize: '0.875rem', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' as const }}>{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '40px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
                    Cash on Delivery only. Orders are typically dispatched within 1–2 business days.
                  </p>
                </div>
              </div>
            </aside>

            {/* Right — Form ──────────────────────────────────── */}
            <article style={{ background: 'white', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '44px 40px' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '12px', marginTop: 0 }}>SEND A MESSAGE</p>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', fontWeight: 600, color: '#1A0A24', marginBottom: '8px', marginTop: 0 }}>
                How Can We Help?
              </h2>
              <p style={{ color: '#9B8FAA', fontSize: '0.8125rem', lineHeight: 1.7, marginBottom: '32px', marginTop: 0 }}>
                Fill out the form and we will respond within 24 hours.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-cols">
                  <div>
                    <label htmlFor="contact-name" style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B4F7A', fontWeight: 600, marginBottom: '6px' }}>Your Name</label>
                    <input type="text" id="contact-name" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Full name" style={inputStyle} required {...focusHandlers} />
                  </div>
                  <div>
                    <label htmlFor="contact-email" style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B4F7A', fontWeight: 600, marginBottom: '6px' }}>Email Address</label>
                    <input type="email" id="contact-email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com" style={inputStyle} required {...focusHandlers} />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B4F7A', fontWeight: 600, marginBottom: '6px' }}>Subject</label>
                  <input type="text" id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="Order enquiry, product question, etc." style={inputStyle} required {...focusHandlers} />
                </div>

                <div>
                  <label htmlFor="contact-message" style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B4F7A', fontWeight: 600, marginBottom: '6px' }}>Message</label>
                  <textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us how we can help you…" rows={6}
                    style={{ ...inputStyle, resize: 'none' as const, lineHeight: 1.6 }} required
                    onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.07)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }} />
                </div>

                <button type="submit" disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 32px', background: submitting ? '#9B8FAA' : '#5B1E6E', color: '#FFFFFF', border: 'none', borderRadius: '3px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', alignSelf: 'flex-start', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = '#3B0D4A'; }}
                  onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = '#5B1E6E'; }}
                  aria-label="Submit contact form">
                  <Send size={14} />
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </article>
          </div>
        </section>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .contact-grid { grid-template-columns: 1fr !important; }
          .form-cols { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
