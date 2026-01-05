# 🧪 Test Rewrite with PowerShell

## ✅ **Correct PowerShell Command**

**PowerShell's `curl` is an alias for `Invoke-WebRequest` with different syntax.**

### **Test as Googlebot:**

```powershell
Invoke-WebRequest -Uri "https://trackmystartup.com/unified-mentor-network" `
  -Headers @{"User-Agent"="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"} `
  | Select-Object -ExpandProperty Content
```

### **Save to File:**

```powershell
Invoke-WebRequest -Uri "https://trackmystartup.com/unified-mentor-network" `
  -Headers @{"User-Agent"="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"} `
  | Select-Object -ExpandProperty Content `
  | Out-File -FilePath "googlebot-test.html" -Encoding utf8
```

### **Test as Regular User:**

```powershell
Invoke-WebRequest -Uri "https://trackmystartup.com/unified-mentor-network" `
  -Headers @{"User-Agent"="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"} `
  | Select-Object -ExpandProperty Content
```

---

## 🔍 **What to Look For**

### **If Rewrite is Working (Googlebot):**
- ✅ Should return HTML with content
- ✅ Should see meta tags, title, description
- ✅ Should NOT see empty `<div id="root"></div>` only
- ✅ Should see logs in Vercel: `[CATCH-ALL] Request:`

### **If Rewrite is NOT Working (Googlebot):**
- ❌ Returns empty HTML or React app shell
- ❌ No logs in Vercel
- ❌ Same as regular user response

---

## 📊 **Check Vercel Logs**

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Your project → Functions → `[...path]`
   - Click "View Logs"

2. **Look for:**
   - `[CATCH-ALL] Request:` logs
   - `isCrawler: true`
   - `pathname: '/unified-mentor-network'`

3. **If you see logs:**
   - ✅ Rewrite is working!
   - ✅ Check what HTML is being returned

4. **If NO logs:**
   - ❌ Rewrite is NOT working
   - ❌ Need to fix rewrite pattern

---

## 🎯 **Next Steps Based on Results**

### **If Rewrite Works:**
- ✅ Check if HTML has content
- ✅ Test in Google Search Console
- ✅ Request indexing

### **If Rewrite Doesn't Work:**
- ❌ Try simpler rewrite pattern
- ❌ Consider Prerender.io
- ❌ Or migrate to Next.js

