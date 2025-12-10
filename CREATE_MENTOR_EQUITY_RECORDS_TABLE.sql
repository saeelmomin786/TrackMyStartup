-- Create mentor_equity_records table for storing mentor equity allocation records
-- This table stores mentor equity allocation data similar to recognition_records

CREATE TABLE IF NOT EXISTS public.mentor_equity_records (
    id BIGSERIAL PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    mentor_name TEXT NOT NULL,
    mentor_code TEXT NOT NULL,
    fee_type TEXT NOT NULL CHECK (fee_type IN ('Free', 'Fees', 'Equity', 'Hybrid')),
    fee_amount DECIMAL(15, 2),
    shares INTEGER,
    price_per_share DECIMAL(15, 2),
    investment_amount DECIMAL(15, 2),
    equity_allocated DECIMAL(5, 2),
    post_money_valuation DECIMAL(15, 2),
    signed_agreement_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    request_id BIGINT REFERENCES public.mentor_requests(id) ON DELETE SET NULL,
    date_added DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on startup_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_equity_records_startup_id ON public.mentor_equity_records(startup_id);

-- Create index on mentor_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_equity_records_mentor_code ON public.mentor_equity_records(mentor_code);

-- Create index on date_added for sorting
CREATE INDEX IF NOT EXISTS idx_mentor_equity_records_date_added ON public.mentor_equity_records(date_added DESC);

-- Create index on request_id for linking with mentor_requests
CREATE INDEX IF NOT EXISTS idx_mentor_equity_records_request_id ON public.mentor_equity_records(request_id);

-- Enable Row Level Security
ALTER TABLE public.mentor_equity_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your security requirements)
-- Policy to allow startups to view their own mentor records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'mentor_equity_records' 
        AND policyname = 'Startups can view their own mentor equity records'
    ) THEN
        CREATE POLICY "Startups can view their own mentor equity records"
            ON public.mentor_equity_records
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.startups
                    WHERE startups.id = mentor_equity_records.startup_id
                    AND startups.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy to allow startups to insert their own mentor records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'mentor_equity_records' 
        AND policyname = 'Startups can insert their own mentor equity records'
    ) THEN
        CREATE POLICY "Startups can insert their own mentor equity records"
            ON public.mentor_equity_records
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.startups
                    WHERE startups.id = mentor_equity_records.startup_id
                    AND startups.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy to allow startups to update their own mentor records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'mentor_equity_records' 
        AND policyname = 'Startups can update their own mentor equity records'
    ) THEN
        CREATE POLICY "Startups can update their own mentor equity records"
            ON public.mentor_equity_records
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.startups
                    WHERE startups.id = mentor_equity_records.startup_id
                    AND startups.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy to allow startups to delete their own mentor records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'mentor_equity_records' 
        AND policyname = 'Startups can delete their own mentor equity records'
    ) THEN
        CREATE POLICY "Startups can delete their own mentor equity records"
            ON public.mentor_equity_records
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM public.startups
                    WHERE startups.id = mentor_equity_records.startup_id
                    AND startups.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy to allow admins to view all mentor records
-- Note: Using public.users instead of auth.users for RLS policies (Supabase compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'mentor_equity_records' 
        AND policyname = 'Admins can view all mentor equity records'
    ) THEN
        EXECUTE '
        CREATE POLICY "Admins can view all mentor equity records"
            ON public.mentor_equity_records
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE public.users.id = auth.uid()
                    AND public.users.role = ''Admin''
                )
            )';
    END IF;
END $$;

-- Policy to allow mentors to view their own records
-- Note: Using public.users instead of auth.users for RLS policies (Supabase compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'mentor_equity_records' 
        AND policyname = 'Mentors can view their own mentor equity records'
    ) THEN
        EXECUTE '
        CREATE POLICY "Mentors can view their own mentor equity records"
            ON public.mentor_equity_records
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE public.users.id = auth.uid()
                    AND public.users.role = ''Mentor''
                    AND public.users.mentor_code = mentor_equity_records.mentor_code
                )
            )';
    END IF;
END $$;

