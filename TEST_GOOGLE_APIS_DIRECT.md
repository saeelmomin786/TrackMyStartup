# Direct Google API Testing Guide

This guide helps you test both Google APIs directly to verify they're working before testing the full application flow.

## 🎯 What We're Testing

1. **Google Meet Link Generation API** - Generates a Meet link using a temporary calendar event
2. **Google Calendar Event Creation API** - Creates a calendar event with a Meet link

---

## 🚀 Quick Test (Using curl)

### Test 1: Generate Google Meet Link

```bash
curl -X POST https://your-domain.com/api/google-calendar?action=generate-meet-link \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "eventId": "event_id_here"
}
```

**✅ Success Indicators:**
- HTTP Status: 200
- Response contains `meetLink` field
- Meet link format: `https://meet.google.com/xxx-xxxx-xxx`

---

### Test 2: Create Calendar Event with Meet Link

```bash
curl -X POST https://your-domain.com/api/google-calendar?action=create-event-service-account \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "summary": "Test Mentoring Session",
      "description": "Test event",
      "start": {
        "dateTime": "2024-12-20T10:00:00Z",
        "timeZone": "UTC"
      },
      "end": {
        "dateTime": "2024-12-20T11:00:00Z",
        "timeZone": "UTC"
      },
      "attendees": []
    }
  }'
```

**Expected Response:**
```json
{
  "eventId": "event_id_here",
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "hangoutLink": "https://meet.google.com/abc-defg-hij",
  "calendarId": "primary"
}
```

**✅ Success Indicators:**
- HTTP Status: 200
- Response contains `eventId` and `meetLink`
- Meet link format is valid

---

## 📝 Using Test Scripts

### Option 1: Node.js Script (Recommended)

**Requirements:** Node.js 18+ (has native fetch)

```bash
# Set your API base URL
export API_BASE_URL=https://your-domain.com

# Run the test
node test-google-apis.js
```

**Output:**
- ✅ Shows detailed test results
- ✅ Validates Meet link format
- ✅ Tests both APIs
- ✅ Provides summary

---

### Option 2: Bash Script

**Requirements:** curl, jq (optional, for pretty JSON)

```bash
# Make script executable
chmod +x test-google-apis.sh

# Set your API base URL
export API_BASE_URL=https://your-domain.com

# Run the test
./test-google-apis.sh
```

**Output:**
- ✅ Color-coded results
- ✅ Validates Meet link format
- ✅ Tests both APIs
- ✅ Provides summary

---

## 🔍 Manual Testing Steps

### Step 1: Test Meet Link Generation

1. **Open your browser or use Postman/Insomnia**
2. **Make POST request to:**
   ```
   https://your-domain.com/api/google-calendar?action=generate-meet-link
   ```
3. **Headers:**
   ```
   Content-Type: application/json
   ```
4. **Check Response:**
   - Should return `200 OK`
   - Should have `meetLink` in response
   - Link should start with `https://meet.google.com/`

### Step 2: Test Calendar Event Creation

1. **Make POST request to:**
   ```
   https://your-domain.com/api/google-calendar?action=create-event-service-account
   ```
2. **Headers:**
   ```
   Content-Type: application/json
   ```
3. **Body:**
   ```json
   {
     "event": {
       "summary": "Test Session",
       "description": "Test",
       "start": {
         "dateTime": "2024-12-20T10:00:00Z",
         "timeZone": "UTC"
       },
       "end": {
         "dateTime": "2024-12-20T11:00:00Z",
         "timeZone": "UTC"
       },
       "attendees": []
     }
   }
   ```
4. **Check Response:**
   - Should return `200 OK`
   - Should have `eventId` and `meetLink`
   - Meet link should be valid

### Step 3: Verify Meet Link Works

1. **Copy the Meet link from response**
2. **Open in browser:** `https://meet.google.com/xxx-xxxx-xxx`
3. **Expected:**
   - ✅ Opens Google Meet page
   - ✅ Shows meeting room (or "Join" button)
   - ❌ Should NOT show "Check your meeting code" error

---

## 🐛 Troubleshooting

### Error: "Google service account not configured"

**Problem:** `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable not set

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `GOOGLE_SERVICE_ACCOUNT_KEY` with your service account JSON
3. Redeploy the application

---

### Error: "Invalid service account key format"

**Problem:** Service account key is not in correct format

**Solution:**
- Ensure the key is valid JSON
- If stored as string, it should be a JSON string
- If stored as file path, ensure file exists

---

### Error: "Failed to generate Google Meet link"

**Problem:** Google Calendar API returned error

**Possible Causes:**
1. Service account doesn't have Calendar API enabled
2. Service account doesn't have proper permissions
3. Calendar API quota exceeded

**Solution:**
1. Check Google Cloud Console → APIs & Services → Enabled APIs
2. Ensure "Google Calendar API" is enabled
3. Check service account permissions
4. Check API quotas

---

### Error: 401 Unauthorized

**Problem:** Authentication failed

**Solution:**
1. Verify service account key is correct
2. Check if service account is active
3. Ensure Calendar API is enabled for the project

---

### Error: 403 Forbidden

**Problem:** Insufficient permissions

**Solution:**
1. Check service account has "Editor" or "Owner" role
2. Ensure Calendar API is enabled
3. Check if domain-wide delegation is needed (usually not for service accounts)

---

### Meet Link Format is Invalid

**Problem:** Meet link doesn't match expected format

**Possible Causes:**
1. Google API returned unexpected format
2. Response parsing issue

**Solution:**
1. Check raw API response
2. Verify Meet link starts with `https://meet.google.com/`
3. Check Vercel function logs

---

## ✅ Success Checklist

- [ ] Meet Link Generation API returns 200 OK
- [ ] Meet Link Generation API returns valid `meetLink`
- [ ] Calendar Event Creation API returns 200 OK
- [ ] Calendar Event Creation API returns `eventId` and `meetLink`
- [ ] Meet links have correct format: `https://meet.google.com/xxx-xxxx-xxx`
- [ ] Meet links open in browser without errors
- [ ] No "Check your meeting code" error when opening links

---

## 📊 Expected Results

### ✅ All Tests Pass

```
✅ Meet Link Generation: PASSED
✅ Calendar Event Creation: PASSED

🎉 All tests passed! Google APIs are working correctly.
```

### ❌ Tests Fail

```
❌ Meet Link Generation: FAILED
❌ Calendar Event Creation: FAILED

⚠️  Some tests failed. Please check:
   1. Environment variables are set correctly
   2. Google Service Account has proper permissions
   3. API endpoints are accessible
   4. Check Vercel logs for detailed error messages
```

---

## 🔗 Next Steps

Once both APIs are working:

1. **Test in Application:**
   - Book a session as mentor
   - Verify Meet link appears
   - Click link to ensure it works

2. **Verify in Dashboard:**
   - Check mentor dashboard → Scheduled Sessions
   - Check startup dashboard → Scheduled Sessions
   - Both should show same working Meet link

3. **Check Calendar:**
   - If Google Calendar is connected, verify event is created
   - Event should have Meet link

---

## 📝 Notes

- **Local Testing:** Use `http://localhost:3000` for local development
- **Production Testing:** Use your production domain (e.g., `https://trackmystartup.com`)
- **Service Account:** The service account needs Calendar API access
- **Quotas:** Google Calendar API has quotas - check if you're hitting limits

---

## 🆘 Need Help?

If tests fail:
1. Check Vercel function logs for detailed errors
2. Verify environment variables in Vercel dashboard
3. Check Google Cloud Console for API status
4. Review error messages in test output

