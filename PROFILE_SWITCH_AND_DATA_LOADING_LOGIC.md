# Profile Switch and Data Loading Logic

## Overview
This document explains how profile switching works and how data is loaded when switching between different user profiles (roles) in the multi-profile system.

---

## Architecture

### Database Tables

1. **`auth.users`** (Supabase Auth)
   - One auth account per email
   - Stores authentication credentials
   - `id` = `auth_user_id` (UUID)

2. **`user_profiles`** (Application Profiles)
   - Multiple profiles per auth user
   - Each profile has its own role (Mentor, Startup, Investor, etc.)
   - `id` = `profile_id` (UUID)
   - `auth_user_id` = Foreign key to `auth.users.id`

3. **`user_profile_sessions`** (Active Profile Tracking)
   - Tracks which profile is currently active
   - One row per auth user
   - `auth_user_id` = Foreign key to `auth.users.id
   - `current_profile_id` = Foreign key to `user_profiles.id`

---

## Profile Switching Flow

### Step 1: User Initiates Profile Switch

**Component:** `ProfileSwitcher.tsx`

```typescript
// User clicks on a profile in the dropdown
handleSwitchProfile(profileId: string)
```

**Location:** `components/ProfileSwitcher.tsx:73`

---

### Step 2: Call Database RPC Function

**Service:** `authService.switchProfile(profileId)`

**Location:** `lib/auth.ts:1073`

**What it does:**
1. Gets current authenticated user from `auth.users`
2. Calls database RPC function `switch_profile(auth_user_uuid, profile_uuid)`
3. This RPC function:
   - Updates `user_profile_sessions.current_profile_id` to the new profile ID
   - Ensures the profile belongs to the authenticated user (security check)
4. Waits 300ms for database to update
5. Verifies the switch by calling `getCurrentUser()`

**Code:**
```typescript
async switchProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .rpc('switch_profile', {
      auth_user_uuid: user.id,
      profile_uuid: profileId
    });
  
  // Wait for database update
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Verify switch worked
  const currentProfile = await this.getCurrentUser();
  return { success: true };
}
```

---

### Step 3: Callback to App.tsx

**Component:** `App.tsx` receives callback from `ProfileSwitcher`

**Location:** `App.tsx:3682`

**What happens:**
1. Waits additional 200ms for database consistency
2. **Retries getting current user** (up to 3 attempts) to ensure correct profile is loaded
3. Updates `currentUser` state with new profile
4. **Clears `selectedStartup`** to prevent showing old startup data
5. Checks if profile is complete
6. If incomplete → Redirects to Form 2 (complete-registration)
7. If complete → Reloads all data for new profile

**Code:**
```typescript
onProfileSwitch={async (profile) => {
  // Wait for database update
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Retry getting user (up to 3 times)
  let refreshedUser = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    refreshedUser = await authService.getCurrentUser();
    if (refreshedUser && refreshedUser.id === profile.id) {
      break; // Got correct profile
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Clear old startup data
  setSelectedStartup(null);
  selectedStartupRef.current = null;
  
  // Update current user
  setCurrentUser(refreshedUser);
  
  // Check profile completion
  const isComplete = await authService.isProfileComplete(refreshedUser.id);
  
  if (!isComplete) {
    // Redirect to Form 2
    setCurrentPage('complete-registration');
    return;
  }
  
  // Reload all data for new profile
  setHasInitialDataLoaded(false);
  setView('dashboard');
  fetchData(true); // Force refresh
}}
```

---

## Data Loading Flow

### How `getCurrentUser()` Works

**Location:** `lib/auth.ts:369`

**Process:**
1. Gets authenticated user from `auth.users` (via `supabase.auth.getUser()`)
2. Calls database RPC function `get_current_profile_safe(auth_user_uuid)`
3. This RPC function:
   - Checks `user_profile_sessions` for active profile
   - Gets profile data from `user_profiles` table
   - Returns the active profile data
4. Maps profile data to `AuthUser` interface
5. Checks profile completion status

**Code:**
```typescript
async _fetchUserProfile(authUserId: string, userEmail: string): Promise<AuthUser | null> {
  // Call RPC function that gets active profile
  const { data: profileData, error } = await supabase
    .rpc('get_current_profile_safe', { auth_user_uuid: authUserId });
  
  const profile = profileData[0];
  const profileId = profile.profile_id || profile.id;
  
  // Check completion status
  let isComplete = profile.is_profile_complete;
  if (isComplete === undefined) {
    isComplete = await this.isProfileComplete(profileId);
  }
  
  // Map to AuthUser interface
  return this._mapProfileToAuthUser(profile, isComplete);
}
```

---

### How `fetchData()` Works After Profile Switch

**Location:** `App.tsx:1438`

**Process:**

#### Phase 0: Startup Role Special Handling
If user role is `Startup`:
1. Fetches startup by `auth_user_id` (NOT profile_id!)
2. Uses `startups.user_id = auth_user_id` to find startup
3. Sets `selectedStartup` immediately
4. Shows startup dashboard right away
5. Loads other data in background

**Code:**
```typescript
if (cu?.role === 'Startup' && !selectedStartupRef.current) {
  const { data: { user: authUser } } = await authService.supabase.auth.getUser();
  const authUserId = authUser.id;
  
  // Query by auth_user_id, not profile_id!
  const { data: startupsByUserId } = await authService.supabase
    .from('startups')
    .select('*')
    .eq('user_id', authUserId);
  
  setSelectedStartup(startupsByUserId[0]);
  setView('startupHealth');
}
```

#### Phase 1: Role-Based Data Fetching
Different roles fetch different data:

**For Mentor:**
- Active assignments from `mentor_startup_assignments`
- Mentor requests from `mentor_requests`
- Uses `mentorService.getMentorMetrics(mentor_id)`
- **Note:** Uses `auth_user_id` for queries, not profile_id

**For Investor:**
- Investment offers
- Portfolio startups
- Uses `investmentService.getUserInvestmentOffers(email)`

**For Admin:**
- All startups
- All investment offers
- All verification requests

**For Startup:**
- Investment offers for their startup
- Compliance tasks
- Uses `startup.id` (from startups table)

**Code:**
```typescript
// Determine startup fetching method based on role
let startupPromise;
if (currentUserRef.current?.role === 'Admin') {
  startupPromise = startupService.getAllStartupsForAdmin();
} else if (currentUserRef.current?.role === 'Investment Advisor') {
  startupPromise = startupService.getAllStartupsForInvestmentAdvisor();
} else if (currentUserRef.current?.role === 'Mentor') {
  // Uses default fetching
  startupPromise = startupService.getAllStartups();
} else {
  startupPromise = startupService.getAllStartups();
}

// Fetch all data in parallel
const [startupsData, investmentsData, ...] = await Promise.allSettled([
  startupPromise,
  investmentService.getNewInvestments(),
  userService.getStartupAdditionRequests(),
  // ... more data sources
]);
```

---

## Key Points

### 1. **ID Usage in Queries**

**CRITICAL:** After profile switching, queries use `auth_user_id` (from `auth.users.id`), NOT `profile_id`!

**Why?**
- `auth_user_id` stays constant across profile switches
- `profile_id` changes when switching profiles
- Foreign keys in other tables (like `startups.user_id`) reference `auth_user_id`

**Example:**
```typescript
// ✅ CORRECT - Uses auth_user_id
const { data: { user: authUser } } = await supabase.auth.getUser();
const startups = await supabase
  .from('startups')
  .select('*')
  .eq('user_id', authUser.id); // auth_user_id

// ❌ WRONG - Uses profile_id
const startups = await supabase
  .from('startups')
  .select('*')
  .eq('user_id', currentUser.id); // This is profile_id!
```

### 2. **Data Clearing on Profile Switch**

When switching profiles:
- `selectedStartup` is cleared (prevents showing old startup data)
- `hasInitialDataLoaded` is reset to `false`
- All state is refreshed for new profile

### 3. **Profile Completion Check**

After switching:
- Checks if new profile is complete
- If incomplete → Redirects to Form 2
- If complete → Loads dashboard data

### 4. **Retry Logic**

The system retries getting current user up to 3 times after profile switch to handle database consistency delays.

---

## Flow Diagram

```
User clicks "Switch Profile"
         ↓
ProfileSwitcher.handleSwitchProfile()
         ↓
authService.switchProfile(profileId)
         ↓
Database RPC: switch_profile()
  - Updates user_profile_sessions.current_profile_id
         ↓
Wait 300ms for DB update
         ↓
Verify: getCurrentUser()
         ↓
Callback to App.tsx onProfileSwitch()
         ↓
Wait 200ms + Retry getCurrentUser() (up to 3x)
         ↓
Clear selectedStartup
         ↓
Update currentUser state
         ↓
Check isProfileComplete()
         ↓
If incomplete → Redirect to Form 2
If complete → fetchData(true)
         ↓
Role-based data loading:
  - Mentor → mentorService.getMentorMetrics()
  - Startup → Fetch startup by auth_user_id
  - Investor → investmentService.getUserInvestmentOffers()
  - Admin → GetAll data
         ↓
Update UI with new profile's data
```

---

## Database RPC Functions

### `switch_profile(auth_user_uuid, profile_uuid)`
- Updates `user_profile_sessions.current_profile_id`
- Verifies profile belongs to auth user
- Returns success/error

### `get_current_profile_safe(auth_user_uuid)`
- Gets active profile from `user_profile_sessions`
- Joins with `user_profiles` to get full profile data
- Returns profile data as array

---

## Security Considerations

1. **Profile Ownership Check:** RPC functions verify that profiles belong to the authenticated user
2. **RLS Policies:** Row Level Security ensures users can only access their own data
3. **Auth User ID:** All foreign key queries use `auth_user_id` to maintain data isolation

---

## Common Issues and Solutions

### Issue: Old data showing after profile switch
**Solution:** Clear `selectedStartup` and reset `hasInitialDataLoaded` flag

### Issue: Wrong profile loaded after switch
**Solution:** Retry logic (3 attempts) handles database consistency delays

### Issue: Queries failing after profile switch
**Solution:** Ensure queries use `auth_user_id` from `auth.users`, not `profile_id`

---

## Files Involved

1. **`lib/auth.ts`**
   - `getCurrentUser()` - Gets active profile
   - `switchProfile()` - Switches active profile
   - `_fetchUserProfile()` - Fetches profile from database

2. **`components/ProfileSwitcher.tsx`**
   - `handleSwitchProfile()` - Initiates profile switch
   - `loadProfiles()` - Loads all user profiles

3. **`App.tsx`**
   - `onProfileSwitch` callback - Handles post-switch logic
   - `fetchData()` - Loads data based on role
   - State management for current user and data

4. **`lib/mentorService.ts`**
   - `getMentorMetrics()` - Loads mentor-specific data
   - Uses `auth_user_id` for queries

---

## Summary

1. **Profile Switch:** Updates `user_profile_sessions.current_profile_id` via RPC function
2. **Data Loading:** Uses `auth_user_id` (not `profile_id`) for all foreign key queries
3. **State Management:** Clears old data and reloads for new profile
4. **Retry Logic:** Handles database consistency delays
5. **Role-Based:** Different roles load different data sets

The system ensures that when a user switches profiles, all data is correctly loaded for the new active profile while maintaining security and data isolation.

