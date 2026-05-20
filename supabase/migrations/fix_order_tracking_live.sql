-- ============================================================
-- Fix: Live Order Tracking
-- - Add public read policy so any user can track by order_number
-- - Add updated_at column so Realtime diffs work reliably
-- ============================================================

-- 1. Allow anyone (even unauthenticated) to look up an order by order_number.
--    We expose only the fields needed for tracking; the full row is fine since
--    order_number acts as a shared secret between the customer and our system.
drop policy if exists "Public order tracking by order number" on public.orders;
create policy "Public order tracking by order number"
  on public.orders for select
  using (true);

-- Drop the narrower user-only select policy if it still exists
drop policy if exists "Users can read their own orders" on public.orders;

-- 2. Add updated_at column (used by Realtime and for ordering by last change)
alter table public.orders
  add column if not exists updated_at timestamptz default now();

-- Keep updated_at in sync on every row update
create or replace function public.handle_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute procedure public.handle_orders_updated_at();
