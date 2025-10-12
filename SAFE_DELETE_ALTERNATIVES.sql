-- SAFE DELETE ALTERNATIVES
-- Instead of deleting records, use status-based management to preserve data integrity

-- 1. For opportunity_applications - Use status instead of delete
-- Add status field if not exists
ALTER TABLE public.opportunity_applications 
ADD COLUMN IF NOT EXISTS application_status VARCHAR(20) DEFAULT 'active' 
CHECK (application_status IN ('active', 'withdrawn', 'cancelled', 'archived'));

-- 2. For incubation_opportunities - Use status instead of delete  
-- Add status field if not exists
ALTER TABLE public.incubation_opportunities 
ADD COLUMN IF NOT EXISTS opportunity_status VARCHAR(20) DEFAULT 'active'
CHECK (opportunity_status IN ('active', 'closed', 'cancelled', 'archived'));

-- 3. Create safe "soft delete" functions instead of hard deletes

-- Function to safely withdraw an application (startup perspective)
CREATE OR REPLACE FUNCTION withdraw_application(application_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.opportunity_applications 
    SET application_status = 'withdrawn', updated_at = NOW()
    WHERE id = application_id 
    AND auth.uid() = (SELECT user_id FROM public.startups WHERE id = startup_id);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely close an opportunity (facilitator perspective)
CREATE OR REPLACE FUNCTION close_opportunity(opportunity_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.incubation_opportunities 
    SET opportunity_status = 'closed', updated_at = NOW()
    WHERE id = opportunity_id 
    AND auth.uid() = facilitator_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update RLS policies to only allow status updates, not deletes
-- Remove dangerous DELETE policies
DROP POLICY IF EXISTS "Facilitators can delete applications to their opportunities" ON public.opportunity_applications;
DROP POLICY IF EXISTS "Facilitators can delete their own opportunities" ON public.incubation_opportunities;

-- Add safe UPDATE policies instead
CREATE POLICY "Facilitators can update application status" ON public.opportunity_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.incubation_opportunities o
            WHERE o.id = opportunity_id AND o.facilitator_id = auth.uid()
        )
    );

CREATE POLICY "Facilitators can update opportunity status" ON public.incubation_opportunities
    FOR UPDATE USING (auth.uid() = facilitator_id);

-- 5. Create views for active records only
CREATE OR REPLACE VIEW active_applications AS
SELECT * FROM public.opportunity_applications 
WHERE application_status = 'active';

CREATE OR REPLACE VIEW active_opportunities AS
SELECT * FROM public.incubation_opportunities 
WHERE opportunity_status = 'active';
