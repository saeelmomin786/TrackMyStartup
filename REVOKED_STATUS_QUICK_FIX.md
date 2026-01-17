# ⚡ Quick Fix - Run This NOW!

## Copy and Paste This into Supabase SQL Editor

```sql
-- Add 'revoked' to allowed status values
ALTER TABLE public.due_diligence_requests
DROP CONSTRAINT due_diligence_requests_status_check;

ALTER TABLE public.due_diligence_requests
ADD CONSTRAINT due_diligence_requests_status_check 
CHECK (status IN ('pending', 'paid', 'completed', 'failed', 'revoked'));
```

## Then Test

1. Refresh browser
2. Go to startup dashboard
3. Try to click "Stop Access" button
4. Should work now! ✅

## What This Does

Allows the new `'revoked'` status value in the database. That's it!

