-- ADD_LEAD_INVESTOR_FIELDS_TO_CO_INVESTMENT_OPPORTUNITIES.sql
-- Safer approach: Store lead investor name and email directly in the table
-- This avoids needing RLS bypass functions and keeps data secure

-- Step 1: Add columns to store lead investor information
ALTER TABLE public.co_investment_opportunities
ADD COLUMN IF NOT EXISTS listed_by_user_name TEXT,
ADD COLUMN IF NOT EXISTS listed_by_user_email TEXT;

-- Step 2: Populate existing records with lead investor info
UPDATE public.co_investment_opportunities cio
SET 
    listed_by_user_name = COALESCE(u.name, 'Unknown'),
    listed_by_user_email = COALESCE(u.email, '')
FROM public.users u
WHERE cio.listed_by_user_id = u.id
AND (cio.listed_by_user_name IS NULL OR cio.listed_by_user_email IS NULL);

-- Step 3: Update the create_co_investment_opportunity function to store lead investor info
-- This function should be updated to fetch and store name/email when creating opportunities
-- Note: You may need to update your application code to pass this info or fetch it in the function

-- Step 4: Create a trigger to automatically update lead investor info when opportunity is created
CREATE OR REPLACE FUNCTION public.set_lead_investor_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only set if not already provided
    IF NEW.listed_by_user_name IS NULL OR NEW.listed_by_user_email IS NULL THEN
        SELECT 
            COALESCE(u.name, 'Unknown'),
            COALESCE(u.email, '')
        INTO 
            NEW.listed_by_user_name,
            NEW.listed_by_user_email
        FROM public.users u
        WHERE u.id = NEW.listed_by_user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_set_lead_investor_info ON public.co_investment_opportunities;

-- Create trigger
CREATE TRIGGER trigger_set_lead_investor_info
BEFORE INSERT OR UPDATE ON public.co_investment_opportunities
FOR EACH ROW
WHEN (NEW.listed_by_user_name IS NULL OR NEW.listed_by_user_email IS NULL)
EXECUTE FUNCTION public.set_lead_investor_info();

-- Step 5: Update existing opportunities that might have NULL values
-- Run this periodically if needed
UPDATE public.co_investment_opportunities cio
SET 
    listed_by_user_name = COALESCE(u.name, 'Unknown'),
    listed_by_user_email = COALESCE(u.email, '')
FROM public.users u
WHERE cio.listed_by_user_id = u.id
AND (cio.listed_by_user_name IS NULL OR cio.listed_by_user_email IS NULL);

-- Grant necessary permissions
GRANT SELECT (listed_by_user_name, listed_by_user_email) ON public.co_investment_opportunities TO authenticated;

