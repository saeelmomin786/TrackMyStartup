# Next Steps: Google Meet Link Fix

## 📋 What We've Done

✅ Fixed Google Meet link generation (stopped deleting temporary events)
✅ Refactored booking flow to use Meet links from permanent calendar events
✅ Added Meet link validation
✅ Created test scripts to verify APIs

---

## 🚀 Step-by-Step Action Plan

### Step 1: Test APIs Locally (Optional but Recommended)

**If you're running locally:**

```powershell
# Test with localhost
$env:API_BASE_URL="http://localhost:3000"
.\test-google-apis.ps1
```

**Or test directly with curl:**
```bash
curl -X POST http://localhost:3000/api/google-calendar?action=generate-meet-link -H "Content-Type: application/json"
```

**Expected:** Should return a Meet link (if environment variables are set locally)

---

### Step 2: Review Changes (Important!)

**Files Changed:**
1. `api/google-calendar.ts` - Fixed Meet link generation
2. `components/mentor/SchedulingModal.tsx` - Refactored booking flow
3. `lib/googleCalendarService.ts` - Added validation

**Review the changes:**
- Check that the logic makes sense
- Verify no breaking changes

---

### Step 3: Commit and Push Code

```bash
# Check what files changed
git status

# Add the changed files
git add api/google-calendar.ts
git add components/mentor/SchedulingModal.tsx
git add lib/googleCalendarService.ts

# Add test files (optional, but useful)
git add test-google-apis.js
git add test-google-apis.ps1
git add test-google-apis.sh
git add TEST_GOOGLE_APIS_DIRECT.md
git add GOOGLE_MEET_LINK_TESTING.md
git add NEXT_STEPS_GOOGLE_MEET_FIX.md

# Commit with descriptive message
git commit -m "Fix Google Meet link generation - use permanent calendar events instead of temporary ones

- Stop deleting temporary events in handleGenerateMeetLink
- Refactor SchedulingModal to create calendar event first and use its Meet link
- Add Meet link validation in googleCalendarService
- Add test scripts for API verification"

# Push to your repository
git push origin main
```

**Note:** If you're using a different branch, replace `main` with your branch name.

---

### Step 4: Wait for Deployment

**If using Vercel:**
- Vercel will automatically deploy after push
- Wait for deployment to complete (check Vercel dashboard)
- Usually takes 2-5 minutes

**If using other hosting:**
- Follow your deployment process
- Wait for deployment to complete

---

### Step 5: Test APIs on Production

**Once deployed, test the APIs:**

```powershell
# Set your production URL
$env:API_BASE_URL="https://your-domain.com"

# Run the test script
.\test-google-apis.ps1
```

**Or test manually:**

**Test 1: Meet Link Generation**
```bash
curl -X POST https://your-domain.com/api/google-calendar?action=generate-meet-link -H "Content-Type: application/json"
```

**Test 2: Calendar Event Creation**
```bash
curl -X POST https://your-domain.com/api/google-calendar?action=create-event-service-account -H "Content-Type: application/json" -d "{\"event\":{\"summary\":\"Test\",\"start\":{\"dateTime\":\"2024-12-20T10:00:00Z\",\"timeZone\":\"UTC\"},\"end\":{\"dateTime\":\"2024-12-20T11:00:00Z\",\"timeZone\":\"UTC\"}}}"
```

**Expected Results:**
- ✅ Both APIs return 200 OK
- ✅ Both return valid Meet links
- ✅ Meet links have correct format: `https://meet.google.com/xxx-xxxx-xxx`

---

### Step 6: Test Full Booking Flow

**Once APIs are working:**

1. **As Mentor:**
   - Go to Mentor Dashboard → My Startups → Currently Mentoring
   - Click "Schedule" button
   - Select date and time
   - Book a session

2. **Verify:**
   - ✅ Session is created
   - ✅ Meet link appears in session card
   - ✅ Meet link format is correct
   - ✅ Clicking link opens Google Meet (not error page)

3. **Check Both Dashboards:**
   - ✅ Mentor dashboard shows Meet link
   - ✅ Startup dashboard shows same Meet link
   - ✅ Both links work when clicked

---

### Step 7: Verify Meet Links Work

**Critical Test:**
1. Click the Meet link from dashboard
2. **Expected:** Opens Google Meet page
3. **Should NOT see:** "Check your meeting code" error
4. **Should see:** Meeting room or "Join" button

---

## ⚠️ Important Notes

### Environment Variables

**Make sure these are set in Vercel:**
- ✅ `GOOGLE_SERVICE_ACCOUNT_KEY` - Service account JSON
- ✅ `GOOGLE_CLIENT_ID` - (Optional, for OAuth)
- ✅ `GOOGLE_CLIENT_SECRET` - (Optional, for OAuth)
- ✅ `GOOGLE_REDIRECT_URI` - (Optional, for OAuth)
- ✅ `GOOGLE_CALENDAR_ID` - (Optional, defaults to 'primary')

**Check in Vercel Dashboard:**
- Settings → Environment Variables
- Ensure all required variables are set
- Redeploy if you add/change variables

---

### If Tests Fail

**Common Issues:**

1. **"Google service account not configured"**
   - Check `GOOGLE_SERVICE_ACCOUNT_KEY` is set in Vercel
   - Verify JSON format is correct

2. **"Failed to generate Google Meet link"**
   - Check Google Cloud Console → APIs enabled
   - Verify Calendar API is enabled
   - Check service account permissions

3. **401/403 Errors**
   - Verify service account key is valid
   - Check API quotas haven't been exceeded

**Debug Steps:**
1. Check Vercel function logs
2. Review error messages in test output
3. Verify environment variables
4. Check Google Cloud Console

---

## ✅ Success Checklist

Before considering this complete:

- [ ] Code committed and pushed
- [ ] Deployment completed
- [ ] API tests pass (both endpoints return valid Meet links)
- [ ] Can book a session successfully
- [ ] Meet link appears in dashboard
- [ ] Meet link opens Google Meet (no error)
- [ ] Meet link works from both mentor and startup dashboards
- [ ] No "Check your meeting code" error

---

## 🎯 Quick Command Summary

```bash
# 1. Review changes
git status

# 2. Add and commit
git add api/google-calendar.ts components/mentor/SchedulingModal.tsx lib/googleCalendarService.ts
git commit -m "Fix Google Meet link generation"

# 3. Push
git push origin main

# 4. Wait for deployment (check Vercel dashboard)

# 5. Test APIs
$env:API_BASE_URL="https://your-domain.com"
.\test-google-apis.ps1

# 6. Test booking flow in app
```

---

## 📞 Need Help?

If something doesn't work:
1. Check Vercel logs for errors
2. Run test scripts to identify which API fails
3. Verify environment variables
4. Check Google Cloud Console for API status

---

## 🎉 Expected Outcome

After completing these steps:
- ✅ Google Meet links are generated correctly
- ✅ Links work when clicked (no errors)
- ✅ Links are tied to permanent calendar events
- ✅ Both mentor and startup can access working Meet links

