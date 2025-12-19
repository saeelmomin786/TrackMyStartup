-- Update trigger function to use user_profiles instead of users
-- This should be run AFTER the migration script

-- Update the trigger function to use user_profiles
CREATE OR REPLACE FUNCTION public.set_lead_investor_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only set if not already provided
    IF NEW.listed_by_user_name IS NULL OR NEW.listed_by_user_email IS NULL THEN
        SELECT 
            COALESCE(up.name, 'Unknown'),
            COALESCE(up.email, '')
        INTO 
            NEW.listed_by_user_name,
            NEW.listed_by_user_email
        FROM public.user_profiles up
        WHERE up.auth_user_id = NEW.listed_by_user_id
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$;


