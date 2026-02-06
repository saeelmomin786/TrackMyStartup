-- Check all opportunities in the system and their facilitator IDs
-- This will help us find the correct facilitator ID

SELECT 
    id as opportunity_id,
    program_name,
    facilitator_id,
    has_form2,
    form2_title,
    created_at
FROM incubation_opportunities
WHERE has_form2 = TRUE OR form2_title IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Also check if there are ANY opportunities at all
SELECT 
    COUNT(*) as total_opportunities,
    COUNT(DISTINCT facilitator_id) as unique_facilitators
FROM incubation_opportunities;

-- List all facilitator IDs with their opportunity counts
SELECT 
    facilitator_id,
    COUNT(*) as opportunity_count,
    COUNT(CASE WHEN has_form2 = TRUE THEN 1 END) as form2_enabled_count
FROM incubation_opportunities
GROUP BY facilitator_id
ORDER BY opportunity_count DESC;

-- Check if the session facilitator profile ID exists
SELECT 
    id,
    user_id,
    first_name,
    last_name,
    email,
    role
FROM user_profiles
WHERE id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
OR user_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd';
