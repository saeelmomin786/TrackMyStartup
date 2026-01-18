-- =====================================================
-- CHECK WHICH STARTUPS BELONG TO INVESTMENT ADVISORS
-- =====================================================
-- For Advisor IDs: 
--   1. e69f7360-9cad-4bb8-aebf-1012bb3775c6
--   2. 50e3a3fc-41ee-4067-bd35-21d06eaaaa08

-- OPTION 1: Check advisor_added_startups (Advisor has added these startups)
-- =====================================================
SELECT 
  '✅ ADVISOR-ADDED STARTUPS' as section,
  aas.id as advisor_startup_id,
  aas.advisor_id,
  aas.tms_startup_id,
  aas.startup_name,
  aas.is_on_tms,
  aas.created_at,
  s.id as startup_db_id,
  u.firm_name as startup_name,
  s.user_id as startup_auth_user_id,
  u.id as startup_profile_id,
  u.email as startup_email
FROM advisor_added_startups aas
LEFT JOIN startups s ON s.id = aas.tms_startup_id
LEFT JOIN user_profiles u ON u.auth_user_id = s.user_id AND u.role = 'Startup'
WHERE aas.advisor_id IN (
  'e69f7360-9cad-4bb8-aebf-1012bb3775c6',
  '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
)
ORDER BY aas.created_at DESC;

-- OPTION 2: Check from investment_offers (Advisor has made offers to these startups)
-- =====================================================
SELECT 
  '✅ STARTUPS WITH INVESTMENT OFFERS' as section,
  io.id as offer_id,
  io.startup_id,
  u.firm_name as startup_name,
  s.user_id as startup_auth_user_id,
  u.id as startup_profile_id,
  u.email as startup_email,
  io.status as offer_status,
  io.created_at
FROM investment_offers io
LEFT JOIN startups s ON s.id = io.startup_id
LEFT JOIN user_profiles u ON u.auth_user_id = s.user_id AND u.role = 'Startup'
WHERE io.startup_id IN (
  SELECT startup_id FROM advisor_added_startups 
  WHERE advisor_id IN ('e69f7360-9cad-4bb8-aebf-1012bb3775c6', '50e3a3fc-41ee-4067-bd35-21d06eaaaa08')
)
ORDER BY io.created_at DESC;

-- OPTION 3: Check connection requests (Advisor has sent requests to these startups)
-- =====================================================
SELECT 
  '✅ CONNECTION REQUESTS FROM ADVISOR' as section,
  acr.id as request_id,
  acr.startup_id,
  u.firm_name as startup_name,
  s.user_id as startup_auth_user_id,
  u.id as startup_profile_id,
  u.email as startup_email,
  acr.status as request_status,
  acr.created_at
FROM advisor_connection_requests acr
LEFT JOIN startups s ON s.id = acr.startup_id
LEFT JOIN user_profiles u ON u.auth_user_id = s.user_id AND u.role = 'Startup'
WHERE acr.advisor_id IN (
  'e69f7360-9cad-4bb8-aebf-1012bb3775c6',
  '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
)
ORDER BY acr.created_at DESC;

-- OPTION 4: COMPREHENSIVE - All relationships for these advisors
-- =====================================================
SELECT 
  '📊 COMPREHENSIVE - ADVISOR-ADDED STARTUPS' as section,
  aas.advisor_id,
  aas.tms_startup_id as startup_id,
  u.firm_name as startup_name,
  u.email as startup_email,
  'Added by Advisor' as relationship_type,
  aas.created_at as interaction_date
FROM advisor_added_startups aas
LEFT JOIN startups s ON s.id = aas.tms_startup_id
LEFT JOIN user_profiles u ON u.auth_user_id = s.user_id AND u.role = 'Startup'
WHERE aas.advisor_id IN (
  'e69f7360-9cad-4bb8-aebf-1012bb3775c6',
  '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
)
ORDER BY aas.advisor_id, u.firm_name;

-- OPTION 5: Check credits/assignments (Which startups have gotten premium from these advisors)
-- =====================================================
SELECT 
  '💳 PREMIUM ASSIGNMENTS FROM ADVISOR' as section,
  up.auth_user_id,
  up.id as startup_profile_id,
  up.firm_name as startup_name,
  up.email as startup_email,
  'Premium Assigned by Advisor' as status
FROM user_profiles up
WHERE up.id IN (
  SELECT startup_profile_id FROM credit_assignments 
  WHERE advisor_id IN ('e69f7360-9cad-4bb8-aebf-1012bb3775c6', '50e3a3fc-41ee-4067-bd35-21d06eaaaa08')
)
AND up.role = 'Startup'
ORDER BY up.firm_name;

-- OPTION 6: Get advisor info (Who are these advisors?)
-- =====================================================
SELECT 
  '👤 ADVISOR INFORMATION' as section,
  up.id as profile_id,
  up.auth_user_id,
  up.email,
  up.firm_name,
  up.role,
  (SELECT COUNT(*) FROM advisor_added_startups WHERE advisor_id = up.auth_user_id) as total_added_startups,
  (SELECT COUNT(*) FROM investment_offers WHERE advisor_id = up.auth_user_id) as total_offers_sent,
  (SELECT COUNT(*) FROM credit_assignments WHERE advisor_id = up.auth_user_id) as total_premium_assignments
FROM user_profiles up
WHERE up.auth_user_id IN (
  'e69f7360-9cad-4bb8-aebf-1012bb3775c6',
  '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'
)
AND up.role = 'Investment Advisor';
