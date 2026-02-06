-- Query to check Form 2 and shortlist status for applications
-- This helps identify why Form 2 is not being sent to shortlisted applicants

-- 1. Check all applications for a specific opportunity
-- Replace 'YOUR_OPPORTUNITY_ID' with the actual opportunity ID
SELECT 
    oa.id as application_id,
    s.name as startup_name,
    oa.status,
    oa.is_shortlisted,
    oa.form2_requested,
    oa.form2_status,
    oa.form2_requested_at,
    oa.form2_submitted_at,
    oa.created_at
FROM opportunity_applications oa
LEFT JOIN startups s ON s.id = oa.startup_id
WHERE oa.opportunity_id = 'YOUR_OPPORTUNITY_ID'
ORDER BY oa.is_shortlisted DESC, oa.created_at DESC;

-- 2. Check which applications are eligible for Form 2 (should match the RPC function logic)
SELECT 
    oa.id as application_id,
    s.name as startup_name,
    oa.status,
    oa.is_shortlisted,
    oa.form2_requested,
    CASE 
        WHEN oa.is_shortlisted = TRUE 
         AND oa.status = 'pending' 
         AND oa.form2_requested = FALSE 
        THEN 'ELIGIBLE for Form 2' 
        ELSE 'NOT eligible' 
    END as eligibility_status,
    CASE 
        WHEN oa.is_shortlisted = FALSE THEN 'Not shortlisted'
        WHEN oa.status != 'pending' THEN 'Status is not pending (status: ' || oa.status || ')'
        WHEN oa.form2_requested = TRUE THEN 'Form 2 already sent'
        ELSE 'Unknown reason'
    END as reason_if_not_eligible
FROM opportunity_applications oa
LEFT JOIN startups s ON s.id = oa.startup_id
WHERE oa.opportunity_id = 'YOUR_OPPORTUNITY_ID'
ORDER BY oa.is_shortlisted DESC, oa.created_at DESC;

-- 3. Get count of eligible applications (should match frontend count after fix)
SELECT 
    COUNT(*) as eligible_count
FROM opportunity_applications
WHERE opportunity_id = 'YOUR_OPPORTUNITY_ID'
    AND is_shortlisted = TRUE
    AND status = 'pending'
    AND form2_requested = FALSE;

-- 4. Check all opportunities for the current facilitator with application counts
-- Replace 'YOUR_FACILITATOR_ID' with your user ID from auth.users
SELECT 
    io.id as opportunity_id,
    io.program_name,
    COUNT(oa.id) as total_applications,
    COUNT(CASE WHEN oa.is_shortlisted = TRUE THEN 1 END) as shortlisted_count,
    COUNT(CASE WHEN oa.is_shortlisted = TRUE AND oa.status = 'pending' AND oa.form2_requested = FALSE THEN 1 END) as eligible_for_form2,
    COUNT(CASE WHEN oa.form2_requested = TRUE THEN 1 END) as form2_already_sent
FROM incubation_opportunities io
LEFT JOIN opportunity_applications oa ON oa.opportunity_id = io.id
WHERE io.facilitator_id = 'YOUR_FACILITATOR_ID'
GROUP BY io.id, io.program_name
ORDER BY io.created_at DESC;

-- 5. Test the RPC function directly to see what it would update
-- Replace 'YOUR_OPPORTUNITY_ID' with the actual opportunity ID
SELECT * FROM public.send_form2_to_shortlisted('YOUR_OPPORTUNITY_ID');

-- 6. Get your user ID (run this first to use in query #4)
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';
