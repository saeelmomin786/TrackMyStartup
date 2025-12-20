# Vercel Environment Variables Setup

## ✅ What to Add to Vercel

You need to add **4 environment variables** to your Vercel project:

1. `GOOGLE_SERVICE_ACCOUNT_KEY` - Service account JSON (for Meet links)
2. `GOOGLE_CLIENT_ID` - OAuth Client ID
3. `GOOGLE_CLIENT_SECRET` - OAuth Client Secret
4. `GOOGLE_REDIRECT_URI` - OAuth redirect URI

---

## 📝 Step-by-Step: Add to Vercel

### Step 1: Go to Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click on your **"Track My Startup"** project (or your project name)
3. Click **"Settings"** (top menu)
4. Click **"Environment Variables"** (left sidebar)

### Step 2: Add Service Account Key

1. Click **"Add New"** button
2. Fill in:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the **entire JSON content** from your downloaded service account key file
     - Open the JSON file you downloaded
     - Copy the **entire content** (all of it, including `{` and `}`)
     - Paste it as a **single line** or keep it formatted (both work)
   - **Environment:** Select all three:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
3. Click **"Save"**

**Example format:**
```
{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

### Step 3: Add OAuth Client ID

1. Click **"Add New"** button
2. Fill in:
   - **Key:** `GOOGLE_CLIENT_ID`
   - **Value:** Your Client ID (looks like: `123456789-abc.apps.googleusercontent.com`)
   - **Environment:** Select all three (Production, Preview, Development)
3. Click **"Save"**

### Step 4: Add OAuth Client Secret

1. Click **"Add New"** button
2. Fill in:
   - **Key:** `GOOGLE_CLIENT_SECRET`
   - **Value:** Your Client Secret (looks like: `GOCSPX-...`)
   - **Environment:** Select all three (Production, Preview, Development)
3. Click **"Save"**

### Step 5: Add Redirect URI

1. Click **"Add New"** button
2. Fill in:
   - **Key:** `GOOGLE_REDIRECT_URI`
   - **Value:** Your production domain + callback path
     - **For production:** `https://yourdomain.com/auth/google/callback`
     - **Replace `yourdomain.com`** with your actual Vercel domain
     - Example: `https://track-my-startup.vercel.app/auth/google/callback`
   - **Environment:** Select all three (Production, Preview, Development)
3. Click **"Save"**

**Note:** You can use different values for different environments if needed, but using the same for all is fine.

---

## ✅ Verification Checklist

After adding all variables, you should see:

- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` - ✅ Added
- [ ] `GOOGLE_CLIENT_ID` - ✅ Added
- [ ] `GOOGLE_CLIENT_SECRET` - ✅ Added
- [ ] `GOOGLE_REDIRECT_URI` - ✅ Added

All should be set for **Production, Preview, and Development**.

---

## 🔄 After Adding Variables

### Option 1: Redeploy (Recommended)

1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. This will use the new environment variables

### Option 2: Wait for Next Deploy

- Next time you push code, Vercel will automatically use the new variables

---

## 🧪 Test After Deployment

Once deployed, test the Meet link generation:

```bash
curl -X POST https://yourdomain.vercel.app/api/generate-google-meet-link \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx"
}
```

---

## ⚠️ Important Notes

### 1. Service Account Key Format

- Must be **entire JSON** as a string
- Can be single line or formatted (both work)
- Make sure all quotes are escaped if pasting directly

### 2. Security

- ✅ Environment variables are encrypted in Vercel
- ✅ Never commit these to Git
- ✅ Only accessible in serverless functions

### 3. Different Environments

If you want different values for different environments:
- Add the same key multiple times
- Select different environments for each
- Vercel will use the right one based on deployment

---

## 🐛 Troubleshooting

### Error: "Google service account not configured"
- **Check:** `GOOGLE_SERVICE_ACCOUNT_KEY` is added
- **Check:** Value is the entire JSON (not just a path)
- **Fix:** Redeploy after adding

### Error: "Invalid service account key format"
- **Check:** JSON is valid (no missing brackets)
- **Check:** All quotes are properly escaped
- **Fix:** Copy the entire JSON file content

### Error: "Invalid or expired access token"
- **Check:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- **Check:** OAuth credentials match what you created
- **Fix:** Double-check values in Google Cloud Console

---

## ✅ Quick Summary

**Add these 4 variables to Vercel:**

1. ✅ `GOOGLE_SERVICE_ACCOUNT_KEY` - Full JSON from downloaded file
2. ✅ `GOOGLE_CLIENT_ID` - From OAuth credentials
3. ✅ `GOOGLE_CLIENT_SECRET` - From OAuth credentials  
4. ✅ `GOOGLE_REDIRECT_URI` - Your domain + `/auth/google/callback`

**Then redeploy and test!** 🚀

---

## 📝 Example Values

Here's what your Vercel environment variables should look like:

```
GOOGLE_SERVICE_ACCOUNT_KEY = {"type":"service_account",...}
GOOGLE_CLIENT_ID = 123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = GOCSPX-your-secret-here
GOOGLE_REDIRECT_URI = https://yourdomain.vercel.app/auth/google/callback
```

**That's it!** Once added, your API endpoints will work. ✅

