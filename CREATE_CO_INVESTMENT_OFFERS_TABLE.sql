-- CREATE_CO_INVESTMENT_OFFERS_TABLE.sql
-- This script creates a separate table for co-investment offers
-- This provides better separation from normal investment offers which have different approval flows

-- Step 1: Create co_investment_offers table
CREATE TABLE IF NOT EXISTS public.co_investment_offers (
    id SERIAL PRIMARY KEY,
    
    -- Foreign key to co_investment_opportunities
    co_investment_opportunity_id INTEGER NOT NULL REFERENCES public.co_investment_opportunities(id) ON DELETE CASCADE,
    
    -- Offer details
    investor_email TEXT NOT NULL,
    investor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    investor_name TEXT,
    
    -- Startup and investment references
    startup_name TEXT NOT NULL,
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE SET NULL,
    investment_id INTEGER REFERENCES public.new_investments(id) ON DELETE SET NULL,
    
    -- Offer terms
    offer_amount DECIMAL(15,2) NOT NULL,
    equity_percentage DECIMAL(5,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Approval flow status (co-investment specific)
    status offer_status DEFAULT 'pending',
    
    -- Approval stages for co-investment flow:
    -- 1. Investor Advisor Approval (if investor has advisor)
    -- 2. Lead Investor Approval (required)
    -- 3. Startup Approval (final)
    investor_advisor_approval_status TEXT DEFAULT 'not_required' CHECK (investor_advisor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
    investor_advisor_approval_at TIMESTAMP WITH TIME ZONE,
    
    lead_investor_approval_status TEXT DEFAULT 'pending' CHECK (lead_investor_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
    lead_investor_approval_at TIMESTAMP WITH TIME ZONE,
    
    startup_approval_status TEXT DEFAULT 'pending' CHECK (startup_approval_status IN ('pending', 'approved', 'rejected')),
    startup_approval_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional fields (if needed for consistency with investment_offers)
    contact_details_revealed BOOLEAN DEFAULT FALSE,
    contact_details_revealed_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_co_investment_offers_co_investment_opportunity_id 
ON public.co_investment_offers(co_investment_opportunity_id);

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_investor_email 
ON public.co_investment_offers(investor_email);

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_status 
ON public.co_investment_offers(status);

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_investor_advisor_status 
ON public.co_investment_offers(investor_advisor_approval_status) 
WHERE investor_advisor_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_lead_investor_status 
ON public.co_investment_offers(lead_investor_approval_status) 
WHERE lead_investor_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_startup_approval_status 
ON public.co_investment_offers(startup_approval_status) 
WHERE startup_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_co_investment_offers_created_at 
ON public.co_investment_offers(created_at DESC);

-- Step 3: Create function to create co-investment offers
CREATE OR REPLACE FUNCTION public.create_co_investment_offer(
    p_co_investment_opportunity_id INTEGER,
    p_investor_email TEXT,
    p_startup_name TEXT,
    p_offer_amount DECIMAL,
    p_equity_percentage DECIMAL,
    p_currency TEXT DEFAULT 'USD',
    p_startup_id INTEGER DEFAULT NULL,
    p_investment_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_offer_id INTEGER;
    investor_id UUID;
    investor_name TEXT;
    final_startup_id INTEGER;
    final_investment_id INTEGER;
    investor_has_advisor BOOLEAN := FALSE;
    investor_advisor_code TEXT;
    initial_status offer_status := 'pending_lead_investor_approval';
    initial_investor_advisor_status TEXT := 'not_required';
BEGIN
    -- Validate: co_investment_opportunity_id must be provided
    IF p_co_investment_opportunity_id IS NULL THEN
        RAISE EXCEPTION 'co_investment_opportunity_id is required';
    END IF;
    
    -- Validate: Lead investor cannot make offer on their own opportunity
    DECLARE
        lead_investor_id UUID;
    BEGIN
        SELECT listed_by_user_id INTO lead_investor_id
        FROM public.co_investment_opportunities
        WHERE id = p_co_investment_opportunity_id;
        
        IF lead_investor_id IS NULL THEN
            RAISE EXCEPTION 'Co-investment opportunity not found';
        END IF;
        
        -- Get investor ID
        SELECT id INTO investor_id FROM public.users WHERE email = p_investor_email;
        
        IF investor_id IS NULL THEN
            RAISE EXCEPTION 'Investor not found with email: %', p_investor_email;
        END IF;
        
        -- Check if investor is the lead investor
        IF investor_id = lead_investor_id THEN
            RAISE EXCEPTION 'Lead investor cannot make an offer on their own co-investment opportunity';
        END IF;
    END;
    
    -- Get investor details and check for advisor
    SELECT 
        u.id,
        COALESCE(u.investment_advisor_code, u.investment_advisor_code_entered) AS advisor_code,
        CASE 
            WHEN u.investment_advisor_code IS NOT NULL OR u.investment_advisor_code_entered IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS has_advisor
    INTO investor_id, investor_advisor_code, investor_has_advisor
    FROM public.users u
    WHERE u.email = p_investor_email;
    
    IF investor_id IS NULL THEN
        RAISE EXCEPTION 'Investor not found with email: %', p_investor_email;
    END IF;
    
    -- Determine final startup_id and investment_id
    IF p_investment_id IS NOT NULL THEN
        final_investment_id := p_investment_id;
        -- Try to find startup by matching name with investment name
        SELECT s.id INTO final_startup_id
        FROM public.startups s
        INNER JOIN public.new_investments ni ON s.name = ni.name
        WHERE ni.id = p_investment_id
        LIMIT 1;
    ELSIF p_startup_id IS NOT NULL THEN
        final_startup_id := p_startup_id;
        -- Try to find investment_id by matching startup name
        SELECT ni.id INTO final_investment_id
        FROM public.new_investments ni
        INNER JOIN public.startups s ON s.name = ni.name
        WHERE s.id = p_startup_id
        LIMIT 1;
    ELSE
        -- Try to find by startup name - find both startup and investment
        SELECT s.id INTO final_startup_id
        FROM public.startups s
        WHERE s.name = p_startup_name
        LIMIT 1;
        
        IF final_startup_id IS NOT NULL THEN
            SELECT ni.id INTO final_investment_id
            FROM public.new_investments ni
            WHERE ni.name = p_startup_name
            LIMIT 1;
        ELSE
            -- If startup not found by name, try to find investment by name
            SELECT ni.id INTO final_investment_id
            FROM public.new_investments ni
            WHERE ni.name = p_startup_name
            LIMIT 1;
        END IF;
    END IF;
    
    -- Set initial status based on investor advisor presence
    IF investor_has_advisor THEN
        initial_investor_advisor_status := 'pending';
        initial_status := 'pending_investor_advisor_approval';
    ELSE
        -- No investor advisor, go directly to lead investor approval
        initial_status := 'pending_lead_investor_approval';
        initial_investor_advisor_status := 'not_required';
    END IF;
    
    -- Get investor name
    SELECT name INTO investor_name FROM public.users WHERE email = p_investor_email;
    
    -- Insert the co-investment offer
    INSERT INTO public.co_investment_offers (
        co_investment_opportunity_id,
        investor_email,
        investor_id,
        investor_name,
        startup_name,
        startup_id,
        investment_id,
        offer_amount,
        equity_percentage,
        currency,
        status,
        investor_advisor_approval_status,
        lead_investor_approval_status,
        startup_approval_status,
        created_at,
        updated_at
    ) VALUES (
        p_co_investment_opportunity_id,
        p_investor_email,
        investor_id,
        investor_name,
        p_startup_name,
        final_startup_id,
        final_investment_id,
        p_offer_amount,
        p_equity_percentage,
        p_currency,
        initial_status::offer_status,
        initial_investor_advisor_status,
        'pending',  -- Lead investor approval always required
        'pending',  -- Startup approval pending
        NOW(),
        NOW()
    ) RETURNING id INTO new_offer_id;
    
    -- Return the new offer ID
    RETURN new_offer_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_co_investment_offer(
    INTEGER, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER
) TO authenticated;

-- Step 4: Create function to approve co-investment offer by investor advisor

-- Drop existing function if it exists (in case it has wrong signature)
DROP FUNCTION IF EXISTS public.approve_co_investment_offer_investor_advisor(INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.approve_co_investment_offer_investor_advisor(TEXT);

CREATE OR REPLACE FUNCTION public.approve_co_investment_offer_investor_advisor(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offer_record RECORD;
    new_status offer_status;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO offer_record 
    FROM public.co_investment_offers 
    WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check if this is the right stage
    IF offer_record.status != 'pending_investor_advisor_approval' THEN
        RAISE EXCEPTION 'Offer is not in pending investor advisor approval status';
    END IF;
    
    -- Update approval status
    IF p_approval_action = 'approve' THEN
        -- Move to lead investor approval
        new_status := 'pending_lead_investor_approval';
        
        UPDATE public.co_investment_offers 
        SET 
            investor_advisor_approval_status = 'approved',
            investor_advisor_approval_at = NOW(),
            status = new_status,
            updated_at = NOW()
        WHERE id = p_offer_id;
    ELSE
        -- Reject the offer
        UPDATE public.co_investment_offers 
        SET 
            investor_advisor_approval_status = 'rejected',
            investor_advisor_approval_at = NOW(),
            status = 'investor_advisor_rejected',
            updated_at = NOW()
        WHERE id = p_offer_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Investor advisor approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_status', new_status,
        'updated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_co_investment_offer_investor_advisor(INTEGER, TEXT) TO authenticated;

-- Step 5: Create function to approve co-investment offer by lead investor

-- Drop existing function if it exists (in case it has wrong signature)
DROP FUNCTION IF EXISTS public.approve_co_investment_offer_lead_investor(INTEGER, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_co_investment_offer_lead_investor(
    p_offer_id INTEGER,
    p_lead_investor_id UUID,
    p_approval_action TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offer_record RECORD;
    co_investment_record RECORD;
    new_status offer_status;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO offer_record 
    FROM public.co_investment_offers 
    WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Get co-investment opportunity details
    SELECT * INTO co_investment_record
    FROM public.co_investment_opportunities
    WHERE id = offer_record.co_investment_opportunity_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment opportunity not found';
    END IF;
    
    -- Verify the caller is the lead investor
    IF co_investment_record.listed_by_user_id != p_lead_investor_id THEN
        RAISE EXCEPTION 'Only the lead investor can approve this co-investment offer';
    END IF;
    
    -- Check current status
    IF offer_record.status != 'pending_lead_investor_approval' THEN
        RAISE EXCEPTION 'Offer is not in pending lead investor approval status';
    END IF;
    
    -- Update approval status
    IF p_approval_action = 'approve' THEN
        -- Move to startup approval
        new_status := 'pending_startup_approval';
        
        UPDATE public.co_investment_offers 
        SET 
            lead_investor_approval_status = 'approved',
            lead_investor_approval_at = NOW(),
            status = new_status,
            updated_at = NOW()
        WHERE id = p_offer_id;
    ELSE
        -- Reject the offer
        UPDATE public.co_investment_offers 
        SET 
            lead_investor_approval_status = 'rejected',
            lead_investor_approval_at = NOW(),
            status = 'lead_investor_rejected',
            updated_at = NOW()
        WHERE id = p_offer_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Lead investor approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_status', new_status,
        'updated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_co_investment_offer_lead_investor(INTEGER, UUID, TEXT) TO authenticated;

-- Step 5.1: Create function to approve co-investment offer by startup
DROP FUNCTION IF EXISTS public.approve_co_investment_offer_startup(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.approve_co_investment_offer_startup(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offer_record RECORD;
    new_status offer_status;
BEGIN
    -- Validate action
    IF p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject"';
    END IF;
    
    -- Get offer details
    SELECT * INTO offer_record 
    FROM public.co_investment_offers 
    WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check current status
    IF offer_record.status != 'pending_startup_approval' THEN
        RAISE EXCEPTION 'Offer is not in pending startup approval status';
    END IF;
    
    -- Update approval status
    IF p_approval_action = 'approve' THEN
        -- Accept the offer
        new_status := 'accepted';
        
        UPDATE public.co_investment_offers 
        SET 
            startup_approval_status = 'approved',
            startup_approval_at = NOW(),
            status = new_status,
            updated_at = NOW()
        WHERE id = p_offer_id;
    ELSE
        -- Reject the offer
        new_status := 'startup_rejected';
        
        UPDATE public.co_investment_offers 
        SET 
            startup_approval_status = 'rejected',
            startup_approval_at = NOW(),
            status = new_status,
            updated_at = NOW()
        WHERE id = p_offer_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Startup approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_status', new_status,
        'updated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_co_investment_offer_startup(INTEGER, TEXT) TO authenticated;

-- Step 6: Migrate existing co-investment offers from investment_offers to co_investment_offers
-- This migrates offers that have co_investment_opportunity_id set
INSERT INTO public.co_investment_offers (
    co_investment_opportunity_id,
    investor_email,
    investor_id,
    investor_name,
    startup_name,
    startup_id,
    investment_id,
    offer_amount,
    equity_percentage,
    currency,
    status,
    investor_advisor_approval_status,
    lead_investor_approval_status,
    startup_approval_status,
    contact_details_revealed,
    contact_details_revealed_at,
    created_at,
    updated_at
)
SELECT 
    co_investment_opportunity_id,
    investor_email,
    investor_id,
    investor_name,
    startup_name,
    startup_id,
    investment_id,
    offer_amount,
    equity_percentage,
    currency,
    status::offer_status,
    COALESCE(investor_advisor_approval_status, 'not_required'),
    COALESCE(lead_investor_approval_status, 'pending'),
    CASE 
        WHEN status = 'pending_startup_approval' THEN 'pending'
        WHEN status = 'accepted' THEN 'approved'
        ELSE 'pending'
    END,
    COALESCE(contact_details_revealed, FALSE),
    contact_details_revealed_at,
    created_at,
    updated_at
FROM public.investment_offers
WHERE co_investment_opportunity_id IS NOT NULL
AND NOT EXISTS (
    -- Avoid duplicates if migration is run multiple times
    SELECT 1 FROM public.co_investment_offers 
    WHERE co_investment_offers.co_investment_opportunity_id = investment_offers.co_investment_opportunity_id
    AND co_investment_offers.investor_email = investment_offers.investor_email
    AND co_investment_offers.created_at = investment_offers.created_at
);

-- Step 7: Enable Row Level Security and create policies
-- =====================================================

-- Enable RLS on co_investment_offers table
ALTER TABLE public.co_investment_offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own co-investment offers" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Users can insert their own co-investment offers" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Users can update their own co-investment offers" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Lead investors can view offers for their opportunities" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Investment advisors can view offers for their clients" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Startups can view offers for their startup" ON public.co_investment_offers;
DROP POLICY IF EXISTS "Admins can view all co-investment offers" ON public.co_investment_offers;

-- Policy: Users can view their own co-investment offers (where they are the investor)
CREATE POLICY "Users can view their own co-investment offers" ON public.co_investment_offers
    FOR SELECT USING (
        investor_email = (
            SELECT email FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Lead investors can view offers for their co-investment opportunities
CREATE POLICY "Lead investors can view offers for their opportunities" ON public.co_investment_offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.co_investment_opportunities cio
            JOIN public.users u ON u.id = auth.uid()
            WHERE cio.id = co_investment_offers.co_investment_opportunity_id
            AND cio.listed_by_user_id = u.id
        )
    );

-- Policy: Investment advisors can view co-investment offers for their clients (investors)
CREATE POLICY "Investment advisors can view offers for their clients" ON public.co_investment_offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users investor
            JOIN public.users advisor ON advisor.id = auth.uid()
            WHERE investor.email = co_investment_offers.investor_email
            AND investor.investment_advisor_code_entered = advisor.investment_advisor_code
            AND advisor.role = 'Investment Advisor'
        )
    );

-- Policy: Startups can view co-investment offers for their startup
CREATE POLICY "Startups can view offers for their startup" ON public.co_investment_offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = co_investment_offers.startup_id
            AND s.user_id = auth.uid()
        )
    );

-- Policy: Admins can view all co-investment offers
CREATE POLICY "Admins can view all co-investment offers" ON public.co_investment_offers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- Policy: Users can insert their own co-investment offers
-- Note: Insert is handled by SECURITY DEFINER function, but this policy allows direct inserts too
CREATE POLICY "Users can insert their own co-investment offers" ON public.co_investment_offers
    FOR INSERT WITH CHECK (
        investor_email = (
            SELECT email FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update their own co-investment offers
CREATE POLICY "Users can update their own co-investment offers" ON public.co_investment_offers
    FOR UPDATE USING (
        investor_email = (
            SELECT email FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- Step 8: Grant permissions on co_investment_offers table
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.co_investment_offers TO authenticated;
GRANT USAGE ON SEQUENCE co_investment_offers_id_seq TO authenticated;

-- Step 9: Create helper function to get user public info (bypasses RLS for public fields)
-- =====================================================
-- This function allows startups to view public information about investors
CREATE OR REPLACE FUNCTION public.get_user_public_info(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_info JSON;
BEGIN
    SELECT json_build_object(
        'id', id,
        'name', name,
        'email', email,
        'company_name', company_name
    ) INTO user_info
    FROM public.users
    WHERE id = p_user_id;
    
    RETURN user_info;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_public_info(UUID) TO authenticated;

-- Step 10: After migration is verified, you can optionally delete migrated offers from investment_offers
-- Uncomment the following after verifying the migration worked correctly:
-- DELETE FROM public.investment_offers WHERE co_investment_opportunity_id IS NOT NULL;

