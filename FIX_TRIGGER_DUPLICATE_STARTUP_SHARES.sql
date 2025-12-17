-- =====================================================
-- FIX TRIGGER DUPLICATE STARTUP_SHARES ERROR
-- =====================================================
-- This script fixes the trigger functions to check if startup_shares
-- already exists before trying to insert, preventing duplicate key errors.
-- =====================================================

-- =====================================================
-- STEP 1: CHECK CURRENT TRIGGERS AND FUNCTIONS
-- =====================================================

SELECT '=== CURRENT TRIGGERS ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%initialize_startup_shares%'
ORDER BY trigger_name;

SELECT '=== CURRENT FUNCTIONS ===' as info;

SELECT 
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname LIKE '%initialize_startup_shares%'
ORDER BY proname;

-- =====================================================
-- STEP 2: FIX ALL TRIGGER FUNCTIONS TO CHECK FOR EXISTING RECORDS
-- =====================================================

-- Fix initialize_startup_shares() function
CREATE OR REPLACE FUNCTION initialize_startup_shares()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if startup_shares already exists before inserting
    IF NOT EXISTS (
        SELECT 1 FROM startup_shares WHERE startup_id = NEW.id
    ) THEN
        -- Insert default startup_shares record for new startup
        INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
        VALUES (NEW.id, 0, 10000, 0, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix initialize_startup_shares_with_esop() function
CREATE OR REPLACE FUNCTION initialize_startup_shares_with_esop()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if startup_shares already exists before inserting
    IF NOT EXISTS (
        SELECT 1 FROM startup_shares WHERE startup_id = NEW.id
    ) THEN
        -- Insert startup_shares record with default ESOP of 10000
        INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
        VALUES (NEW.id, 0, 10000, 0, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix initialize_startup_shares_for_new_startup() function (this is the one causing the error)
CREATE OR REPLACE FUNCTION initialize_startup_shares_for_new_startup()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if startup_shares already exists before inserting
    IF NOT EXISTS (
        SELECT 1 FROM startup_shares WHERE startup_id = NEW.id
    ) THEN
        -- Insert startup_shares record with default ESOP of 10000
        INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
        VALUES (NEW.id, 10000, 10000, 0, NOW());
        
        -- Log the creation
        RAISE NOTICE 'Created startup_shares record for new startup ID: % with ESOP: 10000', NEW.id;
    ELSE
        RAISE NOTICE 'startup_shares already exists for startup ID: %, skipping insert', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: VERIFY FUNCTIONS WERE UPDATED
-- =====================================================

SELECT '=== VERIFICATION - UPDATED FUNCTIONS ===' as info;

SELECT 
    proname as function_name,
    prosecdef as is_security_definer,
    CASE 
        WHEN prosecdef THEN '✅ SECURITY DEFINER (bypasses RLS)'
        ELSE '⚠️ NOT SECURITY DEFINER'
    END as security_status
FROM pg_proc
WHERE proname IN (
    'initialize_startup_shares',
    'initialize_startup_shares_with_esop',
    'initialize_startup_shares_for_new_startup'
)
ORDER BY proname;

-- =====================================================
-- STEP 4: CHECK FOR STARTUPS WITHOUT STARTUP_SHARES
-- =====================================================

SELECT '=== STARTUPS MISSING STARTUP_SHARES ===' as info;

SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.created_at,
    CASE 
        WHEN ss.startup_id IS NULL THEN '❌ Missing startup_shares'
        ELSE '✅ Has startup_shares'
    END as status
FROM startups s
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
WHERE ss.startup_id IS NULL
ORDER BY s.created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 5: CREATE MISSING STARTUP_SHARES FOR EXISTING STARTUPS
-- =====================================================

-- Only create startup_shares for startups that don't have them
INSERT INTO startup_shares (
    startup_id,
    total_shares,
    esop_reserved_shares,
    price_per_share,
    updated_at
)
SELECT 
    s.id as startup_id,
    0 as total_shares,
    10000 as esop_reserved_shares,
    0 as price_per_share,
    NOW() as updated_at
FROM startups s
WHERE NOT EXISTS (
    SELECT 1 FROM startup_shares ss WHERE ss.startup_id = s.id
)
RETURNING *;

-- =====================================================
-- STEP 6: SUMMARY
-- =====================================================

SELECT '=== FIX COMPLETED ===' as info;
SELECT 
    '✅ All trigger functions updated to check for existing startup_shares' as step1,
    '✅ Functions use SECURITY DEFINER to bypass RLS' as step2,
    '✅ Missing startup_shares records created for existing startups' as step3,
    '✅ Future startup creations will not cause duplicate key errors' as result;


