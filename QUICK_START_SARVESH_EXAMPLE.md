# Quick Start: Mapping Sarvesh's Domain

## Step-by-Step Example

### Step 1: Find Sarvesh's Investment Advisor Code

Run this in your database (Supabase SQL Editor or pgAdmin):

```sql
SELECT 
    name,
    email,
    firm_name,
    investment_advisor_code,
    registration_date
FROM users
WHERE role = 'Investment Advisor'
  AND (name ILIKE '%Sarvesh%' OR email ILIKE '%sarvesh%')
ORDER BY registration_date DESC;
```

**Expected Result:**
```
name    | email                | firm_name | investment_advisor_code | registration_date
--------|----------------------|-----------|-------------------------|-------------------
Sarvesh | sarvesh@example.com | Firm XYZ  | IA-ABC123              | 2024-01-15
```

**Copy this code:** `IA-ABC123` (or whatever code is shown)

### Step 2: Get Sarvesh's Domain

Ask Sarvesh or check your hosting:
- **Subdomain:** `sarvesh.trackmystartup.com` (or similar)
- **Custom domain:** `sarvesh.com` (if they have one)

### Step 3: Add to Configuration File

Open: `config/investorAdvisorDomains.ts`

Add this line (replace `IA-ABC123` with the actual code from Step 1):

```typescript
export const INVESTOR_ADVISOR_DOMAIN_MAP: Record<string, string> = {
  // Sarvesh's domain mapping
  'sarvesh.trackmystartup.com': 'IA-ABC123',  // ⬅️ Add this line
  
  // If Sarvesh also has a custom domain:
  // 'sarvesh.com': 'IA-ABC123',
  
  // Other advisors...
  'mulsetu.com': 'INVESTOR123',
};
```

### Step 4: Test It

1. Visit `https://sarvesh.trackmystartup.com` (or their domain)
2. Click "Register" or "Get Started" button
3. On the registration page, check the **Investment Advisor Code** field
4. It should be **automatically filled** with `IA-ABC123`

### Step 5: Verify in Browser Console

Open browser Developer Tools (F12) → Console tab

You should see:
```
✅ Auto-populating Investment Advisor Code: IA-ABC123
```

## Complete Example

**Before:**
```typescript
// config/investorAdvisorDomains.ts
export const INVESTOR_ADVISOR_DOMAIN_MAP: Record<string, string> = {
  'mulsetu.com': 'INVESTOR123',
};
```

**After adding Sarvesh:**
```typescript
// config/investorAdvisorDomains.ts
export const INVESTOR_ADVISOR_DOMAIN_MAP: Record<string, string> = {
  'mulsetu.com': 'INVESTOR123',
  'sarvesh.trackmystartup.com': 'IA-ABC123',  // ✅ Added
};
```

## Troubleshooting

**Problem:** Code not showing up

1. **Check the code exists:**
   ```sql
   SELECT investment_advisor_code 
   FROM users 
   WHERE role = 'Investment Advisor' 
     AND name ILIKE '%Sarvesh%';
   ```

2. **Check domain spelling:**
   - Make sure it matches exactly (case doesn't matter)
   - No `https://` or trailing `/`

3. **Check browser console:**
   - Look for error messages
   - Check if domain is being detected

**Problem:** Wrong code showing

- Verify the code in database matches what you put in config
- Clear browser cache
- Check if there are multiple mappings for the same domain

## Next Steps

Repeat this process for each investment advisor who has their own domain/subdomain.

For more details, see:
- `HOW_TO_MAP_DOMAINS_TO_ADVISOR_CODES.md` - Complete guide
- `FIND_INVESTMENT_ADVISOR_CODES.sql` - All SQL queries

