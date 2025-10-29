-- Check existing offer status and fix duplicate offer issue
-- This script will help diagnose and fix the duplicate offer problem

-- 1. Check the existing offer for this investor and startup
SELECT 
    id,
    investor_email,
    startup_id,
    startup_name,
    offer_amount,
    equity_percentage,
    status,
    stage,
    investor_advisor_approval_status,
    startup_advisor_approval_status,
    created_at,
    updated_at
FROM investment_offers 
WHERE investor_email = 'siddhi.solapurkar22@pccoepune.org' 
AND startup_id = 181;

-- 2. Check if there are any co-investment opportunities for this startup
SELECT 
    id,
    startup_id,
    listed_by_user_id,
    investment_amount,
    minimum_co_investment,
    maximum_co_investment,
    status,
    stage,
    created_at
FROM co_investment_opportunities 
WHERE startup_id = 181;

-- 3. Check the startup details
SELECT 
    id,
    name,
    sector,
    investment_advisor_code,
    user_id
FROM startups 
WHERE id = 181;

-- 4. Check the user details
SELECT 
    id,
    email,
    name,
    role,
    investment_advisor_code_entered
FROM users 
WHERE email = 'siddhi.solapurkar22@pccoepune.org';

-- 5. If the existing offer is in a final state (accepted/rejected), we can either:
--    a) Update the existing offer with new details
--    b) Delete the existing offer and create a new one
--    c) Show a message that an offer already exists

-- Option A: Update existing offer (if it's in a suitable state)
-- UPDATE investment_offers 
-- SET 
--     offer_amount = NEW_AMOUNT,
--     equity_percentage = NEW_EQUITY,
--     currency = 'INR',
--     updated_at = NOW()
-- WHERE id = EXISTING_OFFER_ID;

-- Option B: Delete existing offer and allow new one (if it's rejected)
-- DELETE FROM investment_offers 
-- WHERE id = EXISTING_OFFER_ID;

-- Option C: Show existing offer details to user
-- This would require frontend changes to handle the case where an offer already exists



