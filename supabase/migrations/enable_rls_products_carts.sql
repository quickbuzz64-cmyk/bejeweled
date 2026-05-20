-- Enable RLS on public.products
-- Products are publicly readable; only service-role / admins can write.
alter table public.products enable row level security;

-- Anyone (including anonymous visitors) can read products
create policy "Products are publicly readable"
  on public.products
  for select
  using (true);

-- Only authenticated admins can insert / update / delete products
create policy "Admins can manage products"
  on public.products
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Enable RLS on public.carts (if the table exists — some projects use
-- cart_items instead; this migration is safe to run either way).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'carts'
  ) then

    execute 'alter table public.carts enable row level security';

    -- Users can only read their own cart rows
    execute $policy$
      create policy "Users can view own cart"
        on public.carts
        for select
        using (auth.uid() = user_id)
    $policy$;

    -- Users can only insert into their own cart
    execute $policy$
      create policy "Users can insert into own cart"
        on public.carts
        for insert
        with check (auth.uid() = user_id)
    $policy$;

    -- Users can only update their own cart rows
    execute $policy$
      create policy "Users can update own cart"
        on public.carts
        for update
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $policy$;

    -- Users can only delete their own cart rows
    execute $policy$
      create policy "Users can delete from own cart"
        on public.carts
        for delete
        using (auth.uid() = user_id)
    $policy$;

  end if;
end;
$$;
