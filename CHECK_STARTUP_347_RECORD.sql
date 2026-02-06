-- Check the specific record for startup 347
SELECT 
    id,
    startup_id,
    program_name,
    facilitator_name,
    facilitator_code,
    incubation_type,
    fee_type,
    fee_amount,
    equity_allocated,
    status,
    signed_agreement_url,
    date_added,
    created_at
FROM recognition_records
WHERE startup_id = 347
ORDER BY created_at DESC, date_added DESC
LIMIT 5;

-- Also check if there are records with empty facilitator_code
SELECT 
    'EMPTY FACILITATOR CODE CHECK' as check_type,
    id,
    startup_id,
    facilitator_code,
    CASE 
        WHEN facilitator_code IS NULL THEN 'NULL'
        WHEN facilitator_code = '' THEN 'EMPTY STRING'
        ELSE facilitator_code
    END as code_status
FROM recognition_records
WHERE facilitator_code IS NULL OR facilitator_code = ''
LIMIT 10;
