-- =====================================================
-- COMPLETE FUNDRAISING CRM BACKEND SETUP
-- =====================================================
-- This script creates all necessary tables for Fundraising CRM:
-- 1. fundraising_crm_columns - Custom board columns per startup
-- 2. fundraising_crm_investors - Investor data
-- 3. fundraising_crm_metadata - CRM metadata (status, priority, tags, notes)
-- 4. fundraising_crm_attachments - Attachments for investors/programs
--
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- TABLE 1: FUNDRAISING CRM COLUMNS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fundraising_crm_columns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'bg-slate-100',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_column_per_startup UNIQUE (startup_id, label)
);

CREATE INDEX IF NOT EXISTS idx_fundraising_crm_columns_startup 
    ON public.fundraising_crm_columns(startup_id);
CREATE INDEX IF NOT EXISTS idx_fundraising_crm_columns_position 
    ON public.fundraising_crm_columns(startup_id, position);

-- =====================================================
-- TABLE 2: FUNDRAISING CRM INVESTORS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fundraising_crm_investors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    amount DECIMAL(15, 2),
    pitch_deck_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fundraising_crm_investors_startup 
    ON public.fundraising_crm_investors(startup_id);
CREATE INDEX IF NOT EXISTS idx_fundraising_crm_investors_email 
    ON public.fundraising_crm_investors(email);

-- =====================================================
-- TABLE 3: FUNDRAISING CRM METADATA
-- =====================================================
-- Stores CRM-specific data for both investors and programs
-- (status, priority, notes, tags, approach, first_contact)
CREATE TABLE IF NOT EXISTS public.fundraising_crm_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, -- investor UUID or 'program_{uuid}'
    item_type TEXT NOT NULL CHECK (item_type IN ('investor', 'program')),
    status TEXT NOT NULL DEFAULT 'to_be_contacted',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    approach TEXT,
    first_contact DATE,
    notes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_metadata_per_item UNIQUE (startup_id, item_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_fundraising_crm_metadata_startup 
    ON public.fundraising_crm_metadata(startup_id);
CREATE INDEX IF NOT EXISTS idx_fundraising_crm_metadata_item 
    ON public.fundraising_crm_metadata(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_fundraising_crm_metadata_status 
    ON public.fundraising_crm_metadata(status);

-- =====================================================
-- TABLE 4: FUNDRAISING CRM ATTACHMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fundraising_crm_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, -- investor UUID or 'program_{uuid}'
    item_type TEXT NOT NULL CHECK (item_type IN ('investor', 'program')),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fundraising_crm_attachments_startup 
    ON public.fundraising_crm_attachments(startup_id);
CREATE INDEX IF NOT EXISTS idx_fundraising_crm_attachments_item 
    ON public.fundraising_crm_attachments(item_id, item_type);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fundraising_crm_columns_updated_at ON public.fundraising_crm_columns;
CREATE TRIGGER update_fundraising_crm_columns_updated_at
    BEFORE UPDATE ON public.fundraising_crm_columns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fundraising_crm_investors_updated_at ON public.fundraising_crm_investors;
CREATE TRIGGER update_fundraising_crm_investors_updated_at
    BEFORE UPDATE ON public.fundraising_crm_investors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fundraising_crm_metadata_updated_at ON public.fundraising_crm_metadata;
CREATE TRIGGER update_fundraising_crm_metadata_updated_at
    BEFORE UPDATE ON public.fundraising_crm_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.fundraising_crm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraising_crm_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraising_crm_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraising_crm_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - FUNDRAISING CRM COLUMNS
-- =====================================================
DROP POLICY IF EXISTS "Users can view their startup's CRM columns" ON public.fundraising_crm_columns;
CREATE POLICY "Users can view their startup's CRM columns" ON public.fundraising_crm_columns
    FOR SELECT USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their startup's CRM columns" ON public.fundraising_crm_columns;
CREATE POLICY "Users can manage their startup's CRM columns" ON public.fundraising_crm_columns
    FOR ALL USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES - FUNDRAISING CRM INVESTORS
-- =====================================================
DROP POLICY IF EXISTS "Users can view their startup's CRM investors" ON public.fundraising_crm_investors;
CREATE POLICY "Users can view their startup's CRM investors" ON public.fundraising_crm_investors
    FOR SELECT USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their startup's CRM investors" ON public.fundraising_crm_investors;
CREATE POLICY "Users can manage their startup's CRM investors" ON public.fundraising_crm_investors
    FOR ALL USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES - FUNDRAISING CRM METADATA
-- =====================================================
DROP POLICY IF EXISTS "Users can view their startup's CRM metadata" ON public.fundraising_crm_metadata;
CREATE POLICY "Users can view their startup's CRM metadata" ON public.fundraising_crm_metadata
    FOR SELECT USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their startup's CRM metadata" ON public.fundraising_crm_metadata;
CREATE POLICY "Users can manage their startup's CRM metadata" ON public.fundraising_crm_metadata
    FOR ALL USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES - FUNDRAISING CRM ATTACHMENTS
-- =====================================================
DROP POLICY IF EXISTS "Users can view their startup's CRM attachments" ON public.fundraising_crm_attachments;
CREATE POLICY "Users can view their startup's CRM attachments" ON public.fundraising_crm_attachments
    FOR SELECT USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their startup's CRM attachments" ON public.fundraising_crm_attachments;
CREATE POLICY "Users can manage their startup's CRM attachments" ON public.fundraising_crm_attachments
    FOR ALL USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- DEFAULT COLUMNS FOR EXISTING STARTUPS
-- =====================================================
-- Insert default columns for existing startups (optional)
-- This will ensure all startups have the standard 5 columns

DO $$
DECLARE
    startup_record RECORD;
BEGIN
    FOR startup_record IN SELECT DISTINCT id FROM public.startups LOOP
        -- Check if startup already has columns
        IF NOT EXISTS (
            SELECT 1 FROM public.fundraising_crm_columns 
            WHERE startup_id = startup_record.id
        ) THEN
            -- Insert default columns
            INSERT INTO public.fundraising_crm_columns (startup_id, label, color, position) VALUES
                (startup_record.id, 'To be contacted', 'bg-slate-100', 0),
                (startup_record.id, 'Reached out', 'bg-blue-50', 1),
                (startup_record.id, 'In progress', 'bg-yellow-50', 2),
                (startup_record.id, 'Committed', 'bg-green-50', 3),
                (startup_record.id, 'Not happening', 'bg-red-50', 4);
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Fundraising CRM tables created successfully!';
    RAISE NOTICE '✅ RLS policies applied';
    RAISE NOTICE '✅ Default columns added for all startups';
END $$;
