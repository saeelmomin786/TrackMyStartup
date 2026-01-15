# Database Migration Guide

## 📋 Overview

This directory contains all SQL migration scripts for the payment gateway integration system.

## 🚀 Quick Start

### Option 1: Run All Migrations (Recommended)
```sql
-- In Supabase SQL Editor or psql, run:
\i database/00_run_all_migrations.sql
```

### Option 2: Run Individual Scripts
Execute scripts in this order:

1. **01_create_plan_features_table.sql**
   - Creates `plan_features` table
   - Inserts feature access rules for all plan tiers

2. **02_create_storage_usage_table.sql**
   - Creates `user_storage_usage` table
   - Creates storage tracking functions and triggers

3. **03_create_payment_transactions_table.sql**
   - Creates `payment_transactions` table
   - Creates payment history functions

4. **04_update_subscription_tables.sql**
   - Updates `subscription_plans` table (adds plan_tier, storage_limit_mb, features)
   - Updates `user_subscriptions` table (adds payment_gateway, gateway IDs, country, storage_used_mb)
   - Creates helper functions

5. **CREATE_SUBSCRIPTION_PLANS_EUR.sql** (in root directory)
   - Creates/updates subscription plans with EUR pricing
   - Free: €0, Basic: €5, Premium: €20

## 📊 Tables Created

### `plan_features`
Defines which features are enabled for each plan tier.

**Columns:**
- `id` (UUID)
- `plan_tier` (VARCHAR) - 'free', 'basic', 'premium'
- `feature_name` (VARCHAR) - Feature identifier
- `is_enabled` (BOOLEAN) - Whether feature is enabled
- `created_at`, `updated_at` (TIMESTAMP)

### `user_storage_usage`
Tracks all file uploads and storage usage.

**Columns:**
- `id` (UUID)
- `user_id` (UUID) - References auth.users
- `file_type` (VARCHAR) - 'document', 'image', 'video', etc.
- `file_name` (VARCHAR)
- `file_size_mb` (DECIMAL)
- `storage_location` (TEXT) - S3/Storage path
- `related_entity_type` (VARCHAR) - 'startup', 'fundraising', etc.
- `related_entity_id` (UUID)
- `created_at`, `updated_at` (TIMESTAMP)

### `payment_transactions`
Stores all payment transactions from both gateways.

**Columns:**
- `id` (UUID)
- `user_id` (UUID) - References auth.users
- `subscription_id` (UUID) - References user_subscriptions
- `payment_gateway` (VARCHAR) - 'razorpay' or 'payaid'
- `gateway_order_id`, `gateway_payment_id`, `gateway_signature` (TEXT)
- `gateway_customer_id` (TEXT)
- `amount` (DECIMAL)
- `currency` (VARCHAR) - Default 'EUR'
- `status` (VARCHAR) - 'pending', 'success', 'failed', 'refunded', 'cancelled'
- `plan_tier` (VARCHAR) - 'free', 'basic', 'premium'
- `country` (VARCHAR)
- `failure_reason` (TEXT)
- `metadata` (JSONB)
- `created_at`, `updated_at` (TIMESTAMP)

## 🔄 Tables Updated

### `subscription_plans`
**New Columns:**
- `plan_tier` (VARCHAR) - 'free', 'basic', 'premium'
- `storage_limit_mb` (INTEGER) - Storage limit in MB
- `features` (JSONB) - Feature configuration

### `user_subscriptions`
**New Columns:**
- `payment_gateway` (VARCHAR) - 'razorpay' or 'payaid'
- `gateway_subscription_id` (TEXT) - Gateway subscription ID
- `gateway_customer_id` (TEXT) - Gateway customer ID
- `country` (VARCHAR) - User's country
- `storage_used_mb` (INTEGER) - Current storage usage

## 🔧 Functions Created

### `get_user_plan_tier(user_id UUID)`
Returns the user's current plan tier ('free', 'basic', 'premium').

### `can_user_access_feature(user_id UUID, feature_name VARCHAR)`
Checks if a user can access a specific feature.

### `get_user_storage_limit(user_id UUID)`
Returns the user's storage limit in MB.

### `get_user_storage_total(user_id UUID)`
Returns the user's total storage usage in MB.

### `get_user_payment_history(user_id UUID, limit INTEGER)`
Returns the user's payment transaction history.

## 🔒 Security

All tables have Row Level Security (RLS) enabled:
- Users can only view their own data
- Users can only insert/update/delete their own records
- Service role required for admin operations

## ✅ Verification

After running migrations, verify with:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('plan_features', 'user_storage_usage', 'payment_transactions');

-- Check plan features
SELECT plan_tier, COUNT(*) FROM plan_features GROUP BY plan_tier;

-- Check subscription plans
SELECT name, price, currency, plan_tier FROM subscription_plans 
WHERE user_type = 'Startup' AND country = 'Global';
```

## 🐛 Troubleshooting

### Error: Table already exists
- Tables use `CREATE TABLE IF NOT EXISTS`, so this is safe to ignore
- Or drop tables first if you need a fresh start

### Error: Function already exists
- Functions use `CREATE OR REPLACE`, so this is safe to ignore

### Error: Column already exists
- Columns use `ADD COLUMN IF NOT EXISTS`, so this is safe to ignore

## 📝 Notes

- All migrations are idempotent (safe to run multiple times)
- RLS policies are created for security
- Indexes are created for performance
- Triggers automatically update storage usage

---

**Last Updated**: [Current Date]  
**Status**: Ready for Production
