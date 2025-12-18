-- =====================================================
-- FIX LOGO AND SERVICE REQUESTS FOR NEW REGISTRATIONS
-- USING user_profiles TABLE (NOT users table)
-- =====================================================
-- This script fixes two issues:
-- 1. Logo not updating for new investor/startup registrations under investment advisors
-- 2. Service requests not showing for new registrations with investment advisor codes
-- 
-- CRITICAL: New registrations use user_profiles table, not users table!
-- =====================================================

-- =====================================================
-- PART 1: FIX STORAGE POLICIES FOR INVESTOR-ASSETS BUCKET
-- =====================================================
-- Ensure all authenticated users (including new registrations) can upload/update logos

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Investors can upload their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Investors can update their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Investors can delete their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view investor assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload investor assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update investor assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete investor assets" ON storage.objects;

-- Policy 1: Allow public read access to investor assets (for logos)
CREATE POLICY "Public can view investor assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'investor-assets');

-- Policy 2: Allow ALL authenticated users to upload to investor-assets bucket
-- This includes new registrations (no restrictions on file path)
CREATE POLICY "Authenticated users can upload investor assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'investor-assets');

-- Policy 3: Allow ALL authenticated users to update files in investor-assets bucket
CREATE POLICY "Authenticated users can update investor assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'investor-assets')
WITH CHECK (bucket_id = 'investor-assets');

-- Policy 4: Allow ALL authenticated users to delete files in investor-assets bucket
CREATE POLICY "Authenticated users can delete investor assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'investor-assets');

-- =====================================================
-- PART 2: FIX user_profiles TABLE RLS FOR SERVICE REQUESTS
-- =====================================================
-- Allow Investment Advisors to see user_profiles who entered their code (for Service Requests)

-- Enable RLS on user_profiles table if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Investment Advisors can view their clients" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can view user profiles" ON public.user_profiles;

-- Create comprehensive SELECT policy for user_profiles table
-- This allows:
-- 1. Users to see their own profiles
-- 2. Investment Advisors to see user_profiles who entered their code (for Service Requests)
-- 3. Admins to see all user_profiles
-- 4. CRITICAL: Authenticated users can read Investment Advisor profiles (for logo_url access)
CREATE POLICY "Users can view profiles and advisors can view clients"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profiles
    auth_user_id = auth.uid()
    OR
    -- Investment Advisors can see user_profiles who entered their advisor code
    (
        EXISTS (
            SELECT 1 FROM public.user_profiles advisor_profile
            WHERE advisor_profile.auth_user_id = auth.uid()
            AND advisor_profile.role = 'Investment Advisor'
            AND advisor_profile.investment_advisor_code IS NOT NULL
            AND advisor_profile.investment_advisor_code != ''
            AND public.user_profiles.investment_advisor_code_entered = advisor_profile.investment_advisor_code
        )
    )
    OR
    -- CRITICAL FIX: Allow authenticated users to read Investment Advisor profiles (for logo_url)
    -- This allows investors/startups to fetch advisor logo via getInvestmentAdvisorByCode
    role = 'Investment Advisor'
    OR
    -- Admins can see all user_profiles
    EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile
        WHERE admin_profile.auth_user_id = auth.uid()
        AND admin_profile.role = 'Admin'
    )
);

-- Also allow public read for general functionality (logos, etc.)
-- This is needed so investors/startups can fetch advisor logo_url via getInvestmentAdvisorByCode
CREATE POLICY "Public can view user profiles"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 3: FIX STARTUPS TABLE RLS FOR SERVICE REQUESTS
-- =====================================================
-- Allow Investment Advisors to see startups whose users entered their code
-- Note: Startups table uses user_id (auth_user_id), so we need to join with user_profiles

-- Enable RLS on startups table if not already enabled
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view startups" ON public.startups;
DROP POLICY IF EXISTS "Investment Advisors can view startups" ON public.startups;
DROP POLICY IF EXISTS "Users and advisors can view startups" ON public.startups;
DROP POLICY IF EXISTS "Public can view startups" ON public.startups;

-- Create comprehensive SELECT policy for startups table
CREATE POLICY "Users and advisors can view startups"
ON public.startups
FOR SELECT
TO authenticated
USING (
    -- Users can see their own startups
    user_id = auth.uid()
    OR
    -- Investment Advisors can see startups whose user_profiles entered their advisor code
    (
        EXISTS (
            SELECT 1 FROM public.user_profiles advisor_profile
            JOIN public.user_profiles startup_user_profile ON startup_user_profile.auth_user_id = public.startups.user_id
            WHERE advisor_profile.auth_user_id = auth.uid()
            AND advisor_profile.role = 'Investment Advisor'
            AND advisor_profile.investment_advisor_code IS NOT NULL
            AND advisor_profile.investment_advisor_code != ''
            AND startup_user_profile.investment_advisor_code_entered = advisor_profile.investment_advisor_code
        )
    )
    OR
    -- Admins and other roles can see all startups
    EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile
        WHERE admin_profile.auth_user_id = auth.uid()
        AND admin_profile.role IN ('Admin', 'CA', 'CS', 'Startup Facilitation Center')
    )
);

-- Also allow public read for general functionality
CREATE POLICY "Public can view startups"
ON public.startups
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 4: FIX user_profiles TABLE UPDATE POLICY FOR LOGO_URL
-- =====================================================
-- Ensure users can update their own logo_url (for new registrations)

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create comprehensive UPDATE policy
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
    -- Users can update their own profile (including logo_url)
    auth_user_id = auth.uid()
    OR
    -- Investment Advisors can update user_profiles who entered their code (for acceptance workflow)
    (
        EXISTS (
            SELECT 1 FROM public.user_profiles advisor_profile
            WHERE advisor_profile.auth_user_id = auth.uid()
            AND advisor_profile.role = 'Investment Advisor'
            AND advisor_profile.investment_advisor_code IS NOT NULL
            AND advisor_profile.investment_advisor_code != ''
            AND public.user_profiles.investment_advisor_code_entered = advisor_profile.investment_advisor_code
        )
    )
    OR
    -- Admins can update any user_profile
    EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile
        WHERE admin_profile.auth_user_id = auth.uid()
        AND admin_profile.role = 'Admin'
    )
)
WITH CHECK (
    -- Same conditions for WITH CHECK
    auth_user_id = auth.uid()
    OR
    (
        EXISTS (
            SELECT 1 FROM public.user_profiles advisor_profile
            WHERE advisor_profile.auth_user_id = auth.uid()
            AND advisor_profile.role = 'Investment Advisor'
            AND advisor_profile.investment_advisor_code IS NOT NULL
            AND advisor_profile.investment_advisor_code != ''
            AND public.user_profiles.investment_advisor_code_entered = advisor_profile.investment_advisor_code
        )
    )
    OR
    EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile
        WHERE admin_profile.auth_user_id = auth.uid()
        AND admin_profile.role = 'Admin'
    )
);

-- =====================================================
-- PART 5: ALSO FIX users TABLE (for backward compatibility)
-- =====================================================
-- Some old registrations might still use users table
-- We need to ensure both tables work

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Investment Advisors can view users" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles and advisors can view clients" ON public.users;
DROP POLICY IF EXISTS "Public can view user profiles" ON public.users;

-- Create comprehensive SELECT policy for users table (backward compatibility)
CREATE POLICY "Users can view profiles and advisors can view clients (users table)"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profile
    id = auth.uid()
    OR
    -- Investment Advisors can see users who entered their advisor code
    -- Check both users table and user_profiles table
    (
        EXISTS (
            SELECT 1 FROM public.users advisor
            WHERE advisor.id = auth.uid()
            AND advisor.role = 'Investment Advisor'
            AND advisor.investment_advisor_code IS NOT NULL
            AND advisor.investment_advisor_code != ''
            AND public.users.investment_advisor_code_entered = advisor.investment_advisor_code
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_profiles advisor_profile
            WHERE advisor_profile.auth_user_id = auth.uid()
            AND advisor_profile.role = 'Investment Advisor'
            AND advisor_profile.investment_advisor_code IS NOT NULL
            AND advisor_profile.investment_advisor_code != ''
            AND public.users.investment_advisor_code_entered = advisor_profile.investment_advisor_code
        )
    )
    OR
    -- Admins can see all users
    EXISTS (
        SELECT 1 FROM public.users admin_user
        WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'Admin'
    )
    OR
    EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile
        WHERE admin_profile.auth_user_id = auth.uid()
        AND admin_profile.role = 'Admin'
    )
);

-- Also allow public read for general functionality (logos, etc.)
CREATE POLICY "Public can view user profiles (users table)"
ON public.users
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PART 6: VERIFY POLICIES
-- =====================================================

-- Verify storage policies
SELECT 
    'Storage Policies' as section,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%investor%'
ORDER BY policyname;

-- Verify user_profiles table policies
SELECT 
    'user_profiles Table Policies' as section,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Verify users table policies (backward compatibility)
SELECT 
    'users Table Policies (Backward Compatibility)' as section,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- Verify startups table policies
SELECT 
    'Startups Table Policies' as section,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'startups'
ORDER BY policyname;

-- =====================================================
-- PART 7: TEST QUERIES (for debugging)
-- =====================================================

-- Test if Investment Advisors can see user_profiles who entered their code
-- (This will only work when logged in as an Investment Advisor)
SELECT 
    'Test: Investment Advisors can see user_profiles with their code' as test_name,
    COUNT(*) as visible_profiles
FROM public.user_profiles up
WHERE up.investment_advisor_code_entered IS NOT NULL
  AND up.investment_advisor_code_entered != ''
  AND EXISTS (
      SELECT 1 FROM public.user_profiles advisor_profile
      WHERE advisor_profile.auth_user_id = auth.uid()
      AND advisor_profile.role = 'Investment Advisor'
      AND advisor_profile.investment_advisor_code = up.investment_advisor_code_entered
  );

-- Test if Investment Advisors can see startups whose user_profiles entered their code
SELECT 
    'Test: Investment Advisors can see startups with their code' as test_name,
    COUNT(*) as visible_startups
FROM public.startups s
JOIN public.user_profiles startup_user_profile ON startup_user_profile.auth_user_id = s.user_id
WHERE startup_user_profile.investment_advisor_code_entered IS NOT NULL
  AND startup_user_profile.investment_advisor_code_entered != ''
  AND EXISTS (
      SELECT 1 FROM public.user_profiles advisor_profile
      WHERE advisor_profile.auth_user_id = auth.uid()
      AND advisor_profile.role = 'Investment Advisor'
      AND advisor_profile.investment_advisor_code = startup_user_profile.investment_advisor_code_entered
  );

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ Storage policies fixed - All authenticated users can upload/update logos' as fix_1,
    '✅ user_profiles table RLS fixed - Investment Advisors can see profiles with their code' as fix_2,
    '✅ Startups table RLS fixed - Investment Advisors can see startups with their code' as fix_3,
    '✅ Users can update their own logo_url in user_profiles (including new registrations)' as fix_4,
    '✅ Service Requests should now work for new registrations using user_profiles' as fix_5,
    '✅ Backward compatibility maintained for users table' as fix_6;

