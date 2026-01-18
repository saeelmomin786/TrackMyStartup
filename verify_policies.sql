-- VERIFY ACTUAL RLS POLICIES IN SUPABASE
-- Run this in Supabase SQL Editor or via psql

-- ===================================
-- 1. CHECK user_subscriptions POLICIES
-- ===================================
SELECT 
    tablename,
    policyname,
    qual as condition,
    with_check as check_condition,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- ===================================
-- 2. CHECK billing_cycles POLICIES
-- ===================================
SELECT 
    tablename,
    policyname,
    qual as condition,
    with_check as check_condition,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'billing_cycles'
ORDER BY policyname;

-- ===================================
-- 3. CHECK payment_transactions POLICIES
-- ===================================
SELECT 
    tablename,
    policyname,
    qual as condition,
    with_check as check_condition,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'payment_transactions'
ORDER BY policyname;

-- ===================================
-- 4. CHECK subscription_changes POLICIES
-- ===================================
SELECT 
    tablename,
    policyname,
    qual as condition,
    with_check as check_condition,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'subscription_changes'
ORDER BY policyname;

-- ===================================
-- 5. CHECK FUNCTIONS EXIST
-- ===================================
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname IN (
    'is_subscription_valid',
    'handle_autopay_cancellation',
    'handle_subscription_payment_failure',
    'create_subscription'
)
ORDER BY p.proname;

-- ===================================
-- 6. GET FULL POLICY DETAILS WITH SOURCE
-- ===================================
SELECT tablename, policyname, pg_get_policy_expr(oid, 'qual') as policy_expression
FROM pg_policies
WHERE tablename IN ('user_subscriptions', 'billing_cycles', 'payment_transactions', 'subscription_changes')
ORDER BY tablename, policyname;
