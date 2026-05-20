-- Fix "Database error saving new user" on signup.
-- Supabase fires on_auth_user_created after every INSERT into auth.users.
-- If this trigger is missing or broken, all signups fail with that error.
-- Run this in the Supabase SQL Editor.

-- Step 1: Drop any broken existing trigger/function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Step 2: Create the function that inserts a minimal profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Step 3: Attach the trigger to auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
