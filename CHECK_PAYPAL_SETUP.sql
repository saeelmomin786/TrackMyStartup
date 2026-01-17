-- =====================================================
-- CHECK PAYPAL-SPECIFIC TABLES AND RLS POLICIES
-- =====================================================

-- 1. Check if there are any PayPal-specific tables
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%paypal%' OR table_name LIKE '%payaid%')
ORDER BY table_name;

-- 2. Check if there are any PayPal-specific RLS policies
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('payment_transactions', 'user_subscriptions', 'billing_cycles', 'payments')
  AND policyname LIKE '%paypal%'
ORDER BY tablename, policyname;

-- 3. Show all tables in public schema that might be payment-related
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%payment%' OR table_name LIKE '%subscription%' OR table_name LIKE '%billing%')
ORDER BY table_name;

-- 4. Check columns in payment_transactions - does it handle PayPal?
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
  AND (column_name LIKE '%paypal%' OR column_name LIKE '%payment%')
ORDER BY ordinal_position;
