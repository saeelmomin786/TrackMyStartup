-- Complete verification of mentor_equity_records setup

-- 1. Verify request_id column exists
SELECT 
    'Column: request_id' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'mentor_equity_records' 
            AND column_name = 'request_id'
        ) 
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 2. Verify request_id column details
SELECT 
    'Column Details' as check_item,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'mentor_equity_records' 
AND column_name = 'request_id';

-- 3. Verify foreign key constraint exists
SELECT 
    'Foreign Key Constraint' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'mentor_equity_records_request_id_fkey'
            AND table_name = 'mentor_equity_records'
        ) 
        THEN '✅ EXISTS'
        ELSE '⚠️ NOT FOUND (may be added later)'
    END as status;

-- 4. Verify index exists
SELECT 
    'Index: request_id' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT FROM pg_indexes 
            WHERE tablename = 'mentor_equity_records'
            AND indexname = 'idx_mentor_equity_records_request_id'
        ) 
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- 5. Verify signed_agreement_url is nullable
SELECT 
    'Column: signed_agreement_url' as check_item,
    is_nullable as status
FROM information_schema.columns 
WHERE table_name = 'mentor_equity_records' 
AND column_name = 'signed_agreement_url';

-- 6. Summary
SELECT 
    'SETUP STATUS' as summary,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'mentor_equity_records' 
            AND column_name = 'request_id'
        ) 
        THEN '✅ READY - request_id column added successfully!'
        ELSE '❌ INCOMPLETE'
    END as status;



