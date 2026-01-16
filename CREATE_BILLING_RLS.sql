-- Row Level Security policies for billing tables and subscription_plans
-- Run in Supabase after creating tables

-- Subscription plans
alter table if exists public.subscription_plans enable row level security;

-- Allow all authenticated users to read plans
drop policy if exists subscription_plans_select on public.subscription_plans;
create policy subscription_plans_select on public.subscription_plans
for select to authenticated
using (true);

-- Only Admins can write plans
-- FIXED: Use user_profiles instead of users table
drop policy if exists subscription_plans_admin_write on public.subscription_plans;
create policy subscription_plans_admin_write on public.subscription_plans
for all to authenticated
using (exists (
  select 1 from public.user_profiles u where u.auth_user_id = auth.uid() and u.role = 'Admin'
))
with check (exists (
  select 1 from public.user_profiles u where u.auth_user_id = auth.uid() and u.role = 'Admin'
));

-- Coupons
alter table if exists public.coupons enable row level security;

-- Allow Admins read/write, allow authenticated read
drop policy if exists coupons_select on public.coupons;
create policy coupons_select on public.coupons
for select to authenticated
using (true);

drop policy if exists coupons_admin_write on public.coupons;
create policy coupons_admin_write on public.coupons
for all to authenticated
using (exists (
  select 1 from public.user_profiles u where u.auth_user_id = auth.uid() and u.role = 'Admin'
))
with check (exists (
  select 1 from public.user_profiles u where u.auth_user_id = auth.uid() and u.role = 'Admin'
));

-- Payments
-- Table does not exist, skipping RLS policies

-- User subscriptions
alter table if exists public.user_subscriptions enable row level security;

-- Users can read their own subscriptions
-- FIXED: user_id is profile_id, not auth_user_id, so we need to join user_profiles
drop policy if exists user_subscriptions_user_read on public.user_subscriptions;
create policy user_subscriptions_user_read on public.user_subscriptions
for select to authenticated
using (
  exists (
    select 1 from public.user_profiles up 
    where up.id = user_subscriptions.user_id 
    and up.auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.user_profiles u 
    where u.auth_user_id = auth.uid() 
    and u.role = 'Admin'
  )
);

-- Users can insert their own subscriptions
-- FIXED: user_id is profile_id, not auth_user_id
drop policy if exists user_subscriptions_user_insert on public.user_subscriptions;
create policy user_subscriptions_user_insert on public.user_subscriptions
for insert to authenticated
with check (
  exists (
    select 1 from public.user_profiles up 
    where up.id = user_subscriptions.user_id 
    and up.auth_user_id = auth.uid()
  )
);

-- Users can update their own subscriptions
-- FIXED: user_id is profile_id, not auth_user_id
drop policy if exists user_subscriptions_user_update on public.user_subscriptions;
create policy user_subscriptions_user_update on public.user_subscriptions
for update to authenticated
using (
  exists (
    select 1 from public.user_profiles up 
    where up.id = user_subscriptions.user_id 
    and up.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.user_profiles up 
    where up.id = user_subscriptions.user_id 
    and up.auth_user_id = auth.uid()
  )
);

-- Admins can manage all subscriptions
-- FIXED: Use user_profiles instead of users table
drop policy if exists user_subscriptions_admin_all on public.user_subscriptions;
create policy user_subscriptions_admin_all on public.user_subscriptions
for all to authenticated
using (exists (
  select 1 from public.user_profiles u where u.auth_user_id = auth.uid() and u.role = 'Admin'
))
with check (exists (
  select 1 from public.user_profiles u where u.auth_user_id = auth.uid() and u.role = 'Admin'
));

