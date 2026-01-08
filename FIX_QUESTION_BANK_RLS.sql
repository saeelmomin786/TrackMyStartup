-- =====================================================
-- FIX RLS POLICIES FOR APPLICATION QUESTION BANK
-- =====================================================
-- This script fixes the RLS policies to ensure admins
-- can properly access all questions in the question bank
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS question_bank_select_approved ON public.application_question_bank;
DROP POLICY IF EXISTS question_bank_insert_facilitator ON public.application_question_bank;
DROP POLICY IF EXISTS question_bank_insert_admin ON public.application_question_bank;

-- Improved SELECT policy: Admins can see ALL questions, others see approved or their own
CREATE POLICY question_bank_select_approved ON public.application_question_bank
    FOR SELECT
    TO authenticated
    USING (
        -- Admins can see everything
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'Admin'
        )
        OR
        -- Others can see approved questions
        status = 'approved'
        OR
        -- Or questions they created
        created_by = auth.uid()
    );

-- Facilitators and Admins can insert questions
CREATE POLICY question_bank_insert_facilitator ON public.application_question_bank
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Admins can insert any question (approved or pending)
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'Admin'
        )
        OR
        -- Facilitators can insert pending questions they created
        (
            status = 'pending' AND
            created_by = auth.uid() AND
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Startup Facilitation Center'
            )
        )
    );

-- Verify the policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'application_question_bank'
ORDER BY policyname;

