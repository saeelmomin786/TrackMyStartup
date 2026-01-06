# How to Test Google Calendar APIs

## 🧪 Quick Testing Guide

This guide shows you exactly how to test both Google Calendar API endpoints.

---

## ✅ Prerequisites

Before testing, make sure:
- [ ] Code is deployed to Vercel (wait 2-3 minutes after push)
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` is set in Vercel environment variables
- [ ] Google Calendar API is enabled in Google Cloud Console

---

## 🚀 Method 1: Using PowerShell (Easiest for Windows)

### Test 1: Create Calendar Event (Should Work)

Open PowerShell and run:

```powershell
# Set the event data
$now = (Get-Date).ToUniversalTime()
$oneHourLater = $now.AddHours(1)

$eventData = @{
    event = @{
        summary = "Test Mentoring Session"
        description = "Testing Google Calendar API"
        start = @{
            dateTime = $now.ToString("yyyy-MM-ddTHH:mm:ssZ")
            timeZone = "UTC"
        }
        end = @{
            dateTime = $oneHourLater.ToString("yyyy-MM-ddTHH:mm:ssZ")
            timeZone = "UTC"
        }
        attendees = @()
    }
} | ConvertTo-Json -Depth 10

# Test the endpoint
Invoke-RestMethod -Uri "https://trackmystartup.com/api/google-calendar?action=create-event-service-account" -Method Post -ContentType "application/json" -Body $eventData
```

**Expected Result:**
```json
{
  "eventId": "event_id_here",
  "hangoutLink": null,
  "meetLink": null,
  "calendarId": "primary",
  "note": "Service accounts cannot create Google Meet links..."
}
```

**✅ Success Indicators:**
- Status: 200 OK
- `eventId` is present
- Event is created in calendar

---

### Test 2: Generate Meet Link (Will Fail - Expected)

```powershell
Invoke-RestMethod -Uri "https://trackmystartup.com/api/google-calendar?action=generate-meet-link" -Method Post -ContentType "application/json"
```

**Expected Result:**
```json
{
  "error": "Unable to generate Google Meet link with service account",
  "details": "Service accounts may not have permission to create Google Meet links..."
}
```

**⚠️ This is Expected:** Service accounts cannot create Meet links (Google limitation)

---

## 🚀 Method 2: Using the Test Script

I've created a test script for you:

### Run the Test Script:

```powershell
# Make sure you're in the project directory
cd "C:\Users\Lenovo\Desktop\Track My Startup (2)\Track My Startup"

# Run the test script
.\test-google-apis.ps1
```

**Or set custom URL:**
```powershell
$env:API_BASE_URL="https://trackmystartup.com"
.\test-google-apis.ps1
```

**What it does:**
- Tests both endpoints automatically
- Shows detailed results
- Validates responses
- Provides summary

---

## 🚀 Method 3: Using curl (If Available)

### Test 1: Create Calendar Event

```bash
curl -X POST "https://trackmystartup.com/api/google-calendar?action=create-event-service-account" \
  -H "Content-Type: application/json" \
  -d "{\"event\":{\"summary\":\"Test Session\",\"start\":{\"dateTime\":\"2024-12-20T10:00:00Z\",\"timeZone\":\"UTC\"},\"end\":{\"dateTime\":\"2024-12-20T11:00:00Z\",\"timeZone\":\"UTC\"}}}"
```

### Test 2: Generate Meet Link

```bash
curl -X POST "https://trackmystartup.com/api/google-calendar?action=generate-meet-link" \
  -H "Content-Type: application/json"
```

---

## 🚀 Method 4: Using Browser (HTML Test Page)

1. **Open the test page:**
   - Open `test-google-api.html` in your browser
   - Or go to: `file:///C:/Users/Lenovo/Desktop/Track My Startup (2)/Track My Startup/test-google-api.html`

2. **Set the API URL:**
   - Make sure it shows: `https://trackmystartup.com`

3. **Click the buttons:**
   - Click "Generate Meet Link" (will show error - expected)
   - Click "Create Calendar Event" (should work)

4. **Check results:**
   - Green box = Success ✅
   - Red box = Error ❌

---

## 📊 What to Expect

### ✅ Success (Create Event):

```json
{
  "eventId": "abc123def456",
  "hangoutLink": null,
  "meetLink": null,
  "calendarId": "primary",
  "note": "Service accounts cannot create Google Meet links. Connect user calendars via OAuth for Meet link generation."
}
```

**What this means:**
- ✅ Event was created successfully
- ✅ Event ID is returned
- ⚠️ No Meet link (service account limitation)

---

### ❌ Error (Generate Meet Link):

```json
{
  "error": "Unable to generate Google Meet link with service account",
  "details": "Service accounts may not have permission to create Google Meet links. Consider using OAuth 2.0 for user calendars instead.",
  "hint": "Try using the create-event-service-account endpoint which creates events in a shared calendar, or enable Google Meet API separately"
}
```

**What this means:**
- ❌ Service accounts can't create Meet links
- ✅ This is expected behavior
- 💡 Solution: Use OAuth for user calendars

---

## 🔍 Verify Event Was Created

### Option 1: Check Google Calendar

1. Go to: https://calendar.google.com/
2. Sign in with the service account email: `tms-318@track-my-startup-481806.iam.gserviceaccount.com`
3. Look for the test event you just created

**Note:** You might need to share the calendar or check the service account's calendar.

### Option 2: Check via API

You can list events to verify:

```powershell
# This would require additional API endpoint, but for now just check Google Calendar
```

---

## 🐛 Troubleshooting

### Error: "Google service account not configured"

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Check `GOOGLE_SERVICE_ACCOUNT_KEY` exists
3. Verify it has the complete JSON
4. Redeploy after adding/changing

---

### Error: "Method not allowed"

**Solution:**
- Make sure you're using `-Method Post` in PowerShell
- Or `-X POST` in curl
- Don't just paste URL in browser (that sends GET)

---

### Error: "Invalid conference type value"

**Solution:**
- This is expected for `generate-meet-link` endpoint
- Service accounts can't create Meet links
- Use `create-event-service-account` instead (creates events without Meet links)

---

### Error: "Failed to create calendar event"

**Possible causes:**
1. Service account doesn't have permission
2. Calendar API not enabled
3. Invalid service account key

**Solution:**
1. Check Google Cloud Console → APIs & Services → Library
2. Verify "Google Calendar API" is enabled
3. Check service account has "Editor" role
4. Verify service account key is correct

---

## ✅ Testing Checklist

After running tests, verify:

- [ ] `create-event-service-account` returns 200 OK
- [ ] `create-event-service-account` returns `eventId`
- [ ] Event appears in Google Calendar (if accessible)
- [ ] `generate-meet-link` returns error (expected)
- [ ] Error message is clear and helpful

---

## 🎯 Next Steps After Testing

Once you confirm events are being created:

1. **Test in the App:**
   - Book a session as mentor
   - Verify event is created
   - Check if Meet link appears (if OAuth connected)

2. **Test OAuth Flow:**
   - Connect Google Calendar via OAuth
   - Book a session
   - Verify Meet link is generated (should work with OAuth!)

3. **Update UI:**
   - Show message when no Meet link available
   - Encourage users to connect Google Calendar
   - Explain benefits of OAuth connection

---

## 📝 Quick Test Commands

**Copy and paste these in PowerShell:**

```powershell
# Test 1: Create Event (Should Work)
$now = (Get-Date).ToUniversalTime()
$later = $now.AddHours(1)
$data = @{event=@{summary="Test";start=@{dateTime=$now.ToString("yyyy-MM-ddTHH:mm:ssZ");timeZone="UTC"};end=@{dateTime=$later.ToString("yyyy-MM-ddTHH:mm:ssZ");timeZone="UTC"}}} | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "https://trackmystartup.com/api/google-calendar?action=create-event-service-account" -Method Post -ContentType "application/json" -Body $data

# Test 2: Generate Meet Link (Will Fail - Expected)
Invoke-RestMethod -Uri "https://trackmystartup.com/api/google-calendar?action=generate-meet-link" -Method Post -ContentType "application/json"
```

---

## 🎉 Success Criteria

**You're good to go when:**
- ✅ Events are created successfully
- ✅ Event IDs are returned
- ✅ No 500 errors (except expected Meet link limitation)
- ✅ Clear error messages for limitations

**Remember:** Meet links will only work when users connect their Google Calendar via OAuth!


