-- ============================================================
-- Migration: increment_coupon_usage
-- Adds a SECURITY DEFINER function so anon users can safely
-- increment used_count when an order is placed using a coupon.
-- Also auto-expires the coupon when usedCount >= usageLimit.
-- RLS is bypassed inside the function (owner privileges).
-- ============================================================

create or replace function public.increment_coupon_usage(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Increment used_count for active coupons that have not hit their limit
  update public.coupons
  set used_count = used_count + 1
  where upper(trim(code)) = upper(trim(p_code))
    and status = 'Active'
    and (usage_limit = 0 or used_count < usage_limit);

  -- Auto-expire coupon if usage limit is now reached
  update public.coupons
  set status = 'Expired'
  where upper(trim(code)) = upper(trim(p_code))
    and status = 'Active'
    and usage_limit > 0
    and used_count >= usage_limit;
end;
$$;

-- Allow anon and authenticated users to call this RPC
grant execute on function public.increment_coupon_usage(text) to anon, authenticated;
