-- Wishlist, Coupons, FAQs tables and admin RLS policies
-- Run this in the Supabase SQL Editor

-- ==================== ADMIN HELPER (SECURITY DEFINER) ====================
-- This function bypasses RLS to check admin status, avoiding infinite
-- recursion when profiles policies themselves need an admin check.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ==================== WISHLIST ====================

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.wishlist_items enable row level security;

drop policy if exists "Users can read own wishlist" on public.wishlist_items;
create policy "Users can read own wishlist"
  on public.wishlist_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own wishlist" on public.wishlist_items;
create policy "Users can insert own wishlist"
  on public.wishlist_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own wishlist" on public.wishlist_items;
create policy "Users can delete own wishlist"
  on public.wishlist_items for delete
  using (auth.uid() = user_id);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items(user_id);

-- ==================== COUPONS ====================

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null default 0,
  usage_limit integer not null default 0,
  used_count integer not null default 0,
  status text not null default 'Active' check (status in ('Active', 'Expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

-- Everyone can read active coupons (needed for cart validation)
drop policy if exists "Anyone can read coupons" on public.coupons;
create policy "Anyone can read coupons"
  on public.coupons for select
  using (true);

-- Only admins can insert/update/delete coupons
drop policy if exists "Admins can insert coupons" on public.coupons;
create policy "Admins can insert coupons"
  on public.coupons for insert
  with check (public.is_admin());

drop policy if exists "Admins can update coupons" on public.coupons;
create policy "Admins can update coupons"
  on public.coupons for update
  using (public.is_admin());

drop policy if exists "Admins can delete coupons" on public.coupons;
create policy "Admins can delete coupons"
  on public.coupons for delete
  using (public.is_admin());

create or replace function public.set_coupons_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
before update on public.coupons
for each row execute function public.set_coupons_updated_at();

-- ==================== FAQS ====================

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.faqs enable row level security;

-- Everyone can read FAQs
drop policy if exists "Anyone can read faqs" on public.faqs;
create policy "Anyone can read faqs"
  on public.faqs for select
  using (true);

-- Only admins can manage FAQs
drop policy if exists "Admins can insert faqs" on public.faqs;
create policy "Admins can insert faqs"
  on public.faqs for insert
  with check (public.is_admin());

drop policy if exists "Admins can update faqs" on public.faqs;
create policy "Admins can update faqs"
  on public.faqs for update
  using (public.is_admin());

drop policy if exists "Admins can delete faqs" on public.faqs;
create policy "Admins can delete faqs"
  on public.faqs for delete
  using (public.is_admin());

-- ==================== ADMIN RLS ON EXISTING TABLES ====================

-- Admin can read ALL orders (for admin dashboard)
drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders"
  on public.orders for select
  using (
    auth.uid() = user_id
    or public.is_admin()
  );

-- Admin can update any order status
drop policy if exists "Admins can update all orders" on public.orders;
create policy "Admins can update all orders"
  on public.orders for update
  using (public.is_admin());

-- Admin can read ALL profiles (for customer listing)
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_admin()
  );

-- Drop the old user-only orders select policy so the new combined one takes effect
drop policy if exists "Users can read their own orders" on public.orders;

-- Drop the old user-only profiles select policy so the new combined one takes effect
drop policy if exists "Users can read own profile" on public.profiles;

-- ==================== SEED DEFAULT FAQS ====================

insert into public.faqs (question, answer, sort_order) values
  ('What are your shipping options and delivery times?',
   'We offer standard shipping (5-7 business days) for $5.99 and express shipping (2-3 business days) for $12.99. Free standard shipping on orders over $75. All orders are processed within 1-2 business days. You''ll receive a tracking number once your order ships.',
   1),
  ('What is your return and exchange policy?',
   'We accept returns within 30 days of delivery for a full refund. Items must be unused, in original packaging, and in the same condition you received them. Exchanges are free - just contact us and we''ll send you a prepaid shipping label. Custom or personalized items cannot be returned unless defective.',
   2),
  ('Are your mugs dishwasher and microwave safe?',
   'Yes! All Bejeweled jewelry is made from high-quality materials that are safe for everyday wear. We recommend gentle cleaning with a soft cloth to preserve the beauty of the design and extend the life of your piece. Avoid contact with water, perfume, and harsh chemicals to prevent tarnishing.',
   3),
  ('Do you offer gift wrapping or custom messages?',
   'Absolutely! We offer complimentary gift wrapping on all orders. During checkout, select the "Gift Wrap" option and add a personalized message. Your mug will arrive beautifully wrapped in our signature cream packaging with a handwritten note card.',
   4),
  ('How do I care for my Bejeweled jewelry?',
   'To keep your jewelry looking beautiful: store in a cool, dry place away from sunlight, avoid contact with water and perfume, clean gently with a soft polishing cloth, and remove before swimming or exercising. With proper care, your Bejeweled pieces will sparkle for years to come!',
   5)
on conflict do nothing;

-- ==================== SEED DEFAULT COUPONS ====================

insert into public.coupons (code, discount_type, discount_value, usage_limit, used_count, status) values
  ('SAVE10',     'percent', 10, 100, 0, 'Active'),
  ('DISCOUNT20', 'percent', 20,  50, 0, 'Active'),
  ('OFF30',      'percent', 30,  20, 0, 'Active'),
  ('FREE5',      'fixed',    5, 100, 0, 'Active'),
  ('COZY10',     'percent', 10, 200, 0, 'Active')
on conflict (code) do nothing;
