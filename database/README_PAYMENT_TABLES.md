# Payment Tables - Complete Setup Guide

## 🚀 Quick Start

**Run this ONE file in Supabase SQL Editor:**
```
database/00_CREATE_ALL_PAYMENT_TABLES_FROM_SCRATCH.sql
```

This single script creates **everything from scratch** - no dependencies on existing payment tables.

---

## 📊 Tables Created

### 1. `plan_features`
**Purpose:** Defines which features are enabled for each plan tier

**Columns:**
- `plan_tier` - 'free', 'basic', 'premium'
- `feature_name` - Feature identifier
- `is_enabled` - Whether feature is enabled

**Pre-populated with:**
- Free: Dashboard, Financials, Compliance, Profile (others disabled)
- Basic: All except Fundraising Active
- Premium: All features enabled

---

### 2. `user_storage_usage`
**Purpose:** Tracks all file uploads and storage usage per user

**Columns:**
- `user_id`
- `file_type` - 'document', 'image', 'video', etc.
- `file_name`, `file_size_mb`
- `storage_location` - S3/Storage bucket path
- `related_entity_type`, `related_entity_id`

**Features:**
- Auto-updates `user_subscriptions.storage_used_mb` via trigger
- Function `get_user_storage_total()` for quick totals

---

### 3. `country_plan_prices`
**Purpose:** Admin sets prices in INR for each country

**Columns:**
- `country` - Country name
- `plan_tier` - 'free', 'basic', 'premium'
- `price_inr` - Price in Indian Rupees
- `payment_gateway` - 'razorpay' or 'payaid'
- `is_active` - Enable/disable

**Example Data:**
- India: Basic ₹2000, Premium ₹8000 (Razorpay)
- USA: Basic ₹2500, Premium ₹10000 (PayAid)
- UK: Basic ₹2200, Premium ₹8800 (PayAid)

---

### 4. `payment_transactions`
**Purpose:** Stores all payment records

**Columns:**
- `user_id`, `subscription_id`
- `payment_gateway` - 'razorpay' or 'payaid'
- `amount` - Always in INR
- `currency` - Always 'INR'
- `status` - 'pending', 'success', 'failed', etc.
- `payment_type` - 'initial', 'recurring', 'upgrade', etc.
- `billing_cycle_number` - Which cycle this payment is for
- `is_autopay` - Whether it was auto-pay or manual

---

### 5. `billing_cycles`
**Purpose:** Tracks each billing period

**Columns:**
- `subscription_id`
- `cycle_number` - 1, 2, 3...
- `period_start`, `period_end`
- `amount` - Always in INR
- `status` - 'pending', 'paid', 'failed'
- `is_autopay` - Whether payment was via autopay

---

### 6. `subscription_changes`
**Purpose:** Tracks all subscription changes

**Columns:**
- `change_type` - 'upgrade', 'downgrade', 'autopay_enable', etc.
- `plan_tier_before`, `plan_tier_after`
- `amount_before_inr`, `amount_after_inr`
- `prorated_amount_inr` - For upgrades/downgrades
- `autopay_before`, `autopay_after`

---

## 🔄 Tables Enhanced

### `user_subscriptions`
**New Columns Added:**
- `locked_amount_inr` - Locked payment amount in INR
- `country` - User's country
- `payment_gateway` - 'razorpay' or 'payaid'
- `autopay_enabled` - Auto-pay status
- `razorpay_mandate_id` - Razorpay mandate ID
- `payaid_subscription_id` - PayAid subscription ID
- `mandate_status` - 'pending', 'active', 'paused', 'cancelled'
- `next_billing_date` - Next billing date
- `last_billing_date` - Last billing date
- `billing_cycle_count` - Number of completed cycles
- `total_paid` - Total amount paid
- `previous_plan_tier` - For tracking upgrades/downgrades
- `previous_subscription_id` - Link to old subscription
- `change_reason` - Reason for change

### `subscription_plans`
**New Columns Added:**
- `plan_tier` - 'free', 'basic', 'premium'
- `storage_limit_mb` - Storage limit
- `features` - JSONB feature list

---

## ✅ What Gets Created

1. ✅ **6 New Tables:**
   - plan_features
   - user_storage_usage
   - country_plan_prices
   - payment_transactions
   - billing_cycles
   - subscription_changes

2. ✅ **2 Tables Enhanced:**
   - user_subscriptions (16+ new columns including storage_used_mb)
   - subscription_plans (3 new columns)

3. ✅ **Functions & Triggers:**
   - `get_user_storage_total()` - Calculate user storage
   - `update_subscription_storage_usage()` - Auto-update storage on file changes

4. ✅ **Indexes Created:**
   - Performance indexes on all key columns

5. ✅ **RLS Policies:**
   - Users can only see their own data
   - Public can view country prices and plan features

6. ✅ **Default Data:**
   - Plan features for Free, Basic, Premium
   - India, USA, UK prices pre-populated

---

## 🔒 Security

- ✅ RLS enabled on all tables
- ✅ Users can only access their own payment data
- ✅ Country prices are public (for pricing display)
- ✅ All sensitive operations require authentication

---

## 📝 After Running

1. **Verify Tables:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
       'plan_features',
       'user_storage_usage',
       'country_plan_prices', 
       'payment_transactions', 
       'billing_cycles', 
       'subscription_changes'
   );
   ```

2. **Check Country Prices:**
   ```sql
   SELECT * FROM country_plan_prices ORDER BY country, plan_tier;
   ```

3. **Verify Columns:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'user_subscriptions' 
   AND column_name LIKE '%payment%' OR column_name LIKE '%autopay%' OR column_name LIKE '%billing%';
   ```

---

## 🎯 Next Steps

1. ✅ Run the SQL script
2. ✅ Verify tables are created
3. ✅ Test frontend Account Tab
4. ✅ Admin can add more countries in Financial Tab
5. ✅ Connect payment processing

---

**Status:** Ready to Run  
**File:** `database/00_CREATE_ALL_PAYMENT_TABLES_FROM_SCRATCH.sql`
