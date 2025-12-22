# Double-Booking Prevention & Calendar Events

## ⚠️ Current Situation

### How It Works Now:

1. **Slot Filtering (Prevention)**
   - When fetching available slots, system checks booked sessions
   - Already booked slots are filtered out
   - Only unbooked slots are shown to startups

2. **Potential Issue: Race Condition**
   - If two startups try to book the same slot at the same time
   - Both might see it as available
   - Both might try to book
   - **Could result in double-booking**

3. **Calendar Events**
   - If double-booking occurs, **multiple calendar events** would be created
   - All events would be at the same time
   - This would cause conflicts in your calendar

---

## 🔍 Current Protection

### What Prevents Double-Booking:

1. **Frontend Filtering**
   ```typescript
   // In getAvailableSlotsForDateRange:
   const bookedTimes = new Set(
     bookedSessions.map(s => `${s.session_date}T${s.session_time}`)
   );
   
   // Only show unbooked slots
   if (!bookedTimes.has(timeKey)) {
     availableSlots.push({ date, time, slotId });
   }
   ```

2. **Real-time Updates**
   - When a slot is booked, it's immediately saved to database
   - Next time slots are fetched, it's filtered out
   - Other startups won't see it anymore

### What's Missing:

❌ **No Database Constraint** - Database doesn't prevent double-booking at the constraint level
❌ **No Transaction Lock** - No locking mechanism for concurrent bookings
❌ **Race Condition Possible** - Two startups booking simultaneously could both succeed

---

## 🚨 What Happens If Double-Booking Occurs

### Scenario: Two Startups Book Same Slot

**Timeline:**
```
Time 0ms:  Startup A sees slot available
Time 0ms:  Startup B sees slot available (same time)
Time 100ms: Startup A books → Session saved
Time 100ms: Startup B books → Session saved (both succeed!)
Time 200ms: Calendar event created for Startup A
Time 200ms: Calendar event created for Startup B
```

**Result:**
- ✅ Two sessions in database (same mentor, same time)
- ✅ Two calendar events at same time
- ❌ Mentor double-booked
- ❌ Calendar shows conflicts

---

## ✅ Solution: Add Database Constraint

### Recommended Fix:

Add a **UNIQUE constraint** to prevent double-booking at the database level:

```sql
-- Add unique constraint to prevent double-booking
ALTER TABLE mentor_startup_sessions
ADD CONSTRAINT unique_mentor_time_slot 
UNIQUE (mentor_id, session_date, session_time, status)
WHERE status = 'scheduled';
```

**What This Does:**
- ✅ Prevents multiple 'scheduled' sessions for same mentor/date/time
- ✅ Database rejects second booking automatically
- ✅ Error returned to second startup
- ✅ Only one calendar event created

---

## 🔧 Implementation

### Step 1: Add Database Constraint

Create a SQL migration file:

```sql
-- Prevent double-booking: Only one scheduled session per mentor/date/time
-- This ensures no two startups can book the same time slot

-- First, check if constraint already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_mentor_time_slot'
  ) THEN
    -- Add unique constraint for scheduled sessions only
    ALTER TABLE mentor_startup_sessions
    ADD CONSTRAINT unique_mentor_time_slot 
    UNIQUE (mentor_id, session_date, session_time, status)
    WHERE status = 'scheduled';
    
    RAISE NOTICE 'Constraint unique_mentor_time_slot created successfully';
  ELSE
    RAISE NOTICE 'Constraint unique_mentor_time_slot already exists';
  END IF;
END $$;
```

### Step 2: Update Error Handling

Update `bookSession` to handle constraint violation:

```typescript
// In mentorSchedulingService.ts - bookSession method
try {
  const { data, error } = await supabase
    .from('mentor_startup_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    // Check if it's a unique constraint violation (double-booking)
    if (error.code === '23505' || error.message?.includes('unique_mentor_time_slot')) {
      throw new Error('This time slot has already been booked by another startup. Please select a different time.');
    }
    throw error;
  }
  // ... rest of code
}
```

### Step 3: Update UI

Show user-friendly error message:

```typescript
// In SchedulingModal.tsx
catch (err: any) {
  if (err.message?.includes('already been booked')) {
    setError('This time slot is no longer available. Please select another time.');
    // Reload available slots
    loadAvailableSlots();
  } else {
    setError(err.message || 'Failed to book session. Please try again.');
  }
}
```

---

## 📊 After Fix: What Happens

### Scenario: Two Startups Try to Book Same Slot

**Timeline:**
```
Time 0ms:  Startup A sees slot available
Time 0ms:  Startup B sees slot available
Time 100ms: Startup A books → ✅ Session saved
Time 100ms: Startup B books → ❌ Database rejects (constraint violation)
Time 200ms: Calendar event created for Startup A only
Time 200ms: Startup B sees error: "Slot already booked"
Time 300ms: Startup B's UI refreshes, slot no longer shown
```

**Result:**
- ✅ Only one session in database
- ✅ Only one calendar event
- ✅ No double-booking
- ✅ Second startup gets clear error message

---

## 🎯 Summary

| Aspect | Current | After Fix |
|--------|---------|-----------|
| **Frontend Filtering** | ✅ Works | ✅ Works |
| **Database Constraint** | ❌ Missing | ✅ Added |
| **Race Condition** | ⚠️ Possible | ✅ Prevented |
| **Double Calendar Events** | ⚠️ Possible | ✅ Prevented |
| **Error Handling** | ⚠️ Generic | ✅ User-friendly |

---

## 🚀 Recommended Action

**Add the database constraint** to prevent double-booking at the database level. This ensures:
- ✅ No double-booking possible
- ✅ Only one calendar event per time slot
- ✅ Clear error messages for users
- ✅ Data integrity guaranteed




