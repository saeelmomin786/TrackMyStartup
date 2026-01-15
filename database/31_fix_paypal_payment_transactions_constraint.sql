-- =====================================================
-- FIX PAYPAL PAYMENT TRANSACTIONS CONSTRAINT
-- =====================================================
-- This script fixes the payment_gateway constraint to allow 'paypal'
-- Run this in Supabase SQL Editor

-- 1. Drop the existing constraint on payment_transactions
ALTER TABLE payment_transactions 
DROP CONSTRAINT IF EXISTS payment_transactions_payment_gateway_check;

-- 2. Add new constraint with 'paypal' included
ALTER TABLE payment_transactions 
ADD CONSTRAINT payment_transactions_payment_gateway_check 
CHECK (payment_gateway IN ('razorpay', 'payaid', 'paypal'));

-- 3. Verify the constraint was updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'payment_transactions'::regclass
    AND conname LIKE '%payment_gateway%';

-- 4. Check if there are any existing PayPal transactions that failed to insert
-- (This will show if there were constraint violations)
SELECT 
    COUNT(*) as total_transactions,
    payment_gateway,
    COUNT(*) FILTER (WHERE payment_gateway = 'paypal') as paypal_count
FROM payment_transactions
GROUP BY payment_gateway;

-- =====================================================
-- VERIFY BILLING CYCLES RLS POLICY
-- =====================================================
-- Ensure billing cycles can be viewed by users through their subscriptions

-- Check if the policy exists
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'billing_cycles'
    AND policyname = 'Users can view their own billing cycles';

-- If the policy doesn't exist or is incorrect, create/update it
DROP POLICY IF EXISTS "Users can view their own billing cycles" ON billing_cycles;

CREATE POLICY "Users can view their own billing cycles"
    ON billing_cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions
            WHERE user_subscriptions.id = billing_cycles.subscription_id
            AND user_subscriptions.user_id = auth.uid()
        )
    );

-- =====================================================
-- VERIFY PAYMENT TRANSACTIONS RLS POLICY
-- =====================================================
-- Ensure payment transactions can be viewed by users

-- Check if the policy exists
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'payment_transactions'
    AND policyname = 'Users can view their own payment transactions';

-- If the policy doesn't exist or is incorrect, create/update it
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON payment_transactions;

CREATE POLICY "Users can view their own payment transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- SUMMARY
-- =====================================================
-- After running this script:
-- 1. PayPal payments can now be inserted into payment_transactions
-- 2. Users can view their billing cycles through RLS policy
-- 3. Users can view their payment transactions through RLS policy
-- 
-- Next steps:
-- - Existing PayPal subscriptions may need to have their payment transactions
--   re-created if they failed due to the constraint
-- - Check server logs for any constraint violation errors
