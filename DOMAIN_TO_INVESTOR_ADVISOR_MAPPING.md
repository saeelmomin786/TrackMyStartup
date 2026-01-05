# Domain to Investment Advisor Code Mapping

This feature automatically sets the investment advisor code for users who register from specific investor advisor domains.

## How It Works

When a user visits the registration page from an investor advisor's domain (e.g., `mulsetu.com`), the system:

1. **Detects the referrer domain** - Checks where the user came from
2. **Looks up the advisor code** - Matches the domain to an investment advisor code
3. **Auto-populates the field** - Automatically fills in the Investment Advisor Code field
4. **Saves with registration** - The code is saved when the user completes registration

## Configuration

### Step 1: Find the Investment Advisor Code

First, you need to find the investment advisor code from your database. Use the SQL query file `FIND_INVESTMENT_ADVISOR_CODES.sql`:

**Example: Finding Sarvesh's advisor code**

```sql
SELECT 
    name,
    email,
    firm_name,
    investment_advisor_code as 'ADVISOR_CODE_FOR_DOMAIN_MAPPING',
    registration_date
FROM users
WHERE role = 'Investment Advisor'
  AND (name ILIKE '%Sarvesh%' OR email ILIKE '%sarvesh%')
ORDER BY registration_date DESC;
```

This will return the `investment_advisor_code` (e.g., `IA-ABC123`) that you need for the mapping.

### Step 2: Add Domain Mapping

Once you have the advisor code, edit `config/investorAdvisorDomains.ts`:

```typescript
export const INVESTOR_ADVISOR_DOMAIN_MAP: Record<string, string> = {
  // Example: Sarvesh's domain mapping
  'sarvesh.trackmystartup.com': 'IA-ABC123',  // Subdomain
  'sarvesh.com': 'IA-ABC123',                 // Custom domain (if they have one)
  
  // Example: Mulsetu advisor
  'mulsetu.com': 'IA-XYZ789',
  
  // Add more mappings here
};
```

**Important Notes:**
- Use the exact `investment_advisor_code` from the database
- You can map multiple domains to the same code (e.g., subdomain and custom domain)
- Domain matching is case-insensitive and handles `www.` prefixes automatically

### Domain Matching Rules

- The system automatically handles:
  - `www.` prefixes (e.g., `www.mulsetu.com` → `mulsetu.com`)
  - Protocol removal (e.g., `https://mulsetu.com` → `mulsetu.com`)
  - Subdomain matching (e.g., `subdomain.mulsetu.com` → `mulsetu.com`)
  - Case-insensitive matching

## Detection Priority

The system checks for investment advisor codes in this order:

1. **URL Query Parameter** - `?advisorCode=IA-XXXXXX` (highest priority)
2. **Referrer Domain** - Domain from `document.referrer`
3. **Current Domain** - Current `window.location.hostname`

## Implementation Details

### Files Modified

1. **`config/investorAdvisorDomains.ts`** - Domain to code mapping configuration
2. **`lib/investorAdvisorUtils.ts`** - Utility functions for domain detection
3. **`components/RegistrationPage.tsx`** - Auto-populates code on mount
4. **`components/BasicRegistrationStep.tsx`** - Auto-populates code on mount

### How to Add New Mappings

**Complete Workflow:**

1. **Find the Advisor Code:**
   - Open `FIND_INVESTMENT_ADVISOR_CODES.sql`
   - Run the query to find the advisor by name, email, or firm name
   - Copy the `investment_advisor_code` value (e.g., `IA-ABC123`)

2. **Get the Domain:**
   - Ask the advisor what domain/subdomain they're using
   - Examples:
     - Subdomain: `sarvesh.trackmystartup.com`
     - Custom domain: `sarvesh.com` or `mulsetu.com`

3. **Add the Mapping:**
   - Open `config/investorAdvisorDomains.ts`
   - Add the mapping:
     ```typescript
     'sarvesh.trackmystartup.com': 'IA-ABC123',
     'sarvesh.com': 'IA-ABC123',  // If they have custom domain too
     ```
   - Save the file

4. **Test:**
   - Visit the advisor's domain
   - Click "Register" or "Get Started"
   - Check that the Investment Advisor Code field is auto-filled

**Example for Sarvesh:**
```typescript
// Step 1: Query database
SELECT investment_advisor_code FROM users 
WHERE role = 'Investment Advisor' AND name ILIKE '%Sarvesh%';
// Result: IA-ABC123

// Step 2: Add to config
'sarvesh.trackmystartup.com': 'IA-ABC123',
```

## Testing

To test the feature:

1. **From an investor advisor domain:**
   - Visit `https://mulsetu.com` (or your test domain)
   - Click the "Register" or "Get Started" button
   - Navigate to the registration page
   - The Investment Advisor Code field should be pre-filled

2. **Using URL parameter:**
   - Visit: `/?page=register&advisorCode=IA-XXXXXX`
   - The code should be auto-populated

3. **Manual entry:**
   - Users can still manually enter or modify the code if needed
   - The auto-populated code won't override if the field already has a value

## Notes

- The code is only auto-populated if the field is empty
- Users can still manually edit the code if needed
- The feature works for both `Investor` and `Startup` roles
- The code is saved to the `investment_advisor_code_entered` field in the database

