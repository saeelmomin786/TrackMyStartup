# How to Set Investment Advisor Domains

## Overview

After running `ADD_INVESTOR_ADVISOR_DOMAIN_COLUMN.sql`, you need to **manually set the domain** for each investment advisor in the database.

## Method 1: SQL (Recommended - Quick & Easy)

### Step 1: Find the Advisor

```sql
-- List all investment advisors
SELECT 
    id,
    name,
    email,
    investment_advisor_code,
    investor_advisor_domain  -- Will be NULL initially
FROM users
WHERE role = 'Investment Advisor'
ORDER BY name;
```

### Step 2: Set Domain for Each Advisor

```sql
-- Example: Set domain for Sarvesh
UPDATE users
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE role = 'Investment Advisor' 
  AND (name ILIKE '%Sarvesh%' OR email ILIKE '%sarvesh%');

-- Example: Set domain for Mulsetu
UPDATE users
SET investor_advisor_domain = 'mulsetu.com'
WHERE role = 'Investment Advisor' 
  AND (name ILIKE '%Mulsetu%' OR email ILIKE '%mulsetu%');

-- Example: Set domain by advisor code
UPDATE users
SET investor_advisor_domain = 'advisor.trackmystartup.com'
WHERE role = 'Investment Advisor' 
  AND investment_advisor_code = 'IA-ABC123';
```

### Step 3: Verify

```sql
-- Check domains are set correctly
SELECT 
    name,
    email,
    investment_advisor_code,
    investor_advisor_domain
FROM users
WHERE role = 'Investment Advisor'
ORDER BY name;
```

## Method 2: Supabase Dashboard (UI - No SQL Needed)

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click "Table Editor"
   - Select `users` table

2. **Find the Investment Advisor**
   - Filter by `role = 'Investment Advisor'`
   - Or search by name/email

3. **Edit the Row**
   - Click on the row
   - Find `investor_advisor_domain` column
   - Enter the domain (e.g., `sarvesh.trackmystartup.com`)
   - Click "Save"

4. **Repeat for Each Advisor**

## Method 3: Bulk Update (If You Have a List)

If you have a list of advisors and their domains:

```sql
-- Example: Update multiple advisors at once
UPDATE users
SET investor_advisor_domain = CASE
    WHEN name ILIKE '%Sarvesh%' THEN 'sarvesh.trackmystartup.com'
    WHEN name ILIKE '%Mulsetu%' THEN 'mulsetu.com'
    WHEN name ILIKE '%Advisor3%' THEN 'advisor3.trackmystartup.com'
    -- Add more WHEN clauses as needed
END
WHERE role = 'Investment Advisor'
  AND (
    name ILIKE '%Sarvesh%' OR 
    name ILIKE '%Mulsetu%' OR 
    name ILIKE '%Advisor3%'
  );
```

## Method 4: CSV Import (For Many Advisors)

If you have many advisors, you can:

1. **Export advisors to CSV:**
```sql
-- Export to CSV (run in Supabase SQL Editor)
COPY (
    SELECT id, name, email, investment_advisor_code
    FROM users
    WHERE role = 'Investment Advisor'
) TO '/tmp/advisors.csv' WITH CSV HEADER;
```

2. **Add domain column in Excel/Google Sheets**
3. **Import back** (or use UPDATE statements)

## Quick Reference: Common Scenarios

### Scenario 1: New Advisor Just Registered

```sql
-- Find their code
SELECT investment_advisor_code, name, email
FROM users
WHERE role = 'Investment Advisor'
  AND email = 'newadvisor@example.com';

-- Set their domain
UPDATE users
SET investor_advisor_domain = 'newadvisor.trackmystartup.com'
WHERE email = 'newadvisor@example.com'
  AND role = 'Investment Advisor';
```

### Scenario 2: Advisor Changed Domain

```sql
-- Update existing domain
UPDATE users
SET investor_advisor_domain = 'new-domain.com'
WHERE investment_advisor_code = 'IA-ABC123';
```

### Scenario 3: Remove Domain (Set to NULL)

```sql
-- Remove domain mapping
UPDATE users
SET investor_advisor_domain = NULL
WHERE investment_advisor_code = 'IA-ABC123';
```

## Domain Format Guidelines

**Good formats:**
- ✅ `sarvesh.trackmystartup.com` (subdomain)
- ✅ `mulsetu.com` (custom domain)
- ✅ `www.mulsetu.com` (with www - system handles it)
- ✅ `advisor.trackmystartup.com` (subdomain)

**Avoid:**
- ❌ `https://sarvesh.trackmystartup.com` (system removes protocol)
- ❌ `sarvesh.trackmystartup.com/` (trailing slash - system removes it)
- ❌ `SARVESH.TRACKMYSTARTUP.COM` (use lowercase - system converts)

**Note:** The system automatically handles:
- Protocol removal (`https://` → removed)
- `www.` prefix (handled automatically)
- Case conversion (lowercase)
- Trailing slashes (removed)

## Verification Query

After setting domains, verify everything works:

```sql
-- Check all advisors with domains set
SELECT 
    name,
    email,
    investment_advisor_code,
    investor_advisor_domain,
    CASE 
        WHEN investor_advisor_domain IS NULL THEN '⚠️ No Domain Set'
        ELSE '✅ Domain Set'
    END as status
FROM users
WHERE role = 'Investment Advisor'
ORDER BY 
    CASE WHEN investor_advisor_domain IS NULL THEN 1 ELSE 0 END,
    name;
```

## Future: Admin UI (Optional)

You could build an admin UI later to:
- List all advisors
- Edit domains through a form
- Bulk import domains
- Validate domain format

But for now, **SQL or Supabase Dashboard is the way to go!**

## Summary

**Yes, you need to manually set domains**, but it's very simple:

1. **Run SQL** (fastest for multiple advisors)
2. **Use Supabase Dashboard** (easiest, no SQL needed)
3. **Bulk update** (if you have a list)

**Time required:** ~30 seconds per advisor

