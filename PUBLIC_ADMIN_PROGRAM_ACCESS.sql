-- PUBLIC_ADMIN_PROGRAM_ACCESS.sql
-- Purpose: Allow public (unauthenticated) read access to admin_program_posts
-- so that shared admin program links work without login, while keeping writes protected.

-- 1) Enable Row Level Security on the table (if not already enabled)
alter table if exists public.admin_program_posts enable row level security;

-- 2) Allow read (SELECT) to both anon and authenticated users
-- This makes the programs publicly viewable via the PublicAdminProgramView.
create policy if not exists "Public read admin programs"
  on public.admin_program_posts
  for select
  using (true);

-- NOTE:
-- - This policy is READ-ONLY. It does NOT allow INSERT/UPDATE/DELETE to anonymous users.
-- - Your existing admin-only write policies (if any) will continue to control writes.
-- - If you previously relied on "RLS disabled" for writes, you should also add explicit
--   insert/update/delete policies for admins only, as recommended in CREATE_ADMIN_PROGRAM_POSTS_TABLE.sql.


