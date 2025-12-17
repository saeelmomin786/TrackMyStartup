# Multi-Profile System Implementation Guide

## Overview
This guide explains how to implement a multi-profile system where one user (email) can have multiple profiles (roles) like Mentor, Startup, Investor, etc., with the ability to switch between them.

## Current System
- One email = One auth account = One role
- `users` table has `id` (UUID from auth.users), `email` (UNIQUE), `role`, etc.

## Proposed Solution

### Architecture
1. **Keep Supabase Auth as-is**: One auth account per email (for authentication)
2. **Create `user_profiles` table**: Multiple profiles per auth user
3. **Add `current_profile_id`**: Track which profile is active
4. **Profile switching**: Allow users to switch between their profiles

### Database Schema Changes

#### Step 1: Create `user_profiles` Table
- Stores multiple profiles per auth user
- Each profile has its own role, name, and role-specific data
- Links to `auth.users` via `auth_user_id`

#### Step 2: Migrate Existing Data
- Move existing `users` table data to `user_profiles`
- Create one profile per existing user

#### Step 3: Add Profile Management
- Add `current_profile_id` to track active profile
- Add indexes for performance

### Implementation Steps

1. **Database Migration** (SQL script)
2. **Backend Changes** (auth.ts, database.ts)
3. **Frontend Changes** (Profile switching UI)
4. **Update Queries** (All queries to use active profile)

## Benefits
- ✅ One email can have multiple roles
- ✅ Easy profile switching
- ✅ Separate data per profile
- ✅ Backward compatible (existing users get one profile)

## User Flow

### Registration Flow
1. User signs up with email/password → Creates auth account
2. User selects role → Creates first profile
3. User can later add more profiles from dashboard

### Profile Switching Flow
1. User logs in → Sees all their profiles
2. User selects profile → Sets as active
3. App loads data for active profile

### Adding New Profile Flow
1. User clicks "Add Profile" → Selects new role
2. Fills role-specific form → Creates new profile
3. New profile becomes active automatically


