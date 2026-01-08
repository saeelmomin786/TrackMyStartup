-- =====================================================
-- APPLICATION QUESTION BANK SYSTEM SCHEMA
-- =====================================================
-- This script creates the complete database schema for the application question bank system
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Application Question Bank (Master Table)
CREATE TABLE IF NOT EXISTS public.application_question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    category TEXT, -- e.g., 'Company Info', 'Financial', 'Team', 'Product', 'Market', 'Technology'
    question_type TEXT DEFAULT 'text' CHECK (question_type IN ('text', 'textarea', 'number', 'date', 'select', 'multiselect')),
    options JSONB, -- For select/multiple choice questions (array of options)
    status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for system questions, facilitator_id for custom
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejection_reason TEXT, -- If rejected
    usage_count INTEGER DEFAULT 0, -- Track how often question is used
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link Questions to Opportunities
CREATE TABLE IF NOT EXISTS public.incubation_opportunity_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES public.incubation_opportunities(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.application_question_bank(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(opportunity_id, question_id)
);

-- 3. Startup Answers (Reusable Bank)
CREATE TABLE IF NOT EXISTS public.startup_application_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id BIGINT NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.application_question_bank(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(startup_id, question_id) -- One answer per question per startup
);

-- 4. Application Submissions (Specific to an opportunity)
CREATE TABLE IF NOT EXISTS public.opportunity_application_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.opportunity_applications(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.application_question_bank(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(application_id, question_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Question Bank Indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON public.application_question_bank(status);
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON public.application_question_bank(category);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_by ON public.application_question_bank(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON public.application_question_bank(created_at DESC);

-- Opportunity Questions Indexes
CREATE INDEX IF NOT EXISTS idx_opp_questions_opportunity_id ON public.incubation_opportunity_questions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_questions_question_id ON public.incubation_opportunity_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_opp_questions_display_order ON public.incubation_opportunity_questions(opportunity_id, display_order);

-- Startup Answers Indexes
CREATE INDEX IF NOT EXISTS idx_startup_answers_startup_id ON public.startup_application_answers(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_answers_question_id ON public.startup_application_answers(question_id);

-- Application Responses Indexes
CREATE INDEX IF NOT EXISTS idx_app_responses_application_id ON public.opportunity_application_responses(application_id);
CREATE INDEX IF NOT EXISTS idx_app_responses_question_id ON public.opportunity_application_responses(question_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.application_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubation_opportunity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_application_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_application_responses ENABLE ROW LEVEL SECURITY;

-- Question Bank Policies
-- Everyone can read approved questions
DROP POLICY IF EXISTS question_bank_select_approved ON public.application_question_bank;
CREATE POLICY question_bank_select_approved ON public.application_question_bank
    FOR SELECT
    TO authenticated
    USING (
        status = 'approved' OR 
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- Facilitators can insert custom questions
DROP POLICY IF EXISTS question_bank_insert_facilitator ON public.application_question_bank;
CREATE POLICY question_bank_insert_facilitator ON public.application_question_bank
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid() AND
        status = 'pending'
    );

-- Admins can update (approve/reject) questions
DROP POLICY IF EXISTS question_bank_update_admin ON public.application_question_bank;
CREATE POLICY question_bank_update_admin ON public.application_question_bank
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'Admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- Facilitators can update their own pending questions
DROP POLICY IF EXISTS question_bank_update_creator ON public.application_question_bank;
CREATE POLICY question_bank_update_creator ON public.application_question_bank
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid() AND status = 'pending')
    WITH CHECK (created_by = auth.uid() AND status = 'pending');

-- Opportunity Questions Policies
-- Everyone can read opportunity questions
DROP POLICY IF EXISTS opp_questions_select_all ON public.incubation_opportunity_questions;
CREATE POLICY opp_questions_select_all ON public.incubation_opportunity_questions
    FOR SELECT
    TO authenticated
    USING (true);

-- Facilitators can manage questions for their own opportunities
DROP POLICY IF EXISTS opp_questions_manage_facilitator ON public.incubation_opportunity_questions;
CREATE POLICY opp_questions_manage_facilitator ON public.incubation_opportunity_questions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.incubation_opportunities io
            WHERE io.id = opportunity_id
            AND io.facilitator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.incubation_opportunities io
            WHERE io.id = opportunity_id
            AND io.facilitator_id = auth.uid()
        )
    );

-- Startup Answers Policies
-- Startups can manage their own answers
DROP POLICY IF EXISTS startup_answers_manage_own ON public.startup_application_answers;
CREATE POLICY startup_answers_manage_own ON public.startup_application_answers
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = startup_id
            AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = startup_id
            AND s.user_id = auth.uid()
        )
    );

-- Application Responses Policies
-- Startups can manage responses for their own applications
DROP POLICY IF EXISTS app_responses_manage_own ON public.opportunity_application_responses;
CREATE POLICY app_responses_manage_own ON public.opportunity_application_responses
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.opportunity_applications oa
            JOIN public.startups s ON s.id = oa.startup_id
            WHERE oa.id = application_id
            AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.opportunity_applications oa
            JOIN public.startups s ON s.id = oa.startup_id
            WHERE oa.id = application_id
            AND s.user_id = auth.uid()
        )
    );

-- Facilitators can read responses for their opportunities
DROP POLICY IF EXISTS app_responses_read_facilitator ON public.opportunity_application_responses;
CREATE POLICY app_responses_read_facilitator ON public.opportunity_application_responses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.opportunity_applications oa
            JOIN public.incubation_opportunities io ON io.id = oa.opportunity_id
            WHERE oa.id = application_id
            AND io.facilitator_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to increment usage count when question is used
CREATE OR REPLACE FUNCTION increment_question_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.application_question_bank
    SET usage_count = usage_count + 1
    WHERE id = NEW.question_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment usage count
DROP TRIGGER IF EXISTS trigger_increment_question_usage ON public.incubation_opportunity_questions;
CREATE TRIGGER trigger_increment_question_usage
    AFTER INSERT ON public.incubation_opportunity_questions
    FOR EACH ROW
    EXECUTE FUNCTION increment_question_usage();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_question_bank_updated_at ON public.application_question_bank;
CREATE TRIGGER trigger_update_question_bank_updated_at
    BEFORE UPDATE ON public.application_question_bank
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_startup_answers_updated_at ON public.startup_application_answers;
CREATE TRIGGER trigger_update_startup_answers_updated_at
    BEFORE UPDATE ON public.startup_application_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL QUESTION BANK DATA
-- =====================================================

-- Insert common questions into the bank
-- Categories are mapped to question types: general, financial, social, environmental, other
INSERT INTO public.application_question_bank (question_text, category, question_type, status, created_by)
VALUES
    -- General Questions
    ('What is your startup name?', 'Company Info', 'text', 'approved', NULL),
    ('What is your company registration number?', 'Company Info', 'text', 'approved', NULL),
    ('When was your company founded?', 'Company Info', 'date', 'approved', NULL),
    ('What is your company''s legal structure?', 'Company Info', 'select', 'approved', NULL),
    ('What is your company''s registered address?', 'Company Info', 'textarea', 'approved', NULL),
    ('Describe your product or service in detail.', 'Product', 'textarea', 'approved', NULL),
    ('What problem does your startup solve?', 'Product', 'textarea', 'approved', NULL),
    ('What is your unique value proposition?', 'Product', 'textarea', 'approved', NULL),
    ('Who is your target customer?', 'Product', 'textarea', 'approved', NULL),
    ('What is your business model?', 'Product', 'textarea', 'approved', NULL),
    ('What is the size of your target market?', 'Market', 'textarea', 'approved', NULL),
    ('Who are your main competitors?', 'Market', 'textarea', 'approved', NULL),
    ('What is your competitive advantage?', 'Market', 'textarea', 'approved', NULL),
    ('What is your go-to-market strategy?', 'Market', 'textarea', 'approved', NULL),
    ('How many employees does your startup have?', 'Team', 'number', 'approved', NULL),
    ('Describe your founding team and their backgrounds.', 'Team', 'textarea', 'approved', NULL),
    ('What key positions are you looking to fill?', 'Team', 'textarea', 'approved', NULL),
    ('What technology stack do you use?', 'Technology', 'textarea', 'approved', NULL),
    ('Do you have any patents or IP?', 'Technology', 'textarea', 'approved', NULL),
    ('What is your technology roadmap?', 'Technology', 'textarea', 'approved', NULL),
    ('What is your current stage?', 'Growth', 'select', 'approved', NULL),
    ('What are your key milestones achieved?', 'Growth', 'textarea', 'approved', NULL),
    ('What are your growth metrics?', 'Growth', 'textarea', 'approved', NULL),
    ('What traction have you achieved so far?', 'Growth', 'textarea', 'approved', NULL),
    
    -- Financial Questions
    ('What is your current revenue?', 'Financial', 'number', 'approved', NULL),
    ('What is your revenue model?', 'Financial', 'textarea', 'approved', NULL),
    ('What are your main revenue streams?', 'Financial', 'textarea', 'approved', NULL),
    ('What is your funding requirement?', 'Financial', 'number', 'approved', NULL),
    ('How will you use the funding?', 'Financial', 'textarea', 'approved', NULL),
    ('What is your burn rate?', 'Financial', 'number', 'approved', NULL),
    ('What is your runway?', 'Financial', 'number', 'approved', NULL),
    ('What are your projected revenues for the next 3 years?', 'Financial', 'textarea', 'approved', NULL),
    ('What is your pricing strategy?', 'Financial', 'textarea', 'approved', NULL),
    ('What are your key financial metrics?', 'Financial', 'textarea', 'approved', NULL),
    
    -- Social Questions
    ('What social impact does your startup aim to create?', 'Social', 'textarea', 'approved', NULL),
    ('How does your startup address social challenges?', 'Social', 'textarea', 'approved', NULL),
    ('What communities does your startup serve?', 'Social', 'textarea', 'approved', NULL),
    ('How do you measure your social impact?', 'Social', 'textarea', 'approved', NULL),
    ('What social problems are you solving?', 'Social', 'textarea', 'approved', NULL),
    ('How does your startup promote diversity and inclusion?', 'Social', 'textarea', 'approved', NULL),
    ('What is your approach to corporate social responsibility?', 'Social', 'textarea', 'approved', NULL),
    
    -- Environmental Questions
    ('What environmental impact does your startup aim to create?', 'Environmental', 'textarea', 'approved', NULL),
    ('How does your startup address climate change?', 'Environmental', 'textarea', 'approved', NULL),
    ('What is your carbon footprint reduction strategy?', 'Environmental', 'textarea', 'approved', NULL),
    ('How do you measure your environmental impact?', 'Environmental', 'textarea', 'approved', NULL),
    ('What sustainable practices does your startup follow?', 'Environmental', 'textarea', 'approved', NULL),
    ('How does your product/service contribute to environmental sustainability?', 'Environmental', 'textarea', 'approved', NULL),
    ('What renewable energy sources do you use?', 'Environmental', 'textarea', 'approved', NULL)
ON CONFLICT DO NOTHING;

SELECT 'Application Question Bank System schema created successfully!' as status;

