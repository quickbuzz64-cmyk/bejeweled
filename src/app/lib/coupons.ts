import { getSupabaseClient } from './supabase';
import type { Coupon, CouponStatus } from '../types';

export type { Coupon, CouponStatus };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Coupon {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    usageLimit: row.usage_limit,
    usedCount: row.used_count,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function fetchCoupons(): Promise<Coupon[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function validateCoupon(code: string): Promise<Coupon | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code.trim())
    .eq('status', 'Active')
    .maybeSingle();

  if (error || !data) return null;

  const coupon = mapRow(data);

  // Check usage limit
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return null;
  }

  // Check expiry
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return null;
  }

  return coupon;
}

export async function createCoupon(input: {
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  usageLimit: number;
  status: CouponStatus;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('coupons').insert({
    code: input.code.toUpperCase().trim(),
    discount_type: input.discountType,
    discount_value: input.discountValue,
    usage_limit: input.usageLimit,
    used_count: 0,
    status: input.status,
  });

  if (error) throw error;
}

export async function deleteCoupon(couponId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('coupons').delete().eq('id', couponId);
  if (error) throw error;
}

export async function updateCouponStatus(couponId: string, status: CouponStatus) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('coupons').update({ status }).eq('id', couponId);
  if (error) throw error;
}

/**
 * Increments used_count for the coupon with the given code.
 * Uses a SECURITY DEFINER RPC so anon users can call it during checkout.
 * Silently does nothing if the coupon is inactive or limit is reached.
 */
export async function incrementCouponUsage(code: string): Promise<void> {
  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('increment_coupon_usage', { p_code: code.toUpperCase().trim() });
}
