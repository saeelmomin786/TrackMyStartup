-- Check what recognition records exist and their facilitator codes
SELECT 
    'RECOGNITION RECORDS CHECK' as check_type,
    id,
    startup_id,
    program_name,
    facilitator_name,
    facilitator_code,
    fee_type,
    status,
    date_added,
    '---' as separator
FROM recognition_records
WHERE startup_id = 347  -- The startup that submitted
ORDER BY date_added DESC
LIMIT 10;

-- Check what facilitator code the facilitator actually has
SELECT
    'FACILITATOR CODE CHECK' as check_type,
    id,
    auth_user_id,
    center_name,
    facilitator_code,
    role,
    email
FROM user_profiles
WHERE email = 'incubation_center@trackmystartup.com';

-- Check if there are ANY recognition records at all
SELECT
    'ALL RECOGNITION RECORDS' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT facilitator_code) as unique_facilitator_codes,
    MAX(date_added) as most_recent_date
FROM recognition_records;

-- List all unique facilitator codes in recognition_records
SELECT
    'FACILITATOR CODES IN SYSTEM' as check_type,
    facilitator_code,
    COUNT(*) as record_count
FROM recognition_records
GROUP BY facilitator_code
ORDER BY record_count DESC;
