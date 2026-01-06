# Google Meet Link Testing Guide

## 🐛 Issue Fixed

**Problem:** Google Meet links were being generated but became invalid when opened, showing error: "Check your meeting code - Make sure that you've entered the correct meeting code in the URL"

**Root Cause:** The temporary calendar event used to generate the Meet link was being deleted immediately, which invalidated the Meet link. Google Meet links are tied to calendar events, so deleting the event makes the link invalid.

**Solution:** 
1. Changed the flow to create the actual calendar event FIRST, which generates a valid Meet link tied to a permanent event
2. Use that Meet link when booking the session
3. Removed deletion of temporary events (they're now kept as permanent calendar events)

---

## ✅ Changes Made

### 1. `api/google-calendar.ts`
- **Fixed `handleGenerateMeetLink`**: Stopped deleting the temporary event (commented out deletion code)
- **Note**: Temporary events are now kept, but the better approach is to use Meet links from actual calendar events

### 2. `components/mentor/SchedulingModal.tsx`
- **Refactored booking flow**: Now creates calendar event FIRST, then uses its Meet link
- **Flow**: Create calendar event → Get Meet link → Book session with valid link
- **Added**: Calendar event ID is stored in session for reference

### 3. `lib/googleCalendarService.ts`
- **Added validation**: `isValidMeetLink()` method to validate Meet link format
- **Improved error handling**: No longer returns fake Meet links on error

---

## 🧪 Testing Steps

### Test 1: Book a New Session

1. **As Mentor:**
   - Go to Mentor Dashboard → My Startups → Currently Mentoring
   - Click "Schedule" button next to a startup
   - Select a date and time slot
   - Click "Book Session"

2. **Expected Results:**
   - ✅ Session is created successfully
   - ✅ Google Meet link is generated and displayed
   - ✅ Meet link format: `https://meet.google.com/xxx-xxxx-xxx`
   - ✅ Meet link is clickable and opens in new tab

### Test 2: Verify Meet Link Works

1. **Click the Meet link** in the scheduled session card
2. **Expected Results:**
   - ✅ Opens Google Meet in new tab
   - ✅ Shows meeting room (not error message)
   - ✅ Can join the meeting (or see "Join" button if meeting hasn't started)
   - ❌ Should NOT show: "Check your meeting code" error

### Test 3: Check Calendar Event

1. **Check the calendar** (if Google Calendar is connected):
   - Event should be created with Meet link
   - Event should have both mentor and startup as attendees
   - Meet link in calendar should match the one in dashboard

### Test 4: Verify Link Format

1. **Check the Meet link format:**
   - Should start with: `https://meet.google.com/`
   - Should have meeting code: `xxx-xxxx-xxx` or `xxx-yyyy-zzz`
   - Example: `https://meet.google.com/abc-defg-hij`

### Test 5: Test from Startup Dashboard

1. **As Startup:**
   - Go to Startup Dashboard → My Services
   - Find the scheduled session
   - Click the Meet link

2. **Expected Results:**
   - ✅ Same Meet link as shown in mentor dashboard
   - ✅ Link works and opens meeting room
   - ✅ No error messages

---

## 🔍 Debugging

### If Meet Link Still Doesn't Work:

1. **Check API Response:**
   ```bash
   # Test Meet link generation endpoint
   curl -X POST https://your-domain.com/api/google-calendar?action=generate-meet-link
   ```
   - Should return: `{ "meetLink": "https://meet.google.com/..." }`

2. **Check Calendar Event Creation:**
   ```bash
   # Test calendar event creation
   curl -X POST https://your-domain.com/api/google-calendar?action=create-event-service-account \
     -H "Content-Type: application/json" \
     -d '{"event": {...}, "attendees": [...]}'
   ```
   - Should return: `{ "eventId": "...", "meetLink": "https://meet.google.com/..." }`

3. **Check Database:**
   ```sql
   SELECT id, session_date, session_time, google_meet_link, google_calendar_event_id
   FROM mentor_startup_sessions
   WHERE status = 'scheduled'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - `google_meet_link` should have valid URL
   - `google_calendar_event_id` should have event ID (if calendar event was created)

4. **Check Browser Console:**
   - Look for errors when booking session
   - Check network tab for API calls
   - Verify Meet link is in response

5. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Functions → `google-calendar`
   - Check for errors in function logs
   - Look for "Failed to generate Google Meet link" messages

---

## 📋 Validation Checklist

- [ ] Meet link is generated when booking session
- [ ] Meet link format is correct: `https://meet.google.com/xxx-xxxx-xxx`
- [ ] Meet link opens Google Meet (not error page)
- [ ] Meet link is same in both mentor and startup dashboards
- [ ] Calendar event is created (if attendees available)
- [ ] Calendar event has Meet link
- [ ] Meet link works from calendar invite (if sent)
- [ ] No "Check your meeting code" error

---

## 🎯 Expected Behavior

### Before Fix:
- ❌ Meet link generated but invalid
- ❌ Error: "Check your meeting code"
- ❌ Temporary event deleted, making link invalid

### After Fix:
- ✅ Meet link generated from permanent calendar event
- ✅ Link works when clicked
- ✅ No error messages
- ✅ Link persists and works for entire session duration

---

## 🔧 Environment Variables Required

Make sure these are set in Vercel:

- `GOOGLE_SERVICE_ACCOUNT_KEY` - Service account JSON key
- `GOOGLE_CLIENT_ID` - OAuth client ID (optional, for user calendar integration)
- `GOOGLE_CLIENT_SECRET` - OAuth client secret (optional)
- `GOOGLE_REDIRECT_URI` - OAuth redirect URI (optional)
- `GOOGLE_CALENDAR_ID` - Specific calendar ID (optional, defaults to 'primary')

---

## 📝 Notes

- **Temporary Events**: The temporary events created by `generate-meet-link` are now kept (not deleted). This is acceptable as they're small and don't clutter the calendar much. Alternatively, you can clean them up periodically.

- **Calendar Event Priority**: The system now prioritizes using Meet links from actual calendar events (which are permanent) over temporary events.

- **Fallback**: If calendar event creation fails, the system will try to generate a Meet link separately. However, this should be rare.

---

## ✅ Success Criteria

The fix is successful if:
1. ✅ Meet links are generated when booking sessions
2. ✅ Meet links open Google Meet without errors
3. ✅ Meet links work from both mentor and startup dashboards
4. ✅ No "Check your meeting code" errors appear
5. ✅ Calendar events are created with valid Meet links


