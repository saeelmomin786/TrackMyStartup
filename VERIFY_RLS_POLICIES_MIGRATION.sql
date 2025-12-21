-- =====================================================
-- VERIFY RLS POLICIES MIGRATION
-- =====================================================
-- Check if any policies still reference users table

SELECT 
    '=== RLS POLICIES VERIFICATION ===' as check_type,
    COUNT(*) as policies_still_referencing_users,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL RLS POLICIES MIGRATED TO user_profiles'
        ELSE '❌ ' || COUNT(*) || ' POLICIES STILL REFERENCE users TABLE'
    END as status
FROM pg_policies pp
WHERE schemaname = 'public'
  AND (
      (pp.qual IS NOT NULL AND (
          pp.qual ILIKE '%users%' 
          OR pp.qual ILIKE '%public.users%'
          OR pp.qual ILIKE '%FROM users%'
          OR pp.qual ILIKE '%JOIN users%'
      ))
      OR (pp.with_check IS NOT NULL AND (
          pp.with_check ILIKE '%users%'
          OR pp.with_check ILIKE '%public.users%'
          OR pp.with_check ILIKE '%FROM users%'
          OR pp.with_check ILIKE '%JOIN users%'
      ))
  )
  -- Exclude policies that only mention "user_profiles" (these are correct)
  AND NOT (
      (pp.qual IS NOT NULL AND pp.qual ILIKE '%user_profiles%' AND pp.qual NOT ILIKE '%users%')
      AND (pp.with_check IS NULL OR (pp.with_check IS NOT NULL AND pp.with_check ILIKE '%user_profiles%' AND pp.with_check NOT ILIKE '%users%'))
  );

-- Show which policies still reference users (if any)
SELECT 
    'POLICY_DETAILS' as check_type,
    tablename || '.' || policyname as policy_name,
    CASE 
        WHEN qual IS NOT NULL AND (qual ILIKE '%users%' OR qual ILIKE '%public.users%') THEN 'qual'
        WHEN with_check IS NOT NULL AND (with_check ILIKE '%users%' OR with_check ILIKE '%public.users%') THEN 'with_check'
        ELSE 'both'
    END as expression_type,
    LEFT(COALESCE(qual, with_check), 200) as expression_preview
FROM pg_policies pp
WHERE schemaname = 'public'
  AND (
      (pp.qual IS NOT NULL AND (
          pp.qual ILIKE '%users%' 
          OR pp.qual ILIKE '%public.users%'
          OR pp.qual ILIKE '%FROM users%'
          OR pp.qual ILIKE '%JOIN users%'
      ))
      OR (pp.with_check IS NOT NULL AND (
          pp.with_check ILIKE '%users%'
          OR pp.with_check ILIKE '%public.users%'
          OR pp.with_check ILIKE '%FROM users%'
          OR pp.with_check ILIKE '%JOIN users%'
      ))
  )
  -- Exclude policies that only mention "user_profiles" (these are correct)
  AND NOT (
      (pp.qual IS NOT NULL AND pp.qual ILIKE '%user_profiles%' AND pp.qual NOT ILIKE '%users%')
      AND (pp.with_check IS NULL OR (pp.with_check IS NOT NULL AND pp.with_check ILIKE '%user_profiles%' AND pp.with_check NOT ILIKE '%users%'))
  )
ORDER BY tablename, policyname
LIMIT 20;





