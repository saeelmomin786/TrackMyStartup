# 🚀 Next Step: Create Sync Triggers

## ✅ Step 1 Complete!

You've successfully:
- ✅ Enhanced `startups_public` view (added `updated_at`)
- ✅ Enhanced `fundraising_details_public` view (added URLs + `updated_at`)
- ✅ Created `mentors_public_table` (with all mentor data)
- ✅ Created `advisors_public_table` (with all advisor data)
- ✅ Populated both tables with existing data

---

## 🔄 Step 2: Create Auto-Sync Triggers

Now you need to create triggers so that when users update their mentor/advisor profiles, the public tables update automatically.

### **What the Triggers Do:**

1. **INSERT Trigger:**
   - When a new mentor/advisor profile is created → automatically adds it to the public table

2. **UPDATE Trigger:**
   - When a mentor/advisor profile is updated → automatically updates the public table

3. **DELETE Trigger:**
   - When a mentor/advisor profile is deleted → automatically removes it from the public table

---

## 📋 How to Run

1. **Open Supabase SQL Editor**
2. **Copy the entire contents of `CREATE_MENTOR_ADVISOR_SYNC_TRIGGERS_ONLY.sql`**
3. **Paste and run it**

---

## ✅ What Will Happen

After running the script, you'll see:
```
✅ Sync triggers created for mentors and advisors!
📊 Startups: Using existing views (no triggers needed)
📊 Mentors: Using public table with auto-sync triggers
📊 Advisors: Using public table with auto-sync triggers
📊 Investors: Using main table with RLS (no public table)
```

---

## 🔍 What Gets Created

### **For Mentors:**
- `sync_mentor_to_public_table()` function
- `trigger_sync_mentor_to_public` (runs on INSERT/UPDATE)
- `delete_mentor_from_public_table()` function
- `trigger_delete_mentor_from_public` (runs on DELETE)

### **For Advisors:**
- `sync_advisor_to_public_table()` function
- `trigger_sync_advisor_to_public` (runs on INSERT/UPDATE)
- `delete_advisor_from_public_table()` function
- `trigger_delete_advisor_from_public` (runs on DELETE)

---

## 🎯 After Triggers Are Created

**Automatic Sync:**
- ✅ User updates mentor profile → `mentors_public_table` updates automatically
- ✅ User updates advisor profile → `advisors_public_table` updates automatically
- ✅ No manual sync needed!

**Your Setup:**
- ✅ **Startups:** Use enhanced `startups_public` view (no triggers needed)
- ✅ **Mentors:** Use `mentors_public_table` (auto-synced via triggers)
- ✅ **Advisors:** Use `advisors_public_table` (auto-synced via triggers)
- ✅ **Investors:** Use main table with RLS (as requested)

---

## 🚀 Ready to Run!

The trigger script is ready. Just run `CREATE_MENTOR_ADVISOR_SYNC_TRIGGERS_ONLY.sql` in Supabase SQL Editor!

**Note:** I've fixed the `current_role` reserved keyword issue in the trigger script, so it should run without errors. ✅


