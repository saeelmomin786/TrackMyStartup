-- Billing tables for Razorpay-backed subscriptions and coupons
-- Run these statements in Supabase SQL editor

-- 1) Coupons table
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null,
  max_uses integer not null default 0,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  applies_to_user_type text default 'Startup',
  applies_to_plan_id uuid references public.subscription_plans(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coupons_code on public.coupons(lower(code));
create index if not exists idx_coupons_active on public.coupons(is_active);

-- 2) Coupon redemptions (assignments/usage by user)
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  redeemed_at timestamptz not null default now(),
  -- If set without subscription_id initially, this acts as an assignment record
  is_assignment boolean not null default false
);

create index if not exists idx_coupon_redemptions_coupon on public.coupon_redemptions(coupon_id);
create index if not exists idx_coupon_redemptions_user on public.coupon_redemptions(user_id);

-- 3) Payments table for provider events (e.g., Razorpay)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null,
  status text not null check (status in ('pending','paid','failed','refunded')) default 'pending',
  provider text not null default 'razorpay',
  provider_payment_id text,
  provider_order_id text,
  meta jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_subscription on public.payments(subscription_id);
create index if not exists idx_payments_status on public.payments(status);

-- Optional RLS (enable and add simple policies); comment out if you manage RLS separately
-- alter table public.coupons enable row level security;
-- alter table public.coupon_redemptions enable row level security;
-- alter table public.payments enable row level security;

-- Example permissive policies for testing (adjust for production)
-- create policy "coupons_read" on public.coupons for select using (true);
-- create policy "coupons_admin_write" on public.coupons for all to authenticated using (exists (
--   select 1 from public.users u where u.id = auth.uid() and u.role = 'Admin'
-- )) with check (true);

-- Timestamps auto-update trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();


