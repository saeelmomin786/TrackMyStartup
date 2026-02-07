## 🔍 ACTUAL RLS POLICY ISSUE FOUND

### **The Real Problem**

**Code is sending:**
```typescript
// Line 1593 in FacilitatorView.tsx
setFacilitatorId(user.id);  // This is the AUTH USER ID

// Then in intakeCRMService.ts
INSERT into intake_crm_columns (facilitator_id) VALUES (user.id)
```

**RLS Policy expects:**
```sql
-- Line 88-94 in CREATE_INTAKE_CRM_TABLES.sql
CREATE POLICY icc_insert_own ON public.intake_crm_columns 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.intake_crm_columns.facilitator_id    -- ← Mismatch!
        AND up.auth_user_id = auth.uid()
    )
  );
```

---

### 📊 **The Mismatch**

| Component | Sets | Expects |
|-----------|------|---------|
| **Code** | `facilitator_id = user.id` (Auth User ID) | - |
| **RLS Policy** | - | `user_profiles.id` (Profile ID) |
| **Result** | ❌ **CONFLICT** | RLS policy fails because it's checking wrong field |

---

### **Example:**
```
Auth User ID: 'af123-xyz-789'   ← What code sends as facilitator_id
User Profile ID: 'up456-abc-123' ← What RLS policy looks for

When insert checks: 
  WHERE up.id = 'af123-xyz-789'  ← Looking for this profile ID
    AND up.auth_user_id = 'af123-xyz-789'  ← But this is the auth ID

Result: No match found → INSERT BLOCKED (403 Forbidden)
```

---

### **Why Fundraising CRM Works (Sometimes)**

Fundraising CRM uses `startup_id`:
```sql
CREATE POLICY "Users can manage their startup's CRM columns" ON public.fundraising_crm_columns
    FOR ALL USING (
        startup_id IN (
            SELECT startup_id FROM public.user_profiles             WHERE auth_user_id = auth.uid()   -- ← Correct! Matches actual auth user
        )
    );
```

This works if `user_profiles.startup_id` is set, because it queries by `auth_user_id` (which matches what `auth.uid()` returns).

---

### **✅ Required Fixes**

**Option 1: Fix Code to Use Profile ID** (More Secure)
```typescript
// Get user's profile ID instead of auth ID
const profile = await getUserProfile(user.id);
setFacilitatorId(profile.id);  // Use profile ID
```

**Option 2: Fix RLS Policy to Match Code** (What Code Does Now)
```sql
CREATE POLICY icc_insert_own ON public.intake_crm_columns 
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );
```
This allows any authenticated user. Less secure but matches current code.

**Option 3: Fix RLS to Check Auth User ID**
Replace policy check from:
```sql
WHERE up.id = public.intake_crm_columns.facilitator_id
```
To:
```sql
WHERE up.auth_user_id = public.intake_crm_columns.facilitator_id
```

---

### **Recommended: Option 3 Fix**

The safest fix that maintains security:
1. Code sends: `facilitator_id = user.id` (auth user ID) ✓
2. RLS checks: `WHERE up.auth_user_id = facilitator_id` ✓
3. Security maintained: Only users who own the facilitator_id can access ✓

This requires a NEW SQL fix to update the RLS policies.
