-- =====================================================
-- MIGRATE create_investment_offers_automatically() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This is a TRIGGER function that automatically creates investment offers
-- when advisor relationships are created
-- Frontend Impact: ✅ None (trigger function, not called directly)
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.create_investment_offers_automatically() CASCADE;

CREATE OR REPLACE FUNCTION public.create_investment_offers_automatically()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  advisor_data RECORD;
  startup_data RECORD;
BEGIN
  -- MIGRATED: Get advisor details from user_profiles (most recent profile)
  SELECT name, email, COALESCE(investment_advisor_code, investment_advisor_code_entered) as investment_advisor_code
  FROM public.user_profiles 
  WHERE auth_user_id = NEW.investment_advisor_id  -- MIGRATED: Use auth_user_id instead of id
    AND role = 'Investment Advisor'
  ORDER BY created_at DESC
  LIMIT 1
  INTO advisor_data;
  
  -- If advisor not found, return without creating offer
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Get startup details (no migration needed - startups table is fine)
  SELECT name, user_id
  FROM startups 
  WHERE id = NEW.startup_id
  INTO startup_data;
  
  -- Create investment offer if it doesn't exist
  INSERT INTO investment_offers (
    startup_id,
    startup_name,
    investor_email,
    investor_name,
    offer_amount,
    equity_percentage,
    status,
    created_at
  )
  VALUES (
    NEW.startup_id,
    startup_data.name,
    advisor_data.email,
    advisor_data.name,
    0, -- Default amount
    0, -- Default equity
    'pending',
    NOW()
  )
  ON CONFLICT (startup_id, investor_email) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- No direct GRANT EXECUTE needed for trigger functions, but ensure the trigger is correctly set up
-- Example trigger setup (if not already existing):
-- DROP TRIGGER IF EXISTS trg_create_investment_offers_automatically ON public.investment_advisor_relationships;
-- CREATE TRIGGER trg_create_investment_offers_automatically
-- AFTER INSERT ON public.investment_advisor_relationships
-- FOR EACH ROW 
-- WHEN (NEW.relationship_type = 'advisor_startup')
-- EXECUTE FUNCTION public.create_investment_offers_automatically();

-- Verify the function was created
SELECT '✅ Function create_investment_offers_automatically() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;


