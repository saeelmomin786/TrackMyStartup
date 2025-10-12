-- =====================================================
-- COMPANY DOCUMENTS STORAGE SETUP
-- =====================================================

-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'company-documents',
    'company-documents',
    true,
    52428800, -- 50MB limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'video/mp4',
        'video/avi',
        'application/zip',
        'application/x-rar-compressed'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for company documents bucket
CREATE POLICY "Users can view company documents for their startups" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'company-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM startups 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload company documents for their startups" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'company-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM startups 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update company documents for their startups" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'company-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM startups 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete company documents for their startups" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'company-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
