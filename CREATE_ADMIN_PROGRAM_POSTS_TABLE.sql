-- Admin Program Posts: simple table to store external programs posted by admins
-- Columns: program_name, incubation_center, deadline, application_link

-- Enable required extension for UUIDs if using gen_random_uuid()
-- Note: On Supabase, pgcrypto is typically available.
create extension if not exists pgcrypto;

create table if not exists public.admin_program_posts (
  id uuid primary key default gen_random_uuid(),
  program_name text not null,
  incubation_center text not null,
  deadline date not null,
  application_link text not null,
  poster_url text null,
  created_at timestamptz not null default now(),
  created_by uuid null
);

-- Helpful indexes
create index if not exists idx_admin_program_posts_deadline on public.admin_program_posts (deadline);
create index if not exists idx_admin_program_posts_created_at on public.admin_program_posts (created_at desc);

-- Optional: RLS (uncomment and adjust policies to your auth model)
-- alter table public.admin_program_posts enable row level security;
--
-- -- Allow all authenticated users to read posts
-- create policy "Allow read to authenticated" on public.admin_program_posts
--   for select using (true);
--
-- -- Restrict insert/update/delete to admins
-- -- Replace the condition with your actual admin check (e.g., exists in users table with role = 'Admin')
-- create policy "Allow write to admins only" on public.admin_program_posts
--   for all using (false) with check (
--     -- Example: everyone for now (adjust to your org)
--     true
--   );


