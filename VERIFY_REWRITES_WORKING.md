# 🔍 How to Verify Rewrites Are Working

## ⚠️ The Issue

If Google still can't see pages, the rewrites might not be working. Here's how to verify:

---

## 🧪 Test 1: Check if Rewrites Trigger

### **Method A: Browser Extension**

1. **Install:** "User-Agent Switcher" extension
2. **Set User Agent to:**
   ```
   Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)
   ```
3. **Visit:** `https://trackmystartup.com/unified-mentor-network`
4. **Check:**
   - ✅ Should see pre-rendered HTML (title + description)
   - ❌ If you see React app → Rewrites NOT working

### **Method B: curl Command**

```bash
# Test as Googlebot
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://trackmystartup.com/unified-mentor-network -v

# Check response:
# Should see: Title and description in HTML
# Should NOT see: React app HTML
```

---

## 🧪 Test 2: Check Vercel Function Logs

1. **Go to Vercel Dashboard:**
   - Your Project → Functions → prerender

2. **Check Logs:**
   - Should see: `[PRERENDER] Request received` logs
   - If no logs → API not being called → Rewrites not working

3. **Test API Directly:**
   - Visit: `/api/prerender?path=/unified-mentor-network`
   - Should return HTML
   - Check logs → Should see request

---

## 🧪 Test 3: Check HTTP Headers

**Using Browser DevTools:**

1. **Open DevTools:** `F12`
2. **Network Tab:**
   - Visit page with Googlebot user agent
   - Find the request
   - Check Response Headers

**Should See:**
- `X-Prerender-Served: true` (if rewrite worked)
- `Content-Type: text/html`

**If NOT seeing these:**
- Rewrite didn't trigger
- Need alternative solution

---

## ❌ If Rewrites Don't Work

**Vercel's `has` conditions with user-agent matching can be unreliable.**

### **Solution: Use Prerender.io**

**Why:**
- More reliable than custom rewrites
- Proven service
- Free tier available

**Steps:**

1. **Sign up:** https://prerender.io
2. **Get token**
3. **Add to Vercel:**
   - Environment Variables → `PRERENDER_TOKEN`
4. **Update vercel.json:**

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "has": [
        {
          "type": "header",
          "key": "user-agent",
          "value": "(?i).*(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot).*"
        }
      ],
      "destination": "https://service.prerender.io/https://trackmystartup.com/$1"
    }
  ]
}
```

**This is the most reliable solution!**

---

## 🎯 Quick Diagnostic

**Run these tests:**

1. ✅ Test API directly: `/api/prerender?path=/about` → Should work
2. ✅ Test with Googlebot user agent → Should get pre-rendered HTML
3. ✅ Check Vercel logs → Should see API calls
4. ✅ Test in Search Console → Should show content

**If #2 fails → Rewrites not working → Use Prerender.io**

---

## ⏰ Timeline Note

**Even if rewrites work:**
- Google needs 24-48 hours to re-crawl
- Use "Request Indexing" to speed up
- Be patient!

**The issue might be timing, not functionality!**

