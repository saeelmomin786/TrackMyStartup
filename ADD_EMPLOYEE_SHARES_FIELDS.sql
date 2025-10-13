-- =====================================================
-- ADD EMPLOYEE SHARES FIELDS
-- =====================================================
-- This file adds price per share and number of shares fields to employee tables

-- Add new columns to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS price_per_share DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS number_of_shares INTEGER DEFAULT 0;

-- Add new columns to employees_increments table
ALTER TABLE public.employees_increments ADD COLUMN IF NOT EXISTS price_per_share DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.employees_increments ADD COLUMN IF NOT EXISTS number_of_shares INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_price_per_share ON public.employees(price_per_share);
CREATE INDEX IF NOT EXISTS idx_employees_number_of_shares ON public.employees(number_of_shares);
CREATE INDEX IF NOT EXISTS idx_employees_increments_price_per_share ON public.employees_increments(price_per_share);
CREATE INDEX IF NOT EXISTS idx_employees_increments_number_of_shares ON public.employees_increments(number_of_shares);

-- Add comments for documentation
COMMENT ON COLUMN public.employees.price_per_share IS 'Price per share at the time of ESOP allocation';
COMMENT ON COLUMN public.employees.number_of_shares IS 'Number of shares allocated (auto-calculated from ESOP allocation / price per share)';
COMMENT ON COLUMN public.employees_increments.price_per_share IS 'Price per share at the time of ESOP increment';
COMMENT ON COLUMN public.employees_increments.number_of_shares IS 'Number of shares in increment (auto-calculated from ESOP allocation / price per share)';
