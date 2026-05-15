-- Run in Supabase SQL Editor (idempotent).
-- 1) Admin-configurable fee for startup → investor applications (INR, Razorpay).
-- 2) Optional audit columns on investor_connection_requests.
--
-- Admin checks use public.user_profiles (auth_user_id = auth.uid()), not public.users.

CREATE TABLE IF NOT EXISTS public.investor_application_fee_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fee_inr NUMERIC(12, 2) NOT NULL DEFAULT 499.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.investor_application_fee_settings (id, fee_inr)
VALUES (1, 499.00)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.investor_application_fee_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read investor application fee" ON public.investor_application_fee_settings;
CREATE POLICY "Anyone can read investor application fee"
  ON public.investor_application_fee_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update investor application fee" ON public.investor_application_fee_settings;
CREATE POLICY "Admins can update investor application fee"
  ON public.investor_application_fee_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.role::text = 'Admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert investor application fee" ON public.investor_application_fee_settings;
CREATE POLICY "Admins can insert investor application fee"
  ON public.investor_application_fee_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.role::text = 'Admin'
    )
  );

COMMENT ON TABLE public.investor_application_fee_settings IS 'Single-row (id=1): default INR fee when no per-investor override exists. See investor_application_fees table (run database/investor_application_fees_per_investor.sql).';

ALTER TABLE public.investor_connection_requests
  ADD COLUMN IF NOT EXISTS application_fee_inr NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS application_razorpay_payment_id TEXT;

COMMENT ON COLUMN public.investor_connection_requests.application_fee_inr IS 'Fee charged (INR) when application was paid via Razorpay.';
COMMENT ON COLUMN public.investor_connection_requests.application_razorpay_payment_id IS 'Razorpay payment_id after successful verify.';
