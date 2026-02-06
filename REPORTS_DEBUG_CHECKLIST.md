# Reports Mandate Debugging Checklist

## How to Verify Reports Are Loading Correctly

### Step 1: Navigate to Reports Tab
1. Go to **Track My Startups** section
2. Click the **Reports** sub-tab (next to Portfolio)

### Step 2: Check Browser Console (F12)
Open Developer Tools and look for these console logs:

```
🔄 Loading report mandates for facilitator: <YOUR_AUTH_USER_ID>
✅ Report mandates loaded: [Array]
📊 Processing mandate: <MANDATE_ID> Title: <TITLE> Program: <PROGRAM_NAME>
📈 Mandate stats: X / Y submitted
📊 Final mandate stats: {Object}
```

### Step 3: What Each Log Means

| Log | Meaning |
|-----|---------|
| `🔄 Loading report mandates...` | Function started loading |
| `✅ Report mandates loaded: [Array]` | Data retrieved from database. **Check if array is empty or has items** |
| `📊 Processing mandate:` | Processing each mandate for stats calculation |
| `📈 Mandate stats:` | Shows X/Y startups submitted (breakdown per mandate) |
| `❌ Error loading report mandates:` | Something went wrong - check error details |

### Step 4: Expected Output for 2 Mandates

If you have 2 mandates in database, you should see:

```
✅ Report mandates loaded: [
  {
    id: "mandate-id-1",
    title: "First Report",
    program_name: "Program A",
    question_ids: [...],
    target_startups: [...]
  },
  {
    id: "mandate-id-2", 
    title: "Second Report",
    program_name: "Program B",
    question_ids: [...],
    target_startups: [...]
  }
]
```

### Step 5: Verify in UI

You should see:
- [ ] 2 report cards in grid layout
- [ ] Each card shows: title, program name, question count, submission status (X/Y submitted)
- [ ] Clicking a card should show response tracking table below

---

## Troubleshooting

### Issue: Empty Array `[]`
**Possible Causes:**
1. **Facilitator ID mismatch** - The auth user ID doesn't match `facilitator_id` in `reports_mandate` table
   - **Fix:** Check which user ID is stored in your mandates
   
2. **Mandates in different table** - Maybe created with different system
   - **Check:** Open your database and run:
     ```sql
     SELECT * FROM reports_mandate WHERE created_at > NOW() - INTERVAL '30 days';
     ```
   - Copy the facilitator_id from the mandates and share it

3. **Auth not initialized** - FacilitatorId might be null
   - **Check console for:** `✅ Found user profile id:` before Reports tab
   - **Verify:** facilitatorId should be set before loading

### Issue: Type Mismatch Error
**Check:**
- Mandate has `target_startups` as array (not string or object)
- Mandate has `question_ids` as array (not string or object)

### Issue: Stats Show 0/0
**Check:**
- `program_tracking_responses` table has data matching the program_name
- Question IDs in mandate exist in the responses table

---

## Database Schema Check

Run these queries in your Supabase SQL editor:

```sql
-- Check if mandates exist
SELECT id, title, program_name, facilitator_id, created_at 
FROM reports_mandate 
ORDER BY created_at DESC 
LIMIT 5;

-- Check facilitator_id of YOUR mandates
SELECT DISTINCT facilitator_id FROM reports_mandate;

-- Check responses for a specific program
SELECT program_name, COUNT(*) as response_count
FROM program_tracking_responses
GROUP BY program_name;
```

---

## Quick Test

1. **Open Reports tab**
2. **Press F12** to open console
3. **Share the complete output** of these logs:
   - Full facilitator_id in the "Loading" log
   - The array contents from "loaded" log
   - Any error messages

This will help identify exactly where the issue is!
