# Mentor Profile Setup Guide

## Overview
This guide explains how to set up the Mentor Profile system in the Mentor Dashboard, including the database table, RLS policies, and backend functionality.

## Files Created/Updated

### 1. Database Setup
- **`UPDATE_MENTOR_PROFILES_TABLE.sql`** - SQL script to create/update the `mentor_profiles` table with all required fields

### 2. Backend Service
- **`lib/mentorService.ts`** - Added mentor profile methods:
  - `getMentorProfile()` - Get mentor profile by user ID
  - `saveMentorProfile()` - Save or update mentor profile
  - `deleteMentorProfile()` - Delete mentor profile
  - `getAllMentorProfiles()` - Get all public mentor profiles (for discovery)
  - `searchMentorProfiles()` - Search mentor profiles

### 3. Frontend Component
- **`components/mentor/MentorProfileForm.tsx`** - Already exists and uses the table

## Setup Steps

### Step 1: Run the SQL Script
1. Open your Supabase SQL Editor
2. Run the `UPDATE_MENTOR_PROFILES_TABLE.sql` script
3. This will:
   - Create the table if it doesn't exist
   - Add missing columns if they exist
   - Set up RLS policies
   - Create indexes for performance
   - Set up triggers for `updated_at`

### Step 2: Verify Table Structure
After running the script, verify the table has these columns:

**Basic Information:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, References auth.users, Unique)
- `mentor_name` (TEXT, Required)
- `mentor_type` (TEXT)
- `location` (TEXT)
- `website` (TEXT)
- `linkedin_link` (TEXT)
- `email` (TEXT)

**Mentoring Expertise:**
- `expertise_areas` (TEXT[])
- `sectors` (TEXT[])
- `mentoring_stages` (TEXT[])

**Experience:**
- `years_of_experience` (INTEGER)
- `companies_mentored` (INTEGER)
- `companies_founded` (INTEGER)
- `current_role` (TEXT)
- `previous_companies` (TEXT[])
- `mentoring_experience` (TEXT)

**Mentoring Approach:**
- `mentoring_approach` (TEXT)
- `availability` (TEXT)
- `preferred_engagement` (TEXT)

**Fee Structure:**
- `fee_type` (TEXT, CHECK: 'Fees', 'Equity', 'Hybrid', 'Pro Bono')
- `fee_amount_min` (DECIMAL(15,2))
- `fee_amount_max` (DECIMAL(15,2))
- `fee_currency` (TEXT, Default: 'USD')
- `equity_amount_min` (DECIMAL(5,2))
- `equity_amount_max` (DECIMAL(5,2))
- `fee_description` (TEXT)

**Media:**
- `logo_url` (TEXT)
- `video_url` (TEXT)
- `media_type` (TEXT, CHECK: 'logo', 'video', Default: 'logo')

**Timestamps:**
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### Step 3: Verify RLS Policies
The script creates these RLS policies:

1. **Mentors can view their own profile** - SELECT using `auth.uid() = user_id`
2. **Mentors can insert their own profile** - INSERT with CHECK `auth.uid() = user_id`
3. **Mentors can update their own profile** - UPDATE using `auth.uid() = user_id`
4. **Mentors can delete their own profile** - DELETE using `auth.uid() = user_id`
5. **Public can view mentor profiles** - SELECT using `true` (for discovery)
6. **Admins can view all mentor profiles** - SELECT for Admin role

### Step 4: Test the Backend Service
You can test the service methods in your code:

```typescript
import { mentorService } from '../lib/mentorService';

// Get current mentor's profile
const profile = await mentorService.getMentorProfile();

// Save/update profile
const result = await mentorService.saveMentorProfile({
  mentor_name: 'John Doe',
  mentor_type: 'Serial Entrepreneur',
  location: 'San Francisco, CA',
  // ... other fields
});

// Get all public profiles
const allProfiles = await mentorService.getAllMentorProfiles({
  mentor_type: 'Industry Expert',
  sectors: ['Technology'],
});

// Search profiles
const searchResults = await mentorService.searchMentorProfiles('John');
```

## Security Features

1. **RLS Policies**: All operations are protected by Row Level Security
2. **Auth.uid() Check**: All operations verify `auth.uid() = user_id` to ensure mentors can only modify their own profiles
3. **Public Read Access**: Profiles are publicly readable for discovery, but only editable by the owner
4. **Admin Access**: Admins can view all profiles

## Important Notes

1. **User ID**: The table uses `user_id` which references `auth.users(id)`, NOT profile IDs from `user_profiles`
2. **Auto-update**: The `updated_at` field is automatically updated via database trigger
3. **Unique Constraint**: Each user can only have one mentor profile (enforced by UNIQUE constraint on `user_id`)
4. **Cascade Delete**: If a user is deleted, their mentor profile is automatically deleted

## Troubleshooting

### Issue: 403 Forbidden Error
- **Solution**: Ensure RLS policies are properly set up and you're using `auth.uid()` for `user_id`

### Issue: Profile Not Found
- **Solution**: Check that you're using the auth user ID, not the profile ID from `user_profiles`

### Issue: Missing Columns
- **Solution**: Run the `UPDATE_MENTOR_PROFILES_TABLE.sql` script to add missing columns

## Next Steps

1. ✅ Run the SQL script
2. ✅ Verify table structure
3. ✅ Test profile creation/update in the Mentor Dashboard
4. ✅ Test profile viewing in discovery/search features





