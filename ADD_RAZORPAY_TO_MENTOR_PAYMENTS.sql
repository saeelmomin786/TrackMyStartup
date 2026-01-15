-- =====================================================
-- ADD RAZORPAY SUPPORT TO MENTOR_PAYMENTS TABLE
-- =====================================================
-- This script adds Razorpay order ID column to support
-- INR payments via Razorpay for mentor payments
-- =====================================================

-- Add razorpay_order_id column to mentor_payments table
ALTER TABLE public.mentor_payments
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

-- Add razorpay_payment_id column to store payment ID after verification
ALTER TABLE public.mentor_payments
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_payments_razorpay_order_id 
ON public.mentor_payments(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_mentor_payments_razorpay_payment_id 
ON public.mentor_payments(razorpay_payment_id);

-- Add comment for documentation
COMMENT ON COLUMN public.mentor_payments.razorpay_order_id IS 'Razorpay order ID for INR payments';
COMMENT ON COLUMN public.mentor_payments.razorpay_payment_id IS 'Razorpay payment ID after successful payment';
