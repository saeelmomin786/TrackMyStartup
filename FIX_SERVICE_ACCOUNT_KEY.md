# Fix: "The incoming JSON object does not contain a client_email field"

## ✅ Good News!
Your API is working! The error means the service account key format is incorrect in Vercel.

---

## 🔧 Problem

The `GOOGLE_SERVICE_ACCOUNT_KEY` in Vercel is either:
- ❌ Not a valid JSON
- ❌ Missing the `client_email` field
- ❌ Not formatted correctly
- ❌ Only partial JSON was pasted

---

## 🔧 Solution: Fix the Environment Variable

### Step 1: Get the Correct Service Account Key

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/apis/credentials

2. **Find Your Service Account:**
   - Click on your service account (or create one if you haven't)

3. **Go to Keys Tab:**
   - Click "KEYS" tab
   - If you don't have a key, click "ADD KEY" → "Create new key" → "JSON"
   - Download the JSON file

4. **Open the JSON File:**
   - Open the downloaded file in a text editor (Notepad, VS Code, etc.)
   - It should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**✅ Important:** Make sure it has ALL these fields, especially `client_email`!

---

### Step 2: Copy the ENTIRE JSON

1. **Select ALL the content** in the JSON file (Ctrl+A)
2. **Copy it** (Ctrl+C)
3. **Make sure you copied everything** - from `{` to `}`

---

### Step 3: Add to Vercel (Two Options)

#### Option A: As Single-Line JSON String (Recommended)

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your project
   - Go to **Settings** → **Environment Variables**

2. **Edit or Add `GOOGLE_SERVICE_ACCOUNT_KEY`:**
   - Find `GOOGLE_SERVICE_ACCOUNT_KEY` (or create it)
   - **Paste the ENTIRE JSON** (all on one line, or as-is if Vercel supports multi-line)
   - Make sure it starts with `{` and ends with `}`
   - **Save**

3. **Important:** 
   - If Vercel requires single-line, you can use an online tool to minify JSON
   - Or just paste it as-is - Vercel usually handles multi-line JSON

#### Option B: As Escaped JSON String

If Vercel requires escaped format, you might need to:
- Escape quotes: `\"` instead of `"`
- Make it a single line
- But usually, Vercel accepts JSON as-is

---

### Step 4: Verify the JSON Format

**Check that your JSON has:**
- ✅ `"type": "service_account"`
- ✅ `"project_id": "your-project-id"`
- ✅ `"private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
- ✅ `"client_email": "something@something.iam.gserviceaccount.com"` ← **THIS IS CRITICAL!**
- ✅ `"client_id": "..."`

**The `client_email` field is REQUIRED!**

---

### Step 5: Redeploy

1. **After saving the environment variable:**
   - Go to **Deployments** tab
   - Click **"..."** on the latest deployment
   - Click **"Redeploy"**
   - Or just wait for the next deployment

2. **Wait 2-3 minutes** for deployment to complete

---

### Step 6: Test Again

```powershell
Invoke-RestMethod -Uri "https://trackmystartup.com/api/google-calendar?action=generate-meet-link" -Method Post -ContentType "application/json"
```

**Expected Response:**
```json
{
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx",
  "eventId": "event_id_here"
}
```

---

## 🐛 Common Mistakes

### Mistake 1: Only Copied Part of JSON
❌ **Wrong:** Only copied `{"private_key": "..."}`
✅ **Correct:** Copy the ENTIRE JSON file content

### Mistake 2: Missing client_email
❌ **Wrong:** JSON without `client_email` field
✅ **Correct:** Full JSON with all fields including `client_email`

### Mistake 3: Extra Characters
❌ **Wrong:** `GOOGLE_SERVICE_ACCOUNT_KEY = {...}` (with spaces or extra text)
✅ **Correct:** Just the JSON: `{...}`

### Mistake 4: Not Redeploying
❌ **Wrong:** Changed env var but didn't redeploy
✅ **Correct:** Redeploy after changing environment variables

---

## ✅ Quick Checklist

Before testing again, verify:

- [ ] Downloaded the complete JSON file from Google Cloud Console
- [ ] JSON file has `client_email` field
- [ ] Copied the ENTIRE JSON content (from `{` to `}`)
- [ ] Pasted it into Vercel as `GOOGLE_SERVICE_ACCOUNT_KEY`
- [ ] Saved the environment variable
- [ ] Redeployed the application
- [ ] Waited for deployment to complete

---

## 🔍 How to Verify JSON is Correct

You can test if your JSON is valid:

1. **Online JSON Validator:**
   - Go to: https://jsonlint.com/
   - Paste your JSON
   - Click "Validate JSON"
   - Should show "Valid JSON" ✅

2. **Check for client_email:**
   - Search for `"client_email"` in the JSON
   - Should find: `"client_email": "something@something.iam.gserviceaccount.com"`

---

## 🆘 Still Getting Error?

If you still get the error after fixing:

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on `google-calendar` function
   - Check "Logs" tab for detailed error

2. **Verify JSON in Vercel:**
   - Go to Settings → Environment Variables
   - Click on `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Make sure it shows the full JSON
   - Check that `client_email` is present

3. **Try Re-downloading Key:**
   - Delete the old key in Google Cloud Console
   - Create a new key
   - Download and use the new JSON

---

## 📝 Example of Correct JSON

Your `GOOGLE_SERVICE_ACCOUNT_KEY` should look like this (with your actual values):

```json
{
  "type": "service_account",
  "project_id": "track-my-startup-123456",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "track-my-startup@track-my-startup-123456.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/track-my-startup%40track-my-startup-123456.iam.gserviceaccount.com"
}
```

**Notice:** It has `client_email` field! ✅

---

## 🎯 Next Steps

1. Fix the environment variable in Vercel
2. Redeploy
3. Test again
4. Should work! ✅


