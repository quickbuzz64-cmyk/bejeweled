-- Orders table: persists tracked orders to Supabase
-- Run this in the Supabase SQL Editor

create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_name text not null,
  email text not null,
  phone text not null default '',
  shipping_address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  shipping_method text not null check (shipping_method in ('free', 'standard', 'express')),
  status text not null default 'Packed',
  status_description text not null default '',
  carrier text not null default '',
  tracking_code text not null default '',
  origin_city text not null default '',
  destination_city text not null default '',
  estimated_delivery text not null default '',
  order_placed_at text not null default '',
  items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  timeline jsonb not null default '[]',
  created_at timestamptz default now() not null
);

-- RLS: users can only read/write their own orders
alter table public.orders enable row level security;

create policy "Users can insert their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can update their own orders"
  on public.orders for update
  using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_order_number_idx on public.orders(order_number);
