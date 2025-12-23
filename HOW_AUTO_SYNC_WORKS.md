# 🔄 How Auto-Sync Works - Public Tables

## ✅ Yes! Automatic Sync is Enabled

When a user updates data in the **main tables**, it **automatically syncs** to the **public tables** via triggers.

---

## 🔄 How It Works

### **Example: User Updates Startup**

```
1. User updates startup in main table:
   UPDATE startups SET name = 'New Name' WHERE id = 1;

2. Trigger automatically fires:
   trigger_sync_startup_to_public

3. Public table automatically updates:
   INSERT INTO startups_public_table (...) 
   ON CONFLICT (id) DO UPDATE SET name = 'New Name'

4. Result:
   ✅ Main table: Updated
   ✅ Public table: Automatically updated
   ✅ No manual work needed!
```

---

## 📋 What Gets Synced Automatically

### **For Startups:**
- ✅ User updates `startups` table → `startups_public_table` updates automatically
- ✅ User updates `fundraising_details` table → `fundraising_details_public_table` updates automatically

### **For Mentors:**
- ✅ User updates `mentor_profiles` table → `mentors_public_table` updates automatically

### **For Advisors:**
- ✅ User updates `investment_advisor_profiles` table → `advisors_public_table` updates automatically

### **For Investors:**
- ❌ No public table (using main table with RLS)

---

## 🔄 Trigger Events

Triggers fire on:
- ✅ **INSERT** - New record created → Syncs to public table
- ✅ **UPDATE** - Record updated → Syncs to public table
- ✅ **DELETE** - Record deleted → Removes from public table

---

## ⚡ Real-Time Sync

**The sync happens INSTANTLY:**
- User updates main table → Trigger fires immediately → Public table updates immediately
- **No delay** - happens in the same transaction
- **No manual work** - completely automatic

---

## 🧪 Example Scenarios

### **Scenario 1: User Updates Startup Name**

```sql
-- User updates in main table
UPDATE startups 
SET name = 'My Awesome Startup', updated_at = NOW() 
WHERE id = 1;

-- Trigger automatically runs:
-- INSERT INTO startups_public_table (id, name, ...)
-- VALUES (1, 'My Awesome Startup', ...)
-- ON CONFLICT (id) DO UPDATE SET name = 'My Awesome Startup'

-- Result: Public table now has 'My Awesome Startup'
```

### **Scenario 2: User Creates New Mentor Profile**

```sql
-- User creates in main table
INSERT INTO mentor_profiles (user_id, mentor_name, ...)
VALUES ('uuid-123', 'John Doe', ...);

-- Trigger automatically runs:
-- INSERT INTO mentors_public_table (user_id, mentor_name, ...)
-- VALUES ('uuid-123', 'John Doe', ...)

-- Result: New mentor appears in public table immediately
```

### **Scenario 3: User Updates Fundraising Details**

```sql
-- User updates in main table
UPDATE fundraising_details 
SET active = true, value = 1000000 
WHERE startup_id = 1;

-- Trigger automatically runs:
-- INSERT INTO fundraising_details_public_table (...)
-- ON CONFLICT (id) DO UPDATE SET active = true, value = 1000000

-- Result: Public fundraising details updated immediately
```

---

## 🔒 Security Note

**Users CANNOT directly update public tables:**
- ❌ `UPDATE startups_public_table SET name = 'Hacked'` → **BLOCKED** (read-only)
- ✅ `UPDATE startups SET name = 'New Name'` → **ALLOWED** → Auto-syncs to public table

**Only triggers can update public tables!**

---

## 📊 What Happens in the Database

### **When User Updates Main Table:**

```sql
BEGIN TRANSACTION;

-- 1. User's update
UPDATE startups SET name = 'New Name' WHERE id = 1;

-- 2. Trigger fires automatically (same transaction)
-- Trigger function: sync_startup_to_public_table()
INSERT INTO startups_public_table (id, name, ...)
VALUES (1, 'New Name', ...)
ON CONFLICT (id) DO UPDATE SET name = 'New Name';

COMMIT;
-- Both updates happen together - atomic!
```

---

## ✅ Benefits

1. **Automatic** - No manual sync needed
2. **Real-time** - Updates happen instantly
3. **Reliable** - Triggers run in same transaction
4. **Secure** - Users can't directly modify public tables
5. **Consistent** - Public tables always match main tables

---

## 🎯 Summary

**YES!** When users update main tables:
- ✅ Triggers automatically fire
- ✅ Public tables automatically update
- ✅ Happens instantly (same transaction)
- ✅ No manual work needed
- ✅ Public tables stay in sync automatically

**It's completely automatic!** 🔄✨


