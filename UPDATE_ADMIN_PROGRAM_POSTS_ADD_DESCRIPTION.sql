-- Add description column to existing admin_program_posts table (safe migration)
alter table if exists public.admin_program_posts
  add column if not exists description text null;



