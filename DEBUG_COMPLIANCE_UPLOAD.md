# 🔍 Debug: Compliance Upload Issues

## 🎯 Two Issues to Fix

### **Issue 1: Status Update Error**
**Error:** "Document uploaded successfully, but status could not be updated to 'Submitted'"

**Possible Causes:**
1. ✅ Migration was run, but error message still shows (now fixed - only shows for constraint errors)
2. Missing required fields in `compliance_checks` table (entity_identifier, entity_display_name, year, task_name)
3. Task info not found in comprehensive rules

### **Issue 2: Storage Not Increasing**
**Problem:** Storage usage doesn't increase in Account Tab after upload

**Possible Causes:**
1. `userId` is null/undefined (not getting auth_user_id correctly)
2. Storage tracking insert fails silently
3. Database trigger not firing
4. Account Tab not refreshing storage data

---

## ✅ What I Fixed

### **1. Better Error Handling for Status Update**
- Only shows migration error message if it's actually a constraint error
- Other errors (like missing fields) are logged but don't show error to user
- Better logging to identify the actual issue

### **2. Enhanced Storage Tracking Logging**
- Added detailed console logs for storage tracking
- Logs `userId` being used
- Logs storage record insertion success/failure
- Logs upload result details

### **3. Better userId Validation**
- Warns if `userId` is null/undefined
- Logs startup data for debugging
- Falls back to auth session if startup not found

---

## 🧪 How to Debug

### **Step 1: Check Browser Console**

After uploading a compliance document, check the console for:

#### **Storage Tracking Logs:**
```
[UPLOAD] Using userId for storage tracking: [uuid]
[UPLOAD] Upload result: { success: true, fileSizeMB: X.XX, ... }
📊 [STORAGE] Inserting storage record: { user_id: [uuid], ... }
✅ [STORAGE] Storage record inserted successfully: [...]
```

**If you see:**
- `⚠️ WARNING: userId is null/undefined!` → Storage tracking will fail
- `❌ [STORAGE] Error tracking file upload:` → Check the error details

#### **Status Update Logs:**
```
[STATUS UPDATE] updateStatusToSubmitted called: { ... }
[STATUS UPDATE] Missing required fields for upsert: { ... }
```

**If you see:**
- `Missing required fields` → Task info not found in comprehensive rules
- `ERROR updating status to Submitted:` → Check error details

### **Step 2: Check Database**

#### **Check Storage Record:**
```sql
SELECT * FROM user_storage_usage 
WHERE user_id = '[your-auth-user-id]' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:** Should see the uploaded file record

#### **Check Storage Total:**
```sql
SELECT get_user_storage_total('[your-auth-user-id]') as total_mb;
```

**Expected:** Should return the total storage in MB

#### **Check Status Update:**
```sql
SELECT task_id, ca_status, cs_status 
FROM compliance_checks 
WHERE startup_id = [your_startup_id] 
AND task_id = '[uploaded_task_id]';
```

**Expected:** Status should be 'Submitted' (if update succeeded)

---

## 🔧 Next Steps

1. **Upload a compliance document**
2. **Check browser console** for the logs above
3. **Share the console output** so we can identify the exact issue
4. **Check Account Tab** - does storage increase?

---

## 📝 Common Issues & Solutions

### **Issue: userId is null**
**Solution:** 
- Check if startup exists in database
- Verify `startups.user_id` is set correctly
- Check if auth session is valid

### **Issue: Storage record insert fails**
**Solution:**
- Check RLS policies on `user_storage_usage` table
- Verify `user_id` is a valid UUID
- Check if `file_size_mb` is a valid number

### **Issue: Status update fails (missing fields)**
**Solution:**
- Task info might not be in comprehensive rules
- Check if task exists in `compliance_rules_comprehensive` table
- Verify task has all required fields (entity_identifier, etc.)

---

**Run the upload again and share the console logs!**
