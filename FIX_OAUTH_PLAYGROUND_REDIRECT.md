# Fix OAuth Playground Redirect URI Error

## 🐛 Error: redirect_uri_mismatch

This happens because OAuth Playground's redirect URI isn't registered in your Google Cloud Console.

---

## ✅ Solution: Add OAuth Playground Redirect URI

### Step 1: Go to Google Cloud Console

1. **Go to:** https://console.cloud.google.com/
2. **Select your project:** "Track My Startup" (or your project name)
3. **Navigate to:** APIs & Services → Credentials
   - Or go directly: https://console.cloud.google.com/apis/credentials

---

### Step 2: Edit Your OAuth 2.0 Client

1. **Find your OAuth client:**
   - Look for "TMS" (or your OAuth client name)
   - Click the **pencil icon (✏️)** to edit

---

### Step 3: Add OAuth Playground Redirect URI

1. **Scroll down to "Authorized redirect URIs"**
2. **Click "ADD URI"**
3. **Add this exact URI:**
   ```
   https://developers.google.com/oauthplayground
   ```
4. **Click "SAVE"**

---

### Step 4: Try OAuth Playground Again

1. **Go back to:** https://developers.google.com/oauthplayground/
2. **Configure:**
   - Click gear icon (⚙️)
   - Check "Use your own OAuth credentials"
   - Enter Client ID and Secret
3. **Authorize:**
   - Select Calendar API v3
   - Check `https://www.googleapis.com/auth/calendar`
   - Click "Authorize APIs"
   - Should work now! ✅

---

## 🔄 Alternative: Use Your App's OAuth Flow

If OAuth Playground still doesn't work, you can get the refresh token from your app:

### Option A: Create Temporary OAuth Page

1. **Create a page** that shows the refresh token after OAuth
2. **Sign in** with your app account
3. **Copy the refresh token**

### Option B: Use curl/Postman

1. **Get authorization code** from your OAuth flow
2. **Exchange for tokens** using curl or Postman
3. **Extract refresh token**

---

## 📝 Quick Steps Summary

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click edit (✏️) on your OAuth client
3. Add redirect URI: `https://developers.google.com/oauthplayground`
4. Save
5. Try OAuth Playground again

---

## ✅ Verify It's Added

After adding, you should see in "Authorized redirect URIs":
- Your app's redirect URI (e.g., `https://trackmystartup.com/api/auth/callback`)
- `https://developers.google.com/oauthplayground` ← This one

---

## 🎯 Next Steps After Fix

Once OAuth Playground works:
1. Get the refresh token
2. Add to Vercel as `GOOGLE_APP_ACCOUNT_REFRESH_TOKEN`
3. Redeploy
4. Test Meet link generation

---

That's it! Just add that redirect URI and OAuth Playground will work.

