import { useState } from 'react';
import { Search, Truck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { buildOrderTrackingPath, getTrackedOrder, normalizeOrderNumber } from '../lib/orderTracking';
import { showErrorToast } from '../lib/notifications';
import { PageSeo } from '../components/PageSeo';

export default function TrackOrder() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedOrderNumber = normalizeOrderNumber(orderNumber);

    if (!normalizedOrderNumber) {
      showErrorToast('Enter your order ID.', 'Use the order number you received after checkout, for example CZP-10892.');
      return;
    }

    if (!getTrackedOrder(normalizedOrderNumber)) {
      showErrorToast('Order not found.', 'Double-check the order number and try again.');
      return;
    }

    navigate(buildOrderTrackingPath(normalizedOrderNumber));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
      <PageSeo title="Track Order" />
      <Header />

      <main className="store-section">
        <div className="store-shell-compact">

          <section className="rounded-[2rem] border px-6 py-10 text-center md:px-10 lg:py-16" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5', boxShadow: '0 12px 42px rgba(91, 30, 110, 0.12)' }} aria-labelledby="track-order-heading">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: '#F0F4F0' }}>
              <Truck className="h-9 w-9" style={{ color: '#5B1E6E' }} aria-hidden="true" />
            </div>
            <h1 id="track-order-heading" className="mb-4 text-4xl" style={{ fontFamily: 'Playfair Display, serif', color: '#3B0D4A', fontWeight: 600 }}>
              Track Your Order
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed md:text-lg" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>
              Enter your order ID to view the latest tracking activity, courier updates, shipment route, and full order details even if you checked out as a guest.
            </p>

            <form onSubmit={handleSubmit} className="mx-auto max-w-xl">
              <label htmlFor="order-id" className="mb-2 block text-left text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>
                Order ID
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: '#5B1E6E' }} aria-hidden="true" />
                  <input
                    id="order-id"
                    type="text"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="Enter order ID, e.g. CZP-10892"
                    className="w-full rounded-xl py-4 pl-12 pr-4 outline-none"
                    style={{ backgroundColor: '#FAF7FF', border: '2px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif' }}
                    autoCapitalize="characters"
                    aria-label="Enter order ID"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl px-8 py-4 transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontWeight: 600, boxShadow: '0 8px 24px rgba(91, 30, 110, 0.24)' }}
                >
                  View Tracking
                </button>
              </div>
            </form>

            <div className="mt-8 rounded-2xl p-5 text-left" style={{ backgroundColor: '#FAF7FF', border: '1px solid #E8D5F5' }}>
              <p className="mb-2 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 600 }}>
                Demo order to try
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', lineHeight: 1.7 }}>
                Use <strong style={{ color: '#3B0D4A' }}>CZP-10892</strong> to preview the full guest-tracking experience.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}