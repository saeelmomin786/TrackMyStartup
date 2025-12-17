# How "Add Profile" Works - Complete Flow

## Overview
The "Add Profile" feature allows users who are already logged in to create additional profiles with different roles using the same email address. For example, a user can have both a "Mentor" profile and a "Startup" profile.

---

## Where "Add Profile" Button Appears

### Location: Header (All Dashboards)
The "Add Profile" button appears in the header for **ALL authenticated users** on **ALL dashboards**:
- ✅ Mentor Dashboard
- ✅ Startup Dashboard  
- ✅ Investor Dashboard
- ✅ Investment Advisor Dashboard
- ✅ Startup Facilitation Center Dashboard
- ✅ Admin Dashboard

**Code Location:** `App.tsx` lines 3525-3532

```tsx
{isAuthenticated && currentUser && (
  <>
    <ProfileSwitcher ... />
    <button onClick={() => setShowAddProfileModal(true)}>
      <UserPlus className="h-4 w-4" />
      <span>Add Profile</span>
    </button>
  </>
)}
```

---

## Complete Flow: Step by Step

### **Step 1: User Clicks "Add Profile" Button**

**What Happens:**
- Button is in the header (visible on all dashboards)
- User clicks the button
- `setShowAddProfileModal(true)` is called
- `AddProfileModal` component opens

**Code:** `App.tsx` line 3526

---

### **Step 2: Add Profile Modal Opens**

**Component:** `components/AddProfileModal.tsx`

**What User Sees:**
- Modal overlay with "Add New Profile" title
- Form 1 (Basic Registration Step)
- Close button (X) in top right

**Modal State:**
- `currentStep`: Starts as `'form1'`
- `form1Data`: Initially `null`

---

### **Step 3: Form 1 - Basic Registration**

**Component:** `components/BasicRegistrationStep.tsx` with `isAddingProfile={true}`

**What's Different When Adding Profile:**
1. ✅ **Email field is HIDDEN** (uses current user's email automatically)
2. ✅ **Password fields are HIDDEN** (not needed - user already authenticated)
3. ✅ **OTP verification is SKIPPED** (user already verified)
4. ✅ **Role selection is SHOWN** (user can choose any role)
5. ✅ **Role-specific fields are SHOWN** (Startup Name, Center Name, Firm Name, etc.)

**Fields User Fills:**
- **Name** (required)
- **Role** (required) - Dropdown: Investor, Startup, Mentor, Investment Advisor, Startup Facilitation Center
- **Startup Name** (if role = Startup)
- **Center Name** (if role = Startup Facilitation Center)
- **Firm Name** (if role = Investment Advisor)
- **Investment Advisor Code** (optional, if role = Investor)

**Code:** `components/BasicRegistrationStep.tsx` lines 148-232

---

### **Step 4: Form 1 Submission**

**What Happens When User Clicks "Continue to Profile Details":**

1. **Validation:**
   - Checks if name is provided
   - Checks role-specific fields (startup name, center name, firm name)
   - Checks if user already has this role (prevents duplicates)

2. **Calls `authService.createProfile()`:**
   ```typescript
   const result = await authService.createProfile({
     name: formData.name,
     role: formData.role,
     startupName: formData.startupName,
     centerName: formData.centerName,
     firmName: formData.firmName,
     investmentAdvisorCode: formData.investmentAdvisorCode
   });
   ```

3. **What `createProfile()` Does:**
   - Gets current authenticated user from `auth.users`
   - Checks if user already has this role (returns error if yes)
   - Generates codes (Investor Code, Investment Advisor Code) if needed
   - **Creates new entry in `user_profiles` table:**
     ```sql
     INSERT INTO user_profiles (
       id,                    -- New UUID
       auth_user_id,          -- Same as current user's auth ID
       email,                 -- Same as current user's email
       name,                  -- From form
       role,                  -- From form
       startup_name,         -- From form (if Startup)
       center_name,          -- From form (if Facilitator)
       firm_name,            -- From form (if Investment Advisor)
       investor_code,        -- Auto-generated (if Investor)
       investment_advisor_code, -- Auto-generated (if Investment Advisor)
       registration_date,    -- Current date
       is_profile_complete   -- FALSE (will be completed in Form 2)
     )
     ```
   - **Automatically switches to the new profile:**
     - Updates `user_profile_sessions` table
     - Sets `current_profile_id` to the new profile's ID

4. **After Success:**
   - Calls `onEmailVerified()` callback
   - Passes form data to modal
   - Modal moves to Step 2 (Form 2)

**Code:** `lib/auth.ts` lines 1049-1118

---

### **Step 5: Form 2 - Complete Registration**

**Component:** `components/CompleteRegistrationPage.tsx`

**What User Sees:**
- Full profile completion form
- All the same fields as normal registration Form 2
- Company details, compliance, documents, etc.

**What's Different:**
- User is already authenticated (no need to sign in)
- Profile already exists in `user_profiles` (created in Form 1)
- Form 2 just **updates** the existing profile

**Code:** `components/AddProfileModal.tsx` lines 103-106

---

### **Step 6: Form 2 Submission**

**What Happens When User Completes Form 2:**

1. **Updates `user_profiles` table:**
   - Updates all Form 2 fields (phone, address, company, documents, etc.)
   - Sets `is_profile_complete = true`

2. **If Role = Startup:**
   - Creates entry in `startups` table
   - Links to `auth_user_id` (NOT profile_id)
   - Creates entries in `founders` table
   - Creates entries in `startup_shares` table

3. **Calls `onProfileCreated()` callback:**
   - Modal closes
   - Page reloads (`window.location.reload()`)
   - User sees their new profile's dashboard

**Code:** `components/AddProfileModal.tsx` lines 36-45

---

## Data Storage Summary

### **Tables Used:**

1. **`user_profiles`** ✅
   - Stores the new profile
   - Same `auth_user_id` as existing profiles
   - Different `id` (profile_id)
   - Different `role`

2. **`user_profile_sessions`** ✅
   - Updated to set new profile as active
   - `current_profile_id` = new profile's ID

3. **`startups`** ✅ (if role = Startup)
   - Created in Form 2
   - Linked to `auth_user_id` (NOT profile_id)

4. **`founders`** ✅ (if role = Startup)
   - Created in Form 2
   - Linked to startup

5. **`startup_shares`** ✅ (if role = Startup)
   - Created in Form 2
   - Linked to startup

---

## Key Differences: Adding Profile vs. New Registration

| Feature | New Registration | Adding Profile |
|---------|-----------------|----------------|
| **Email Field** | ✅ Shown (user enters) | ❌ Hidden (auto-filled) |
| **Password Field** | ✅ Shown (user enters) | ❌ Hidden (not needed) |
| **OTP Verification** | ✅ Required | ❌ Skipped |
| **Auth User Creation** | ✅ Creates new | ❌ Uses existing |
| **Profile Creation** | ✅ Creates first profile | ✅ Creates additional profile |
| **Profile Switching** | ❌ Not needed | ✅ Automatically switches to new profile |

---

## Profile Switching After Creation

**What Happens:**
1. New profile is created
2. `switchProfile()` is called automatically
3. `user_profile_sessions.current_profile_id` is updated
4. User is now viewing the new profile's dashboard
5. Page reloads to show new dashboard

**Code:** `lib/auth.ts` lines 1103-1107

---

## Error Handling

### **Common Errors:**

1. **"You already have a [Role] profile"**
   - **Cause:** User tries to create duplicate role
   - **Solution:** User should switch to existing profile instead

2. **"Not authenticated"**
   - **Cause:** User session expired
   - **Solution:** User needs to log in again

3. **"Failed to create profile"**
   - **Cause:** Database error
   - **Solution:** Check database connection, try again

---

## Testing the Flow

### **Test Scenario 1: Mentor Adds Startup Profile**

1. ✅ Login as Mentor
2. ✅ Click "Add Profile" in header
3. ✅ Fill Form 1: Name = "My Startup", Role = "Startup", Startup Name = "Test Startup"
4. ✅ Click "Continue to Profile Details"
5. ✅ Fill Form 2 with all required fields
6. ✅ Submit Form 2
7. ✅ Page reloads
8. ✅ User sees Startup Dashboard
9. ✅ Profile Switcher shows both "Mentor" and "Startup" profiles

### **Test Scenario 2: Startup Adds Investor Profile**

1. ✅ Login as Startup
2. ✅ Click "Add Profile" in header
3. ✅ Fill Form 1: Name = "John Investor", Role = "Investor"
4. ✅ Click "Continue to Profile Details"
5. ✅ Fill Form 2
6. ✅ Submit Form 2
7. ✅ Page reloads
8. ✅ User sees Investor Dashboard
9. ✅ Can switch between Startup and Investor profiles

---

## Code Files Involved

1. **`App.tsx`** - Button and modal integration
2. **`components/AddProfileModal.tsx`** - Modal wrapper
3. **`components/BasicRegistrationStep.tsx`** - Form 1 (with `isAddingProfile` prop)
4. **`components/CompleteRegistrationPage.tsx`** - Form 2
5. **`lib/auth.ts`** - `createProfile()` function
6. **`lib/auth.ts`** - `switchProfile()` function
7. **`components/ProfileSwitcher.tsx`** - Shows all profiles

---

## Database Schema

### **user_profiles Table:**
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,              -- Profile ID (unique per profile)
  auth_user_id UUID NOT NULL,       -- Links to auth.users.id (same for all profiles)
  email TEXT NOT NULL,              -- Same email for all profiles
  name TEXT NOT NULL,               -- Profile-specific name
  role TEXT NOT NULL,               -- Profile-specific role
  startup_name TEXT,                -- If role = Startup
  center_name TEXT,                 -- If role = Startup Facilitation Center
  firm_name TEXT,                   -- If role = Investment Advisor
  is_profile_complete BOOLEAN,    -- Completion status
  ...
);
```

### **user_profile_sessions Table:**
```sql
CREATE TABLE user_profile_sessions (
  auth_user_id UUID PRIMARY KEY,    -- Links to auth.users.id
  current_profile_id UUID NOT NULL,  -- Currently active profile ID
  updated_at TIMESTAMP
);
```

---

## Summary

✅ **"Add Profile" works the same way on ALL dashboards**
✅ **Button is always visible in header when authenticated**
✅ **Uses same email, creates new profile with different role**
✅ **Automatically switches to new profile after creation**
✅ **User can switch between profiles anytime using ProfileSwitcher**

The feature is **fully functional** and **works identically** across all dashboard types!

