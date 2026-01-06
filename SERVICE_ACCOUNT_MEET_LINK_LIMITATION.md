# Service Account Google Meet Link Limitation

## ⚠️ Important Discovery

**Service accounts CANNOT create Google Meet links directly.**

This is a Google API limitation - service accounts don't have permission to create Google Meet conference links, even when the Calendar API is enabled.

---

## 🔍 What We Found

### Error:
```
"Invalid conference type value"
```

### Root Cause:
- Service accounts are system accounts, not user accounts
- Google Meet links require a user calendar context
- Service account calendars don't support Meet link generation

---

## ✅ Solutions

### Option 1: Use OAuth 2.0 for User Calendars (Recommended)

**Best approach:** When users connect their Google Calendar via OAuth, create events in THEIR calendar, which CAN have Meet links.

**How it works:**
1. User connects Google Calendar (OAuth flow)
2. Create events in user's calendar (not service account)
3. Google automatically generates Meet links
4. Both mentor and startup get calendar invites with Meet links

**Implementation:**
- Already have OAuth setup in the codebase
- Use `createCalendarEventWithMeet()` with user's OAuth token
- This creates events in user's calendar with Meet links

---

### Option 2: Create Events Without Meet Links (Current Workaround)

**What we're doing now:**
- Create calendar events via service account (works)
- Events don't have Meet links (limitation)
- Meet links can be added manually or via OAuth later

**Limitations:**
- No automatic Meet link generation
- Users need to add Meet links manually
- Or connect their Google Calendar for automatic Meet links

---

### Option 3: Generate Meet Links Separately (Not Recommended)

**Alternative approaches:**
- Use Google Meet API directly (requires different setup)
- Generate Meet room URLs manually (not tied to calendar events)
- Use third-party services

**Not recommended because:**
- Meet links should be tied to calendar events
- Manual links don't sync with calendar
- More complex to maintain

---

## 🎯 Recommended Approach

### For Production:

1. **Encourage users to connect Google Calendar:**
   - When mentor/startup connects their Google Calendar
   - Create events in their calendar (via OAuth)
   - Google automatically generates Meet links
   - Both parties get calendar invites

2. **Fallback for users without Google Calendar:**
   - Create events via service account (no Meet link)
   - Show message: "Connect Google Calendar to get Meet links automatically"
   - Or provide manual Meet link generation option

3. **Update SchedulingModal:**
   - Try to create event in user's calendar first (if OAuth connected)
   - Fall back to service account if no OAuth
   - Show appropriate message based on which method was used

---

## 📝 Code Changes Needed

### 1. Update SchedulingModal to prefer OAuth

```typescript
// In SchedulingModal.tsx
// 1. Check if mentor has Google Calendar connected
const integration = await googleCalendarService.getIntegration(mentorId, 'Mentor');

if (integration && integration.calendar_sync_enabled) {
  // Use OAuth - can create Meet links
  const result = await googleCalendarService.createCalendarEventWithMeet(integration, event);
  // This will have a Meet link!
} else {
  // Fall back to service account - no Meet link
  const result = await googleCalendarService.createCalendarEventWithServiceAccount(event, attendees);
  // No Meet link, but event is created
}
```

### 2. Update UI to show Meet link status

- If Meet link exists: Show "Join Google Meet" button
- If no Meet link: Show "Connect Google Calendar to get Meet links" message

---

## 🔧 Current Status

**What works:**
- ✅ Service account can create calendar events
- ✅ Events are created successfully
- ✅ Attendees receive calendar invites

**What doesn't work:**
- ❌ Service account cannot create Meet links
- ❌ `generate-meet-link` endpoint fails
- ❌ `create-event-service-account` cannot add Meet links

**What we need:**
- ✅ OAuth integration for user calendars (already exists)
- ✅ Update booking flow to use OAuth when available
- ✅ Fallback to service account when OAuth not available

---

## 📋 Next Steps

1. **Test OAuth calendar event creation:**
   - Connect a Google Calendar via OAuth
   - Create event using OAuth token
   - Verify Meet link is generated

2. **Update booking flow:**
   - Prefer OAuth when available
   - Fall back to service account
   - Show appropriate UI messages

3. **Update documentation:**
   - Explain Meet link limitation
   - Guide users to connect Google Calendar
   - Show benefits of OAuth connection

---

## 🎯 Summary

**The issue:** Service accounts cannot create Google Meet links.

**The solution:** Use OAuth 2.0 to create events in user calendars, which CAN have Meet links.

**The workaround:** Create events via service account without Meet links, encourage users to connect their Google Calendar for automatic Meet link generation.

---

## ✅ Action Items

- [ ] Test OAuth calendar event creation with Meet links
- [ ] Update SchedulingModal to prefer OAuth
- [ ] Add UI messages about Meet link availability
- [ ] Update user documentation
- [ ] Test full booking flow with OAuth


