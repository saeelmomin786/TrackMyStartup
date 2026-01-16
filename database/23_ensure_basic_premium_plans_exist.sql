-- =====================================================
-- ENSURE BASIC AND PREMIUM PLANS EXIST
-- =====================================================
-- This script ensures that basic and premium plans exist
-- for Startup users with plan_tier set correctly

-- Add plan_tier column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) CHECK (plan_tier IN ('free', 'basic', 'premium'));

-- Add storage_limit_mb column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER DEFAULT 100;

-- Add features JSONB column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- CREATE UNIQUE CONSTRAINT FOR ON CONFLICT
-- =====================================================

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_subscription_plan_name_user_interval_country'
        AND table_name = 'subscription_plans'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE subscription_plans 
        ADD CONSTRAINT unique_subscription_plan_name_user_interval_country 
        UNIQUE (name, user_type, interval, country);
    END IF;
END $$;

-- =====================================================
-- INSERT/UPDATE BASIC PLAN (Global - EUR)
-- =====================================================

-- Use DO block to check if exists, then INSERT or UPDATE
DO $$
DECLARE
    plan_exists BOOLEAN;
BEGIN
    -- Check if plan already exists
    SELECT EXISTS (
        SELECT 1 FROM subscription_plans
        WHERE name = 'Basic Plan - Startup'
          AND user_type = 'Startup'
          AND interval = 'monthly'
          AND country = 'Global'
    ) INTO plan_exists;
    
    IF plan_exists THEN
        -- Update existing plan
        UPDATE subscription_plans
        SET 
            price = 5.00,
            currency = 'EUR',
            plan_tier = 'basic',
            storage_limit_mb = 1024,
            features = '{
                "portfolio_fundraising": true,
                "grants_draft": true,
                "grants_add_to_crm": true,
                "investor_ai_matching": false,
                "investor_add_to_crm": false,
                "crm_access": true,
                "fundraising_active": false
            }'::jsonb,
            description = 'Basic plan with portfolio fundraising, grants, and CRM - 1 GB storage',
            is_active = true,
            updated_at = NOW()
        WHERE name = 'Basic Plan - Startup'
          AND user_type = 'Startup'
          AND interval = 'monthly'
          AND country = 'Global';
    ELSE
        -- Insert new plan
        INSERT INTO subscription_plans (
            name, 
            price, 
            currency, 
            interval, 
            description, 
            user_type, 
            country, 
            is_active,
            plan_tier,
            storage_limit_mb,
            features
        ) VALUES (
            'Basic Plan - Startup',
            5.00,
            'EUR',
            'monthly',
            'Basic plan with portfolio fundraising, grants, and CRM - 1 GB storage',
            'Startup',
            'Global',
            true,
            'basic',
            1024,
            '{
                "portfolio_fundraising": true,
                "grants_draft": true,
                "grants_add_to_crm": true,
                "investor_ai_matching": false,
                "investor_add_to_crm": false,
                "crm_access": true,
                "fundraising_active": false
            }'::jsonb
        );
    END IF;
END $$;

-- =====================================================
-- INSERT/UPDATE PREMIUM PLAN (Global - EUR)
-- =====================================================

-- Use DO block to check if exists, then INSERT or UPDATE
DO $$
DECLARE
    plan_exists BOOLEAN;
BEGIN
    -- Check if plan already exists
    SELECT EXISTS (
        SELECT 1 FROM subscription_plans
        WHERE name = 'Premium Plan - Startup'
          AND user_type = 'Startup'
          AND interval = 'monthly'
          AND country = 'Global'
    ) INTO plan_exists;
    
    IF plan_exists THEN
        -- Update existing plan
        UPDATE subscription_plans
        SET 
            price = 20.00,
            currency = 'EUR',
            plan_tier = 'premium',
            storage_limit_mb = 10240,
            features = '{
                "portfolio_fundraising": true,
                "grants_draft": true,
                "grants_add_to_crm": true,
                "investor_ai_matching": true,
                "investor_add_to_crm": true,
                "crm_access": true,
                "fundraising_active": true
            }'::jsonb,
            description = 'Premium plan with all features including active fundraising campaigns - 10 GB storage',
            is_active = true,
            updated_at = NOW()
        WHERE name = 'Premium Plan - Startup'
          AND user_type = 'Startup'
          AND interval = 'monthly'
          AND country = 'Global';
    ELSE
        -- Insert new plan
        INSERT INTO subscription_plans (
            name, 
            price, 
            currency, 
            interval, 
            description, 
            user_type, 
            country, 
            is_active,
            plan_tier,
            storage_limit_mb,
            features
        ) VALUES (
            'Premium Plan - Startup',
            20.00,
            'EUR',
            'monthly',
            'Premium plan with all features including active fundraising campaigns - 10 GB storage',
            'Startup',
            'Global',
            true,
            'premium',
            10240,
            '{
                "portfolio_fundraising": true,
                "grants_draft": true,
                "grants_add_to_crm": true,
                "investor_ai_matching": true,
                "investor_add_to_crm": true,
                "crm_access": true,
                "fundraising_active": true
            }'::jsonb
        );
    END IF;
END $$;

-- =====================================================
-- UPDATE EXISTING PLANS TO SET plan_tier IF NULL
-- =====================================================

-- Update plans with "Basic" in name to have plan_tier = 'basic'
UPDATE subscription_plans
SET plan_tier = 'basic'
WHERE plan_tier IS NULL
  AND (name ILIKE '%basic%' OR name ILIKE '%Basic%')
  AND user_type = 'Startup'
  AND interval = 'monthly';

-- Update plans with "Premium" in name to have plan_tier = 'premium'
UPDATE subscription_plans
SET plan_tier = 'premium'
WHERE plan_tier IS NULL
  AND (name ILIKE '%premium%' OR name ILIKE '%Premium%')
  AND user_type = 'Startup'
  AND interval = 'monthly';

-- Update plans with "Free" in name to have plan_tier = 'free'
UPDATE subscription_plans
SET plan_tier = 'free'
WHERE plan_tier IS NULL
  AND (name ILIKE '%free%' OR name ILIKE '%Free%')
  AND user_type = 'Startup'
  AND interval = 'monthly';

-- =====================================================
-- VERIFY PLANS EXIST
-- =====================================================

-- Check if plans exist
DO $$
DECLARE
    basic_count INTEGER;
    premium_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO basic_count
    FROM subscription_plans
    WHERE plan_tier = 'basic'
      AND user_type = 'Startup'
      AND interval = 'monthly'
      AND is_active = true;
    
    SELECT COUNT(*) INTO premium_count
    FROM subscription_plans
    WHERE plan_tier = 'premium'
      AND user_type = 'Startup'
      AND interval = 'monthly'
      AND is_active = true;
    
    RAISE NOTICE 'Basic plans found: %', basic_count;
    RAISE NOTICE 'Premium plans found: %', premium_count;
    
    IF basic_count = 0 THEN
        RAISE WARNING 'No basic plans found!';
    END IF;
    
    IF premium_count = 0 THEN
        RAISE WARNING 'No premium plans found!';
    END IF;
END $$;
