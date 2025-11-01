-- Create table to store investor favorites (liked startups)
-- This will persist favorites even after refresh

CREATE TABLE IF NOT EXISTS public.investor_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique investor-startup combinations
    UNIQUE(investor_id, startup_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investor_favorites_investor_id 
ON public.investor_favorites(investor_id);

CREATE INDEX IF NOT EXISTS idx_investor_favorites_startup_id 
ON public.investor_favorites(startup_id);

CREATE INDEX IF NOT EXISTS idx_investor_favorites_created_at 
ON public.investor_favorites(created_at);

-- Enable RLS
ALTER TABLE public.investor_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Investors can view their own favorites
CREATE POLICY "Investors can view their own favorites" ON public.investor_favorites
    FOR SELECT USING (auth.uid() = investor_id);

-- Investors can insert their own favorites
CREATE POLICY "Investors can insert their own favorites" ON public.investor_favorites
    FOR INSERT WITH CHECK (auth.uid() = investor_id);

-- Investors can delete their own favorites
CREATE POLICY "Investors can delete their own favorites" ON public.investor_favorites
    FOR DELETE USING (auth.uid() = investor_id);

-- Investment Advisors can view favorites of their assigned investors
CREATE POLICY "Investment Advisors can view assigned investor favorites" ON public.investor_favorites
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'Investment Advisor'
            AND EXISTS (
                SELECT 1 FROM public.users investor
                WHERE investor.id = investor_favorites.investor_id
                AND investor.investment_advisor_code_entered = (
                    SELECT investment_advisor_code FROM public.users WHERE id = auth.uid()
                )
                AND investor.advisor_accepted = true
            )
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.investor_favorites TO authenticated;

