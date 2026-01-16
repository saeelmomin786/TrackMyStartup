-- =====================================================
-- FIX 404 AND 400 ERRORS - COMPREHENSIVE FIX
-- =====================================================
-- This script fixes:
-- 1. Missing RPC functions (get_valuation_history, get_equity_distribution)
-- 2. startup_addition_requests table missing columns
-- 3. Better error handling for profile_notifications
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE MISSING RPC FUNCTIONS
-- =====================================================

-- Create get_valuation_history RPC function (if valuation_history table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'valuation_history') THEN
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
            FROM public.valuation_history vh
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

-- Create get_equity_distribution RPC function (if equity_holdings table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equity_holdings') THEN
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
            FROM public.equity_holdings eh
            LEFT JOIN public.investment_records ir ON ir.startup_id = eh.startup_id 
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

-- =====================================================
-- 2. FIX startup_addition_requests TABLE
-- =====================================================

-- Ensure investor_code column exists
ALTER TABLE public.startup_addition_requests
ADD COLUMN IF NOT EXISTS investor_code TEXT;

-- Ensure status column exists with proper constraint
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'startup_addition_requests' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.startup_addition_requests
        ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add check constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'startup_addition_requests' 
        AND constraint_name = 'startup_addition_requests_status_check'
    ) THEN
        ALTER TABLE public.startup_addition_requests
        ADD CONSTRAINT startup_addition_requests_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Create index on investor_code for better performance
CREATE INDEX IF NOT EXISTS idx_startup_addition_requests_investor_code 
ON public.startup_addition_requests(investor_code);

-- =====================================================
-- 3. CREATE profile_notifications TABLE (if it doesn't exist)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profile_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'profile_updated', 'subsidiary_added', 'international_op_added'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_notifications_startup_id 
ON public.profile_notifications(startup_id);
CREATE INDEX IF NOT EXISTS idx_profile_notifications_user_id 
ON public.profile_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_notifications_created_at 
ON public.profile_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.profile_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profile_notifications
DROP POLICY IF EXISTS profile_notifications_select_own ON public.profile_notifications;
CREATE POLICY profile_notifications_select_own ON public.profile_notifications
    FOR SELECT
    TO authenticated
    USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS profile_notifications_insert_own ON public.profile_notifications;
CREATE POLICY profile_notifications_insert_own ON public.profile_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS profile_notifications_update_own ON public.profile_notifications;
CREATE POLICY profile_notifications_update_own ON public.profile_notifications
    FOR UPDATE
    TO authenticated
    USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
    )
    WITH CHECK (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- =====================================================
-- 4. VERIFY CREATION
-- =====================================================

-- Check RPC functions
SELECT 
    routine_name,
    '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_valuation_history', 'get_equity_distribution');

-- Check startup_addition_requests columns
SELECT 
    column_name,
    data_type,
    '✅ EXISTS' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'startup_addition_requests'
AND column_name IN ('investor_code', 'status');

-- Check profile_notifications table
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profile_notifications'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;
