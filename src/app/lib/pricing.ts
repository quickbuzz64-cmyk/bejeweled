// ─── Delivery & Tax Constants ───────────────────────────────────────────
// Single source of truth used across Cart, Checkout, and order summaries.
// ────────────────────────────────────────────────────────────────────────

/** Standard delivery charge (PKR) */
export const DELIVERY_CHARGE = 250;

/** Subtotal threshold above which delivery is free (PKR) */
export const FREE_DELIVERY_THRESHOLD = 3000;

/** Government COD tax rate (fraction, e.g. 0.04 = 4%) */
export const COD_TAX_RATE = 0.04;

// ─── Helpers ────────────────────────────────────────────────────────────

export function calcDeliveryCharge(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
}

/**
 * COD tax is 4% of (subtotal + delivery).
 * Only applied when payment method is "cod".
 */
export function calcCodTax(subtotal: number, deliveryCharge: number): number {
  return Math.round((subtotal + deliveryCharge) * COD_TAX_RATE);
}

export function formatPKR(amount: number): string {
  return `Rs ${new Intl.NumberFormat('en-PK').format(amount)}`;
}
