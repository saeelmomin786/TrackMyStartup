# Multi-Profile System - Implementation Summary

## What You Asked For
You want to allow one user (same email) to create multiple accounts with different roles (e.g., Mentor, Startup, Investor) and switch between them using a profile switching feature.

## Solution Overview

### Current System
- ❌ One email = One account = One role
- ❌ Cannot have multiple roles with same email
- ❌ No profile switching

### New System
- ✅ One email = One auth account = Multiple profiles (roles)
- ✅ Can create Mentor profile, then Startup profile, then Investor profile - all with same email
- ✅ Profile switching tab/UI to switch between profiles
- ✅ Each profile has separate data and settings

## What Needs to Be Done

### Step 1: Database Changes (SQL Script)
**File**: `CREATE_MULTI_PROFILE_SYSTEM.sql`

This script will:
1. Create `user_profiles` table (stores multiple profiles per user)
2. Create `user_profile_sessions` table (tracks active profile)
3. Migrate existing users to profiles (one profile per existing user)
4. Create helper functions
5. Set up security policies (RLS)

**Action**: Run this SQL script in your Supabase SQL Editor

### Step 2: Backend Code Changes
**File**: `lib/auth.ts`

Changes needed:
- Update `getCurrentUser()` to use `get_current_profile()` function
- Add `getUserProfiles()` to get all profiles
- Add `switchProfile()` to switch active profile
- Add `createProfile()` to create additional profiles
- Update `signUp()` to allow creating profiles for existing emails

**Action**: Follow the code examples in `MULTI_PROFILE_CODE_CHANGES.md`

### Step 3: Frontend UI Changes
**New Components Needed**:
1. `ProfileSwitcher.tsx` - Shows all profiles and allows switching
2. `AddProfileModal.tsx` - Form to create new profile

**Action**: Create these components using examples in `MULTI_PROFILE_CODE_CHANGES.md`

### Step 4: Update App Integration
- Add ProfileSwitcher to your main app (header/sidebar)
- Add "Add Profile" button
- Update state management to handle profile switching
- Update all data fetching to use active profile

## Implementation Order

### Phase 1: Database Setup (1-2 hours)
1. ✅ Review `CREATE_MULTI_PROFILE_SYSTEM.sql`
2. ✅ Run SQL script in Supabase
3. ✅ Verify migration worked (check queries in script)

### Phase 2: Backend Updates (2-3 hours)
1. ✅ Update `lib/auth.ts` with new functions
2. ✅ Test profile creation
3. ✅ Test profile switching
4. ✅ Update `lib/database.ts` if needed

### Phase 3: Frontend UI (2-3 hours)
1. ✅ Create `ProfileSwitcher` component
2. ✅ Create `AddProfileModal` component
3. ✅ Add to main app
4. ✅ Style and test

### Phase 4: Integration & Testing (2-3 hours)
1. ✅ Update all queries to use active profile
2. ✅ Test all user flows
3. ✅ Fix any issues
4. ✅ Update foreign key relationships if needed

## Key Features

### Profile Switching
- User sees all their profiles in a dropdown/menu
- Click to switch → Active profile changes
- App reloads with new profile's data

### Adding New Profile
- User clicks "Add Profile"
- Selects role (Mentor, Startup, etc.)
- Fills role-specific form
- New profile created and set as active

### Data Separation
- Each profile has its own:
  - Name
  - Role-specific data (startup_name, firm_name, etc.)
  - Codes (investor_code, etc.)
  - Settings and preferences
- Data is completely separate between profiles

## Example User Flow

1. **User signs up as Mentor**
   - Email: john@example.com
   - Creates auth account
   - Creates Mentor profile
   - Mentor profile is active

2. **User wants to add Startup profile**
   - Clicks "Add Profile"
   - Selects "Startup" role
   - Enters startup name
   - New Startup profile created
   - Startup profile becomes active

3. **User switches back to Mentor**
   - Opens profile switcher
   - Clicks on Mentor profile
   - Mentor profile becomes active
   - App shows Mentor data

## Important Notes

### Backward Compatibility
- Existing users are automatically migrated
- Each existing user gets one profile (their current role)
- No data loss

### Security
- RLS policies ensure users can only access their own profiles
- Users cannot switch to profiles that don't belong to them
- All profile operations are authenticated

### Database Relationships
- You may need to update foreign keys:
  - If `startups.user_id` references `users.id`, update to `user_profiles.id`
  - Same for other tables that reference users
- Consider creating a view or updating queries

## Files Created

1. **CREATE_MULTI_PROFILE_SYSTEM.sql** - Database migration script
2. **MULTI_PROFILE_IMPLEMENTATION_GUIDE.md** - Detailed guide
3. **MULTI_PROFILE_CODE_CHANGES.md** - Code examples and changes
4. **MULTI_PROFILE_SUMMARY.md** - This file (overview)

## Next Steps

1. **Review the SQL script** - Make sure you understand what it does
2. **Backup your database** - Always backup before migrations
3. **Run SQL script** - Execute in Supabase SQL Editor
4. **Verify migration** - Check that profiles were created
5. **Start with backend** - Update `lib/auth.ts`
6. **Add UI components** - Create profile switcher
7. **Test thoroughly** - Test all user flows

## Questions?

If you need clarification on any part:
- Check `MULTI_PROFILE_IMPLEMENTATION_GUIDE.md` for detailed explanation
- Check `MULTI_PROFILE_CODE_CHANGES.md` for code examples
- Review the SQL script comments for database details

## Estimated Time

- **Total**: 8-12 hours
- **Database**: 1-2 hours
- **Backend**: 2-3 hours
- **Frontend**: 2-3 hours
- **Integration & Testing**: 2-3 hours
- **Bug fixes**: 1-2 hours

Good luck with the implementation! 🚀


