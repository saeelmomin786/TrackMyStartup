# Google Cloud Console Setup Checklist

## ✅ What You Need to Configure

You need to set up your Google Cloud project and enable the Calendar API. Here's the step-by-step guide:

---

## 🔧 Step 1: Go to Google Cloud Console

**URL:** https://console.cloud.google.com/

1. **Sign in** with your Google account
2. **Select your project** (or create a new one)
3. If you don't have a project, create one:
   - Click "Select a project" → "New Project"
   - Enter project name: "Track My Startup" (or any name)
   - Click "Create"

---

## 🔧 Step 2: Enable Google Calendar API

1. **Go to APIs & Services:**
   - In the left menu, click **"APIs & Services"** → **"Library"**
   - Or go directly: https://console.cloud.google.com/apis/library

2. **Search for "Google Calendar API":**
   - In the search box, type: `Google Calendar API`
   - Click on **"Google Calendar API"** from results

3. **Enable the API:**
   - Click the **"ENABLE"** button
   - Wait for it to enable (usually takes a few seconds)

**✅ Check:** You should see "API enabled" status

---

## 🔧 Step 3: Create Service Account

1. **Go to Service Accounts:**
   - In the left menu, click **"APIs & Services"** → **"Credentials"**
   - Or go directly: https://console.cloud.google.com/apis/credentials

2. **Create Service Account:**
   - Click **"+ CREATE CREDENTIALS"** at the top
   - Select **"Service account"**

3. **Fill in Details:**
   - **Service account name:** `track-my-startup-calendar` (or any name)
   - **Service account ID:** (auto-generated, you can change it)
   - **Description:** `Service account for Google Calendar and Meet integration`
   - Click **"CREATE AND CONTINUE"**

4. **Grant Role (Optional but Recommended):**
   - **Role:** Select **"Editor"** or **"Owner"**
   - Click **"CONTINUE"**

5. **Skip User Access (Optional):**
   - Click **"DONE"** (you can skip granting users access)

---

## 🔧 Step 4: Create Service Account Key

1. **Find Your Service Account:**
   - In the Service Accounts list, click on the service account you just created

2. **Create Key:**
   - Click the **"KEYS"** tab
   - Click **"ADD KEY"** → **"Create new key"**
   - Select **"JSON"** format
   - Click **"CREATE"**

3. **Download the Key:**
   - A JSON file will download automatically
   - **IMPORTANT:** Keep this file secure! It contains your credentials

---

## 🔧 Step 5: Get the JSON Key Content

1. **Open the downloaded JSON file** in a text editor
2. **Copy the entire contents** of the file
3. **It should look like this:**
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

---

## 🔧 Step 6: Add to Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your project

2. **Go to Settings:**
   - Click **"Settings"** → **"Environment Variables"**

3. **Add the Service Account Key:**
   - **Name:** `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the **entire JSON content** from Step 5
   - **Environment:** Select all (Production, Preview, Development)
   - Click **"Save"**

   **⚠️ Important:** 
   - Paste the entire JSON as a single-line string, OR
   - If Vercel supports multi-line, paste it as-is
   - Make sure all quotes are escaped if needed

4. **Redeploy:**
   - After adding the variable, go to **"Deployments"**
   - Click the **"..."** menu on the latest deployment
   - Click **"Redeploy"** to apply the new environment variable

---

## 🔧 Step 7: Verify Setup

### Check 1: API is Enabled
- Go to: https://console.cloud.google.com/apis/library
- Search for "Google Calendar API"
- Should show: **"API enabled"** ✅

### Check 2: Service Account Exists
- Go to: https://console.cloud.google.com/apis/credentials
- Under "Service Accounts", you should see your service account ✅

### Check 3: Service Account Key Created
- Click on your service account
- Go to "KEYS" tab
- Should see at least one key ✅

### Check 4: Environment Variable in Vercel
- Go to Vercel Dashboard → Settings → Environment Variables
- Should see `GOOGLE_SERVICE_ACCOUNT_KEY` ✅

---

## 🧪 Step 8: Test the API

Once everything is set up, test with:

```bash
curl -X POST "https://trackmystartup.com/api/google-calendar?action=generate-meet-link" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx",
  "eventId": "event_id_here"
}
```

**If you get an error:**
- Check Vercel logs for detailed error messages
- Verify the JSON key is correctly formatted in Vercel
- Make sure Calendar API is enabled
- Check service account has proper permissions

---

## 🐛 Common Issues

### Issue 1: "Google service account not configured"
**Solution:** 
- Check `GOOGLE_SERVICE_ACCOUNT_KEY` is set in Vercel
- Verify the JSON is complete and valid
- Redeploy after adding the variable

### Issue 2: "API not enabled"
**Solution:**
- Go to Google Cloud Console → APIs & Services → Library
- Enable "Google Calendar API"

### Issue 3: "Permission denied"
**Solution:**
- Check service account has "Editor" or "Owner" role
- Verify the service account email is correct

### Issue 4: "Invalid JSON format"
**Solution:**
- Make sure the entire JSON is on one line (or properly formatted)
- Check all quotes are escaped if needed
- Verify no extra characters or line breaks

---

## 📋 Quick Checklist

Before testing, make sure:

- [ ] Google Cloud project created
- [ ] Google Calendar API enabled
- [ ] Service account created
- [ ] Service account key (JSON) downloaded
- [ ] JSON key added to Vercel as `GOOGLE_SERVICE_ACCOUNT_KEY`
- [ ] Vercel project redeployed after adding environment variable
- [ ] Tested API endpoint

---

## 🔗 Useful Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **APIs Library:** https://console.cloud.google.com/apis/library
- **Credentials:** https://console.cloud.google.com/apis/credentials
- **Vercel Dashboard:** https://vercel.com/dashboard

---

## ✅ Success Indicators

You're ready when:
- ✅ Calendar API shows "API enabled" in Google Cloud Console
- ✅ Service account exists and has a key
- ✅ Environment variable is set in Vercel
- ✅ API test returns a valid Meet link (not an error)

---

## 🆘 Still Having Issues?

1. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on `google-calendar` function
   - Check "Logs" tab for detailed error messages

2. **Verify JSON Format:**
   - The JSON should be valid JSON
   - Can test at: https://jsonlint.com/

3. **Check Service Account Email:**
   - Should end with: `@your-project-id.iam.gserviceaccount.com`
   - Should be visible in Google Cloud Console

4. **Test Locally (if running dev server):**
   - Set environment variable locally
   - Test with: `curl -X POST "http://localhost:3000/api/google-calendar?action=generate-meet-link"`


