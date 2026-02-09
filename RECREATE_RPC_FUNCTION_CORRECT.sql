-- =====================================================
-- DROP AND RECREATE: validate_recognition_acceptance
-- =====================================================
-- This is the CORRECT implementation that should work

DROP FUNCTION IF EXISTS public.validate_recognition_acceptance(INTEGER, INTEGER, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_recognition_acceptance(
  p_recognition_id INTEGER,
  p_startup_id INTEGER,
  p_facilitator_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  recognition_exists BOOLEAN,
  startup_exists BOOLEAN,
  facilitator_is_valid BOOLEAN,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recognition_exists BOOLEAN := FALSE;
  v_startup_exists BOOLEAN := FALSE;
  v_facilitator_is_valid BOOLEAN := FALSE;
  v_error_message TEXT := NULL;
BEGIN

  -- Check if recognition record exists
  SELECT EXISTS(
    SELECT 1 FROM public.recognition_records 
    WHERE id = p_recognition_id
  ) INTO v_recognition_exists;

  -- Check if startup exists
  SELECT EXISTS(
    SELECT 1 FROM public.startups 
    WHERE id = p_startup_id
  ) INTO v_startup_exists;

  -- Check if facilitator exists and has correct role
  -- Look for match by BOTH id and auth_user_id since we don't know which one is being passed
  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE (id = p_facilitator_id OR auth_user_id = p_facilitator_id)
    AND role = 'Startup Facilitation Center'::user_role
  ) INTO v_facilitator_is_valid;

  -- Set error message
  IF NOT v_recognition_exists THEN
    v_error_message := 'Recognition record not found';
  ELSIF NOT v_startup_exists THEN
    v_error_message := 'Startup not found';
  ELSIF NOT v_facilitator_is_valid THEN
    v_error_message := 'Facilitator not found or does not have correct role';
  END IF;

  -- Return results
  RETURN QUERY SELECT
    (v_recognition_exists AND v_startup_exists AND v_facilitator_is_valid)::BOOLEAN as is_valid,
    v_recognition_exists,
    v_startup_exists,
    v_facilitator_is_valid,
    v_error_message;

END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_recognition_acceptance(INTEGER, INTEGER, UUID) 
  TO authenticated, anon, service_role;

-- =====================================================
-- TEST THE FUNCTION WITH KNOWN GOOD DATA
-- =====================================================
SELECT * FROM public.validate_recognition_acceptance(
    55,  -- recognition_id 
    347, -- startup_id
    'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'::UUID  -- facilitator_id (this is auth_user_id)
);
