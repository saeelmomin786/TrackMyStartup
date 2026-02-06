# Quick Action Guide - Verify Your Reports

## What You Need to Do RIGHT NOW

### **Step 1: Open the Application**
- Login to your app (incubation_center@trackmystartup.com)
- Navigate to **Track My Startups** section

### **Step 2: Go to Reports Tab**
- You should see 2 sub-tabs: **Portfolio** and **Reports**
- Click the **Reports** tab

### **Step 3: Check Browser Console**
- Press **F12** (or Ctrl+Shift+I on Windows)
- Go to **Console** tab
- You should see logs like:

```
🔄 Loading report mandates for facilitator: ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd
✅ Report mandates loaded: [Array(2)]
📊 Processing mandate: <id> Title: <title> Program: <program>
📈 Mandate stats: 0 / 3 submitted
📊 Final mandate stats: {Object}
```

### **Step 4: What You Should See**

#### Option A: SUCCESS ✅
- 2 report cards appear in grid layout
- Each card shows title, program name, questions count, submission status
- When clicked, shows response tracking table

#### Option B: PROBLEM ❌
- No cards appear (empty state)
- Console shows empty array: `✅ Report mandates loaded: []`
- Or error message in console

---

## If Problem: Share This Information

Copy-paste the console logs you see:

```
1. The full "Loading report mandates for facilitator: ..." log
2. The full "Report mandates loaded: [...]" log content
3. Any error messages (lines starting with ❌ or red text)
```

Also check:
- **Are you logged in as:** incubation_center@trackmystartup.com
- **Or a different facilitator account?**

---

## Expected Result

You should see 2 mandate cards similar to this:

```
┌──────────────────────────────────────┐
│ Report Title 1              Active   │
│ Program Name A                       │
│ 5 questions    0 / 3 submitted       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Report Title 2              Active   │
│ Program Name B                       │
│ 3 questions    0 / 2 submitted       │
└──────────────────────────────────────┘
```

---

## If Still Empty

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Check if mandates exist
SELECT id, title, program_name, facilitator_id 
FROM reports_mandate 
ORDER BY created_at DESC;
```

**Share the result with me:**
- How many rows returned? (0, 1, 2, or more?)
- What facilitator_id values do you see?
- Copy the exact facilitator_id from first row

This will help identify if it's a database issue or a UI issue.

---

## Timeline

- [ ] Open Reports tab
- [ ] Check console logs (F12)
- [ ] Take screenshot or copy logs
- [ ] Share feedback on what you see

Once I see the console output, I can pinpoint exactly what's missing!
