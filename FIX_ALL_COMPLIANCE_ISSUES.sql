-- =====================================================
-- FIX ALL COMPLIANCE ISSUES
-- =====================================================
-- This script fixes:
-- 1. user_submitted_compliances table (500 error)
-- 2. Storage policy for ip-trademark-documents (400 error on file access)

-- =====================================================
-- 1. FIX USER_SUBMITTED_COMPLIANCES TABLE
-- =====================================================

-- Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_submitted_compliances'
    ) THEN
        RAISE NOTICE 'Creating user_submitted_compliances table...';
    ELSE
        RAISE NOTICE 'user_submitted_compliances table exists.';
    END IF;
END $$;

-- Create user_submitted_compliances table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_submitted_compliances (
    id SERIAL PRIMARY KEY,
    submitted_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    submitted_by_name VARCHAR(100) NOT NULL,
    submitted_by_role VARCHAR(50) NOT NULL,
    submitted_by_email VARCHAR(255) NOT NULL,
    
    -- Company information
    company_name VARCHAR(200) NOT NULL,
    company_type VARCHAR(100) NOT NULL,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('parent', 'subsidiary', 'international')),
    
    -- Compliance details
    country_code VARCHAR(10) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    ca_type VARCHAR(50),
    cs_type VARCHAR(50),
    compliance_name VARCHAR(200) NOT NULL,
    compliance_description TEXT,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('first-year', 'monthly', 'quarterly', 'annual')),
    verification_required VARCHAR(20) NOT NULL CHECK (verification_required IN ('CA', 'CS', 'both')),
    
    -- Additional context
    justification TEXT,
    supporting_documents TEXT[],
    regulatory_reference VARCHAR(500),
    
    -- Status and approval
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
    reviewed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_submitted_compliances_submitted_by ON public.user_submitted_compliances(submitted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_submitted_compliances_status ON public.user_submitted_compliances(status);
CREATE INDEX IF NOT EXISTS idx_user_submitted_compliances_country ON public.user_submitted_compliances(country_code);
CREATE INDEX IF NOT EXISTS idx_user_submitted_compliances_company_type ON public.user_submitted_compliances(company_type);
CREATE INDEX IF NOT EXISTS idx_user_submitted_compliances_operation_type ON public.user_submitted_compliances(operation_type);
CREATE INDEX IF NOT EXISTS idx_user_submitted_compliances_created_at ON public.user_submitted_compliances(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_submitted_compliances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_submitted_compliances_updated_at ON public.user_submitted_compliances;
CREATE TRIGGER update_user_submitted_compliances_updated_at 
    BEFORE UPDATE ON public.user_submitted_compliances 
    FOR EACH ROW EXECUTE FUNCTION public.update_user_submitted_compliances_updated_at();

-- Enable RLS
ALTER TABLE public.user_submitted_compliances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own submissions" ON public.user_submitted_compliances;
DROP POLICY IF EXISTS "Users can submit compliances" ON public.user_submitted_compliances;
DROP POLICY IF EXISTS "Users can update own pending submissions" ON public.user_submitted_compliances;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.user_submitted_compliances;
DROP POLICY IF EXISTS "Admins can update all submissions" ON public.user_submitted_compliances;
DROP POLICY IF EXISTS "Admins can delete submissions" ON public.user_submitted_compliances;

-- Create RLS policies
CREATE POLICY "Users can view own submissions" ON public.user_submitted_compliances
    FOR SELECT USING (auth.uid() = submitted_by_user_id);

CREATE POLICY "Users can submit compliances" ON public.user_submitted_compliances
    FOR INSERT WITH CHECK (
        auth.uid() = submitted_by_user_id
    );

CREATE POLICY "Users can update own pending submissions" ON public.user_submitted_compliances
    FOR UPDATE USING (
        auth.uid() = submitted_by_user_id AND 
        status = 'pending'
    );

CREATE POLICY "Admins can view all submissions" ON public.user_submitted_compliances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

CREATE POLICY "Admins can update all submissions" ON public.user_submitted_compliances
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

CREATE POLICY "Admins can delete submissions" ON public.user_submitted_compliances
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- =====================================================
-- 2. VERIFY STORAGE BUCKET EXISTS
-- =====================================================

-- Check if ip-trademark-documents bucket exists
SELECT 
    '=== STORAGE BUCKET CHECK ===' as section,
    CASE 
        WHEN EXISTS (SELECT FROM storage.buckets WHERE id = 'ip-trademark-documents') 
        THEN '✅ ip-trademark-documents bucket exists'
        ELSE '❌ ip-trademark-documents bucket missing - Create via Dashboard'
    END as bucket_status;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify user_submitted_compliances table
SELECT 
    '=== TABLE VERIFICATION ===' as section,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_submitted_compliances') 
        THEN '✅ user_submitted_compliances table exists'
        ELSE '❌ user_submitted_compliances table missing'
    END as table_status;

-- Verify RLS policies
SELECT 
    '=== RLS POLICIES ===' as section,
    schemaname,
    tablename,
    policyname,
    cmd as command_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_submitted_compliances'
ORDER BY policyname;

SELECT '✅ Fix script complete!' as status;
SELECT '⚠️ For storage policies, use Supabase Dashboard (Storage > Policies)' as note;


