-- FIX_PROFILE_CREATION_FLOW.sql
-- This script ensures user profiles are created immediately after email verification
-- Run this in your Supabase SQL Editor

-- Step 1: First, ensure all required columns exist in users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS startup_name TEXT,
ADD COLUMN IF NOT EXISTS center_name TEXT,
ADD COLUMN IF NOT EXISTS investor_code TEXT,
ADD COLUMN IF NOT EXISTS investment_advisor_code TEXT,
ADD COLUMN IF NOT EXISTS investment_advisor_code_entered TEXT,
ADD COLUMN IF NOT EXISTS ca_code TEXT,
ADD COLUMN IF NOT EXISTS cs_code TEXT,
ADD COLUMN IF NOT EXISTS government_id TEXT,
ADD COLUMN IF NOT EXISTS ca_license TEXT,
ADD COLUMN IF NOT EXISTS verification_documents TEXT[],
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS proof_of_business_url TEXT,
ADD COLUMN IF NOT EXISTS financial_advisor_license_url TEXT,
ADD COLUMN IF NOT EXISTS startup_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_type TEXT;

-- Step 2: Create a function to automatically create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    startup_name_val TEXT;
    center_name_val TEXT;
    investor_code_val TEXT;
    investment_advisor_code_val TEXT;
    investment_advisor_code_entered_val TEXT;
BEGIN
    -- Get role from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Investor');
    startup_name_val := NEW.raw_user_meta_data->>'startupName';
    center_name_val := NEW.raw_user_meta_data->>'centerName';
    investment_advisor_code_entered_val := NEW.raw_user_meta_data->>'investmentAdvisorCode';
    
    -- Generate codes based on role
    IF user_role = 'Investor' THEN
        investor_code_val := 'INV-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    END IF;
    
    IF user_role = 'Investment Advisor' THEN
        investment_advisor_code_val := 'IA-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    END IF;
    
    -- Insert user profile
    INSERT INTO public.users (
        id,
        email,
        name,
        role,
        startup_name,
        center_name,
        investor_code,
        investment_advisor_code,
        investment_advisor_code_entered,
        registration_date,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
        user_role::user_role,
        CASE WHEN user_role = 'Startup' THEN startup_name_val ELSE NULL END,
        CASE WHEN user_role = 'Startup Facilitation Center' THEN center_name_val ELSE NULL END,
        investor_code_val,
        investment_advisor_code_val,
        investment_advisor_code_entered_val,
        CURRENT_DATE,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to automatically create user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_startup_name ON public.users(startup_name);
CREATE INDEX IF NOT EXISTS idx_users_investor_code ON public.users(investor_code);
CREATE INDEX IF NOT EXISTS idx_users_investment_advisor_code ON public.users(investment_advisor_code);
CREATE INDEX IF NOT EXISTS idx_users_ca_code ON public.users(ca_code);
CREATE INDEX IF NOT EXISTS idx_users_cs_code ON public.users(cs_code);

-- Step 5: Test the trigger by checking if it works
SELECT 'Trigger created successfully. New users will automatically get profiles.' as info;

-- Step 6: Check current users without profiles (if any)
SELECT 'Users without profiles (should be 0 after trigger):' as info;
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'name' as name,
    au.raw_user_meta_data->>'role' as role,
    au.email_confirmed_at,
    u.id as profile_exists
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.email_confirmed_at IS NOT NULL
ORDER BY au.created_at DESC
LIMIT 10;
