# Multi-Profile Creation Flow

## Overview
This document explains the complete flow for creating additional profiles after a user already has an account.

## Flow 1: First Profile (During Signup)
This is the normal signup flow - user creates their first profile.

### Steps:
1. User goes to Signup page
2. User enters: Email, Password, Name, Role (e.g., "Mentor")
3. User fills role-specific fields (if any)
4. User submits form
5. **Backend creates:**
   - Auth account (if email doesn't exist) OR uses existing auth account
   - First profile in `user_profiles` table
   - Session in `user_profile_sessions` (sets this profile as active)
6. User is logged in with their first profile active

---

## Flow 2: Adding Additional Profile (After Login)
This is the NEW flow - user already has an account and wants to add another profile.

### Step-by-Step Flow:

#### Step 1: User is Logged In
- User is already authenticated
- User has at least one profile (their first one)
- Current profile is active (e.g., "Mentor" profile)

#### Step 2: User Clicks "Add Profile" Button
**Location**: Can be in:
- Header/Dashboard
- Profile settings page
- Profile switcher dropdown

**UI Example:**
```
┌─────────────────────────────┐
│  Profile: Mentor (Active)   │
│  [Switch Profile ▼]         │
│  [Add New Profile]          │ ← User clicks here
└─────────────────────────────┘
```

#### Step 3: "Add Profile" Modal Opens
**Component**: `AddProfileModal.tsx`

**UI Shows:**
```
┌─────────────────────────────────────┐
│  Add New Profile                    │
├─────────────────────────────────────┤
│  Select Role:                       │
│  [Dropdown: Investor ▼]             │
│                                     │
│  Name:                              │
│  [________________]                 │
│                                     │
│  (Role-specific fields appear)      │
│  Startup Name: [if Startup]         │
│  Firm Name: [if Investment Advisor] │
│                                     │
│  [Cancel]  [Create Profile]         │
└─────────────────────────────────────┘
```

#### Step 4: User Fills Form
- **Selects Role**: e.g., "Startup"
- **Enters Name**: e.g., "John's Startup"
- **Fills Role-Specific Fields**:
  - If Startup → Startup Name required
  - If Investment Advisor → Firm Name required
  - If Startup Facilitation Center → Center Name required
  - etc.

#### Step 5: User Clicks "Create Profile"
**What Happens Behind the Scenes:**

```typescript
// 1. Check if user already has this role
const existingProfile = await checkExistingProfile(authUserId, selectedRole);
if (existingProfile) {
  // Show error: "You already have a [Role] profile"
  return;
}

// 2. Generate role-specific codes
let investorCode = null;
let investmentAdvisorCode = null;
if (role === 'Investor') {
  investorCode = generateInvestorCode();
}
if (role === 'Investment Advisor') {
  investmentAdvisorCode = generateInvestmentAdvisorCode();
}

// 3. Create new profile in database
const newProfile = await supabase
  .from('user_profiles')
  .insert({
    auth_user_id: currentAuthUserId, // Same auth user!
    email: currentUserEmail,         // Same email!
    name: formData.name,
    role: selectedRole,
    startup_name: role === 'Startup' ? formData.startupName : null,
    firm_name: role === 'Investment Advisor' ? formData.firmName : null,
    center_name: role === 'Startup Facilitation Center' ? formData.centerName : null,
    investor_code: investorCode,
    investment_advisor_code: investmentAdvisorCode,
    registration_date: new Date().toISOString().split('T')[0]
  })
  .select()
  .single();

// 4. Set new profile as active
await supabase
  .rpc('switch_profile', {
    auth_user_uuid: currentAuthUserId,
    profile_uuid: newProfile.id
  });

// 5. Return success
return { success: true, profile: newProfile };
```

#### Step 6: Profile Created Successfully
**What Happens:**
1. ✅ New profile saved to `user_profiles` table
2. ✅ New profile set as active in `user_profile_sessions`
3. ✅ Modal closes
4. ✅ App refreshes/reloads data
5. ✅ User sees new profile as active

**UI Updates:**
```
┌─────────────────────────────┐
│  Profile: Startup (Active)   │ ← New profile is now active
│  [Switch Profile ▼]         │
│    • Startup (Active)        │
│    • Mentor                  │
│  [Add New Profile]           │
└─────────────────────────────┘
```

---

## Complete User Journey Example

### Scenario: User wants to be both Mentor and Startup

#### Day 1: User Signs Up as Mentor
1. User goes to signup page
2. Enters: Email: `john@example.com`, Role: `Mentor`
3. Creates account
4. **Database:**
   - `auth.users`: 1 record (john@example.com)
   - `user_profiles`: 1 record (Mentor profile)
   - `user_profile_sessions`: 1 record (Mentor is active)

#### Day 2: User Wants to Add Startup Profile
1. User logs in (Mentor profile is active)
2. User goes to dashboard/settings
3. User clicks "Add New Profile"
4. Modal opens:
   - Selects Role: "Startup"
   - Enters Name: "John's Tech Startup"
   - Enters Startup Name: "TechStart Inc"
5. Clicks "Create Profile"
6. **Database:**
   - `auth.users`: Still 1 record (same email)
   - `user_profiles`: Now 2 records
     - Profile 1: Mentor (john@example.com)
     - Profile 2: Startup (john@example.com) ← NEW
   - `user_profile_sessions`: Updated (Startup is now active)
7. User is now viewing Startup profile
8. All data shown is for Startup profile

#### Day 3: User Switches Back to Mentor
1. User clicks "Switch Profile" dropdown
2. Sees list:
   - Startup (currently active)
   - Mentor
3. Clicks "Mentor"
4. **Database:**
   - `user_profile_sessions`: Updated (Mentor is now active)
5. App reloads, shows Mentor data

---

## UI/UX Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER IS LOGGED IN                    │
│              (Has at least 1 profile active)            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              DASHBOARD / HEADER / SETTINGS               │
│                                                          │
│  ┌──────────────────────────────────────┐              │
│  │ Profile: [Current Role] (Active)     │              │
│  │ [Switch Profile ▼] [Add New Profile] │ ← Click here │
│  └──────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              ADD PROFILE MODAL OPENS                     │
│                                                          │
│  Select Role: [Dropdown ▼]                               │
│  Name: [Input field]                                     │
│  (Role-specific fields appear dynamically)              │
│                                                          │
│  [Cancel]  [Create Profile] ← Click to create           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND PROCESSING                         │
│                                                          │
│  1. Check if role already exists ❌                     │
│  2. Generate codes (if needed)                          │
│  3. Insert into user_profiles table                     │
│  4. Set as active in user_profile_sessions              │
│  5. Return success ✅                                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              SUCCESS - PROFILE CREATED                   │
│                                                          │
│  ✅ New profile created                                 │
│  ✅ Profile set as active                               │
│  ✅ Modal closes                                        │
│  ✅ App reloads with new profile                        │
│                                                          │
│  Profile Switcher now shows:                            │
│  • New Profile (Active)                                 │
│  • Previous Profile                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Code Flow (Detailed)

### Frontend: AddProfileModal Component

```typescript
// User fills form and clicks "Create Profile"
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. Validate form
  if (!name || !role) {
    setError('Please fill all required fields');
    return;
  }
  
  // 2. Show loading state
  setIsSubmitting(true);
  
  // 3. Call backend
  const result = await authService.createProfile({
    name: name,
    role: role,
    startupName: role === 'Startup' ? startupName : undefined,
    firmName: role === 'Investment Advisor' ? firmName : undefined,
    // ... other fields
  });
  
  // 4. Handle result
  if (result.error) {
    setError(result.error);
    setIsSubmitting(false);
  } else {
    // Success!
    onProfileCreated(); // Callback to parent
    onClose(); // Close modal
    // Parent component will reload data
  }
};
```

### Backend: authService.createProfile()

```typescript
async createProfile(profileData: {
  name: string;
  role: UserRole;
  startupName?: string;
  // ... other fields
}): Promise<{ profile: UserProfile | null; error: string | null }> {
  
  // 1. Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { profile: null, error: 'Not authenticated' };
  }
  
  // 2. Check if user already has this role
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('role', profileData.role)
    .maybeSingle();
  
  if (existing) {
    return { 
      profile: null, 
      error: `You already have a ${profileData.role} profile. Please switch to it instead.` 
    };
  }
  
  // 3. Generate codes based on role
  const investorCode = profileData.role === 'Investor' 
    ? generateInvestorCode() 
    : null;
  const investmentAdvisorCode = profileData.role === 'Investment Advisor' 
    ? generateInvestmentAdvisorCode() 
    : null;
  
  // 4. Create new profile
  const { data: newProfile, error } = await supabase
    .from('user_profiles')
    .insert({
      auth_user_id: user.id, // Same auth user!
      email: user.email || '', // Same email!
      name: profileData.name,
      role: profileData.role,
      startup_name: profileData.role === 'Startup' ? profileData.startupName : null,
      center_name: profileData.role === 'Startup Facilitation Center' ? profileData.centerName : null,
      firm_name: profileData.role === 'Investment Advisor' ? profileData.firmName : null,
      investor_code: investorCode,
      investment_advisor_code: investmentAdvisorCode,
      registration_date: new Date().toISOString().split('T')[0],
      is_profile_complete: false // Will be completed later
    })
    .select()
    .single();
  
  if (error) {
    return { profile: null, error: error.message };
  }
  
  // 5. Set new profile as active
  const switchResult = await this.switchProfile(newProfile.id);
  if (!switchResult.success) {
    // Profile created but failed to switch - still return success
    console.warn('Profile created but failed to set as active:', switchResult.error);
  }
  
  return { profile: newProfile, error: null };
}
```

---

## Key Points

### ✅ What Stays the Same
- **Email**: Same email for all profiles
- **Password**: Same password (auth account)
- **Authentication**: Same login process
- **All other flows**: Everything else works the same

### 🆕 What's New
- **Multiple profiles**: One user can have multiple roles
- **Profile switching**: Easy switch between profiles
- **Separate data**: Each profile has its own data
- **Add profile button**: New UI element to create profiles

### 🔒 Security
- User can only create profiles for themselves
- User can only switch to their own profiles
- RLS policies enforce security
- All operations require authentication

### 📊 Database State After Adding Profile

**Before:**
```
auth.users: 1 record (john@example.com)
user_profiles: 1 record (Mentor)
user_profile_sessions: 1 record (Mentor active)
```

**After Adding Startup Profile:**
```
auth.users: 1 record (john@example.com) ← Same!
user_profiles: 2 records
  - Profile 1: Mentor (john@example.com)
  - Profile 2: Startup (john@example.com) ← New!
user_profile_sessions: 1 record (Startup active) ← Updated!
```

---

## Error Handling

### Error 1: "You already have a [Role] profile"
**Cause**: User tries to create duplicate role
**Solution**: Show message, suggest switching to existing profile instead

### Error 2: "Not authenticated"
**Cause**: User session expired
**Solution**: Redirect to login page

### Error 3: "Failed to create profile"
**Cause**: Database error or validation failure
**Solution**: Show error message, allow retry

---

## Testing Checklist

- [ ] User can open "Add Profile" modal
- [ ] User can select different roles
- [ ] Role-specific fields appear correctly
- [ ] User can create new profile
- [ ] New profile appears in profile switcher
- [ ] New profile becomes active automatically
- [ ] User cannot create duplicate role (error shown)
- [ ] Data is separate between profiles
- [ ] Switching profiles works correctly

---

This flow ensures a smooth experience for users who want multiple roles with the same email! 🚀


