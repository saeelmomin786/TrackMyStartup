## ✅ RLS Policy Verification Complete

### **What We Found**

#### **Intake CRM RLS Policies** ❌ **ISSUE FOUND**

**File:** `CREATE_INTAKE_CRM_TABLES.sql` (Lines 88-94)

```sql
CREATE POLICY icc_insert_own ON public.intake_crm_columns 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_columns.facilitator_id        ← WRONG!
        AND up.auth_user_id = auth.uid()
    )
  );
```

**Problem:** 
- Code sends: `facilitator_id = user.id` (Auth User ID like `af123-xyz-789`)
- Policy checks: `up.id = facilitator_id` (expecting Profile ID like `up456-abc-123`)
- **Result:** 🔴 MISMATCH → 403 Forbidden Error

---

#### **Fundraising CRM RLS Policies** ✅ **NO ISSUES**

**File:** `database/CREATE_FUNDRAISING_CRM_TABLES.sql` (Lines 136-146)

```sql
CREATE POLICY "Users can manage their startup's CRM columns" ON public.fundraising_crm_columns
    FOR ALL USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles             WHERE auth_user_id = auth.uid()   -- ✅ Correct! Uses auth_user_id
        )
    );
```

**Why it works:**
- Policy queries by `auth_user_id` which matches what `auth.uid()` returns
- Returns the startup_id from user_profiles
- Checks if table's startup_id matches user's startup_id
- ✅ Logic is correct (but may fail if startup_id is NULL)

---

### **The Core Issue: ID Mismatch**

| Property | Value | Used In |
|----------|-------|----------|
| **auth.uid()** | `af123-xyz-789` | Supabase Auth (JWT token) |
| **user_profiles.id** | `up456-abc-123` | User profiles table (Primary key) |
| **user_profiles.auth_user_id** | `af123-xyz-789` | Linking auth to profiles |

**Code does:**
```typescript
setFacilitatorId(user.id)  // Sets to auth.uid() = af123-xyz-789
INSERT INTO intake_crm_columns (facilitator_id) VALUES ('af123-xyz-789')
```

**Original RLS checks:**
```sql
WHERE up.id = 'af123-xyz-789'          -- ❌ Looks in wrong column!
  AND up.auth_user_id = 'af123-xyz-789' -- ✅ This would match
```

**Correct RLS should check:**
```sql
WHERE up.auth_user_id = 'af123-xyz-789'  ✅ Match in right column!
```

---

### **The Fix** ✅

**File to Apply:** `database/FIX_CRM_RLS_POLICIES.sql`

**Changes:**
```
Old: WHERE up.id = public.intake_crm_columns.facilitator_id
New: WHERE up.auth_user_id = public.intake_crm_columns.facilitator_id
```

Applied to:
- `icc_select_own` (SELECT policy)
- `icc_insert_own` (INSERT policy) ← **This was blocking!**
- `icc_update_own` (UPDATE policy)
- `icc_delete_own` (DELETE policy)
- `icsm_select_own` through `icsm_delete_own` (Status map)
- `ica_select_own`, `ica_insert_own`, `ica_delete_own` (Attachments)

---

### **Why This Fix is Correct**

✅ **Maintains Security:**
- Only users who created the facilitator_id can access it
- Still uses auth_user_id verification

✅ **Matches Code Logic:**
- Code sends: `user.id` (auth user ID)
- Policy checks: `up.auth_user_id` (matches what code sends)

✅ **Follows Correct Data Model:**
- `user_profiles.auth_user_id` = Supabase Auth user
- `facilitator_id` = should reference auth user, not profile id

---

### **Ready to Apply?**

**Steps:**
1. Open Supabase → SQL Editor
2. Copy entire content from: `database/FIX_CRM_RLS_POLICIES.sql`
3. Run the script
4. Verify: "Success" message
5. Reload app → Console should show: `✅ Loaded columns from Supabase`

**Or Keep Current Workaround:**
- Code already has fallback to local defaults
- UI works but columns won't persist to database
- Fix is needed for full functionality
