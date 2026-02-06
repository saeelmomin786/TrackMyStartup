-- Create request_diligence RPC function
-- Run this in Supabase SQL Editor (public schema)

-- Drop old version if exists (explicit schema)
DROP FUNCTION IF EXISTS public.request_diligence(UUID) CASCADE;

-- Create new function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.request_diligence(
    p_application_id UUID
)
RETURNS json
SET search_path = public
AS $$
DECLARE
    v_facilitator_id UUID;
    v_caller_profile_id UUID;
    v_caller_auth_id UUID;
    v_diligence_status TEXT;
    v_rows_updated INT;
    result json;
BEGIN
    -- Log the input
    RAISE NOTICE 'request_diligence called with application_id: %', p_application_id;

    -- Verify application exists and resolve facilitator owner via linked opportunity
    SELECT io.facilitator_id, oa.diligence_status
    INTO v_facilitator_id, v_diligence_status
    FROM opportunity_applications oa
    JOIN incubation_opportunities io ON io.id = oa.opportunity_id
    WHERE oa.id = p_application_id;

    IF v_facilitator_id IS NULL THEN
        result := json_build_object('success', false, 'error', 'Application not found');
        RAISE NOTICE 'Application not found: %', p_application_id;
        RETURN result;
    END IF;

    -- Authorization: owning facilitator can be stored as auth.uid() or profile id (mixed historical data)
    v_caller_auth_id := auth.uid();
    SELECT id INTO v_caller_profile_id FROM user_profiles WHERE auth_user_id = v_caller_auth_id;

    IF v_facilitator_id IS NULL OR (
        v_facilitator_id <> v_caller_auth_id AND
        (v_caller_profile_id IS NULL OR v_facilitator_id <> v_caller_profile_id)
    ) THEN
        result := json_build_object('success', false, 'error', 'Not authorized to request diligence for this application');
        RAISE NOTICE 'Not authorized: caller auth % / profile % tried to request for application % (owned by %)', v_caller_auth_id, v_caller_profile_id, p_application_id, v_facilitator_id;
        RETURN result;
    END IF;

    -- Already requested
    IF v_diligence_status = 'requested' THEN
        result := json_build_object('success', true, 'message', 'Diligence already requested');
        RAISE NOTICE 'Diligence already requested for application %', p_application_id;
        RETURN result;
    END IF;

    -- Request diligence regardless of current application status
    UPDATE opportunity_applications
    SET diligence_status = 'requested', updated_at = NOW()
    WHERE id = p_application_id
      AND (diligence_status IS NULL OR diligence_status = 'none');

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated > 0 THEN
        result := json_build_object('success', true, 'message', 'Diligence requested successfully');
        RAISE NOTICE 'Diligence requested for application %', p_application_id;
    ELSE
        result := json_build_object('success', false, 'error', 'Failed to update application');
        RAISE NOTICE 'Failed to update application %', p_application_id;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.request_diligence(UUID) TO authenticated;

-- Verify function was created
SELECT 'request_diligence function created successfully!' AS status;
