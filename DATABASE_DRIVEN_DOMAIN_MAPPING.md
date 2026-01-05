# Database-Driven Domain Mapping for Investment Advisors

## ✅ Better Approach: Database-Driven Mapping

Instead of maintaining a static config file, we now store the domain directly in the database for each investment advisor. This is **much better** because:

### Advantages:
- ✅ **Dynamic**: No code changes needed when adding new advisors
- ✅ **Easy Management**: Update domains through database/admin panel
- ✅ **Scalable**: No deployment required for new mappings
- ✅ **Single Source of Truth**: Domain and code stored together
- ✅ **Admin-Friendly**: Can be managed through UI in the future

## How It Works

1. **Database Column**: Each investment advisor has an `investor_advisor_domain` column
2. **Auto-Detection**: When user registers, system queries database to find matching domain
3. **Auto-Population**: The corresponding `investment_advisor_code` is automatically filled

## Setup Instructions

### Step 1: Add Database Column

Run the SQL script:
```sql
-- File: ADD_INVESTOR_ADVISOR_DOMAIN_COLUMN.sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS investor_advisor_domain TEXT;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS investor_advisor_domain TEXT;
```

### Step 2: Set Domain for Each Advisor

For each investment advisor, update their domain:

```sql
-- Example: Set domain for Sarvesh
UPDATE public.users 
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE role = 'Investment Advisor' 
  AND (name ILIKE '%Sarvesh%' OR email ILIKE '%sarvesh%');

-- Example: Set domain for Mulsetu
UPDATE public.users 
SET investor_advisor_domain = 'mulsetu.com'
WHERE role = 'Investment Advisor' 
  AND (name ILIKE '%Mulsetu%' OR email ILIKE '%mulsetu%');
```

### Step 3: Verify

Check that domains are set correctly:

```sql
SELECT 
    name,
    email,
    investment_advisor_code,
    investor_advisor_domain
FROM users
WHERE role = 'Investment Advisor'
ORDER BY name;
```

## Usage

### For Admins: Adding New Advisor Domain

1. **Find the advisor:**
   ```sql
   SELECT id, name, email, investment_advisor_code
   FROM users
   WHERE role = 'Investment Advisor' AND name ILIKE '%AdvisorName%';
   ```

2. **Set their domain:**
   ```sql
   UPDATE users
   SET investor_advisor_domain = 'advisor.trackmystartup.com'
   WHERE id = 'advisor-uuid-here';
   ```

3. **Done!** No code changes needed.

### For Users: Registration Flow

1. User visits `sarvesh.trackmystartup.com`
2. Clicks "Register" button
3. System queries database: "Which advisor has domain `sarvesh.trackmystartup.com`?"
4. Finds Sarvesh's record with `investment_advisor_code = 'IA-ABC123'`
5. Auto-fills the code in registration form
6. User completes registration with code pre-filled

## Domain Matching Rules

The system handles:
- ✅ Exact domain match: `sarvesh.trackmystartup.com`
- ✅ Base domain match: `www.sarvesh.trackmystartup.com` → `sarvesh.trackmystartup.com`
- ✅ Protocol removal: `https://sarvesh.trackmystartup.com` → `sarvesh.trackmystartup.com`
- ✅ Case-insensitive: `SARVESH.TRACKMYSTARTUP.COM` → `sarvesh.trackmystartup.com`

## Example: Complete Workflow for Sarvesh

### 1. Sarvesh Registers as Investment Advisor
```sql
-- After registration, Sarvesh has:
-- investment_advisor_code: 'IA-ABC123'
-- investor_advisor_domain: NULL (not set yet)
```

### 2. Admin Sets Domain
```sql
UPDATE users
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE investment_advisor_code = 'IA-ABC123';
```

### 3. User Visits Domain and Registers
- User goes to `https://sarvesh.trackmystartup.com`
- Clicks "Register"
- System queries: `SELECT investment_advisor_code FROM users WHERE investor_advisor_domain = 'sarvesh.trackmystartup.com'`
- Returns: `IA-ABC123`
- Form auto-fills with `IA-ABC123`

## Migration from Config File

If you were using the old config file approach:

**Old Way (config/investorAdvisorDomains.ts):**
```typescript
'sarvesh.trackmystartup.com': 'IA-ABC123',
```

**New Way (Database):**
```sql
UPDATE users
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE investment_advisor_code = 'IA-ABC123';
```

The config file is now **optional** - the system will query the database first.

## Troubleshooting

### Problem: Code not auto-filling

**Check:**
1. Is domain set in database?
   ```sql
   SELECT investor_advisor_domain, investment_advisor_code
   FROM users
   WHERE role = 'Investment Advisor';
   ```

2. Does domain match exactly? (case-insensitive, but spelling must match)

3. Check browser console for errors

### Problem: Multiple advisors with same domain

**Solution:** Only one advisor should have each domain. Check for duplicates:
```sql
SELECT investor_advisor_domain, COUNT(*) as count
FROM users
WHERE role = 'Investment Advisor' 
  AND investor_advisor_domain IS NOT NULL
GROUP BY investor_advisor_domain
HAVING COUNT(*) > 1;
```

## Future Enhancements

- Admin UI to manage domains
- Support for multiple domains per advisor
- Domain validation
- Analytics on which domains generate registrations

