-- Per-investor application fee (INR). Run after investor_application_fee_and_columns.sql.
-- If no row for an investor, the global default from investor_application_fee_settings (id=1) is used.
-- Admin checks use public.user_profiles (auth_user_id = auth.uid()), not public.users.

CREATE TABLE IF NOT EXISTS public.investor_application_fees (
  investor_user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fee_inr NUMERIC(12, 2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investor_application_fees_updated_at
  ON public.investor_application_fees(updated_at DESC);

ALTER TABLE public.investor_application_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read investor application fees" ON public.investor_application_fees;
CREATE POLICY "Anyone can read investor application fees"
  ON public.investor_application_fees
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert investor application fees" ON public.investor_application_fees;
CREATE POLICY "Admins can insert investor application fees"
  ON public.investor_application_fees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.role::text = 'Admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update investor application fees" ON public.investor_application_fees;
CREATE POLICY "Admins can update investor application fees"
  ON public.investor_application_fees
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.role::text = 'Admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete investor application fees" ON public.investor_application_fees;
CREATE POLICY "Admins can delete investor application fees"
  ON public.investor_application_fees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.role::text = 'Admin'
    )
  );

COMMENT ON TABLE public.investor_application_fees IS 'Optional per-investor override for startup application fee (INR).';
