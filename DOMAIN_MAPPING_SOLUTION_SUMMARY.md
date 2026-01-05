# Domain-to-Investment-Advisor-Code Mapping - Complete Solution

## ✅ Database-Driven Approach (Recommended)

We've implemented a **database-driven solution** that stores the domain directly in the database for each investment advisor. This is much better than a static config file.

## Why Database Approach is Better

| Feature | Config File | Database |
|---------|-------------|----------|
| **Add New Advisor** | Edit code + Deploy | Update database |
| **Scalability** | Limited | Unlimited |
| **Management** | Code changes | Admin panel/DB |
| **Single Source of Truth** | No (code + DB) | Yes (DB only) |
| **Dynamic Updates** | No | Yes |

## Implementation Summary

### 1. Database Schema

**Column Added:**
- `users.investor_advisor_domain` - Stores domain for each advisor
- `user_profiles.investor_advisor_domain` - For multi-profile system

**SQL Script:** `ADD_INVESTOR_ADVISOR_DOMAIN_COLUMN.sql`

### 2. Code Changes

**Files Modified:**
- `lib/investorAdvisorUtils.ts` - Queries database instead of config file
- `components/RegistrationPage.tsx` - Auto-populates code (async)
- `components/BasicRegistrationStep.tsx` - Auto-populates code (async)

**How It Works:**
1. User visits advisor's domain (e.g., `sarvesh.trackmystartup.com`)
2. System queries database: `SELECT investment_advisor_code FROM users WHERE investor_advisor_domain = 'sarvesh.trackmystartup.com'`
3. Returns code (e.g., `IA-ABC123`)
4. Auto-fills registration form

### 3. Setup Process

**Step 1: Run SQL Migration**
```sql
-- Run: ADD_INVESTOR_ADVISOR_DOMAIN_COLUMN.sql
ALTER TABLE users ADD COLUMN investor_advisor_domain TEXT;
```

**Step 2: Set Domain for Each Advisor**
```sql
UPDATE users
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE role = 'Investment Advisor' 
  AND name ILIKE '%Sarvesh%';
```

**Step 3: Test**
- Visit `sarvesh.trackmystartup.com`
- Click "Register"
- Verify code auto-fills

## Quick Start: Adding Sarvesh's Domain

```sql
-- 1. Find Sarvesh's advisor code
SELECT name, email, investment_advisor_code
FROM users
WHERE role = 'Investment Advisor' 
  AND name ILIKE '%Sarvesh%';

-- 2. Set domain (replace with actual values)
UPDATE users
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE investment_advisor_code = 'IA-ABC123';

-- 3. Verify
SELECT name, investment_advisor_code, investor_advisor_domain
FROM users
WHERE investment_advisor_code = 'IA-ABC123';
```

## Features

✅ **Automatic Detection** - Detects domain from:
- URL query parameter (`?advisorCode=IA-XXXXXX`)
- Referrer domain (`document.referrer`)
- Current domain (`window.location.hostname`)

✅ **Smart Matching** - Handles:
- Exact match: `sarvesh.trackmystartup.com`
- Base domain: `www.sarvesh.trackmystartup.com` → `sarvesh.trackmystartup.com`
- Protocol removal: `https://sarvesh.trackmystartup.com` → `sarvesh.trackmystartup.com`
- Case-insensitive matching

✅ **Multi-Table Support** - Checks both:
- `user_profiles` table (new multi-profile system)
- `users` table (legacy system)

## Documentation Files

1. **`ADD_INVESTOR_ADVISOR_DOMAIN_COLUMN.sql`** - Database migration script
2. **`DATABASE_DRIVEN_DOMAIN_MAPPING.md`** - Complete guide
3. **`DOMAIN_MAPPING_SOLUTION_SUMMARY.md`** - This file (overview)

## Migration from Config File

If you were using the old approach:

**Old (config/investorAdvisorDomains.ts):**
```typescript
export const INVESTOR_ADVISOR_DOMAIN_MAP = {
  'sarvesh.trackmystartup.com': 'IA-ABC123',
};
```

**New (Database):**
```sql
UPDATE users
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE investment_advisor_code = 'IA-ABC123';
```

The config file is now **optional** - database takes priority.

## Benefits for Your Team

1. **No Code Deployment** - Add new advisors without touching code
2. **Easy Management** - Update through database/admin panel
3. **Scalable** - Handle unlimited advisors
4. **Maintainable** - Single source of truth in database
5. **Future-Proof** - Can add admin UI later

## Next Steps

1. ✅ Run `ADD_INVESTOR_ADVISOR_DOMAIN_COLUMN.sql`
2. ✅ Set domains for existing advisors
3. ✅ Test registration flow
4. ✅ (Optional) Build admin UI to manage domains

---

**This approach is much better than the config file!** 🎉

