-- =====================================================
-- CREATE INTERNATIONAL_OPS TABLE (SAFE V2)
-- =====================================================
-- This script checks if the international_ops table exists
-- and creates it with all necessary columns if it doesn't exist
-- Also adds any missing columns if the table exists but is incomplete
-- Handles both international_ops and international_operations table names
-- 
-- PREREQUISITES:
-- 1. The 'startups' table must exist
-- 2. The 'auth.users' table must exist (Supabase default)
-- 3. The 'authenticated' role must exist (Supabase default)

-- =====================================================
-- PRE-CHECKS: Verify prerequisites
-- =====================================================
DO $$
BEGIN
    -- Check if startups table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'startups'
    ) THEN
        RAISE EXCEPTION '❌ PREREQUISITE ERROR: The "startups" table does not exist. Please create it first.';
    END IF;
    
    -- Check if auth.users exists (Supabase should have this)
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
    ) THEN
        RAISE WARNING '⚠️ WARNING: The "auth.users" table does not exist. Foreign key to user_id may fail.';
    END IF;
    
    RAISE NOTICE '✅ Prerequisites check passed';
END $$;

-- Step 1: Check if international_operations exists and rename to international_ops if needed
DO $$
BEGIN
    -- If international_operations exists but international_ops doesn't, rename it
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'international_operations'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops'
    ) THEN
        ALTER TABLE public.international_operations RENAME TO international_ops;
        RAISE NOTICE '✅ Renamed international_operations to international_ops';
    END IF;
END $$;

-- Step 2: Check if table exists and create if it doesn't
DO $$
BEGIN
    -- Check if international_ops table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops'
    ) THEN
        -- Create the table with SERIAL (which auto-creates the sequence)
        CREATE TABLE public.international_ops (
            id SERIAL PRIMARY KEY,
            startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
            country TEXT NOT NULL,
            company_type TEXT DEFAULT 'C-Corporation',
            start_date DATE NOT NULL,
            user_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add foreign key to auth.users if it exists (optional)
        BEGIN
            ALTER TABLE public.international_ops 
            ADD CONSTRAINT international_ops_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added foreign key constraint to auth.users';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ℹ️ Could not add foreign key to auth.users (may not exist): %', SQLERRM;
        END;
        
        RAISE NOTICE '✅ Created international_ops table with SERIAL id (sequence created automatically)';
    ELSE
        RAISE NOTICE 'ℹ️ international_ops table already exists';
        
        -- If table exists but doesn't have an id column with sequence, add it
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'international_ops' 
            AND column_name = 'id'
        ) THEN
            -- Add id column with sequence
            CREATE SEQUENCE IF NOT EXISTS public.international_ops_id_seq;
            ALTER TABLE public.international_ops 
            ADD COLUMN id INTEGER PRIMARY KEY DEFAULT nextval('public.international_ops_id_seq');
            ALTER SEQUENCE public.international_ops_id_seq OWNED BY public.international_ops.id;
            RAISE NOTICE '✅ Added id column with sequence to existing table';
        END IF;
    END IF;
END $$;

-- Step 3: Add missing columns if table exists but columns are missing
DO $$
BEGIN
    -- Add company_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops' 
        AND column_name = 'company_type'
    ) THEN
        ALTER TABLE public.international_ops 
        ADD COLUMN company_type TEXT DEFAULT 'C-Corporation';
        RAISE NOTICE '✅ Added company_type column to international_ops';
    END IF;

    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.international_ops 
        ADD COLUMN user_id UUID;
        
        -- Try to add foreign key constraint if auth.users exists
        BEGIN
            ALTER TABLE public.international_ops 
            ADD CONSTRAINT international_ops_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added user_id column with foreign key constraint';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ℹ️ Added user_id column without foreign key (auth.users may not exist)';
        END;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.international_ops 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to international_ops';
    END IF;

    -- Add profile_updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops' 
        AND column_name = 'profile_updated_at'
    ) THEN
        ALTER TABLE public.international_ops 
        ADD COLUMN profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added profile_updated_at column to international_ops';
    END IF;
END $$;

-- Step 4: Create indexes for better performance (only if columns exist)
DO $$
BEGIN
    -- Create startup_id index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops' 
        AND column_name = 'startup_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_international_ops_startup_id 
            ON public.international_ops(startup_id);
        RAISE NOTICE '✅ Created index on startup_id';
    END IF;
    
    -- Create country index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops' 
        AND column_name = 'country'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_international_ops_country 
            ON public.international_ops(country);
        RAISE NOTICE '✅ Created index on country';
    END IF;
    
    -- Create user_id index (partial, only for non-null values)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops' 
        AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_international_ops_user_id 
            ON public.international_ops(user_id) 
            WHERE user_id IS NOT NULL;
        RAISE NOTICE '✅ Created index on user_id';
    END IF;
END $$;

-- Step 5: Enable Row Level Security
ALTER TABLE public.international_ops ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own international operations" ON public.international_ops;
DROP POLICY IF EXISTS "Users can insert their own international operations" ON public.international_ops;
DROP POLICY IF EXISTS "Users can update their own international operations" ON public.international_ops;
DROP POLICY IF EXISTS "Users can delete their own international operations" ON public.international_ops;

-- Step 7: Create RLS policies for SELECT (view)
CREATE POLICY "Users can view their own international operations" 
    ON public.international_ops
    FOR SELECT 
    USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

-- Step 8: Create RLS policies for INSERT (create)
CREATE POLICY "Users can insert their own international operations" 
    ON public.international_ops
    FOR INSERT 
    WITH CHECK (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

-- Step 9: Create RLS policies for UPDATE (modify)
CREATE POLICY "Users can update their own international operations" 
    ON public.international_ops
    FOR UPDATE 
    USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

-- Step 10: Create RLS policies for DELETE (remove)
CREATE POLICY "Users can delete their own international operations" 
    ON public.international_ops
    FOR DELETE 
    USING (
        startup_id IN (
            SELECT id FROM public.startups WHERE user_id = auth.uid()
        )
    );

-- Step 11: Ensure sequence exists and is properly configured
DO $$
BEGIN
    -- Check if sequence exists
    IF NOT EXISTS (
        SELECT FROM pg_sequences 
        WHERE schemaname = 'public' 
        AND sequencename = 'international_ops_id_seq'
    ) THEN
        -- Create the sequence if it doesn't exist
        CREATE SEQUENCE public.international_ops_id_seq;
        
        -- Link it to the id column if the table exists
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'international_ops'
        ) THEN
            -- Set the sequence as owned by the column
            ALTER SEQUENCE public.international_ops_id_seq OWNED BY public.international_ops.id;
            
            -- Set the default value for the id column if it doesn't have one
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'international_ops' 
                AND column_name = 'id'
                AND column_default IS NULL
            ) THEN
                ALTER TABLE public.international_ops 
                ALTER COLUMN id SET DEFAULT nextval('public.international_ops_id_seq');
            END IF;
        END IF;
        
        RAISE NOTICE '✅ Created international_ops_id_seq sequence';
    ELSE
        RAISE NOTICE 'ℹ️ Sequence international_ops_id_seq already exists';
    END IF;
END $$;

-- Step 12: Grant necessary permissions on table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.international_ops TO authenticated;

-- Step 13: Grant sequence permissions (only if sequence exists)
DO $$
DECLARE
    seq_name TEXT;
BEGIN
    -- Try to find the sequence name using pg_get_serial_sequence (most reliable)
    SELECT pg_get_serial_sequence('public.international_ops', 'id') INTO seq_name;
    
    IF seq_name IS NOT NULL THEN
        -- Extract just the sequence name from the full qualified name
        seq_name := substring(seq_name from '\.([^\.]+)$');
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_name);
        RAISE NOTICE '✅ Granted permissions on sequence: %', seq_name;
    ELSE
        -- Fallback: Try to find by name pattern
        SELECT sequencename INTO seq_name
        FROM pg_sequences 
        WHERE schemaname = 'public' 
        AND sequencename LIKE 'international_ops%id%seq'
        LIMIT 1;
        
        IF seq_name IS NOT NULL THEN
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_name);
            RAISE NOTICE '✅ Granted permissions on sequence (found by name): %', seq_name;
        ELSE
            RAISE NOTICE 'ℹ️ No sequence found for international_ops.id - table may use a different ID generation method';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ Could not grant sequence permissions (may not be needed): %', SQLERRM;
END $$;

-- Step 14: Create trigger for updated_at (auto-update on row change)
CREATE OR REPLACE FUNCTION update_international_ops_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_international_ops_updated_at ON public.international_ops;
CREATE TRIGGER update_international_ops_updated_at
    BEFORE UPDATE ON public.international_ops
    FOR EACH ROW
    EXECUTE FUNCTION update_international_ops_updated_at();

-- Step 15: Verify table creation and show structure
DO $$
DECLARE
    table_exists BOOLEAN;
    column_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'international_ops';
        
        RAISE NOTICE '✅ international_ops table verified: % columns found', column_count;
        
        -- Show table structure
        RAISE NOTICE 'Table structure:';
        FOR rec IN (
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'international_ops'
            ORDER BY ordinal_position
        ) LOOP
            RAISE NOTICE '  - %: % (nullable: %, default: %)', 
                rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'none');
        END LOOP;
    ELSE
        RAISE EXCEPTION '❌ Failed to create international_ops table';
    END IF;
END $$;

-- Final verification query
SELECT 
    '✅ international_ops table is ready!' as status,
    COUNT(*) as total_columns,
    (SELECT COUNT(*) FROM public.international_ops) as existing_records
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'international_ops';


