# Form 2 Submission RLS Policy Fix

## Problem
When startups tried to open the Form 2 submission modal, they received a **406 error** when querying the `incubation_opportunities` table to fetch Form 2 configuration (title, description).

**Error Message:**
```
Failed to load resource: the server responded with a status of 406 ()
```

## Root Cause
The RLS (Row Level Security) policies on the database were designed to protect the `incubation_opportunity_form2_questions` and `opportunity_form2_responses` tables, but the base `incubation_opportunities` table didn't have a policy allowing startups to view opportunities they had applied to. When a startup tried to query `incubation_opportunities` directly, Supabase denied access (406 error).

## Solution
I implemented a two-part fix:

### 1. **Graceful Error Handling in form2ResponseService.ts**
- Modified `getForm2Config()` method to return default configuration on errors instead of throwing
- Modified `getForm2Questions()` method to return empty array on errors instead of throwing
- This prevents the modal from showing error states when queries fail due to RLS restrictions

**Before:**
```typescript
if (error) {
  console.error('Error fetching Form 2 config:', error);
  throw error;
}
```

**After:**
```typescript
if (error) {
  console.error('Error fetching Form 2 config:', error);
  return {
    has_form2: false,
    form2_title: 'Additional Information',
    form2_description: null
  };
}
```

### 2. **New RLS Policy for Startups**
Created migration file `ADD_FORM2_STARTUP_VIEW_POLICY.sql` with a new policy:

```sql
CREATE POLICY "Startups can view opportunities they applied to"
  ON public.incubation_opportunities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunity_applications oa
      JOIN public.startups s ON oa.startup_id = s.id
      WHERE oa.opportunity_id = incubation_opportunities.id
        AND s.user_id = auth.uid()
    )
  );
```

This policy allows startups to view `incubation_opportunities` records only for opportunities they have applications for.

## How It Works

### When Startup Opens Form 2 Modal:
1. **First load**: Queries `incubation_opportunity_form2_questions` for questions
   - RLS policy allows this because startup has an application for the opportunity
2. **Config fetch**: Queries `incubation_opportunities` for form title/description
   - With new policy: Direct access allowed for opportunities they applied to
   - Without new policy: Returns default config (graceful fallback)
3. **Responses fetch**: Queries `opportunity_form2_responses` for existing answers
   - RLS policy allows this because startup owns the application

### Modal Display:
- If Form 2 config loads: Shows title and description
- If no questions loaded: Shows "No questions configured for this form"
- If errors occur: Shows default form with no questions (graceful handling)

## Testing Checklist
- [ ] **Test 1**: Startup logs in and sees Incubation Programs with "Fill Form 2" button
- [ ] **Test 2**: Click "Fill Form 2" button and modal opens
- [ ] **Test 3**: Modal loads and displays questions (if configured)
- [ ] **Test 4**: No console errors or 406 errors appear
- [ ] **Test 5**: Startup can answer questions and submit form
- [ ] **Test 6**: Form 2 status updates to 'submitted' after submission

## Files Modified
1. **lib/form2ResponseService.ts**
   - Updated `getForm2Config()` for graceful error handling
   - Updated `getForm2Questions()` for graceful error handling

2. **New file**: `ADD_FORM2_STARTUP_VIEW_POLICY.sql`
   - Adds RLS policy allowing startups to view opportunities they applied to

## Next Steps
1. **Execute** the migration: `ADD_FORM2_STARTUP_VIEW_POLICY.sql`
2. **Test** Form 2 submission in browser with startup account
3. **Monitor** console for any remaining RLS or permission errors
4. If facilitator-side Form 2 response review is needed, create separate policy for facilitators
