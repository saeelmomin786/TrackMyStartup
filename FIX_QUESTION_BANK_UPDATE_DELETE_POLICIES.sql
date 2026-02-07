-- =====================================================
-- ADD DELETE POLICY FOR QUESTION BANK
-- =====================================================
-- This script adds missing DELETE policy
-- to allow admins to delete questions
-- =====================================================

-- Drop existing policies to recreate with proper permissions
DROP POLICY IF EXISTS question_bank_delete_admin ON public.application_question_bank;
DROP POLICY IF EXISTS question_bank_update_admin ON public.application_question_bank;

-- UPDATE policy: Admins can update all questions and change status
CREATE POLICY question_bank_update_admin ON public.application_question_bank
    FOR UPDATE
    TO authenticated
    USING (
        -- Admins can update any question
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'Admin'
        )
    )
    WITH CHECK (
        -- Admins can set any status (approved, rejected, pending)
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- DELETE policy: Admins can delete any question
CREATE POLICY question_bank_delete_admin ON public.application_question_bank
    FOR DELETE
    TO authenticated
    USING (
        -- Admins can delete any question
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- Verify all policies are now in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'application_question_bank'
ORDER BY cmd, policyname;
