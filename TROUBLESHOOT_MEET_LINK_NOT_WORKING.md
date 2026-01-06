# Troubleshoot: Meet Link Not Working

## 🐛 Issue: Still Using Service Account

The API is returning `"method": "service_account"` which means it's not finding the app account refresh token.

---

## ✅ Check 1: Verify Environment Variable Name

**The variable name must be EXACTLY:**
```
GOOGLE_APP_ACCOUNT_REFRESH_TOKEN
```

**Common mistakes:**
- ❌ `GOOGLE_APP_REFRESH_TOKEN` (missing "ACCOUNT")
- ❌ `GOOGLE_APP_ACCOUNT_TOKEN` (missing "REFRESH")
- ❌ `GOOGLE_REFRESH_TOKEN` (missing "APP_ACCOUNT")
- ✅ `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN` (CORRECT)

---

## ✅ Check 2: Verify Environment Variable Value

1. **Go to Vercel Dashboard:**
   - Settings → Environment Variables
   - Find `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN`

2. **Check the value:**
   - Should start with: `1//` or `1/`
   - Should be long (50+ characters)
   - Should NOT have extra spaces or quotes

3. **Example of correct format:**
   ```
   1//04nxOD3k7YX_6CgYIARAAGAQSNwF-L9lrYdqGB5D7w
   ```

---

## ✅ Check 3: Verify Environment is Set for All

**Make sure the variable is set for:**
- ✅ Production
- ✅ Preview  
- ✅ Development

**Or at least:**
- ✅ Production (if testing on production URL)

---

## ✅ Check 4: Redeploy After Adding Variable

**Important:** After adding/changing environment variables:
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait 2-3 minutes for deployment to complete

**Environment variables only take effect after redeployment!**

---

## ✅ Check 5: Verify Both Variables Are Set

You need BOTH variables:

1. **`GOOGLE_APP_ACCOUNT_REFRESH_TOKEN`**
   - Value: The refresh token from OAuth Playground

2. **`GOOGLE_APP_ACCOUNT_EMAIL`**
   - Value: `saeelmomin.tms@gmail.com` (or the email you used)

---

## 🔍 Debug: Check Vercel Logs

1. **Go to Vercel Dashboard:**
   - Your Project → Functions
   - Click on `google-calendar` function
   - Go to "Logs" tab

2. **Look for errors:**
   - "GOOGLE_APP_ACCOUNT_REFRESH_TOKEN not configured"
   - "Failed to get access token"
   - Any other errors

---

## 🧪 Test: Verify Variable is Accessible

After redeploying, the API should:
- Try app account OAuth first
- If refresh token exists → use it (generates Meet links)
- If refresh token missing → fall back to service account (no Meet links)

**Current behavior:** Falling back to service account = refresh token not found

---

## 📝 Step-by-Step Fix

1. **Go to Vercel:** https://vercel.com/dashboard
2. **Select project:** Track My Startup
3. **Go to:** Settings → Environment Variables
4. **Check if `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN` exists:**
   - If NO → Add it (see below)
   - If YES → Check value and environment

5. **If adding:**
   - Name: `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN`
   - Value: `1//04nxOD3k7YX_6CgYIARAAGAQSNwF-L9lrYdqGB5D7w` (your actual token)
   - Environment: All
   - Save

6. **Add second variable:**
   - Name: `GOOGLE_APP_ACCOUNT_EMAIL`
   - Value: `saeelmomin.tms@gmail.com`
   - Environment: All
   - Save

7. **Redeploy:**
   - Deployments → ... → Redeploy
   - Wait 2-3 minutes

8. **Test again:**
   ```powershell
   $now = (Get-Date).ToUniversalTime()
   $later = $now.AddHours(1)
   $data = @{event=@{summary="Test";start=@{dateTime=$now.ToString("yyyy-MM-ddTHH:mm:ssZ");timeZone="UTC"};end=@{dateTime=$later.ToString("yyyy-MM-ddTHH:mm:ssZ");timeZone="UTC"};attendees=@()}} | ConvertTo-Json -Depth 10
   Invoke-RestMethod -Uri "https://trackmystartup.com/api/google-calendar?action=create-event-service-account" -Method Post -ContentType "application/json" -Body $data
   ```

9. **Expected result:**
   ```json
   {
     "eventId": "...",
     "meetLink": "https://meet.google.com/xxx-xxxx-xxx",  ← Should have this!
     "method": "app_account_oauth"  ← Should show this!
   }
   ```

---

## ✅ Success Indicators

**When it's working, you'll see:**
- ✅ `"method": "app_account_oauth"` (not "service_account")
- ✅ `"meetLink"` is NOT null
- ✅ `"meetLink"` starts with `https://meet.google.com/`

---

## 🆘 Still Not Working?

1. **Check Vercel logs** for detailed error messages
2. **Verify refresh token** is correct (copy from OAuth Playground again)
3. **Make sure you redeployed** after adding variables
4. **Check variable name** is exactly `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN`

---

The most common issue is: **Not redeploying after adding environment variables!**

Make sure you redeploy after adding/changing variables.

