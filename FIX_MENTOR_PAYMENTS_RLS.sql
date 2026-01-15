-- =====================================================
-- FIX RLS POLICIES FOR MENTOR_PAYMENTS
-- =====================================================
-- This fixes the 403 error when creating payment records
-- Allows authenticated users (mentors) to insert payment records
-- when accepting mentor requests

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON public.mentor_payments;

-- Create new INSERT policy for authenticated users
-- This allows mentors to create payment records when accepting requests
CREATE POLICY "Allow authenticated users to insert payments"
ON public.mentor_payments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Mentors can insert payments for their own assignments
  auth.uid() = mentor_id
);

-- Also ensure SELECT policies are correct
-- (These should already exist, but let's verify)

-- Policy: Mentors can view their own payments
DROP POLICY IF EXISTS "Mentors can view their own payments" ON public.mentor_payments;
CREATE POLICY "Mentors can view their own payments"
ON public.mentor_payments
FOR SELECT
USING (auth.uid() = mentor_id);

-- Policy: Startups can view payments they made
DROP POLICY IF EXISTS "Startups can view their own payments" ON public.mentor_payments;
CREATE POLICY "Startups can view their own payments"
ON public.mentor_payments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.startups 
        WHERE id = mentor_payments.startup_id 
        AND user_id = auth.uid()
    )
);

-- Allow service role full access (for admin operations)
DROP POLICY IF EXISTS "Enable all for service role" ON public.mentor_payments;
CREATE POLICY "Enable all for service role"
ON public.mentor_payments
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
