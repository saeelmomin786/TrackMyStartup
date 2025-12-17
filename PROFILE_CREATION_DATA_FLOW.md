# Profile Creation Data Flow - Where Data is Stored

## Overview
When you click "Add Profile" from the dashboard and create a new profile, here's exactly where each piece of data is stored:

---

## **Step 1: Form 1 (BasicRegistrationStep)**

### What Happens:
- User fills out: Name, Role, Startup Name (if Startup), Center Name (if Facilitator), Firm Name (if Investment Advisor)
- Clicks "Continue"

### Where Data is Stored:

#### **Table: `user_profiles`** ✅
**Location:** `lib/auth.ts` → `createProfile()` function

**Data Stored:**
```sql
INSERT INTO user_profiles (
  id,                          -- Auto-generated UUID
  auth_user_id,                -- From auth.users (your email account)
  email,                       -- From auth.users.email
  name,                        -- From Form 1
  role,                        -- From Form 1 (Startup, Mentor, Investor, etc.)
  startup_name,                -- From Form 1 (if role = Startup)
  center_name,                 -- From Form 1 (if role = Startup Facilitation Center)
  firm_name,                   -- From Form 1 (if role = Investment Advisor)
  investor_code,               -- Auto-generated (if role = Investor)
  investment_advisor_code,    -- Auto-generated (if role = Investment Advisor)
  investment_advisor_code_entered, -- From Form 1 (if entered)
  registration_date,           -- Current date
  created_at,                  -- Current timestamp
  updated_at                   -- Current timestamp
)
```

#### **Table: `user_profile_sessions`** ✅
**Location:** `lib/auth.ts` → `switchProfile()` function (called automatically)

**Data Stored:**
```sql
INSERT INTO user_profile_sessions (
  auth_user_id,                -- From auth.users
  current_profile_id,          -- The new profile's ID
  updated_at                   -- Current timestamp
)
ON CONFLICT (auth_user_id) 
UPDATE SET current_profile_id = new_profile_id
```

**Purpose:** Tracks which profile is currently active for your account

---

## **Step 2: Form 2 (CompleteRegistrationPage)**

### What Happens:
- User uploads documents (Government ID, CA License, etc.)
- Fills out profile details (address, phone, founders, etc.)
- Clicks "Complete Registration"

### Where Data is Stored:

#### **Table: `user_profiles`** (UPDATE) ✅
**Location:** `components/CompleteRegistrationPage.tsx` → `handleSubmit()`

**Data Updated:**
```sql
UPDATE user_profiles SET
  government_id = 'url_to_uploaded_file',
  ca_license = 'url_to_uploaded_file',
  cs_license = 'url_to_uploaded_file',  -- If applicable
  verification_documents = ARRAY['url1', 'url2', ...],
  logo_url = 'url_to_logo',              -- If Investment Advisor
  financial_advisor_license_url = 'url',  -- If Investment Advisor
  center_name = 'name',                   -- If Facilitator (if not set in Form 1)
  phone = 'phone_number',
  address = 'address',
  city = 'city',
  state = 'state',
  country = 'country',
  company = 'company_name',
  company_type = 'company_type',
  is_profile_complete = true,             -- Marked as complete
  updated_at = NOW()
WHERE id = profile_id
```

**Note:** Documents are first uploaded to **Supabase Storage**, then URLs are stored in the database.

---

### **If Role = Startup:**

#### **Table: `startups`** ✅
**Location:** `components/CompleteRegistrationPage.tsx` → `handleSubmit()`

**Data Stored:**
```sql
INSERT INTO startups (
  id,                          -- Auto-generated
  name,                        -- From Form 1 (startup_name)
  user_id,                     -- ⚠️ IMPORTANT: Uses auth_user_id (from auth.users), NOT profile ID!
  investment_type,             -- Default: 'Seed'
  investment_value,            -- Default: 0
  equity_allocation,           -- Default: 0
  current_valuation,          -- Calculated from shares
  compliance_status,           -- Default: 'Pending'
  sector,                      -- Default: 'Technology'
  total_funding,               -- Default: 0
  total_revenue,               -- Default: 0
  registration_date,           -- From Form 2
  created_at,                  -- Current timestamp
  updated_at                   -- Current timestamp
)
```

**⚠️ CRITICAL:** The `startups` table uses `user_id = auth_user_id` (from `auth.users`), NOT the profile ID from `user_profiles`!

#### **Table: `founders`** ✅
**Location:** `components/CompleteRegistrationPage.tsx` → `handleSubmit()`

**Data Stored:**
```sql
INSERT INTO founders (
  id,                          -- Auto-generated
  startup_id,                  -- From startups table
  name,                        -- From Form 2
  email,                       -- From Form 2
  phone,                       -- From Form 2
  role,                        -- From Form 2
  equity_percentage,           -- From Form 2
  created_at,                  -- Current timestamp
  updated_at                   -- Current timestamp
)
```

#### **Table: `startup_shares`** ✅
**Location:** `components/CompleteRegistrationPage.tsx` → `handleSubmit()`

**Data Stored:**
```sql
INSERT INTO startup_shares (
  id,                          -- Auto-generated
  startup_id,                  -- From startups table
  total_shares,                -- From Form 2
  price_per_share,             -- From Form 2
  created_at,                  -- Current timestamp
  updated_at                   -- Current timestamp
)
```

---

### **If Role = Investment Advisor:**

#### **Table: `investment_advisor_profiles`** ✅
**Location:** `components/CompleteRegistrationPage.tsx` → `handleSubmit()`

**Data Stored:**
```sql
INSERT INTO investment_advisor_profiles (
  id,                          -- Auto-generated
  user_id,                     -- ⚠️ Uses profile ID from user_profiles
  advisor_name,                -- From Form 2
  firm_name,                   -- From Form 1 or Form 2
  logo_url,                    -- From Form 2
  -- ... other advisor-specific fields
  created_at,                  -- Current timestamp
  updated_at                   -- Current timestamp
)
```

---

## **Summary Table**

| Data Type | Table Name | Key Field | Notes |
|-----------|-----------|-----------|-------|
| **Profile Basic Info** | `user_profiles` | `id` (profile UUID) | One row per profile |
| **Active Profile Tracking** | `user_profile_sessions` | `auth_user_id` | One row per auth user |
| **Startup Data** | `startups` | `user_id` = **auth_user_id** | ⚠️ Uses auth_user_id, not profile ID |
| **Founders** | `founders` | `startup_id` | Linked to startup |
| **Startup Shares** | `startup_shares` | `startup_id` | Linked to startup |
| **Investment Advisor Profile** | `investment_advisor_profiles` | `user_id` = **profile ID** | Uses profile ID |
| **Documents** | **Supabase Storage** | File URLs stored in `user_profiles` | Not in database tables |

---

## **Important Notes:**

### 1. **Two Different User IDs:**
- **`auth_user_id`**: Your email account ID (from `auth.users`) - **ONE per email**
- **`profile_id`**: Each profile's unique ID (from `user_profiles`) - **MULTIPLE per email**

### 2. **Which ID to Use:**
- **`user_profiles`**: Uses `auth_user_id` to link profiles to your account
- **`startups`**: Uses `auth_user_id` (NOT profile ID!) - This is why you need to get it from `auth.users`
- **`investment_advisor_profiles`**: Uses `profile_id` (from `user_profiles`)

### 3. **Profile Switching:**
- When you switch profiles, only `user_profile_sessions.current_profile_id` is updated
- All other data remains unchanged
- The app queries based on the active profile ID

### 4. **Backward Compatibility:**
- Old users (from `users` table) still work
- New profiles go to `user_profiles` table
- The code checks both tables automatically

---

## **Visual Flow:**

```
Dashboard → "Add Profile" Button
    ↓
Form 1 (BasicRegistrationStep)
    ↓
    ├─→ user_profiles (INSERT) - Basic profile info
    └─→ user_profile_sessions (UPDATE) - Set as active
    ↓
Form 2 (CompleteRegistrationPage)
    ↓
    ├─→ Supabase Storage - Upload documents
    ├─→ user_profiles (UPDATE) - Documents URLs, complete flag
    ├─→ startups (INSERT) - If role = Startup ⚠️ Uses auth_user_id
    ├─→ founders (INSERT) - If role = Startup
    ├─→ startup_shares (INSERT) - If role = Startup
    └─→ investment_advisor_profiles (INSERT) - If role = Investment Advisor
```

---

## **How to Verify Data:**

### Check Profile:
```sql
SELECT * FROM user_profiles 
WHERE auth_user_id = 'your-auth-user-id';
```

### Check Active Profile:
```sql
SELECT * FROM user_profile_sessions 
WHERE auth_user_id = 'your-auth-user-id';
```

### Check Startup (if Startup role):
```sql
SELECT * FROM startups 
WHERE user_id = 'your-auth-user-id';  -- ⚠️ Uses auth_user_id!
```

### Check All Your Profiles:
```sql
SELECT p.*, s.current_profile_id 
FROM user_profiles p
LEFT JOIN user_profile_sessions s ON s.auth_user_id = p.auth_user_id
WHERE p.auth_user_id = 'your-auth-user-id';
```

