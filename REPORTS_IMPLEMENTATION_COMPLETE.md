# Reports System - Complete Implementation Status

## Overview

The Reports system in **Track My Startups → Reports Tab** has TWO FLOWS:

### **FLOW 1: Generate from Existing Responses (Option A)**
- Facilitator selects questions from Question Bank
- Clicks **Generate** without sending to startups
- Downloads Excel + PDF immediately
- **Nothing saved in Supabase**

### **FLOW 2: Send to Startups for Responses (Option B)**
- Facilitator selects questions from Question Bank
- Facilitator selects target startups
- Clicks **Create & Send**
- Creates **mandate** in `reports_mandate` table
- Startups receive form to fill out
- Responses stored in `program_tracking_responses` table
- Facilitator tracks submission status in Reports tab

---

## Current Implementation

### **What Was Fixed**
✅ Reports tab now shows **mandates** from `reports_mandate` table
✅ Loads 2 (or more) report mandates you created
✅ Displays submission statistics (X/Y submitted)
✅ Shows response tracking when mandate selected

### **Database Tables Used**

| Table | Purpose | Data |
|-------|---------|------|
| `reports_mandate` | Stores mandate metadata | id, title, program_name, facilitator_id, target_startups[], question_ids[], created_at |
| `program_tracking_responses` | Stores startup responses | startup_id, program_name, answers JSON, submitted_at, last_updated_at |
| `application_question_bank` | Centralized question library | question_text, question_type, options, etc. |

---

## Step 3 Logic - Report Creation Modal

### **When Modal Opens (Create Report Button)**

**Step 1: Basic Info**
- Input report title
- Select program
- Proceed to questions

**Step 2: Select Questions**
- Browse Question Bank (`application_question_bank` table)
- Check questions to include
- Show selected count

**Step 3: Choose Source (Critical)**
```
┌─────────────────────────────────────┐
│ Where should answers come from?     │
├─────────────────────────────────────┤
│                                     │
│ ☑ OPTION A: Use Existing Data       │
│   (Pull from Response 1 & 2)        │
│   → Generate Excel/PDF              │
│   → Download                        │
│   → Nothing saved                   │
│                                     │
│ ☐ OPTION B: Send to Startups        │
│   (Create mandate + send form)      │
│   → Select target startups          │
│   → Create mandate in DB            │
│   → Track responses                 │
│                                     │
└─────────────────────────────────────┘
```

**If Option A Selected:**
1. System fetches existing Response 1 & 2 data
2. Maps to selected questions
3. Generates Excel with all startups' answers
4. Generates PDF summary
5. Downloads both files
6. Modal closes

**If Option B Selected:**
1. Show list of target startups from program
2. Allow select/deselect (Select All button)
3. Click **Create & Send**
4. System creates mandate in `reports_mandate`
5. System creates response placeholders in `program_tracking_responses`
6. Mandate appears in Reports tab with "Pending" status
7. Startups see form in their Track My Startups section

---

## Reports Tab Display

### **When You Switch to Reports Sub-Tab**

**Cards View** (Grid of all mandates)
```
┌─────────────────────────────────────┐
│  Q1 Progress Report          Active │
│  Tech Incubation Program            │
│  5 questions    2 / 5 submitted     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Mid-Year Review                    │
│  Finance Program             Active │
│  8 questions    1 / 3 submitted     │
└─────────────────────────────────────┘
```

**When You Click a Mandate** (Details below)
```
┌─────────────────────────────────────┐
│ Response Tracking                   │
├─────────────────────────────────────┤
│ Program: Tech Incubation            │
│ Questions: 5                        │
│ Target Startups: 5                  │
│ Submitted: 2 / 5                    │
├─────────────────────────────────────┤
│ Startup ID  │ Status      │ When    │
├─────────────┼─────────────┼─────────┤
│ startup-001 │ ✓ Submitted │ Feb 3   │
│ startup-002 │ ✓ Submitted │ Feb 3   │
│ startup-003 │ ✗ Pending   │ —       │
│ startup-004 │ ✗ Pending   │ —       │
│ startup-005 │ ✗ Pending   │ —       │
└─────────────┴─────────────┴─────────┘
```

---

## Debugging Your 2 Missing Mandates

### **Possible Reasons Not Showing**

1. **Different Facilitator ID**
   - Mandates saved with different facilitator_id
   - Check database: `SELECT facilitator_id FROM reports_mandate LIMIT 1;`
   - Your auth user ID should match

2. **Loading Not Triggered**
   - Reports tab not opened yet
   - Function not called automatically
   - Fixed: Now auto-loads when switching to Reports tab

3. **Database Query Failure**
   - Connection issue
   - Permissions problem
   - Check browser console for error message

### **How to Verify**

1. Open **Track My Startups** → **Reports**
2. Press **F12** (Dev Tools)
3. Look for this log:
   ```
   🔄 Loading report mandates for facilitator: <YOUR_ID>
   ✅ Report mandates loaded: [Array]
   ```
4. If array shows `[]` (empty), mandates not found
5. If array shows 2+ items, they should appear as cards

### **If Empty, Run This SQL**
```sql
-- Find YOUR mandates
SELECT id, title, program_name, facilitator_id, target_startups, created_at
FROM reports_mandate
WHERE facilitator_id = '<YOUR_AUTH_USER_ID>'
ORDER BY created_at DESC;

-- If empty, check all recent mandates
SELECT DISTINCT facilitator_id, COUNT(*) as count
FROM reports_mandate
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY facilitator_id;
```

---

## Next Steps

1. **Open Reports tab** in your app
2. **Check console logs** (F12 → Console tab)
3. **Share the output:**
   - The log showing facilitator ID
   - The array of loaded mandates (should show 2 items)
   - Any error messages

This will help identify exactly why the 2 mandates aren't displaying!

---

## Console Log Reference

| Log | Meaning |
|-----|---------|
| `🔄 Loading report mandates...` | Starting to load |
| `✅ Report mandates loaded: [...]` | Success! Array shows mandates |
| `📊 Processing mandate:` | Calculating stats for each |
| `📈 Mandate stats: X / Y submitted` | X startups submitted out of Y |
| `❌ Error loading report mandates:` | Failed - check error details |

If you don't see ANY of these logs, Reports tab might not have been opened yet. Make sure to click the **Reports** sub-tab!
