-- Create form2_submissions idempotency table for all registration flows
-- This ensures all Form 2 submissions (Startup, Investor, Incubation, Investment Advisor) are idempotent
-- Prevents duplicates even if user refreshes, closes browser, or retries

-- 1. Create main idempotency tracking table
CREATE TABLE IF NOT EXISTS public.form2_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Idempotency key (unique constraint ensures single submission per key)
  idempotency_key text UNIQUE NOT NULL,
  
  -- User/profile tracking
  auth_user_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  user_role text NOT NULL, -- 'Startup', 'Investor', 'Incubation Center', 'Investment Advisor', 'CA', 'CS', 'Mentor'
  
  -- Submission payload (stores the form data as JSON for replay/auditing)
  payload jsonb,
  
  -- File URLs (stores uploaded file URLs for reference)
  file_urls jsonb,
  
  -- Status tracking for async processing
  status text NOT NULL DEFAULT 'pending', -- pending/processing/completed/failed
  status_message text,
  
  -- Result tracking
  created_startup_id integer, -- If user role is 'Startup', ID of created startup
  created_profile_id uuid,
  
  -- Error tracking
  error_message text,
  error_details jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  
  -- Metadata
  retry_count integer DEFAULT 0,
  client_version text,
  client_ip text
);

-- 2. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_form2_submissions_idempotency_key 
ON public.form2_submissions(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_form2_submissions_auth_user_id 
ON public.form2_submissions(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_form2_submissions_profile_id 
ON public.form2_submissions(profile_id);

CREATE INDEX IF NOT EXISTS idx_form2_submissions_status 
ON public.form2_submissions(status);

CREATE INDEX IF NOT EXISTS idx_form2_submissions_user_role 
ON public.form2_submissions(user_role);

CREATE INDEX IF NOT EXISTS idx_form2_submissions_created_at 
ON public.form2_submissions(created_at DESC);

-- 3. Add comments for documentation
COMMENT ON TABLE public.form2_submissions IS 'Idempotency tracking table for Form 2 registration submissions across all roles (Startup, Investor, Incubation, Investment Advisor, etc). Ensures duplicate submissions are handled gracefully.';

COMMENT ON COLUMN public.form2_submissions.idempotency_key IS 'Unique submission identifier (UUID v4) sent by client to ensure idempotency';

COMMENT ON COLUMN public.form2_submissions.status IS 'Submission status: pending (awaiting processing), processing (background job running), completed (success), failed (error)';

COMMENT ON COLUMN public.form2_submissions.payload IS 'Original form submission data as JSON (country, company_type, founders, shares, etc)';

COMMENT ON COLUMN public.form2_submissions.file_urls IS 'Uploaded file URLs (govId, roleSpecific, logo, license, pitchDeck, etc) as JSON object';

-- 4. Set up automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_form2_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_form2_submissions_timestamp ON public.form2_submissions;

CREATE TRIGGER update_form2_submissions_timestamp
BEFORE UPDATE ON public.form2_submissions
FOR EACH ROW
EXECUTE FUNCTION update_form2_submissions_updated_at();

-- 5. Verification query
-- Run this to check if table was created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'form2_submissions'
ORDER BY ordinal_position;
