-- =====================================================
-- FIX RAZORPAY PLAN CACHE TABLE
-- =====================================================
-- This script creates/updates the razorpay_plans_cache table
-- to prevent duplicate plan creation for same amount/period/currency
-- =====================================================

-- Create razorpay_plans_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS razorpay_plans_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id VARCHAR(255) NOT NULL UNIQUE,
    amount_paise INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'yearly', 'weekly', 'daily')),
    interval_count INTEGER NOT NULL DEFAULT 1,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: same amount + currency + period + interval_count = same plan
    UNIQUE(amount_paise, currency, period, interval_count)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_razorpay_plans_cache_lookup 
ON razorpay_plans_cache(amount_paise, currency, period, interval_count);

CREATE INDEX IF NOT EXISTS idx_razorpay_plans_cache_plan_id 
ON razorpay_plans_cache(plan_id);

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_razorpay_plans_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_razorpay_plans_cache_updated_at ON razorpay_plans_cache;
CREATE TRIGGER trigger_update_razorpay_plans_cache_updated_at
    BEFORE UPDATE ON razorpay_plans_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_razorpay_plans_cache_updated_at();

-- If table already exists, add unique constraint if missing
DO $$
BEGIN
    -- Check if unique constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'razorpay_plans_cache_amount_paise_currency_period_interval_count_key'
    ) THEN
        -- Add unique constraint
        ALTER TABLE razorpay_plans_cache
        ADD CONSTRAINT razorpay_plans_cache_amount_paise_currency_period_interval_count_key
        UNIQUE(amount_paise, currency, period, interval_count);
    END IF;
    
    -- Update period values from 'month' to 'monthly' if needed
    UPDATE razorpay_plans_cache 
    SET period = 'monthly' 
    WHERE period = 'month';
    
    -- Update period values from 'year' to 'yearly' if needed
    UPDATE razorpay_plans_cache 
    SET period = 'yearly' 
    WHERE period = 'year';
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON razorpay_plans_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE ON razorpay_plans_cache TO service_role;

COMMENT ON TABLE razorpay_plans_cache IS 'Cache table for Razorpay plans to prevent duplicate plan creation. Same amount + currency + period + interval_count = same plan_id (shared across all users).';
