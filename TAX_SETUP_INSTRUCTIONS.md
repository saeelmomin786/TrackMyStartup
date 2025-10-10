# Tax System Setup Instructions

## 🚨 Current Issue
The application is showing errors because the `tax_percentage` column doesn't exist in the database tables yet.

## ✅ Solution
Run the SQL script to add the required tax columns to your database.

## 📋 Steps to Fix

### 1. Run the SQL Script
Execute the `ADD_TAX_COLUMNS.sql` script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of ADD_TAX_COLUMNS.sql into Supabase SQL editor
-- Then click "Run" to execute the script
```

### 2. What the Script Does
- ✅ Adds `tax_percentage` column to `subscription_plans` table
- ✅ Adds tax columns to `user_subscriptions` table
- ✅ Adds tax columns to `payments` table
- ✅ Creates tax calculation function
- ✅ Verifies the changes

### 3. After Running the Script
- ✅ The tax percentage field will work in the admin dashboard
- ✅ Tax calculations will work in the payment flow
- ✅ Tax information will be stored in the database

## 🔧 Alternative: Manual Column Addition

If you prefer to add columns manually:

```sql
-- Add tax_percentage to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 0.00;

-- Add tax columns to user_subscriptions
ALTER TABLE user_subscriptions 
ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN total_amount_with_tax DECIMAL(10,2) DEFAULT 0.00;

-- Add tax columns to payments
ALTER TABLE payments 
ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN total_amount_with_tax DECIMAL(10,2) DEFAULT 0.00;
```

## 🎯 Expected Result
After running the script:
- ✅ No more 400 errors when loading subscription plans
- ✅ Tax percentage field will work in admin dashboard
- ✅ Tax calculations will work in payment flow
- ✅ Tax information will be stored properly

## 📞 Need Help?
If you encounter any issues:
1. Check the Supabase SQL editor for any error messages
2. Verify the columns were added by running: `SELECT * FROM subscription_plans LIMIT 1;`
3. Make sure you have admin access to the database
