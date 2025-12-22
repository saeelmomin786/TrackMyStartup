-- =====================================================
-- UPDATE EQUITY AMOUNT FIELDS TO STOCK OPTIONS (CURRENCY)
-- =====================================================
-- This script updates the equity_amount_min and equity_amount_max fields
-- from DECIMAL(5, 2) (percentage, max 999.99) to DECIMAL(15, 2) (currency, same as fees)
-- since Stock Options are now currency amounts, not percentages
-- =====================================================

-- Update equity_amount_min to support currency amounts
DO $$ 
BEGIN
    -- Check if column exists and has the old precision
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'equity_amount_min'
        AND numeric_precision = 5
        AND numeric_scale = 2
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ALTER COLUMN equity_amount_min TYPE DECIMAL(15, 2);
        
        COMMENT ON COLUMN public.mentor_profiles.equity_amount_min IS 'Minimum stock options amount in specified currency (currency amount, not percentage)';
    END IF;
END $$;

-- Update equity_amount_max to support currency amounts
DO $$ 
BEGIN
    -- Check if column exists and has the old precision
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'equity_amount_max'
        AND numeric_precision = 5
        AND numeric_scale = 2
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ALTER COLUMN equity_amount_max TYPE DECIMAL(15, 2);
        
        COMMENT ON COLUMN public.mentor_profiles.equity_amount_max IS 'Maximum stock options amount in specified currency (currency amount, not percentage)';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the column types have been updated:
-- SELECT 
--     column_name,
--     data_type,
--     numeric_precision,
--     numeric_scale
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'mentor_profiles'
-- AND column_name IN ('equity_amount_min', 'equity_amount_max')
-- ORDER BY column_name;

