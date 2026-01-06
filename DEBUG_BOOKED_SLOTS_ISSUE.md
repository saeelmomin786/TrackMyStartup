# Debug Booked Slots Issue

## 🐛 Problem
Slots booked by Startup A are still showing as available to Startup B.

## 🔍 Debugging Steps

### 1. Check Console Logs
When a startup opens the scheduling modal, check the browser console for:

```
🔍 Fetching booked sessions for mentor: [mentorId] Date range: [startDate] to [endDate]
📅 Booked sessions found: [count]
📅 Booked sessions details: [...]
📅 Booked time slots (Set): [...]
```

### 2. Verify Booked Sessions Query
The query should return ALL scheduled sessions for the mentor:
```typescript
const { data: bookedSessions } = await supabase
  .from('mentor_startup_sessions')
  .select('session_date, session_time, startup_id')
  .eq('mentor_id', mentorId)
  .eq('status', 'scheduled')
  .gte('session_date', startDate)
  .lte('session_date', endDate);
```

### 3. Check RLS Policies
If `bookedSessions` is empty but slots are booked, check RLS policies on `mentor_startup_sessions` table.

**Possible RLS Issue:**
- Startup users might not be able to read sessions booked by other startups
- Need to verify RLS policy allows reading all scheduled sessions for a mentor

### 4. Verify Time Format Matching
Check if time formats match:
- Booked session time: `HH:MM:SS` or `HH:MM`?
- Slot time: `HH:MM`
- Normalized to: `HH:MM` (first 5 characters)

### 5. Test Query Directly
Run this query in Supabase SQL Editor:
```sql
SELECT 
  id,
  mentor_id,
  startup_id,
  session_date,
  session_time,
  status,
  created_at
FROM mentor_startup_sessions
WHERE mentor_id = 'YOUR_MENTOR_ID'
  AND status = 'scheduled'
  AND session_date >= CURRENT_DATE
ORDER BY session_date, session_time;
```

## 🔧 Potential Fixes

### Fix 1: RLS Policy Issue
If RLS is blocking the query, we need to allow startups to read all scheduled sessions for a mentor (not just their own).

### Fix 2: Time Format Issue
If time formats don't match, the `bookedTimes.has(timeKey)` check will fail.

### Fix 3: Date Format Issue
If dates are in different formats, the timeKey won't match.

## 📝 Next Steps

1. Check browser console logs when opening scheduling modal
2. Verify booked sessions are being fetched
3. Check RLS policies on `mentor_startup_sessions` table
4. Test the query directly in Supabase

