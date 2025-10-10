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
drop policy if exists subscription_plans_admin_write on public.subscription_plans;
create policy subscription_plans_admin_write on public.subscription_plans
for all to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
))
with check (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
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
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
))
with check (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
));

-- Coupon redemptions
alter table if exists public.coupon_redemptions enable row level security;

-- Allow Admins full access; users can read their own assignments/uses
drop policy if exists coupon_redemptions_user_read on public.coupon_redemptions;
create policy coupon_redemptions_user_read on public.coupon_redemptions
for select to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
));

drop policy if exists coupon_redemptions_admin_write on public.coupon_redemptions;
create policy coupon_redemptions_admin_write on public.coupon_redemptions
for all to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
))
with check (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
));

-- Payments
alter table if exists public.payments enable row level security;

-- Admins can read all; users can read their own
drop policy if exists payments_user_read on public.payments;
create policy payments_user_read on public.payments
for select to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
));

-- Only Admins can write payments rows (webhooks/server should use service role)
drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments
for all to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
))
with check (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
));

-- User subscriptions
alter table if exists public.user_subscriptions enable row level security;

-- Users can read their own subscriptions
drop policy if exists user_subscriptions_user_read on public.user_subscriptions;
create policy user_subscriptions_user_read on public.user_subscriptions
for select to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
));

-- Users can insert their own subscriptions
drop policy if exists user_subscriptions_user_insert on public.user_subscriptions;
create policy user_subscriptions_user_insert on public.user_subscriptions
for insert to authenticated
with check (user_id = auth.uid());

-- Users can update their own subscriptions
drop policy if exists user_subscriptions_user_update on public.user_subscriptions;
create policy user_subscriptions_user_update on public.user_subscriptions
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Admins can manage all subscriptions
drop policy if exists user_subscriptions_admin_all on public.user_subscriptions;
create policy user_subscriptions_admin_all on public.user_subscriptions
for all to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
))
with check (exists (
  select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
));

