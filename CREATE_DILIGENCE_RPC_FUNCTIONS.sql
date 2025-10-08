-- Create the missing RPC functions for due diligence flow
-- Run this in your Supabase SQL editor

-- Step 1: Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS request_diligence(UUID);
DROP FUNCTION IF EXISTS safe_update_diligence_status(UUID, TEXT, TEXT);

-- Step 2: Create request_diligence function
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
    
    -- Check if application is pending
    IF app_record.status != 'pending' THEN
        RAISE EXCEPTION 'Can only request diligence for pending applications. Current status: %', app_record.status;
    END IF;
    
    -- Update diligence_status to 'requested'
    UPDATE public.opportunity_applications 
    SET diligence_status = 'requested', updated_at = NOW()
    WHERE id = p_application_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create safe_update_diligence_status function
CREATE OR REPLACE FUNCTION safe_update_diligence_status(
    p_application_id UUID,
    p_new_status TEXT,
    p_old_status TEXT
)
RETURNS TABLE (id UUID, diligence_status TEXT) AS $$
BEGIN
    RETURN QUERY
    UPDATE public.opportunity_applications oa
    SET diligence_status = p_new_status, updated_at = NOW()
    WHERE oa.id = p_application_id 
      AND oa.diligence_status = p_old_status
    RETURNING oa.id, oa.diligence_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION request_diligence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_update_diligence_status(UUID, TEXT, TEXT) TO authenticated;

-- Step 5: Test the functions exist
SELECT 'Functions created successfully' as status;
