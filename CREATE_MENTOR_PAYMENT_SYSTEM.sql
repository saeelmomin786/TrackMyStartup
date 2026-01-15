-- =====================================================
-- MENTOR PAYMENT SYSTEM - COMPLETE SCHEMA
-- =====================================================
-- This script creates the mentor payment system with:
-- 1. mentor_payments table for tracking payments
-- 2. Updates to mentor_startup_assignments for payment/agreement status
-- =====================================================

-- =====================================================
-- STEP 1: CREATE MENTOR_PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.mentor_payments (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT REFERENCES public.mentor_startup_assignments(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Commission calculation
    commission_percentage DECIMAL(5, 2) DEFAULT 20.00,
    commission_amount DECIMAL(15, 2) NOT NULL,
    payout_amount DECIMAL(15, 2) NOT NULL,
    
    -- Payment status
    payment_status TEXT NOT NULL DEFAULT 'pending_payment' 
        CHECK (payment_status IN ('pending_payment', 'completed', 'failed', 'refunded')),
    paypal_order_id TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Payout status (manual transfer by admin)
    payout_status TEXT NOT NULL DEFAULT 'not_initiated'
        CHECK (payout_status IN ('not_initiated', 'pending_transfer', 'transferred')),
    payout_date TIMESTAMP WITH TIME ZONE,
    payout_method TEXT, -- 'Bank Transfer', 'PayPal', 'Wire', 'Other'
    payout_reference TEXT, -- Transaction reference number
    payout_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for mentor_payments
CREATE INDEX IF NOT EXISTS idx_mentor_payments_assignment_id 
ON public.mentor_payments(assignment_id);

CREATE INDEX IF NOT EXISTS idx_mentor_payments_mentor_id 
ON public.mentor_payments(mentor_id);

CREATE INDEX IF NOT EXISTS idx_mentor_payments_startup_id 
ON public.mentor_payments(startup_id);

CREATE INDEX IF NOT EXISTS idx_mentor_payments_payment_status 
ON public.mentor_payments(payment_status);

CREATE INDEX IF NOT EXISTS idx_mentor_payments_payout_status 
ON public.mentor_payments(payout_status);

-- =====================================================
-- STEP 2: UPDATE MENTOR_STARTUP_ASSIGNMENTS TABLE
-- =====================================================

-- Add new status values (keeping existing ones)
ALTER TABLE public.mentor_startup_assignments 
DROP CONSTRAINT IF EXISTS mentor_startup_assignments_status_check;

ALTER TABLE public.mentor_startup_assignments
ADD CONSTRAINT mentor_startup_assignments_status_check 
CHECK (status IN (
    'active', 
    'completed', 
    'cancelled',
    'pending_payment',
    'pending_agreement',
    'pending_payment_and_agreement'
));

-- Add payment status field
ALTER TABLE public.mentor_startup_assignments
ADD COLUMN IF NOT EXISTS payment_status TEXT 
    CHECK (payment_status IN ('pending', 'completed', 'failed'));

-- Add agreement fields
ALTER TABLE public.mentor_startup_assignments
ADD COLUMN IF NOT EXISTS agreement_url TEXT;

ALTER TABLE public.mentor_startup_assignments
ADD COLUMN IF NOT EXISTS agreement_uploaded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.mentor_startup_assignments
ADD COLUMN IF NOT EXISTS agreement_status TEXT 
    CHECK (agreement_status IN ('pending_upload', 'pending_mentor_approval', 'approved', 'rejected'));

-- Update assigned_at to be nullable (set when status becomes 'active')
ALTER TABLE public.mentor_startup_assignments
ALTER COLUMN assigned_at DROP NOT NULL;

-- =====================================================
-- STEP 3: CREATE FUNCTION TO CALCULATE COMMISSION
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_mentor_commission(
    payment_amount DECIMAL,
    commission_pct DECIMAL DEFAULT 20.00
) RETURNS TABLE(
    commission_amount DECIMAL,
    payout_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY SELECT
        (payment_amount * commission_pct / 100.00)::DECIMAL(15, 2) as commission_amount,
        (payment_amount * (100.00 - commission_pct) / 100.00)::DECIMAL(15, 2) as payout_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: ENABLE RLS
-- =====================================================
ALTER TABLE public.mentor_payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES FOR MENTOR_PAYMENTS
-- =====================================================

-- Policy: Mentors can view their own payments
CREATE POLICY "Mentors can view their own payments"
ON public.mentor_payments
FOR SELECT
USING (auth.uid() = mentor_id);

-- Policy: Startups can view payments they made
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

-- Policy: System can insert payments (via service role)
-- Note: This will be handled via service role in application code

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.mentor_payments IS 'Tracks payments from startups to mentors with commission calculation';
COMMENT ON COLUMN public.mentor_payments.commission_percentage IS 'Platform commission percentage (default 20%)';
COMMENT ON COLUMN public.mentor_payments.commission_amount IS 'Calculated commission amount (amount × commission_percentage)';
COMMENT ON COLUMN public.mentor_payments.payout_amount IS 'Amount to be paid to mentor (amount - commission_amount)';
COMMENT ON COLUMN public.mentor_payments.payout_status IS 'Status of manual transfer to mentor by admin';

COMMENT ON COLUMN public.mentor_startup_assignments.payment_status IS 'Payment status for fee-based assignments';
COMMENT ON COLUMN public.mentor_startup_assignments.agreement_url IS 'URL to uploaded agreement file (for Stock Options/Hybrid)';
COMMENT ON COLUMN public.mentor_startup_assignments.agreement_status IS 'Status of agreement upload and approval';
