-- =====================================================
-- COMPANY DOCUMENTS BACKEND SETUP
-- =====================================================

-- Create company_documents table
CREATE TABLE IF NOT EXISTS company_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    description TEXT,
    document_url TEXT NOT NULL,
    document_type VARCHAR(100),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_documents_startup_id ON company_documents(startup_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_created_by ON company_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_company_documents_created_at ON company_documents(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_documents_updated_at 
    BEFORE UPDATE ON company_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see company documents for startups they have access to
CREATE POLICY "Users can view company documents for their startups" ON company_documents
    FOR SELECT USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert company documents for their startups
CREATE POLICY "Users can insert company documents for their startups" ON company_documents
    FOR INSERT WITH CHECK (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update company documents for their startups
CREATE POLICY "Users can update company documents for their startups" ON company_documents
    FOR UPDATE USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete company documents for their startups
CREATE POLICY "Users can delete company documents for their startups" ON company_documents
    FOR DELETE USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON company_documents TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
