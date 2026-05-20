import { Link, useLocation, Navigate } from 'react-router';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PageSeo } from '../components/PageSeo';

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'Playfair Display, serif',
  fontSize: '1.125rem',
  fontWeight: 600,
  color: '#1A0A24',
  margin: '0 0 10px',
};

const bodyStyle: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  color: '#4A3558',
  lineHeight: 1.85,
  fontSize: '0.9rem',
  margin: '0 0 12px',
};

const CONTACT = {
  email: 'hello@bejeweled.store',
  phone: '+92 310 7700470',
};

export default function Legal() {
  const location = useLocation();
  const isTerms = location.pathname === '/terms';
  const isPrivacy = location.pathname === '/privacy';

  // Redirect /legal to /terms — no selector page
  if (!isTerms && !isPrivacy) {
    return <Navigate to="/terms" replace />;
  }

  const pageTitle = isTerms ? 'Terms & Conditions' : 'Privacy Policy';
  const updated = 'May 1, 2026';

  return (
    <div style={{ backgroundColor: '#FAF7FF', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <PageSeo title={pageTitle} />
      <Header />

      <main>
        {/* Page header */}
        <section style={{ background: 'white', padding: '56px 48px 48px', borderBottom: '1px solid #E8D5F5' }}>
          <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '10px', marginTop: '16px' }}>LEGAL</p>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 600, color: '#1A0A24', margin: '0 0 12px', lineHeight: 1.2 }}>
              {pageTitle}
            </h1>
            <p style={{ color: '#9B8FAA', fontSize: '0.8rem', margin: '0 0 20px' }}>Last updated: {updated}</p>

            {/* Tab switcher */}
            <div style={{ display: 'inline-flex', border: '1px solid #E8D5F5', borderRadius: '3px', overflow: 'hidden' }}>
              <Link to="/terms" style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', background: isTerms ? '#5B1E6E' : 'transparent', color: isTerms ? '#FFFFFF' : '#6B4F7A', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>Terms & Conditions</Link>
              <Link to="/privacy" style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', background: isPrivacy ? '#5B1E6E' : 'transparent', color: isPrivacy ? '#FFFFFF' : '#6B4F7A', fontFamily: 'Inter, sans-serif', borderLeft: '1px solid #E8D5F5', transition: 'all 0.15s' }}>Privacy Policy</Link>
            </div>
          </div>
        </section>

        {/* Content */}
        <section style={{ padding: '64px 48px 80px' }}>
          <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <article style={{ background: 'white', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '48px 52px' }} className="legal-article">

              {isTerms && (
                <>
                  <LegalSection title="1. Introduction">
                    <p style={bodyStyle}>Welcome to Bejeweled. These Terms and Conditions govern your use of our website and the purchase of our products. By accessing our website or making a purchase, you agree to be bound by these terms.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>Please read these terms carefully before using our services. If you do not agree with any part of these terms, you may not access our website or make purchases.</p>
                  </LegalSection>

                  <LegalSection title="2. Products and Pricing">
                    <p style={bodyStyle}>All products sold through Bejeweled are sourced from trusted suppliers and curated for quality and aesthetic appeal. Minor variations in colour, size, or finish may occur across product batches and are not considered defects.</p>
                    <p style={bodyStyle}>All prices are listed in PKR (Pakistani Rupees) and are subject to change without notice. Orders already placed will honour the price at the time of purchase.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>Product availability is subject to stock levels. We make every effort to keep inventory updated, but items may sell out before we can reflect changes online.</p>
                  </LegalSection>

                  <LegalSection title="3. Orders and Payment">
                    <p style={bodyStyle}>By placing an order, you are making an offer to purchase products. We reserve the right to accept or decline your order for any reason. All orders are subject to acceptance and availability.</p>
                    <p style={bodyStyle}>Bejeweled currently accepts Cash on Delivery (COD) as its primary payment method. A COD service fee of 4% may apply at checkout. Payment is collected at the time of delivery.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>Once your order is confirmed, you will receive an order confirmation. This confirmation does not constitute final acceptance — only a record that your order has been received and is being processed.</p>
                  </LegalSection>

                  <LegalSection title="4. Shipping and Delivery">
                    <p style={bodyStyle}>We deliver across Pakistan. Shipping costs and estimated delivery times are calculated at checkout based on your location.</p>
                    <p style={bodyStyle}>Orders are typically processed and dispatched within 1–2 business days. Delivery times are estimates and are not guaranteed. Bejeweled is not responsible for delays caused by courier services or circumstances beyond our control.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>Free delivery is available on orders above PKR 3,000. Standard delivery charges apply below this threshold.</p>
                  </LegalSection>

                  <LegalSection title="5. Returns and Refunds">
                    <p style={bodyStyle}>We want you to be completely satisfied with your purchase. If you are not happy with your order, you may return unused items in their original packaging within 7 days of delivery for a refund or exchange.</p>
                    <p style={bodyStyle}>To initiate a return, please contact our customer service team at {CONTACT.email} with your order number. We will provide return instructions.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>Refunds will be processed within 5–7 business days of receiving and inspecting your return. Items returned in a used or damaged condition may not be eligible for a full refund.</p>
                  </LegalSection>

                  <LegalSection title="6. Intellectual Property">
                    <p style={bodyStyle}>All content on the Bejeweled website — including text, images, logos, designs, and graphics — is the property of Bejeweled and is protected by applicable copyright and trademark laws.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>You may not reproduce, distribute, modify, or create derivative works from our content without express written permission from Bejeweled.</p>
                  </LegalSection>

                  <LegalSection title="7. Contact Us" last>
                    <p style={bodyStyle}>If you have any questions about these Terms and Conditions, please contact us:</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>
                      Email: <a href={`mailto:${CONTACT.email}`} style={{ color: '#5B1E6E' }}>{CONTACT.email}</a><br />
                      Phone: <a href="tel:+923107700470" style={{ color: '#5B1E6E' }}>{CONTACT.phone}</a>
                    </p>
                  </LegalSection>
                </>
              )}

              {isPrivacy && (
                <>
                  <LegalSection title="1. Introduction">
                    <p style={bodyStyle}>At Bejeweled, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our website or make a purchase.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>By using our website, you consent to the collection and use of your information as described in this policy.</p>
                  </LegalSection>

                  <LegalSection title="2. Information We Collect">
                    <p style={bodyStyle}>We collect the following types of information:</p>
                    <p style={bodyStyle}><strong>Personal Information:</strong> When you create an account or place an order, we collect your name, email address, shipping address, and phone number.</p>
                    <p style={bodyStyle}><strong>Usage Data:</strong> We automatically collect information about your device, browser, and how you interact with our website through cookies and similar technologies.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}><strong>Communication Data:</strong> If you contact us, we collect the content of your messages and any supporting information you share.</p>
                  </LegalSection>

                  <LegalSection title="3. How We Use Your Information">
                    <p style={bodyStyle}>We use the information we collect to:</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>
                      • Process and fulfil your orders<br />
                      • Communicate with you about orders and customer service<br />
                      • Send marketing communications (with your consent)<br />
                      • Improve our website and user experience<br />
                      • Detect and prevent fraud or security issues<br />
                      • Comply with legal obligations
                    </p>
                  </LegalSection>

                  <LegalSection title="4. Sharing Your Information">
                    <p style={bodyStyle}>We do not sell or rent your personal information to third parties. We may share your information with trusted service providers who assist in operating our website, processing payments, and fulfilling orders.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>We may disclose your information if required by law or to protect our rights, property, or safety.</p>
                  </LegalSection>

                  <LegalSection title="5. Cookies">
                    <p style={bodyStyle}>We use cookies and similar technologies to collect information about your browsing activities. Cookies help us remember your preferences and improve your experience.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>You can control cookies through your browser settings. Disabling cookies may affect the functionality of our website.</p>
                  </LegalSection>

                  <LegalSection title="6. Data Security">
                    <p style={bodyStyle}>We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, or disclosure.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>No method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>
                  </LegalSection>

                  <LegalSection title="7. Your Rights">
                    <p style={bodyStyle}>You have the right to access, update, or request deletion of your personal information. You may also opt out of marketing communications at any time.</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>To exercise these rights, please contact us at <a href={`mailto:${CONTACT.email}`} style={{ color: '#5B1E6E' }}>{CONTACT.email}</a>.</p>
                  </LegalSection>

                  <LegalSection title="8. Contact Us" last>
                    <p style={bodyStyle}>If you have questions about this Privacy Policy, please contact us:</p>
                    <p style={{ ...bodyStyle, margin: 0 }}>
                      Email: <a href={`mailto:${CONTACT.email}`} style={{ color: '#5B1E6E' }}>{CONTACT.email}</a><br />
                      Phone: <a href="tel:+923107700470" style={{ color: '#5B1E6E' }}>{CONTACT.phone}</a>
                    </p>
                  </LegalSection>
                </>
              )}
            </article>
          </div>
        </section>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .legal-article { padding: 32px 24px !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}

function LegalSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section style={{ marginBottom: last ? 0 : '40px', paddingBottom: last ? 0 : '40px', borderBottom: last ? 'none' : '1px solid #F0E8F8' }}>
      <h2 style={sectionHeadingStyle}>{title}</h2>
      {children}
    </section>
  );
}
