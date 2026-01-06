# Fix Slot Availability Issues ✅

## 🐛 Issues Fixed

### 1. **Old/Past Slots Showing** ✅
**Problem**: Slots from past dates and past times (for today) were still showing as available.

**Fix**: Added date/time filtering to exclude past slots:
- Check if slot date is before current date → Skip
- Check if slot is today but time is in the past → Skip
- Only show future slots (date + time)

### 2. **Booked Slots Still Showing** ✅
**Problem**: Slots that were already booked were still appearing as available.

**Fix**: 
- Normalized time format to ensure proper matching (HH:MM format)
- Booked sessions time format might be `HH:MM:SS`, but slot time is `HH:MM`
- Now both are normalized to `HH:MM` for accurate comparison

### 3. **Slots Booked by Other Startups Showing** ✅
**Problem**: Slots booked by one startup were still visible to other startups.

**Fix**: 
- Query already gets ALL booked sessions for the mentor (regardless of startup_id)
- This ensures slots booked by ANY startup are hidden from ALL startups
- Added better logging to verify this is working

## 🔧 Technical Changes

### Time Format Normalization
```typescript
// Before: Time format mismatch could cause booked slots to show
const timeKey = `${dateStr}T${slot.start_time}`; // Might be HH:MM:SS

// After: Normalize both to HH:MM format
const normalizedSlotTime = slot.start_time.substring(0, 5); // HH:MM
const normalizedSessionTime = s.session_time.substring(0, 5); // HH:MM
const timeKey = `${dateStr}T${normalizedSlotTime}`;
```

### Past Slot Filtering
```typescript
// Get current date/time
const now = new Date();
const currentDateStr = now.toISOString().split('T')[0];
const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);

// Filter out past slots
const isPastDate = dateStr < currentDateStr;
const isToday = dateStr === currentDateStr;
const isPastTime = isToday && normalizedSlotTime < currentTimeStr;

if (isPastDate || isPastTime) {
  // Skip this slot
  continue;
}
```

### Booked Sessions Query
```typescript
// Gets ALL scheduled sessions for the mentor (regardless of startup)
const { data: bookedSessions } = await supabase
  .from('mentor_startup_sessions')
  .select('session_date, session_time, startup_id')
  .eq('mentor_id', mentorId)
  .eq('status', 'scheduled')
  .gte('session_date', startDate)
  .lte('session_date', endDate);

// Creates Set of booked time slots (normalized format)
const bookedTimes = new Set(
  bookedSessions.map(s => {
    const normalizedTime = s.session_time.substring(0, 5); // HH:MM
    return `${s.session_date}T${normalizedTime}`;
  })
);
```

## ✅ Result

Now the startup dashboard will:
- ✅ **Hide past slots** (dates and times in the past)
- ✅ **Hide booked slots** (slots already booked by any startup)
- ✅ **Show only available future slots** (not booked, not in the past)

## 🧪 Testing

After these changes, test:
1. Create a slot for today at a past time → Should NOT appear
2. Create a slot for yesterday → Should NOT appear
3. Book a slot → Should disappear from all startups' views
4. Book a slot as Startup A → Startup B should NOT see it
5. Only future, unbooked slots should be visible

## 📝 Files Changed

- `lib/mentorSchedulingService.ts` - `getAvailableSlotsForDateRange()` function

