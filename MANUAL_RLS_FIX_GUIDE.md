# Manual RLS Policy Fix Guide

## Step-by-Step Process

### Step 1: Identify Problematic Tables
Run `IDENTIFY_PROBLEMATIC_TABLES.sql` to see:
- Which tables have user reference columns
- Which tables have FK constraints
- Which tables have RLS enabled
- Column data types

### Step 2: Fix Tables One by One

For each problematic table:

1. **Open `FIX_SINGLE_TABLE_RLS.sql`**
2. **Replace `'YOUR_TABLE_NAME'` with the actual table name**
3. **Run the script**
4. **Check the output** - it will show:
   - Column found
   - Column type
   - FK constraint status
   - Policies created

### Step 3: Test Each Table

After fixing each table:
1. Test the functionality that uses that table
2. Check browser console for errors
3. Try INSERT/SELECT/UPDATE/DELETE operations
4. If it works, move to next table
5. If it fails, note the error and we'll fix it

## Common Table Patterns

### Pattern 1: Standard user_id (UUID, FK to users.id)
```sql
-- Use: FIX_SINGLE_TABLE_RLS.sql
-- Will create: policies using auth.uid()
```

### Pattern 2: VARCHAR user_id (no FK)
```sql
-- Use: FIX_SINGLE_TABLE_RLS.sql  
-- Will create: policies using auth.uid()::text
```

### Pattern 3: Special cases (already handled)
- `startup_addition_requests` - uses `investor_code`
- `advisor_added_startups` - uses VARCHAR `advisor_id`
- `investment_records` - uses `startup_id` indirectly
- `mentor_equity_records` - uses `startup_id` + `mentor_code`
- `co_investment_opportunities` - role-based, no direct user_id

## Quick Reference

### To fix a single table:
1. Edit `FIX_SINGLE_TABLE_RLS.sql`
2. Change `'YOUR_TABLE_NAME'` to your table name
3. Run the script
4. Test

### To see which tables need fixing:
Run `IDENTIFY_PROBLEMATIC_TABLES.sql`

### To verify a table is fixed:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'your_table_name' 
AND schemaname = 'public';
```

## Troubleshooting

### Error: "column does not exist"
- Check the table name is correct
- Check the column name in IDENTIFY_PROBLEMATIC_TABLES.sql

### Error: "operator does not exist"
- Column type mismatch (UUID vs TEXT)
- The script should handle this automatically, but check the output

### Error: "foreign key constraint violation"
- Table has FK to users(id) but policy allows profile IDs
- The script checks this automatically

## Example Workflow

```
1. Run IDENTIFY_PROBLEMATIC_TABLES.sql
   → See: investor_favorites needs fixing

2. Edit FIX_SINGLE_TABLE_RLS.sql
   → Change 'YOUR_TABLE_NAME' to 'investor_favorites'

3. Run FIX_SINGLE_TABLE_RLS.sql
   → Output shows: "✅ Created policies for investor_favorites"

4. Test in browser
   → Try favoriting a startup
   → Check console for errors
   → If works, move to next table
```




