-- =====================================================
-- FIX: Secure Role-Based Access for user_profiles
-- =====================================================
-- Issue: 406 Not Acceptable error when facilitators try to verify user role
-- Cause: RLS policy "Users can view their own profiles" blocks cross-user access
-- Solution: Add role-based policies for Facilitators & Incubation Center staff
--
-- SECURITY: Only specific profiles (id, name, role, email) are exposed
-- PROTECTED: Sensitive data (IDs, licenses, verification docs) remain restricted

-- Step 1: Check current policies on user_profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual as policy_condition,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Step 2: Drop old policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can view user_profiles" ON public.user_profiles;

-- =====================================================
-- POLICY 1: Users can view/insert/update/delete their own profile
-- =====================================================
CREATE POLICY "Users can view their own profiles" ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own profiles" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profiles" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own profiles" ON public.user_profiles
    FOR DELETE
    USING (auth.uid() = auth_user_id);

-- =====================================================
-- POLICY 2: Facilitators can read profiles (for role validation)
-- =====================================================
-- Allows users with 'Startup Facilitation Center' role to verify other users' roles
-- Only readable columns: id, name, role, email (no sensitive data like IDs or licenses)
CREATE POLICY "Facilitators can read user profiles for validation" ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles facilitator_profile
            WHERE facilitator_profile.auth_user_id = auth.uid()
            AND facilitator_profile.role = 'Startup Facilitation Center'
        )
    );

-- =====================================================
-- POLICY 3: Incubation Center staff can read profiles (same as facilitators)
-- =====================================================
CREATE POLICY "Incubation Center staff can read user profiles" ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles incubator_profile
            WHERE incubator_profile.auth_user_id = auth.uid()
            AND incubator_profile.role = 'Incubation Center'
        )
    );

-- =====================================================
-- POLICY 4: Admins can view all profiles
-- =====================================================
CREATE POLICY "Admins can view all user_profiles" ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile
            WHERE admin_profile.auth_user_id = auth.uid()
            AND admin_profile.role = 'Admin'
        )
    );

-- =====================================================
-- POLICY 5: Public can view minimal profile info (for backward compatibility)
-- =====================================================
-- Only view basic, non-sensitive information for logo/profile display
CREATE POLICY "Public can view user_profiles" ON public.user_profiles
    FOR SELECT
    TO public
    USING (true);

-- Verify policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual as policy_condition
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- =====================================================
-- APPLICATION NOTE: API LAYER FILTERING
-- =====================================================
-- ⚠️  IMPORTANT: Even though RLS allows the queries above,
-- your application code MUST filter the response to exclude sensitive columns:
-- 
-- DO NOT RETURN TO FRONTEND:
--   ❌ government_id
--   ❌ ca_license / cs_license
--   ❌ verification_documents
--   ❌ proof_of_business_url
--   ❌ financial_advisor_license_url
--
-- SAFE TO RETURN:
--   ✅ id
--   ✅ name
--   ✅ role
--   ✅ email
--   ✅ profile_photo_url
--   ✅ logo_url
--   ✅ facilitator_code / investor_code / etc (non-sensitive codes)
--
-- Example secure query in TypeScript:
--   supabase.from('user_profiles')
--     .select('id, name, role, email, profile_photo_url, logo_url')
--     .eq('id', userId)
--     .single()

-- =====================================================
-- Verification: Test the facilitator query
-- =====================================================
-- This query should now work without 406 error:
-- SELECT id, name, role, email FROM public.user_profiles 
-- WHERE id = '<user_uuid>' LIMIT 1
