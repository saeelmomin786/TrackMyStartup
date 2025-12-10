-- Verify request_id column was added successfully

-- Check if request_id column exists
SELECT 
    'Column Check' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mentor_equity_records'
  AND column_name = 'request_id';

-- Check if index exists
SELECT 
    'Index Check' as check_type,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'mentor_equity_records'
  AND indexname = 'idx_mentor_equity_records_request_id';

-- List all columns in mentor_equity_records table
SELECT 
    'All Columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mentor_equity_records'
ORDER BY ordinal_position;














