import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, Banknote } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { showErrorToast, showSuccessToast } from '../lib/notifications';
import { createTrackedOrder, saveTrackedOrder } from '../lib/orderTracking';
import { useCartStore } from '../store/cartStore';
import { PageSeo } from '../components/PageSeo';
import { calcDeliveryCharge, calcCodTax, formatPKR } from '../lib/pricing';
import { incrementCouponUsage } from '../lib/coupons';

const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Kashmir',
  'Islamabad Capital Territory',
];

type CheckoutStep = 'address' | 'payment';

export default function Checkout() {
  const navigate = useNavigate();
  const { items: cartItems, isLoading: cartLoading, clearCart: storeClearCart, appliedCoupon, clearCoupon } = useCartStore();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [addressForm, setAddressForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    phone: '',
  });
  const paymentMethod = 'cod' as const;
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = calcDeliveryCharge(subtotal);
  const tax = calcCodTax(subtotal, deliveryCharge);
  // Recalculate coupon discount against current subtotal for accuracy
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === 'percent'
      ? subtotal * (appliedCoupon.discountValue / 100)
      : appliedCoupon.discountValue
    : 0;
  const total = Math.max(0, subtotal + deliveryCharge + tax - couponDiscount);
  const checkoutTitle = currentStep === 'address'
    ? 'Checkout - Address'
    : 'Checkout - Payment';

  const completeOrder = () => {
    // Stock validation before placing order
    const stockViolation = cartItems.find((item) => item.quantity > item.stock);
    if (stockViolation) {
      showErrorToast(
        'Stock limit exceeded',
        `Only ${stockViolation.stock} units of "${stockViolation.name}" are available. Please update your cart.`,
      );
      setIsProcessing(false);
      return;
    }

    try {
      const trackedOrder = createTrackedOrder({
        firstName: addressForm.firstName,
        lastName: addressForm.lastName,
        email: addressForm.email,
        phone: addressForm.phone,
        address: addressForm.address,
        city: addressForm.city,
        state: addressForm.province,
        zipCode: addressForm.zipCode,
        shippingMethod: 'standard' as const,
        items: cartItems,
        subtotal,
        shippingCost: deliveryCharge,
        tax,
        total,
        paymentMethod,
      });

      saveTrackedOrder(trackedOrder);

      // Increment coupon usage (best-effort, non-blocking)
      if (appliedCoupon) {
        void incrementCouponUsage(appliedCoupon.code).catch(() => {/* ignore */});
        clearCoupon();
      }
      void storeClearCart();
      showSuccessToast('Order confirmed', `Your order ${trackedOrder.orderNumber} is being prepared.`);
      navigate('/order-success', {
        state: { orderNumber: trackedOrder.orderNumber },
      });
    } catch (err) {
      showErrorToast('Order failed', err instanceof Error ? err.message : 'Unable to complete your order.');
      setIsProcessing(false);
    }
  };

  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setCurrentStep('payment');
  };

  const handleCodSubmit = () => {
    setIsProcessing(true);
    // Brief delay for UX feedback
    setTimeout(() => {
      setIsProcessing(false);
      completeOrder();
    }, 500);
  };

  const steps: Array<{ key: CheckoutStep; label: string; step: number }> = [
    { key: 'address', label: 'Address', step: 1 },
    { key: 'payment', label: 'Payment', step: 2 },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
      <PageSeo title={checkoutTitle} />
      <header className="border-b px-4 py-6 md:px-6 lg:px-12" style={{ borderColor: '#E8D5F5' }}>
        <div className="store-shell">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandLogo className="inline-flex w-full justify-center md:w-auto" imageClassName="h-14 w-auto" />
            <Link to="/cart" className="text-center text-sm transition-opacity hover:opacity-70 md:text-right" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontWeight: 500 }}>
              Return to cart
            </Link>
          </div>
        </div>
      </header>

      <main className="store-section">
        <div className="store-shell">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-16">
            <section className="lg:col-span-3" aria-labelledby="checkout-heading">
              <h1 id="checkout-heading" className="sr-only">Checkout process</h1>

              <nav aria-label="Checkout steps" className="mb-12">
                <ol className="flex flex-wrap items-center gap-4 lg:max-w-2xl lg:flex-nowrap lg:justify-between" role="list">
                  {steps.map((step, index) => {
                    const currentIndex = steps.findIndex((item) => item.key === currentStep);
                    const isComplete = currentIndex > index;
                    const isActive = currentStep === step.key;

                    return (
                      <li key={step.key} className="flex flex-1 items-center gap-4">
                        <div className="flex flex-1 flex-col items-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (step.key === 'address' || currentStep === 'payment') {
                                setCurrentStep(step.key);
                              }
                            }}
                            className="mb-2 flex h-10 w-10 items-center justify-center rounded-full transition-all"
                            style={{ backgroundColor: isActive || isComplete ? '#5B1E6E' : '#E8D5F5', color: '#ffffff' }}
                            aria-current={isActive ? 'step' : undefined}
                            aria-label={`Step ${step.step}: ${step.label}`}
                            disabled={step.key === 'payment'}
                          >
                            {isComplete ? <Check className="h-5 w-5" aria-hidden="true" /> : <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{step.step}</span>}
                          </button>
                          <span className="text-center text-sm" style={{ fontFamily: 'Inter, sans-serif', color: isActive ? '#3B0D4A' : '#5B1E6E', fontWeight: isActive ? 600 : 500 }}>
                            {step.label}
                          </span>
                        </div>
                        {index < steps.length - 1 && <div className="mx-2 hidden h-0.5 flex-1 lg:block" style={{ backgroundColor: isComplete ? '#5B1E6E' : '#E8D5F5' }} aria-hidden="true" />}
                      </li>
                    );
                  })}
                </ol>
              </nav>

              {currentStep === 'address' && (
                <form onSubmit={handleAddressSubmit} className="max-w-2xl space-y-6">
                  <fieldset>
                    <legend className="mb-6 text-2xl" style={{ fontFamily: 'Playfair Display, serif', color: '#3B0D4A', fontWeight: 600 }}>Shipping Address</legend>

                    <div className="mb-5">
                      <label htmlFor="email" className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>Email Address</label>
                      <input type="email" id="email" value={addressForm.email} onChange={(event) => setAddressForm({ ...addressForm, email: event.target.value })} required autoComplete="email" className="w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif' }} placeholder="your@email.com" />
                    </div>

                    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="firstName" className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>First Name</label>
                        <input type="text" id="firstName" value={addressForm.firstName} onChange={(event) => setAddressForm({ ...addressForm, firstName: event.target.value })} required autoComplete="given-name" className="w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>Last Name</label>
                        <input type="text" id="lastName" value={addressForm.lastName} onChange={(event) => setAddressForm({ ...addressForm, lastName: event.target.value })} required autoComplete="family-name" className="w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                    </div>

                    <div className="mb-5">
                      <label htmlFor="address" className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>Street Address</label>
                      <input type="text" id="address" value={addressForm.address} onChange={(event) => setAddressForm({ ...addressForm, address: event.target.value })} required autoComplete="street-address" className="w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif' }} placeholder="123 Main Street" />
                    </div>

                    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
                      <div className="sm:col-span-2">
                        <label htmlFor="city" className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>City</label>
                        <input type="text" id="city" value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} required autoComplete="address-level2" className="w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                      <div className="sm:col-span-1">
                        <label htmlFor="province" className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>Province</label>
                        <select
                          id="province"
                          value={addressForm.province}
                          onChange={(event) => setAddressForm({ ...addressForm, province: event.target.value })}
                          required
                          autoComplete="address-level1"
                          className="w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2"
                          style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', color: addressForm.province ? '#1A0A24' : '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
                        >
                          <option value="" disabled>Select province</option>
                          {PAKISTAN_PROVINCES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-1">
                        <label htmlFor="zipCode" className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>Postal Code</label>
                        <input type="text" id="zipCode" value={addressForm.zipCode} onChange={(event) => setAddressForm({ ...addressForm, zipCode: event.target.value })} required autoComplete="postal-code" className="w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif' }} placeholder="54000" />
                      </div>
                    </div>

                    <div className="mb-5">
                      <label htmlFor="phone" className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>Phone Number</label>
                      <input type="tel" id="phone" value={addressForm.phone} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })} required autoComplete="tel" className="w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif' }} placeholder="(555) 123-4567" />
                    </div>
                  </fieldset>

                  <button type="submit" className="w-full rounded-full py-4 text-lg transition-all hover:scale-105" style={{ backgroundColor: '#5B1E6E', color: '#ffffff', boxShadow: '0 6px 24px rgba(91, 30, 110, 0.4)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    Continue to Payment
                  </button>
                </form>
              )}

              {currentStep === 'payment' && (
                <div className="max-w-2xl space-y-6">
                  <h2 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif', color: '#3B0D4A', fontWeight: 600 }}>Payment Method</h2>

                  {/* Payment method — Cash on Delivery only */}
                  <div className="flex items-center gap-4 rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '2px solid #5B1E6E', boxShadow: '0 4px 16px rgba(91, 30, 110, 0.15)' }}>
                    <Banknote className="h-6 w-6" style={{ color: '#3B0D4A' }} aria-hidden="true" />
                    <div>
                      <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>Cash on Delivery</p>
                      <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Pay when you receive your order</p>
                    </div>
                  </div>

                  {(
                    <div className="space-y-6">
                      <div className="rounded-xl p-6" style={{ backgroundColor: '#FAF7FF', border: '1px solid #E8D5F5' }}>
                        <h3 className="mb-3 text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>Cash on Delivery</h3>
                        <ul className="space-y-2 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', lineHeight: 1.7 }}>
                          <li>• You will pay <strong style={{ color: '#3B0D4A' }}>{formatPKR(total)}</strong> when your order arrives.</li>
                          <li>• A 4% government COD tax ({formatPKR(tax)}) is included in this total.</li>
                          <li>• Please have the exact amount ready for the delivery person.</li>
                          <li>• Your order will be confirmed immediately.</li>
                        </ul>
                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row">
                        <button type="button" onClick={() => setCurrentStep('address')} className="flex-1 rounded-full py-4 text-lg transition-all hover:opacity-80" style={{ backgroundColor: '#FFFFFF', color: '#5B1E6E', border: '2px solid #E8D5F5', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                          Back
                        </button>
                        <button type="button" onClick={handleCodSubmit} disabled={isProcessing} className="flex-1 rounded-full py-4 text-lg transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: '#5B1E6E', color: '#ffffff', boxShadow: '0 6px 24px rgba(91, 30, 110, 0.4)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                          {isProcessing ? 'Confirming…' : 'Confirm Order (COD)'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="lg:col-span-2" aria-labelledby="order-summary-heading">
              <div className="sticky top-24 rounded-3xl p-8" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E8D5F5', boxShadow: '0 10px 40px rgba(91, 30, 110, 0.12)' }}>
                <h2 id="order-summary-heading" className="mb-6 text-2xl" style={{ fontFamily: 'Playfair Display, serif', color: '#3B0D4A', fontWeight: 600 }}>
                  Order Summary
                </h2>

                <ul className="mb-6 space-y-5" role="list">
                  {cartItems.map((item) => (
                    <li key={item.id} className="flex gap-4">
                      <img src={item.image} alt={item.name} className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" style={{ border: '2px solid #E8D5F5' }} />
                      <div className="min-w-0 flex-1">
                        <h3 className="product-title-wrap mb-1 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>{item.name}</h3>
                        <p className="mb-1 text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Qty: {item.quantity}</p>
                        <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 600 }}>{formatPKR(item.price * item.quantity)}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <hr className="mb-6" style={{ borderColor: '#E8D5F5', borderWidth: '1px' }} />

                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontSize: '0.9rem' }}>Subtotal</dt>
                    <dd style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>{formatPKR(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontSize: '0.9rem' }}>Delivery</dt>
                    <dd style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>{deliveryCharge === 0 ? 'Free' : formatPKR(deliveryCharge)}</dd>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <dt style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontSize: '0.9rem' }}>COD Tax (4%)</dt>
                      <dd style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>{formatPKR(tax)}</dd>
                    </div>
                  )}
                  {couponDiscount > 0 && appliedCoupon && (
                    <div className="flex justify-between">
                      <dt style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontSize: '0.9rem' }}>Discount ({appliedCoupon.code})</dt>
                      <dd style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 500 }}>-{formatPKR(couponDiscount)}</dd>
                    </div>
                  )}
                  <hr style={{ borderColor: '#E8D5F5', borderWidth: '1px' }} />
                  <div className="flex items-center justify-between pt-2">
                    <dt className="text-lg" style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 600 }}>Total</dt>
                    <dd className="text-2xl" style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 700 }}>{formatPKR(total)}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}