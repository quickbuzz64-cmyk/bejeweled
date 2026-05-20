-- Stores one row per AI chat exchange (user message + assistant reply).
-- Inserts come from the API using the service role (bypasses RLS).
-- Reads, updates, and deletes are restricted to admin users only.

create table if not exists chat_logs (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users(id) on delete set null,
  user_message      text        not null,
  assistant_message text        not null,
  intent            text        not null default 'general',
  tools_used        text[]      not null default '{}',
  model_used        text        not null default 'llama-3.3-70b-versatile',
  created_at        timestamptz not null default now()
);

create index if not exists chat_logs_created_idx on chat_logs (created_at desc);
create index if not exists chat_logs_user_idx    on chat_logs (user_id);
create index if not exists chat_logs_intent_idx  on chat_logs (intent);

alter table chat_logs enable row level security;

-- Admins can view all logs
create policy "admin_select_chat_logs"
  on chat_logs for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Admins can delete logs (e.g. prune old/test entries)
create policy "admin_delete_chat_logs"
  on chat_logs for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Note: INSERT is handled by the API via the service role key, which
-- bypasses RLS entirely — no INSERT policy needed here.
