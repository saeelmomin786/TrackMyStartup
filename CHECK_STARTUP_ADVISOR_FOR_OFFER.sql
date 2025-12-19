-- Check which startup advisor needs to approve offer ID 138
-- The offer is at Stage 2, waiting for startup advisor approval

SELECT 
    io.id as offer_id,
    io.startup_name,
    io.startup_id,
    io.stage,
    io.investor_advisor_approval_status,
    io.startup_advisor_approval_status,
    s.id as startup_id,
    s.name as startup_name_full,
    s.investment_advisor_code as startup_advisor_code,
    -- Find the advisor with this code
    up_advisor.auth_user_id as advisor_user_id,
    up_advisor.name as advisor_name,
    up_advisor.email as advisor_email,
    up_advisor.investment_advisor_code as advisor_code
FROM investment_offers io
LEFT JOIN startups s ON io.startup_id = s.id
LEFT JOIN user_profiles up_advisor ON s.investment_advisor_code = up_advisor.investment_advisor_code 
    AND up_advisor.role = 'Investment Advisor'
WHERE io.id = 138;

-- Alternative query to check if startup has an advisor at all
SELECT 
    'Startup Details' as info_type,
    id,
    name,
    investment_advisor_code,
    CASE 
        WHEN investment_advisor_code IS NULL OR investment_advisor_code = '' 
        THEN 'No advisor assigned - will skip to Stage 3'
        ELSE 'Has advisor - waiting for Stage 2 approval'
    END as advisor_status
FROM startups
WHERE id = 276;

