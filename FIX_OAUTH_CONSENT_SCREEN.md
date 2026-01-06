# Fix OAuth Consent Screen - Add Test Users

## 🐛 Error: "TMS has not completed the Google verification process"

This happens because your OAuth app is in "Testing" mode and the email you're using isn't added as a test user.

---

## ✅ Solution: Add Test Users

### Step 1: Go to OAuth Consent Screen

1. **Go to:** https://console.cloud.google.com/
2. **Select your project:** "Track My Startup"
3. **Navigate to:** APIs & Services → OAuth consent screen
   - Or go directly: https://console.cloud.google.com/apis/credentials/consent

---

### Step 2: Add Test Users

1. **Scroll down to "Test users" section**
2. **Click "ADD USERS"** button
3. **Add your email addresses:**
   - `saeelmomin.tms@gmail.com` (the one you're trying to use)
   - `trackmystartup.app@gmail.com` (your app account - if different)
   - Any other emails you want to test with
4. **Click "ADD"** for each email
5. **Click "SAVE"** at the bottom

---

### Step 3: Try OAuth Playground Again

1. **Go back to:** https://developers.google.com/oauthplayground/
2. **Try authorizing again**
3. **Sign in with:** `saeelmomin.tms@gmail.com` (or the email you added)
4. **Should work now!** ✅

---

## 📝 Quick Steps Summary

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Scroll to "Test users" section
3. Click "ADD USERS"
4. Add: `saeelmomin.tms@gmail.com`
5. Click "ADD" then "SAVE"
6. Try OAuth Playground again

---

## 🔍 Alternative: Use Different Email

If you want to use a different email:

1. **Create app account:** `trackmystartup.app@gmail.com` (or any Gmail)
2. **Add that email** as a test user in OAuth consent screen
3. **Use that email** in OAuth Playground

---

## ✅ What You Should See

After adding test users, in "Test users" section you'll see:
- ✅ `saeelmomin.tms@gmail.com`
- ✅ Any other emails you added

---

## 🎯 After Adding Test Users

Once test users are added:
1. OAuth Playground will work
2. You can sign in with the test user email
3. Get the refresh token
4. Add to Vercel
5. Meet links will be generated!

---

## 💡 Pro Tip

**Add multiple test users:**
- Your personal email
- App account email
- Any emails you might use for testing

This way you can test with different accounts.

---

That's it! Just add your email as a test user and it will work.

