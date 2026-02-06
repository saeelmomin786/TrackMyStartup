-- Create get_due_diligence_requests_for_startup RPC (public schema)
-- Run in Supabase SQL editor

-- Drop old version if it exists
DROP FUNCTION IF EXISTS public.get_due_diligence_requests_for_startup(BIGINT);

CREATE OR REPLACE FUNCTION public.get_due_diligence_requests_for_startup(
    p_startup_id BIGINT
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    startup_id BIGINT,
    status TEXT,
    created_at TIMESTAMPTZ,
    investor_name TEXT,
    investor_email TEXT
)
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ddr.id,
        ddr.user_id,
        ddr.startup_id,
        ddr.status,
        ddr.created_at,
        up.name AS investor_name,
        COALESCE(up.email, up.contact_email) AS investor_email
    FROM due_diligence_requests ddr
    LEFT JOIN user_profiles up
      ON up.auth_user_id = ddr.user_id
    WHERE ddr.startup_id = p_startup_id
    ORDER BY ddr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_due_diligence_requests_for_startup(BIGINT) TO authenticated;

-- Verification helper
SELECT 'get_due_diligence_requests_for_startup created' AS status;
