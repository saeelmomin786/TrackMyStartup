-- Diagnose why Form 2 was configured on different opportunity than where test1 applied
-- 
-- SITUATION:
-- - test1 startup applied to opportunity: 1edcb779-378c-485a-8d01-9a0564f2b00f
-- - Form 2 was configured on opportunity: 60437153-aa15-4c74-88b5-135d6d7afcfd
-- - Both belong to same facilitator: d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1

-- 1. Check ALL opportunities for this facilitator to see if there are duplicates or similar programs
SELECT 
    id as opportunity_id,
    program_name,
    has_form2,
    form2_title,
    created_at,
    updated_at,
    CASE 
        WHEN id = '1edcb779-378c-485a-8d01-9a0564f2b00f' THEN '👤 HAS APPLICATION from test1'
        WHEN id = '60437153-aa15-4c74-88b5-135d6d7afcfd' THEN '📋 HAS FORM 2 CONFIG (9 questions)'
        ELSE '❓ Other opportunity'
    END as notes
FROM incubation_opportunities
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
ORDER BY created_at DESC;

-- 2. Check the application details for test1
SELECT 
    oa.id as application_id,
    oa.opportunity_id,
    io.program_name,
    s.name as startup_name,
    s.user_id as startup_user_id,
    oa.is_shortlisted,
    oa.status,
    oa.form2_requested,
    oa.form2_status,
    oa.created_at as application_date
FROM opportunity_applications oa
JOIN incubation_opportunities io ON io.id = oa.opportunity_id
JOIN startups s ON s.id = oa.startup_id
WHERE s.user_id = 'acec7880-0c9f-4757-b521-1bffd39dce25'
  AND io.facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
ORDER BY oa.created_at DESC;

-- 3. Check Form 2 configuration history (when was it configured)
SELECT 
    opportunity_id,
    COUNT(*) as question_count,
    MIN(created_at) as first_question_added,
    MAX(created_at) as last_question_added
FROM incubation_opportunity_form2_questions
WHERE opportunity_id IN (
    SELECT id FROM incubation_opportunities 
    WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
)
GROUP BY opportunity_id;

-- 4. Check if Form 2 was EVER configured on the opportunity where test1 applied
SELECT 
    f2q.id,
    f2q.opportunity_id,
    f2q.question_id,
    f2q.created_at,
    aqb.question as question_text
FROM incubation_opportunity_form2_questions f2q
LEFT JOIN application_question_bank aqb ON aqb.id = f2q.question_id
WHERE f2q.opportunity_id = '1edcb779-378c-485a-8d01-9a0564f2b00f'
ORDER BY f2q.display_order;

-- 5. Summary: Why the mismatch happened
-- POSSIBLE REASONS:
-- A) Facilitator has multiple similar opportunities and configured Form 2 on wrong one
-- B) Application was created BEFORE Form 2 feature was set up on that opportunity
-- C) Facilitator created a NEW opportunity for Form 2 testing
-- D) There were duplicate opportunities with same/similar names

SELECT 
    'DIAGNOSIS' as analysis,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM incubation_opportunities 
            WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
            GROUP BY program_name 
            HAVING COUNT(*) > 1
        ) THEN '⚠️ Multiple opportunities with same program_name exist'
        ELSE '✅ No duplicate program names'
    END as duplicate_check,
    
    CASE 
        WHEN (
            SELECT created_at FROM opportunity_applications 
            WHERE id = '1edcb779-378c-485a-8d01-9a0564f2b00f'
        ) < (
            SELECT MIN(created_at) FROM incubation_opportunity_form2_questions
            WHERE opportunity_id = '60437153-aa15-4c74-88b5-135d6d7afcfd'
        ) THEN '📅 Application created BEFORE Form 2 was configured on different opportunity'
        ELSE '📅 Application created AFTER Form 2 configuration'
    END as timeline_check;
