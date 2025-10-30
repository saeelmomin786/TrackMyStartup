-- Allows startup owners to view investor due diligence requests via RPC (RLS-safe)

-- Function: get_due_diligence_requests_for_startup(p_startup_id TEXT)
-- Returns rows with investor name/email even with RLS enabled on due_diligence_requests

CREATE OR REPLACE FUNCTION public.get_due_diligence_requests_for_startup(
  p_startup_id TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  startup_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  investor_name TEXT,
  investor_email TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.id,
         r.user_id,
         r.startup_id,
         r.status,
         r.created_at,
         u.name AS investor_name,
         u.email AS investor_email
  FROM public.due_diligence_requests r
  JOIN public.startups s ON s.id::text = r.startup_id
  JOIN public.users u ON u.id = r.user_id
  WHERE r.startup_id = p_startup_id
    AND (s.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_due_diligence_requests_for_startup(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_due_diligence_requests_for_startup(TEXT) TO authenticated;

-- Approve a due diligence request if caller owns the startup
CREATE OR REPLACE FUNCTION public.approve_due_diligence_for_startup(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_startup_owner UUID;
BEGIN
  -- Ensure the caller owns the startup associated with the request
  SELECT s.user_id INTO v_startup_owner
  FROM public.due_diligence_requests r
  JOIN public.startups s ON s.id::text = r.startup_id
  WHERE r.id = p_request_id;

  IF v_startup_owner IS NULL OR v_startup_owner <> auth.uid() THEN
    RETURN FALSE;
  END IF;

  UPDATE public.due_diligence_requests
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_due_diligence_for_startup(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_due_diligence_for_startup(UUID) TO authenticated;

-- Reject a due diligence request if caller owns the startup
CREATE OR REPLACE FUNCTION public.reject_due_diligence_for_startup(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_startup_owner UUID;
BEGIN
  SELECT s.user_id INTO v_startup_owner
  FROM public.due_diligence_requests r
  JOIN public.startups s ON s.id::text = r.startup_id
  WHERE r.id = p_request_id;

  IF v_startup_owner IS NULL OR v_startup_owner <> auth.uid() THEN
    RETURN FALSE;
  END IF;

  UPDATE public.due_diligence_requests
  SET status = 'failed'
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_due_diligence_for_startup(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_due_diligence_for_startup(UUID) TO authenticated;


