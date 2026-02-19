-- HOTFIX: co_investment_offers RLS policies migrated from public.users -> public.user_profiles
-- Date: 2026-02-18
-- Issue: SELECT on co_investment_offers returns 500 because existing policies reference public.users
-- (which does not exist in this schema setup).

ALTER TABLE public.co_investment_offers ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies
DROP POLICY IF EXISTS "Users can view their own co-investment offers" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Users can insert their own co-investment offers" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Users can update their own co-investment offers" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Lead investors can view offers for their opportunities" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Investment advisors can view offers for their clients" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Startups can view offers for their startup" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Admins can view all co-investment offers" ON public.co_investment_offers;

-- Users can view their own co-investment offers (investor_email matches their latest profile email)
CREATE POLICY "Users can view their own co-investment offers"
ON public.co_investment_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.email = co_investment_offers.investor_email
  )
);

-- Lead investors can view offers for opportunities they listed
CREATE POLICY "Lead investors can view offers for their opportunities"
ON public.co_investment_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.co_investment_opportunities cio
    WHERE cio.id = co_investment_offers.co_investment_opportunity_id
      AND cio.listed_by_user_id = auth.uid()
  )
);

-- Investment advisors can view offers for investors who entered their advisor code
CREATE POLICY "Investment advisors can view offers for their clients"
ON public.co_investment_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles investor
    JOIN public.user_profiles advisor
      ON advisor.auth_user_id = auth.uid()
    WHERE investor.role = 'Investor'
      AND advisor.role = 'Investment Advisor'
      AND investor.email = co_investment_offers.investor_email
      AND COALESCE(NULLIF(TRIM(investor.investment_advisor_code_entered), ''), NULLIF(TRIM(investor.investment_advisor_code), ''))
          = NULLIF(TRIM(advisor.investment_advisor_code), '')
  )
);

-- Startups can view offers for their startup
CREATE POLICY "Startups can view offers for their startup"
ON public.co_investment_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.startups s
    WHERE s.id = co_investment_offers.startup_id
      AND s.user_id = auth.uid()
  )
);

-- Admins can view/manage all offers
CREATE POLICY "Admins can view all co-investment offers"
ON public.co_investment_offers
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.role = 'Admin'
  )
);

-- Users can insert their own offers (when not using SECURITY DEFINER RPC)
CREATE POLICY "Users can insert their own co-investment offers"
ON public.co_investment_offers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.email = co_investment_offers.investor_email
  )
);

-- Users can update their own offers
CREATE POLICY "Users can update their own co-investment offers"
ON public.co_investment_offers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.email = co_investment_offers.investor_email
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.email = co_investment_offers.investor_email
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.co_investment_offers TO authenticated;
GRANT USAGE ON SEQUENCE co_investment_offers_id_seq TO authenticated;
