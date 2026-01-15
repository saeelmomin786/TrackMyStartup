# 🚀 Run Storage Backfill on Localhost

## ✅ Step 1: Start the Server

Make sure your local server is running:

```powershell
# In a terminal, run:
npm run server
```

Or if you prefer to run it directly:
```powershell
node server.js
```

You should see:
```
Local API running on http://localhost:3001
```

---

## ✅ Step 2: Run the Backfill (PowerShell)

Once the server is running, open a **new PowerShell terminal** and run:

### **Option A: Backfill ALL Users**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/storage/backfill?allUsers=true" -Method POST
```

### **Option B: Backfill Specific User (Test First)**
```powershell
# Replace USER_ID_HERE with an actual user ID
Invoke-RestMethod -Uri "http://localhost:3001/api/storage/backfill?userId=USER_ID_HERE" -Method POST
```

---

## ✅ Step 3: View Results

The command will output JSON with results:

```json
{
  "success": true,
  "message": "Backfill completed for 150 users",
  "result": {
    "usersProcessed": 150,
    "totalFilesTracked": 2345,
    "errors": 2
  }
}
```

---

## 🔍 Alternative: Using Browser Console

If your frontend is running (`npm run dev`), you can also use the browser console:

1. Open `http://localhost:5173` (or your dev URL)
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Run:

```javascript
// Backfill all users
fetch('http://localhost:3001/api/storage/backfill?allUsers=true', { 
  method: 'POST' 
})
  .then(r => r.json())
  .then(result => {
    console.log('✅ Backfill Result:', result);
  });
```

---

## ⚠️ Important Notes

1. **Server Must Be Running** - The endpoint is on `server.js`, so it must be running
2. **Takes Time** - Backfilling all users can take several minutes
3. **Check Console** - Watch the server terminal for progress logs
4. **Test First** - Test with one user before running for all users

---

## 🐛 Troubleshooting

### Error: "Cannot POST /api/storage/backfill"
- **Solution:** Make sure `server.js` is running (`npm run server`)

### Error: "Module not found"
- **Solution:** Make sure `lib/backfillStorageTracking.ts` exists

### Error: "Supabase credentials not configured"
- **Solution:** Check your `.env.local` file has:
  - `SUPABASE_URL` or `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` or `VITE_SUPABASE_SERVICE_ROLE_KEY`

---

**Status:** ✅ Ready to use! Start the server and run the PowerShell command.
