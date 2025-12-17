-- =====================================================
-- CHECK USERS TABLE COLUMNS
-- =====================================================
-- Run this first to see what columns actually exist in your users table
-- Then we'll update the migration script based on the results
-- =====================================================

-- Get all columns in users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Check for specific columns that we need for migration
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'startup_name'
    ) THEN 'EXISTS' ELSE 'MISSING' END as startup_name,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'center_name'
    ) THEN 'EXISTS' ELSE 'MISSING' END as center_name,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'firm_name'
    ) THEN 'EXISTS' ELSE 'MISSING' END as firm_name,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'investor_code'
    ) THEN 'EXISTS' ELSE 'MISSING' END as investor_code,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'investment_advisor_code'
    ) THEN 'EXISTS' ELSE 'MISSING' END as investment_advisor_code,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'investment_advisor_code_entered'
    ) THEN 'EXISTS' ELSE 'MISSING' END as investment_advisor_code_entered,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'ca_code'
    ) THEN 'EXISTS' ELSE 'MISSING' END as ca_code,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'cs_code'
    ) THEN 'EXISTS' ELSE 'MISSING' END as cs_code,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'phone'
    ) THEN 'EXISTS' ELSE 'MISSING' END as phone,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'address'
    ) THEN 'EXISTS' ELSE 'MISSING' END as address,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'city'
    ) THEN 'EXISTS' ELSE 'MISSING' END as city,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'state'
    ) THEN 'EXISTS' ELSE 'MISSING' END as state,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'country'
    ) THEN 'EXISTS' ELSE 'MISSING' END as country,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'company'
    ) THEN 'EXISTS' ELSE 'MISSING' END as company,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'company_type'
    ) THEN 'EXISTS' ELSE 'MISSING' END as company_type,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'currency'
    ) THEN 'EXISTS' ELSE 'MISSING' END as currency,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'government_id'
    ) THEN 'EXISTS' ELSE 'MISSING' END as government_id,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'ca_license'
    ) THEN 'EXISTS' ELSE 'MISSING' END as ca_license,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'cs_license'
    ) THEN 'EXISTS' ELSE 'MISSING' END as cs_license,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'verification_documents'
    ) THEN 'EXISTS' ELSE 'MISSING' END as verification_documents,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'profile_photo_url'
    ) THEN 'EXISTS' ELSE 'MISSING' END as profile_photo_url,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'logo_url'
    ) THEN 'EXISTS' ELSE 'MISSING' END as logo_url,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'proof_of_business_url'
    ) THEN 'EXISTS' ELSE 'MISSING' END as proof_of_business_url,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'financial_advisor_license_url'
    ) THEN 'EXISTS' ELSE 'MISSING' END as financial_advisor_license_url,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'is_profile_complete'
    ) THEN 'EXISTS' ELSE 'MISSING' END as is_profile_complete;

-- Show sample data structure (first row only, no sensitive data)
SELECT 
    id,
    email,
    name,
    role,
    registration_date,
    created_at,
    updated_at
FROM public.users 
LIMIT 1;

