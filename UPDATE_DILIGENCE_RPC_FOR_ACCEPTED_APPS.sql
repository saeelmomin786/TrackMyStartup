-- Update the request_diligence function to allow requesting diligence for both pending and accepted applications
-- Run this in your Supabase SQL editor

-- Drop and recreate the function with updated logic
DROP FUNCTION IF EXISTS request_diligence(UUID);

CREATE OR REPLACE FUNCTION request_diligence(p_application_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    app_record RECORD;
BEGIN
    -- Get the application record
    SELECT * INTO app_record 
    FROM public.opportunity_applications 
    WHERE id = p_application_id;
    
    -- Check if application exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found: %', p_application_id;
    END IF;
    
    -- Check if application is pending or accepted
    IF app_record.status NOT IN ('pending', 'accepted') THEN
        RAISE EXCEPTION 'Can only request diligence for pending or accepted applications. Current status: %', app_record.status;
    END IF;
    
    -- Update diligence_status to 'requested'
    UPDATE public.opportunity_applications 
    SET diligence_status = 'requested', updated_at = NOW()
    WHERE id = p_application_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_diligence(UUID) TO authenticated;

-- Test the function exists
SELECT 'Updated request_diligence function created successfully' as status;
