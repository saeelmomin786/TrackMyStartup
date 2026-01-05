# How to Map Domains to Investment Advisor Codes

This guide explains how to find investment advisor codes and map them to domains.

## Quick Start Example: Mapping Sarvesh's Domain

### Step 1: Find Sarvesh's Investment Advisor Code

Run this SQL query in your database:

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

**Result Example:**
```
name    | email              | firm_name | investment_advisor_code | registration_date
--------|--------------------|-----------|-------------------------|-------------------
Sarvesh | sarvesh@email.com | Firm Name | IA-ABC123               | 2024-01-15
```

Copy the `investment_advisor_code` value: `IA-ABC123`

### Step 2: Get the Domain/Subdomain

Ask Sarvesh what domain they're using:
- Subdomain: `sarvesh.trackmystartup.com`
- Custom domain: `sarvesh.com` or `mulsetu.com`

### Step 3: Add to Configuration

Open `config/investorAdvisorDomains.ts` and add:

```typescript
export const INVESTOR_ADVISOR_DOMAIN_MAP: Record<string, string> = {
  // Sarvesh's mapping
  'sarvesh.trackmystartup.com': 'IA-ABC123',  // Subdomain
  'sarvesh.com': 'IA-ABC123',                 // Custom domain (if they have one)
  
  // Add other advisors here
};
```

### Step 4: Test

1. Visit `https://sarvesh.trackmystartup.com` (or their custom domain)
2. Click "Register" or "Get Started"
3. The Investment Advisor Code field should be auto-filled with `IA-ABC123`

## Complete Workflow

### For Each New Investment Advisor:

1. **Find their code in the database:**
   ```sql
   -- Option 1: By name
   SELECT investment_advisor_code 
   FROM users 
   WHERE role = 'Investment Advisor' 
     AND name ILIKE '%AdvisorName%';
   
   -- Option 2: By email
   SELECT investment_advisor_code 
   FROM users 
   WHERE role = 'Investment Advisor' 
     AND email = 'advisor@email.com';
   
   -- Option 3: By firm name
   SELECT investment_advisor_code 
   FROM users 
   WHERE role = 'Investment Advisor' 
     AND firm_name ILIKE '%FirmName%';
   ```

2. **Get their domain information:**
   - What subdomain are they using? (e.g., `advisor.trackmystartup.com`)
   - Do they have a custom domain? (e.g., `advisor.com`)

3. **Add mapping to config:**
   ```typescript
   'advisor.trackmystartup.com': 'IA-XXXXXX',
   'advisor.com': 'IA-XXXXXX',  // If custom domain
   ```

4. **Test the mapping:**
   - Visit their domain
   - Try registering
   - Verify code is auto-filled

## Common Scenarios

### Scenario 1: Advisor with Subdomain Only
```typescript
'sarvesh.trackmystartup.com': 'IA-ABC123',
```

### Scenario 2: Advisor with Custom Domain
```typescript
'mulsetu.com': 'IA-XYZ789',
'www.mulsetu.com': 'IA-XYZ789',  // Optional - www is handled automatically
```

### Scenario 3: Advisor with Both Subdomain and Custom Domain
```typescript
'sarvesh.trackmystartup.com': 'IA-ABC123',
'sarvesh.com': 'IA-ABC123',
```

### Scenario 4: Multiple Advisors, Same Domain Provider
```typescript
'advisor1.trackmystartup.com': 'IA-111111',
'advisor2.trackmystartup.com': 'IA-222222',
'advisor3.trackmystartup.com': 'IA-333333',
```

## Troubleshooting

### Problem: Code not auto-filling

**Check:**
1. Is the domain in the mapping? (check spelling, case doesn't matter)
2. Is the code correct? (verify in database)
3. Is the user coming from the correct domain? (check browser console for logs)

**Debug:**
- Open browser console
- Look for: `✅ Auto-populating Investment Advisor Code: IA-XXXXXX`
- If not found, check: `📋 Investment Advisor Code from query param:` or `🔗 Investment Advisor Code from referrer:`

### Problem: Wrong code being used

**Solution:**
1. Verify the code in database matches the mapping
2. Clear browser cache and try again
3. Check if multiple domains map to different codes (shouldn't happen)

### Problem: Advisor code not found in database

**Solution:**
1. Check if advisor has registered as "Investment Advisor" role
2. Verify the `investment_advisor_code` column has a value
3. If code is NULL, the advisor may need to complete registration first

## SQL Queries Reference

See `FIND_INVESTMENT_ADVISOR_CODES.sql` for all available queries to find advisor codes.

## Notes

- Domain matching is **case-insensitive**
- `www.` prefix is handled automatically
- Subdomains are supported (e.g., `subdomain.domain.com`)
- Multiple domains can map to the same code
- Users can still manually edit the code if needed

