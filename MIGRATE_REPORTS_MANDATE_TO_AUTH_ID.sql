-- ⚠️ MIGRATION REQUIRED: Update reports_mandate to use Auth User ID
-- 
-- Issue: Code now uses user.id (Auth ID) but reports_mandate has profile.id (Profile ID)
-- 
-- Old Profile ID:  d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1 (stored in table)
-- New Auth ID:     ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd (code queries with this)

-- Step 1: Check existing mandates with Profile ID
SELECT 
  id,
  title,
  program_name,
  facilitator_id,
  created_at
FROM reports_mandate
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';
-- Should show your existing mandates

-- Step 2: MIGRATE - Update from Profile ID to Auth User ID
UPDATE reports_mandate
SET facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';

-- Step 3: Verify migration successful
SELECT 
  id,
  title,
  program_name,
  facilitator_id,
  created_at
FROM reports_mandate
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
ORDER BY created_at DESC;
-- Should now show all your mandates with Auth ID

-- Step 4: Verify old Profile ID no longer exists
SELECT COUNT(*) as remaining_with_profile_id
FROM reports_mandate
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';
-- Should return: 0
