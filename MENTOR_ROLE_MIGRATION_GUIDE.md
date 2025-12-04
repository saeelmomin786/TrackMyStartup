# Mentor Role Migration Guide

This guide provides step-by-step instructions for adding the "Mentor" role to your live TrackMyStartup application.

## ⚠️ IMPORTANT: Pre-Migration Checklist

Before running any migrations on your live database:

1. **Backup your database** - Always create a full backup before making schema changes
2. **Test in development first** - Run all scripts in a development/staging environment
3. **Schedule maintenance window** - Plan for potential downtime during migration
4. **Review RLS policies** - Understand which policies need Mentor access

## 📋 Migration Steps

### Step 1: Database Migration (Run in Supabase SQL Editor)

**File:** `ADD_MENTOR_ROLE_MIGRATION.sql`

This script:
- Safely adds 'Mentor' to the `user_role` enum (checks if it exists first)
- Creates `is_mentor()` helper function
- Is safe to run multiple times (idempotent)

```sql
-- Run this in Supabase SQL Editor
-- See ADD_MENTOR_ROLE_MIGRATION.sql for full script
```

**Verification:**
```sql
-- Check if Mentor was added
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
AND enumlabel = 'Mentor';
```

### Step 2: Update RLS Policies

**File:** `ADD_MENTOR_RLS_POLICIES.sql`

**⚠️ CRITICAL:** Review each policy carefully. Not all policies should grant Mentor access.

**Common scenarios:**
- **Read-only access:** Mentors might only need SELECT permissions
- **Assigned startups/investors:** Consider creating assignment tables
- **Storage access:** Update storage bucket policies if mentors need file access

**Example policy update:**
```sql
-- Allow mentors to view startups (read-only)
CREATE POLICY "Mentors can view startups" ON public.startups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'Mentor'
        )
    );
```

### Step 3: Frontend Changes (Already Completed)

✅ **TypeScript Types** - Updated `types.ts` to include 'Mentor'
✅ **Mentor Dashboard** - Created `components/MentorView.tsx`
✅ **Routing** - Updated `App.tsx` to route Mentor users
✅ **Registration** - Updated `BasicRegistrationStep.tsx` to include Mentor

### Step 4: Create Assignment Tables (Optional but Recommended)

If mentors should only see assigned startups/investors, create assignment tables:

```sql
-- Mentor-Startup Assignments
CREATE TABLE IF NOT EXISTS mentor_startup_assignments (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mentor_id, startup_id)
);

-- Mentor-Investor Assignments
CREATE TABLE IF NOT EXISTS mentor_investor_assignments (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mentor_id, investor_id)
);

-- Enable RLS
ALTER TABLE mentor_startup_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_investor_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Mentors can view their assignments" ON mentor_startup_assignments
    FOR SELECT USING (mentor_id = auth.uid());

CREATE POLICY "Mentors can view their investor assignments" ON mentor_investor_assignments
    FOR SELECT USING (mentor_id = auth.uid());
```

### Step 5: Update MentorView Component

The current `MentorView.tsx` shows all startups/investors. Update it to use assignment tables:

```typescript
// In MentorView.tsx, update myStartups:
const myStartups = useMemo(() => {
  if (!currentUser?.id) return [];
  
  // Fetch from mentor_startup_assignments table
  // For now, showing all - update with actual assignment logic
  return startups;
}, [startups, currentUser]);
```

### Step 6: Test Thoroughly

1. **Create a test Mentor user:**
   ```sql
   -- Update an existing user to Mentor role (for testing)
   UPDATE public.users SET role = 'Mentor' WHERE email = 'test@example.com';
   ```

2. **Test registration:**
   - Register a new user with Mentor role
   - Verify they can access the Mentor dashboard

3. **Test RLS policies:**
   - Verify mentors can only access what they should
   - Test with different mentor assignments

4. **Test routing:**
   - Login as Mentor
   - Verify correct dashboard loads
   - Test navigation between tabs

## 🔒 Security Considerations

### RLS Policy Best Practices

1. **Principle of Least Privilege:**
   - Only grant necessary permissions
   - Start with read-only, add write permissions only if needed

2. **Assignment-Based Access:**
   - Use assignment tables to restrict access
   - Don't grant access to all startups/investors by default

3. **Audit Trail:**
   - Consider logging mentor actions
   - Track which startups/investors mentors access

### Example Secure Policy

```sql
-- Mentors can only view startups they're assigned to
CREATE POLICY "Mentors view assigned startups" ON public.startups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN mentor_startup_assignments msa ON u.id = msa.mentor_id
            WHERE u.id = auth.uid()
            AND u.role = 'Mentor'
            AND msa.startup_id = startups.id
        )
    );
```

## 📝 Post-Migration Tasks

1. **Update Documentation:**
   - Document Mentor role capabilities
   - Update user guides

2. **Admin Interface:**
   - Add UI for assigning mentors to startups/investors
   - Create mentor management page

3. **Notifications:**
   - Set up notifications for mentor assignments
   - Notify mentors when new startups/investors are assigned

4. **Analytics:**
   - Track mentor engagement
   - Monitor mentor dashboard usage

## 🐛 Troubleshooting

### Issue: Mentor can't see any startups
**Solution:** Check RLS policies - they might be too restrictive

### Issue: Registration fails for Mentor role
**Solution:** Verify enum was added correctly: `SELECT enumlabel FROM pg_enum WHERE enumlabel = 'Mentor'`

### Issue: Mentor dashboard doesn't load
**Solution:** 
- Check browser console for errors
- Verify `App.tsx` routing includes Mentor
- Check that `MentorView.tsx` is imported correctly

### Issue: RLS policy errors
**Solution:** 
- Review policy syntax
- Check if helper functions exist (`is_mentor()`)
- Verify user role is correctly set in database

## 📞 Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Review browser console for frontend errors
3. Verify all migration scripts ran successfully
4. Check that TypeScript types match database enum

## ✅ Migration Checklist

- [ ] Database backup created
- [ ] `ADD_MENTOR_ROLE_MIGRATION.sql` executed successfully
- [ ] `ADD_MENTOR_RLS_POLICIES.sql` reviewed and executed
- [ ] Assignment tables created (if needed)
- [ ] Frontend code deployed
- [ ] Test Mentor user created
- [ ] Registration tested
- [ ] Dashboard access tested
- [ ] RLS policies tested
- [ ] Documentation updated

---

**Last Updated:** 2025-01-XX
**Version:** 1.0

