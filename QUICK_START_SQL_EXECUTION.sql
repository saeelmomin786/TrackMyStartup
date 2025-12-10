-- =====================================================
-- QUICK START: Mentor Equity Records Setup
-- =====================================================
-- This script checks current state and runs appropriate queries
-- SAFE TO RUN - Uses IF NOT EXISTS patterns
-- =====================================================

-- Step 1: Check if table exists
DO $$
DECLARE
    table_exists BOOLEAN;
    request_id_exists BOOLEAN;
    agreement_nullable BOOLEAN;
BEGIN
    -- Check if mentor_equity_records table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_equity_records'
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE NOTICE 'Table does not exist. Creating mentor_equity_records table...';
        -- Table will be created by CREATE_MENTOR_EQUITY_RECORDS_TABLE.sql
        -- Run that file separately
    ELSE
        RAISE NOTICE 'Table exists. Checking columns...';
        
        -- Check if request_id column exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mentor_equity_records' 
            AND column_name = 'request_id'
        ) INTO request_id_exists;
        
        -- Check if signed_agreement_url is nullable
        SELECT is_nullable = 'YES'
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_equity_records' 
        AND column_name = 'signed_agreement_url'
        INTO agreement_nullable;
        
        IF NOT request_id_exists THEN
            RAISE NOTICE 'request_id column missing. Run ADD_MENTOR_REQUEST_LINK_TO_EQUITY_RECORDS.sql';
        ELSE
            RAISE NOTICE 'request_id column exists.';
        END IF;
        
        IF NOT agreement_nullable THEN
            RAISE NOTICE 'signed_agreement_url is NOT NULL. Run UPDATE_MENTOR_EQUITY_MAKE_AGREEMENT_OPTIONAL.sql';
        ELSE
            RAISE NOTICE 'signed_agreement_url is nullable.';
        END IF;
    END IF;
END $$;

-- Step 2: Display current state
SELECT 
    'Current State' as info,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mentor_equity_records') 
        THEN 'Table EXISTS'
        ELSE 'Table DOES NOT EXIST'
    END as table_status,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'mentor_equity_records' 
            AND column_name = 'request_id'
        ) 
        THEN 'request_id EXISTS'
        ELSE 'request_id MISSING'
    END as request_id_status,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'mentor_equity_records' 
            AND column_name = 'signed_agreement_url'
            AND is_nullable = 'YES'
        ) 
        THEN 'signed_agreement_url is NULLABLE'
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'mentor_equity_records' 
            AND column_name = 'signed_agreement_url'
        )
        THEN 'signed_agreement_url is NOT NULL'
        ELSE 'signed_agreement_url MISSING'
    END as agreement_status;














