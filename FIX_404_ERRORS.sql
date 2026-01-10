-- =====================================================
-- FIX 404 ERRORS - CREATE MISSING RPC FUNCTIONS AND TABLE
-- =====================================================
-- This script creates the missing RPC functions and table
-- that are causing 404 errors in the console
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create get_valuation_history RPC function (if valuation_history table exists)
-- This function may fail if valuation_history table doesn't exist, which is OK
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'valuation_history') THEN
        CREATE OR REPLACE FUNCTION get_valuation_history(p_startup_id INTEGER)
        RETURNS TABLE (
            round_name TEXT,
            valuation DECIMAL(15,2),
            investment_amount DECIMAL(15,2),
            date DATE
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                COALESCE(vh.round_type::TEXT, 'Unknown') as round_name,
                COALESCE(vh.valuation, 0) as valuation,
                COALESCE(vh.investment_amount, 0) as investment_amount,
                COALESCE(vh.date, CURRENT_DATE) as date
            FROM valuation_history vh
            WHERE vh.startup_id = p_startup_id
            ORDER BY vh.date ASC;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE '✅ Created get_valuation_history function';
    ELSE
        RAISE NOTICE '⚠️ valuation_history table does not exist, skipping get_valuation_history function';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not create get_valuation_history: %', SQLERRM;
END $$;

-- 2. Create get_equity_distribution RPC function (if equity_holdings table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equity_holdings') THEN
        CREATE OR REPLACE FUNCTION get_equity_distribution(p_startup_id INTEGER)
        RETURNS TABLE (
            holder_type TEXT,
            equity_percentage DECIMAL(5,2),
            total_amount DECIMAL(15,2)
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                COALESCE(eh.holder_type::TEXT, 'Unknown') as holder_type,
                COALESCE(eh.equity_percentage, 0) as equity_percentage,
                COALESCE(SUM(ir.amount), 0) as total_amount
            FROM equity_holdings eh
            LEFT JOIN investment_records ir ON ir.startup_id = eh.startup_id 
                AND ir.investor_name = eh.holder_name
            WHERE eh.startup_id = p_startup_id
            GROUP BY eh.holder_type, eh.equity_percentage
            ORDER BY eh.equity_percentage DESC;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE '✅ Created get_equity_distribution function';
    ELSE
        RAISE NOTICE '⚠️ equity_holdings table does not exist, skipping get_equity_distribution function';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not create get_equity_distribution: %', SQLERRM;
END $$;

-- 3. Create incubation_programs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.incubation_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    program_type TEXT NOT NULL CHECK (program_type IN ('Incubation', 'Acceleration', 'Mentorship', 'Bootcamp')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Dropped')),
    description TEXT,
    mentor_name TEXT,
    mentor_email TEXT,
    program_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_incubation_programs_startup_id ON public.incubation_programs(startup_id);
CREATE INDEX IF NOT EXISTS idx_incubation_programs_program_type ON public.incubation_programs(program_type);
CREATE INDEX IF NOT EXISTS idx_incubation_programs_status ON public.incubation_programs(status);

-- Enable RLS
ALTER TABLE public.incubation_programs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for incubation_programs
DROP POLICY IF EXISTS incubation_programs_select_own ON public.incubation_programs;
CREATE POLICY incubation_programs_select_own ON public.incubation_programs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = startup_id
            AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS incubation_programs_manage_own ON public.incubation_programs;
CREATE POLICY incubation_programs_manage_own ON public.incubation_programs
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

-- Verify creation
SELECT 
    '✅ incubation_programs table created' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'incubation_programs'
);

SELECT 
    routine_name,
    '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_valuation_history', 'get_equity_distribution');






