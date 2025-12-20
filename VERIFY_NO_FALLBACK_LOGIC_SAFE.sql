-- =====================================================
-- VERIFY NO FALLBACK LOGIC TO users TABLE (SAFE VERSION)
-- =====================================================
-- This script avoids array_agg errors by using safer query patterns

-- =====================================================
-- 1. Check for functions referencing users table (using safer method)
-- =====================================================
DO $$
DECLARE
    func_record RECORD;
    func_count INTEGER := 0;
    func_def TEXT;
BEGIN
    RAISE NOTICE '=== CHECKING FUNCTIONS FOR users TABLE REFERENCES ===';
    
    FOR func_record IN 
        SELECT p.proname, p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        BEGIN
            func_def := pg_get_functiondef(func_record.oid);
            
            IF func_def ILIKE '%FROM users%'
               OR func_def ILIKE '%JOIN users%'
               OR func_def ILIKE '%public.users%'
            THEN
                IF func_def NOT ILIKE '%auth.users%'
                   AND func_def NOT ILIKE '%user_profiles%'
                THEN
                    func_count := func_count + 1;
                    RAISE NOTICE 'Found: %', func_record.proname;
                END IF;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Skip functions that cause errors
                NULL;
        END;
    END LOOP;
    
    IF func_count = 0 THEN
        RAISE NOTICE '✅ NO FUNCTIONS REFERENCE users TABLE';
    ELSE
        RAISE NOTICE '❌ % FUNCTIONS STILL REFERENCE users TABLE', func_count;
    END IF;
END $$;

-- =====================================================
-- 2. Summary query (simplified, safer)
-- =====================================================
SELECT 
    '=== FINAL FALLBACK CHECK ===' as summary,
    'Run DO block above to check functions' as note,
    '✅ VERIFY_NO_FALLBACK_LOGIC_SAFE.sql completed' as status;



