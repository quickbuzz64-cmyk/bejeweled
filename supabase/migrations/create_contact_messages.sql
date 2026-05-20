-- Contact messages table: stores all submissions from the website contact form.
-- INSERT is open to public (anon + authenticated).
-- SELECT / UPDATE / DELETE are restricted to admin users only.

create table if not exists contact_messages (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null,
  subject    text        not null,
  message    text        not null,
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

-- Anyone can submit a contact message (no auth required)
create policy "public_insert_contact_messages"
  on contact_messages for insert
  to anon, authenticated
  with check (true);

-- Only admins can view messages
create policy "admin_select_contact_messages"
  on contact_messages for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Only admins can update (e.g. mark as read)
create policy "admin_update_contact_messages"
  on contact_messages for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Only admins can delete messages
create policy "admin_delete_contact_messages"
  on contact_messages for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
