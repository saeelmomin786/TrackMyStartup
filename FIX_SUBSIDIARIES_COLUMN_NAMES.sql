-- Fix Subsidiaries Column Names
-- This script ensures subsidiaries table uses the correct column names

-- Step 1: Check current subsidiaries table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'subsidiaries'
ORDER BY ordinal_position;

-- Step 2: Check if there are any subsidiaries with data
SELECT 
    COUNT(*) as total_subsidiaries,
    COUNT(ca_service_code) as ca_codes_set,
    COUNT(cs_service_code) as cs_codes_set
FROM subsidiaries;

-- Step 3: Display sample subsidiaries data to verify column names
SELECT 
    id,
    startup_id,
    country,
    company_type,
    registration_date,
    ca_service_code,
    cs_service_code,
    created_at
FROM subsidiaries
LIMIT 10;

-- Step 4: If the columns are named ca_code and cs_code instead, run this to rename them:
-- (Uncomment if needed)
/*
DO $$
BEGIN
    -- Check if ca_code column exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subsidiaries' 
        AND column_name = 'ca_code'
    ) THEN
        ALTER TABLE subsidiaries RENAME COLUMN ca_code TO ca_service_code;
        RAISE NOTICE 'Renamed ca_code to ca_service_code';
    END IF;
    
    -- Check if cs_code column exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subsidiaries' 
        AND column_name = 'cs_code'
    ) THEN
        ALTER TABLE subsidiaries RENAME COLUMN cs_code TO cs_service_code;
        RAISE NOTICE 'Renamed cs_code to cs_service_code';
    END IF;
END $$;
*/

-- Step 5: Verify the fix
SELECT 
    s.id,
    s.startup_id,
    st.name as startup_name,
    s.country,
    s.company_type,
    s.registration_date,
    s.ca_service_code,
    s.cs_service_code
FROM subsidiaries s
LEFT JOIN startups st ON st.id = s.startup_id
ORDER BY s.created_at DESC
LIMIT 20;
