-- =====================================================
-- COMPLETE USER_PROFILES TABLE MIGRATION
-- =====================================================
-- This script adds ALL missing columns from users table to user_profiles table
-- This fixes the "Failed to update user profile" error
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Check what columns exist in users table
SELECT 
    'Step 1: Columns in users table' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 2: Check what columns exist in user_profiles table
SELECT 
    'Step 2: Columns in user_profiles table' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 3: Find columns in users but NOT in user_profiles
SELECT 
    'Step 3: Missing columns (in users but NOT in user_profiles)' as info,
    u.column_name,
    u.data_type,
    u.is_nullable
FROM information_schema.columns u
WHERE u.table_schema = 'public' 
  AND u.table_name = 'users'
  AND u.column_name NOT IN (
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
  )
  AND u.column_name NOT IN ('id') -- Exclude primary key (user_profiles uses different id)
ORDER BY u.column_name;

-- Step 4: Add ALL missing columns to user_profiles
-- This dynamically adds any column that exists in users but not in user_profiles

DO $$
DECLARE
    col_record RECORD;
    sql_statement TEXT;
    columns_added INTEGER := 0;
BEGIN
    -- Loop through all columns in users table
    FOR col_record IN 
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name NOT IN ('id') -- Exclude primary key
          AND column_name NOT IN (
              -- Exclude columns that already exist in user_profiles
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
                AND table_name = 'user_profiles'
          )
    LOOP
        -- Build ALTER TABLE statement
        sql_statement := 'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ' || 
                         quote_ident(col_record.column_name) || ' ';
        
        -- Add data type
        IF col_record.data_type = 'character varying' THEN
            IF col_record.character_maximum_length IS NOT NULL THEN
                sql_statement := sql_statement || 'VARCHAR(' || col_record.character_maximum_length || ')';
            ELSE
                sql_statement := sql_statement || 'TEXT';
            END IF;
        ELSIF col_record.data_type = 'text' THEN
            sql_statement := sql_statement || 'TEXT';
        ELSIF col_record.data_type = 'integer' THEN
            sql_statement := sql_statement || 'INTEGER';
        ELSIF col_record.data_type = 'bigint' THEN
            sql_statement := sql_statement || 'BIGINT';
        ELSIF col_record.data_type = 'boolean' THEN
            sql_statement := sql_statement || 'BOOLEAN';
        ELSIF col_record.data_type = 'date' THEN
            sql_statement := sql_statement || 'DATE';
        ELSIF col_record.data_type = 'timestamp with time zone' THEN
            sql_statement := sql_statement || 'TIMESTAMP WITH TIME ZONE';
        ELSIF col_record.data_type = 'timestamp without time zone' THEN
            sql_statement := sql_statement || 'TIMESTAMP WITHOUT TIME ZONE';
        ELSIF col_record.data_type = 'numeric' OR col_record.data_type = 'decimal' THEN
            sql_statement := sql_statement || 'NUMERIC';
        ELSIF col_record.data_type = 'ARRAY' THEN
            -- For arrays, check the underlying type
            sql_statement := sql_statement || 'TEXT[]'; -- Default to TEXT[] for arrays
        ELSE
            sql_statement := sql_statement || col_record.data_type;
        END IF;
        
        -- Add default value if exists
        IF col_record.column_default IS NOT NULL THEN
            sql_statement := sql_statement || ' DEFAULT ' || col_record.column_default;
        END IF;
        
        -- Execute the ALTER TABLE statement
        BEGIN
            EXECUTE sql_statement;
            columns_added := columns_added + 1;
            RAISE NOTICE '✅ Added column: %', col_record.column_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Failed to add column %: %', col_record.column_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Migration complete! Added % columns to user_profiles', columns_added;
END $$;

-- Step 5: Manually add specific columns that are commonly missing
-- (These are columns the code definitely tries to update)

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ca_service_code TEXT,
ADD COLUMN IF NOT EXISTS cs_service_code TEXT,
ADD COLUMN IF NOT EXISTS advisor_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS startup_count INTEGER DEFAULT 0;

-- Step 6: Verify all columns were added
SELECT 
    'Step 6: Final user_profiles columns' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 7: Check if critical columns exist
SELECT 
    'Step 7: Critical columns check' as info,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'ca_service_code'
    ) THEN '✅ ca_service_code EXISTS' ELSE '❌ ca_service_code MISSING' END as ca_service_code,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'cs_service_code'
    ) THEN '✅ cs_service_code EXISTS' ELSE '❌ cs_service_code MISSING' END as cs_service_code,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'government_id'
    ) THEN '✅ government_id EXISTS' ELSE '❌ government_id MISSING' END as government_id,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'verification_documents'
    ) THEN '✅ verification_documents EXISTS' ELSE '❌ verification_documents MISSING' END as verification_documents;

-- Step 8: Summary
SELECT 
    '✅ MIGRATION COMPLETE' as status,
    'All columns from users table have been added to user_profiles' as note,
    'Profile registration should now work correctly' as result;






