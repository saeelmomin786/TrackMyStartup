-- Check all your opportunities to see which one has the application vs Form 2 config

-- 1. List ALL your opportunities
SELECT 
    id,
    program_name,
    has_form2,
    form2_title,
    created_at,
    updated_at
FROM incubation_opportunities
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
ORDER BY created_at DESC;

-- 2. Show which opportunity has the application from test1
SELECT 
    io.id as opportunity_id,
    io.program_name as opportunity_name,
    s.name as startup_name,
    oa.is_shortlisted,
    oa.status,
    oa.form2_requested,
    '👤 TEST1 APPLIED HERE' as note
FROM opportunity_applications oa
JOIN incubation_opportunities io ON io.id = oa.opportunity_id
JOIN startups s ON s.id = oa.startup_id
WHERE s.user_id = 'acec7880-0c9f-4757-b521-1bffd39dce25'
  AND io.facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';

-- 3. Show which opportunity has Form 2 configured
SELECT 
    io.id as opportunity_id,
    io.program_name as opportunity_name,
    COUNT(f2q.id) as questions_configured,
    '📋 FORM 2 CONFIGURED HERE' as note
FROM incubation_opportunities io
LEFT JOIN incubation_opportunity_form2_questions f2q ON f2q.opportunity_id = io.id
WHERE io.facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
  AND f2q.id IS NOT NULL
GROUP BY io.id, io.program_name;
