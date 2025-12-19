-- =====================================================
-- FIX COMPLIANCE TABLES
-- =====================================================
-- This script fixes missing tables for Compliance tab:
-- 1. verification_requests
-- 2. international_operations (fixes name mismatch)
-- 3. ip_trademark_records and ip_trademark_documents (ensures proper setup)

-- =====================================================
-- 1. FIX VERIFICATION_REQUESTS TABLE
-- =====================================================

-- Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'verification_requests'
    ) THEN
        RAISE NOTICE 'Creating verification_requests table...';
    ELSE
        RAISE NOTICE 'verification_requests table exists.';
    END IF;
END $$;

-- Create verification_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id SERIAL PRIMARY KEY,
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    startup_name TEXT NOT NULL,
    request_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_requests_startup_id ON public.verification_requests(startup_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_request_date ON public.verification_requests(request_date);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can create verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Anyone can manage verification requests" ON public.verification_requests;

-- Create RLS policies
CREATE POLICY "Users can view their verification requests" ON public.verification_requests
    FOR SELECT USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create verification requests" ON public.verification_requests
    FOR INSERT WITH CHECK (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- 2. FIX INTERNATIONAL_OPERATIONS TABLE
-- =====================================================

-- Check if international_ops exists (old name) and rename it
DO $$
BEGIN
    -- If international_ops exists but international_operations doesn't, rename it
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'international_operations'
    ) THEN
        ALTER TABLE public.international_ops RENAME TO international_operations;
        RAISE NOTICE 'Renamed international_ops to international_operations';
    END IF;
END $$;

-- Create international_operations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.international_operations (
    id SERIAL PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    country TEXT NOT NULL,
    company_type TEXT,
    start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_international_operations_startup_id ON public.international_operations(startup_id);
CREATE INDEX IF NOT EXISTS idx_international_operations_country ON public.international_operations(country);

-- Enable RLS
ALTER TABLE public.international_operations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own international operations" ON public.international_operations;
DROP POLICY IF EXISTS "Users can insert their own international operations" ON public.international_operations;
DROP POLICY IF EXISTS "Users can update their own international operations" ON public.international_operations;
DROP POLICY IF EXISTS "Users can delete their own international operations" ON public.international_operations;

-- Create RLS policies
CREATE POLICY "Users can view their own international operations" ON public.international_operations
    FOR SELECT USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own international operations" ON public.international_operations
    FOR INSERT WITH CHECK (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own international operations" ON public.international_operations
    FOR UPDATE USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own international operations" ON public.international_operations
    FOR DELETE USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- 3. FIX IP_TRADEMARK TABLES
-- =====================================================

-- Create IP/trademark records table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ip_trademark_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Trademark', 'Patent', 'Copyright', 'Trade Secret', 'Domain Name', 'Other')),
    name TEXT NOT NULL,
    description TEXT,
    registration_number TEXT,
    registration_date DATE,
    expiry_date DATE,
    jurisdiction TEXT NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Expired', 'Abandoned', 'Cancelled')),
    owner TEXT,
    filing_date DATE,
    priority_date DATE,
    renewal_date DATE,
    estimated_value DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create IP/trademark document uploads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ip_trademark_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_record_id UUID NOT NULL REFERENCES public.ip_trademark_records(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('Registration Certificate', 'Application Form', 'Renewal Document', 'Assignment Agreement', 'License Agreement', 'Other')),
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ip_trademark_records_startup_id ON public.ip_trademark_records(startup_id);
CREATE INDEX IF NOT EXISTS idx_ip_trademark_records_type ON public.ip_trademark_records(type);
CREATE INDEX IF NOT EXISTS idx_ip_trademark_records_status ON public.ip_trademark_records(status);
CREATE INDEX IF NOT EXISTS idx_ip_trademark_records_jurisdiction ON public.ip_trademark_records(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_ip_trademark_documents_ip_record_id ON public.ip_trademark_documents(ip_record_id);

-- Enable Row Level Security
ALTER TABLE public.ip_trademark_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_trademark_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view IP records for their startups" ON public.ip_trademark_records;
DROP POLICY IF EXISTS "Users can insert IP records for their startups" ON public.ip_trademark_records;
DROP POLICY IF EXISTS "Users can update IP records for their startups" ON public.ip_trademark_records;
DROP POLICY IF EXISTS "Users can delete IP records for their startups" ON public.ip_trademark_records;
DROP POLICY IF EXISTS "Users can view IP documents for their startups" ON public.ip_trademark_documents;
DROP POLICY IF EXISTS "Users can insert IP documents for their startups" ON public.ip_trademark_documents;
DROP POLICY IF EXISTS "Users can update IP documents for their startups" ON public.ip_trademark_documents;
DROP POLICY IF EXISTS "Users can delete IP documents for their startups" ON public.ip_trademark_documents;

-- Create RLS policies for ip_trademark_records
CREATE POLICY "Users can view IP records for their startups" ON public.ip_trademark_records
    FOR SELECT USING (
        startup_id IN (
            SELECT id FROM public.startups 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert IP records for their startups" ON public.ip_trademark_records
    FOR INSERT WITH CHECK (
        startup_id IN (
            SELECT id FROM public.startups 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update IP records for their startups" ON public.ip_trademark_records
    FOR UPDATE USING (
        startup_id IN (
            SELECT id FROM public.startups 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete IP records for their startups" ON public.ip_trademark_records
    FOR DELETE USING (
        startup_id IN (
            SELECT id FROM public.startups 
            WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for ip_trademark_documents
CREATE POLICY "Users can view IP documents for their startups" ON public.ip_trademark_documents
    FOR SELECT USING (
        ip_record_id IN (
            SELECT id FROM public.ip_trademark_records
            WHERE startup_id IN (
                SELECT id FROM public.startups 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert IP documents for their startups" ON public.ip_trademark_documents
    FOR INSERT WITH CHECK (
        ip_record_id IN (
            SELECT id FROM public.ip_trademark_records
            WHERE startup_id IN (
                SELECT id FROM public.startups 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update IP documents for their startups" ON public.ip_trademark_documents
    FOR UPDATE USING (
        ip_record_id IN (
            SELECT id FROM public.ip_trademark_records
            WHERE startup_id IN (
                SELECT id FROM public.startups 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete IP documents for their startups" ON public.ip_trademark_documents
    FOR DELETE USING (
        ip_record_id IN (
            SELECT id FROM public.ip_trademark_records
            WHERE startup_id IN (
                SELECT id FROM public.startups 
                WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify all tables exist
SELECT 
    '=== TABLE VERIFICATION ===' as section,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verification_requests') 
        THEN '✅ verification_requests'
        ELSE '❌ verification_requests'
    END as verification_requests_status,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'international_operations') 
        THEN '✅ international_operations'
        ELSE '❌ international_operations'
    END as international_operations_status,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ip_trademark_records') 
        THEN '✅ ip_trademark_records'
        ELSE '❌ ip_trademark_records'
    END as ip_trademark_records_status,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ip_trademark_documents') 
        THEN '✅ ip_trademark_documents'
        ELSE '❌ ip_trademark_documents'
    END as ip_trademark_documents_status;

-- Verify foreign key relationships
SELECT 
    '=== FOREIGN KEY VERIFICATION ===' as section,
    tc.constraint_name,
    tc.table_name as referencing_table,
    ccu.table_name as referenced_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name IN ('verification_requests', 'international_operations', 'ip_trademark_records', 'ip_trademark_documents')
       OR ccu.table_name IN ('verification_requests', 'international_operations', 'ip_trademark_records', 'ip_trademark_documents'))
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 4. CREATE STORAGE BUCKET FOR DOCUMENTS
-- =====================================================

-- Check if storage bucket exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM storage.buckets WHERE id = 'compliance-documents'
    ) THEN
        RAISE NOTICE 'Storage bucket compliance-documents exists.';
    ELSE
        RAISE NOTICE 'Creating storage bucket compliance-documents...';
    END IF;
END $$;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'compliance-documents',
    'compliance-documents',
    true, -- Public bucket for easier access
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access to compliance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to compliance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update compliance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete compliance-documents" ON storage.objects;

-- Create simple public access policy for compliance-documents bucket
CREATE POLICY "Public Access to compliance-documents" ON storage.objects
    FOR ALL USING (bucket_id = 'compliance-documents');

-- Verify storage bucket
SELECT 
    '=== STORAGE BUCKET VERIFICATION ===' as section,
    CASE 
        WHEN EXISTS (SELECT FROM storage.buckets WHERE id = 'compliance-documents') 
        THEN '✅ compliance-documents bucket exists'
        ELSE '❌ compliance-documents bucket missing'
    END as storage_bucket_status;

SELECT '✅ Compliance tables setup complete!' as status;
SELECT '✅ Storage bucket setup complete!' as status;

