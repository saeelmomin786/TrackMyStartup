# Subsidiaries Display Issue - Fixed

## Problem Summary
Subsidiaries were being saved during registration (Form 2) but were not displaying in the Profile section of the Startup Dashboard.

## Root Cause
**Column Name Mismatch:**
- In `CompleteRegistrationPage.tsx` (Form 2), subsidiaries were being saved with columns `ca_code` and `cs_code`
- In `profileService.ts` (Profile data retrieval), the code was reading columns `ca_service_code` and `cs_service_code`
- This mismatch caused subsidiary CA/CS codes to not be retrieved properly

## Files Changed

### 1. `components/CompleteRegistrationPage.tsx` (Lines 1606-1624)
**Before:**
```typescript
const subsidiariesData = subsidiaries
  .filter(s => s.country && s.companyType && s.registrationDate)
  .map(subsidiary => ({
    startup_id: startup.id,
    country: subsidiary.country,
    company_type: subsidiary.companyType,
    registration_date: subsidiary.registrationDate,
    ca_code: subsidiary.caCode || null,        // ❌ Wrong column name
    cs_code: subsidiary.csCode || null         // ❌ Wrong column name
  }));
```

**After:**
```typescript
const subsidiariesData = subsidiaries
  .filter(s => s.country && s.companyType && s.registrationDate)
  .map(subsidiary => ({
    startup_id: startup.id,
    country: subsidiary.country,
    company_type: subsidiary.companyType,
    registration_date: subsidiary.registrationDate,
    ca_service_code: subsidiary.caCode || null,  // ✅ Correct column name
    cs_service_code: subsidiary.csCode || null   // ✅ Correct column name
  }));
```

## Database Verification

### Run this SQL to check if your database has the correct columns:
```sql
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'subsidiaries'
AND column_name IN ('ca_service_code', 'cs_service_code', 'ca_code', 'cs_code')
ORDER BY column_name;
```

### If your table has `ca_code` and `cs_code` columns instead, run:
See `FIX_SUBSIDIARIES_COLUMN_NAMES.sql` for the migration script.

## How It Works Now

### 1. **Registration (Form 2)**
When a user completes registration Form 2:
- User enters subsidiary information (country, company type, registration date, CA code, CS code)
- Data is saved to `subsidiaries` table with columns:
  - `startup_id`
  - `country`
  - `company_type`
  - `registration_date`
  - `ca_service_code` ✅
  - `cs_service_code` ✅

### 2. **Profile Display**
When viewing the Profile tab in Startup Dashboard:
- `profileService.getStartupProfile()` fetches subsidiaries from the database
- Reads columns `ca_service_code` and `cs_service_code` ✅
- Maps them to `caCode` and `csCode` in the UI
- Displays subsidiaries with all information including service provider codes

## Testing Checklist

- [ ] Complete registration Form 2 with subsidiaries
- [ ] Navigate to Startup Dashboard → Profile tab
- [ ] Verify subsidiaries are displayed
- [ ] Verify subsidiary count dropdown shows correct number
- [ ] Verify country, company type, and registration date are displayed
- [ ] Verify CA and CS codes are displayed (if entered)
- [ ] Edit subsidiaries and save changes
- [ ] Verify changes persist after page reload

## Related Files
- `components/CompleteRegistrationPage.tsx` - Form 2 submission
- `lib/profileService.ts` - Profile data retrieval and updates
- `components/startup-health/ProfileTab.tsx` - Profile UI
- `FIX_SUBSIDIARIES_COLUMN_NAMES.sql` - Database verification script

## Future Improvements
1. Add data validation on Form 2 to ensure CA/CS codes exist before saving
2. Add real-time validation as users type CA/CS codes
3. Show service provider names alongside codes in the profile
4. Add ability to remove service providers from subsidiaries
