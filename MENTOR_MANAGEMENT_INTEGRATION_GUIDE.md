# Integration Guide - Mentor Management System

## How to Integrate into Your Application

### Step 1: Execute Database Script

#### Option A: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click "SQL Editor"
3. Click "New Query"
4. Copy all content from `CREATE_MENTOR_STARTUP_ASSIGNMENTS.sql`
5. Paste it into the editor
6. Click "Run"
7. Verify tables created in "Tables" section

#### Option B: Command Line
```bash
# If using supabase CLI
supabase db push

# Or directly with psql
psql -h your-host -U postgres -d postgres < CREATE_MENTOR_STARTUP_ASSIGNMENTS.sql
```

**Result**: 
- ✅ `mentor_startup_assignments` table created
- ✅ `mentor_meeting_history` table created
- ✅ RLS policies enabled
- ✅ Indexes created

---

### Step 2: Update Your Mentor Management Page

Locate your existing mentor management page. It could be:
- `components/MentorView.tsx`
- `pages/mentor/ManagementPage.tsx`
- `components/mentor/MentorManagement.tsx`

#### Find the section for "Registered Mentors" or "Approved Mentors"

**Before (Old code):**
```typescript
export default function MentorView() {
  return (
    <div>
      <h1>Mentor Management</h1>
      {/* Old table or component here */}
    </div>
  );
}
```

**After (New code):**
```typescript
import RegisteredMentorsTab from './mentor/RegisteredMentorsTab';

export default function MentorView() {
  return (
    <div>
      <h1>Mentor Management</h1>
      <RegisteredMentorsTab />
    </div>
  );
}
```

That's it! The component is self-contained.

---

### Step 3: Verify Environment Variables

Make sure your `.env` (or `.env.local`) has:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

These should already be set if your app is working.

---

### Step 4: Test the Integration

#### Manual Testing

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Navigate to Mentor Management page**
   - Should see two tabs: "Approved Mentors" and "Pending Mentors"

3. **Test each feature**
   - Click on a mentor row
   - Verify Portfolio button works
   - Click "View Portfolio"
   - See portfolio modal with stats
   - Click "View History" 
   - See meeting history
   - Click "+ Assign"
   - Try assigning to a startup

4. **Check browser console**
   - Should have no red errors
   - May have info/debug logs

5. **Check Supabase logs**
   - Go to Supabase dashboard
   - Check "Logs" for any errors

#### Automated Testing

```typescript
// Example test file: mentor-management.test.ts
import { render, screen, fireEvent } from '@testing-library/react';
import RegisteredMentorsTab from './RegisteredMentorsTab';

test('renders mentor tab component', () => {
  render(<RegisteredMentorsTab />);
  expect(screen.getByText(/Approved Mentors/i)).toBeInTheDocument();
});

test('shows pending mentors tab', () => {
  render(<RegisteredMentorsTab />);
  const pendingTab = screen.getByText(/Pending Mentors/i);
  fireEvent.click(pendingTab);
  expect(pendingTab).toHaveClass('active');
});
```

---

### Step 5: Customize if Needed

#### Change Tab Names
In `RegisteredMentorsTab.tsx`:
```typescript
// Line ~23-30
<button onClick={() => setActiveTab('approved')}>
  Approved Mentors ({mentors.length}) // Change this text
</button>
```

#### Change Table Columns
In `RegisteredMentorsTab.tsx`:
```typescript
// Add new column header
<th>Location</th>

// Add new column data
<td>{mentor.location}</td>
```

#### Change Statistics Displayed
In `MentorPortfolioModal.tsx`:
```typescript
// Add new stat card
<div className="text-center">
  <p className="text-2xl font-bold text-purple-600">{stats.newStat}</p>
  <p className="text-xs text-gray-600 mt-1">New Stat Label</p>
</div>
```

---

### Step 6: Deploy

#### Development
```bash
npm run dev
# Changes are live immediately
```

#### Production
```bash
# Build
npm run build

# Deploy (method depends on your hosting)
# If using Vercel:
vercel deploy

# If using GitHub Pages:
npm run build && git add . && git commit -m "Deploy" && git push
```

---

## Common Integration Scenarios

### Scenario 1: Existing Mentor System with Table
**You have**: An existing mentor table in your database  
**You need**: To migrate mentors to the new system

```typescript
// Migration script (run once)
const migrateMentors = async () => {
  const { data: existingMentors } = await supabase
    .from('your_old_mentors_table')
    .select('*');

  // Create assignments for existing mentors
  for (const mentor of existingMentors) {
    await supabase
      .from('mentor_startup_assignments')
      .insert({
        mentor_user_id: mentor.user_id,
        startup_id: mentor.startup_id,
        status: 'active',
        assigned_at: new Date().toISOString()
      });
  }
};
```

### Scenario 2: Different User ID System
**You have**: Mentor IDs in a different format  
**You need**: To map them correctly

```typescript
// In RegisteredMentorsTab.tsx
// Change the query to use your ID system:
const query = supabase
  .from('user_profiles')
  .select(`...`)
  .eq('your_id_field', yourIdValue); // Map accordingly
```

### Scenario 3: Additional Mentor Roles
**You have**: Different types of mentors (advisor, coach, specialist)  
**You need**: To filter by type

```typescript
// In RegisteredMentorsTab.tsx
const [mentorType, setMentorType] = useState('all');

const fetchMentors = async () => {
  let query = supabase.from('user_profiles').select(...);
  
  if (mentorType !== 'all') {
    query = query.eq('mentor_type', mentorType);
  }
  
  // ... rest of query
};
```

---

## Troubleshooting Integration

### Issue: "RegisteredMentorsTab not found"
**Solution**: 
- Check file path is correct
- Ensure file is in `components/mentor/` folder
- Rebuild project

### Issue: "Cannot find module 'ui/Modal'"
**Solution**:
- Check ui components exist in `components/ui/`
- Verify imports paths are correct
- Install missing dependencies

### Issue: "RLS policy denies access"
**Solution**:
- Go to Supabase dashboard
- Check RLS policies created successfully
- Verify auth.uid() matches user
- Check user has appropriate role

### Issue: "Empty mentor list"
**Solution**:
- Verify user_profiles table has mentors with is_mentor=true
- Check RLS allows access to user_profiles
- Test with admin user first

### Issue: "API endpoints return 404"
**Solution**:
- Check API files are in correct location (`api/` folder)
- Verify Vercel/hosting can find routes
- Check environment variables set
- Test with curl first

---

## Performance Optimization

### If Mentor List Loads Slowly

1. **Add pagination**
   ```typescript
   const PAGE_SIZE = 20;
   const [page, setPage] = useState(0);
   
   query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
   ```

2. **Cache results**
   ```typescript
   const [cachedMentors, setCachedMentors] = useState(null);
   
   if (cachedMentors) {
     setMentors(cachedMentors);
     return;
   }
   ```

3. **Use real-time subscriptions**
   ```typescript
   const subscription = supabase
     .from('user_profiles')
     .on('UPDATE', (payload) => {
       // Update local state
     })
     .subscribe();
   ```

### If Portfolio Modal Loads Slowly

1. **Lazy load stats**
   ```typescript
   useEffect(() => {
     fetchStatsLazy();
   }, [mentor.mentor_user_id]);
   ```

2. **Reduce query complexity**
   ```typescript
   // Instead of complex joins, fetch data separately
   const stats = await getMentorStats();
   const history = await getMentorHistory();
   ```

---

## Rollback Instructions

If you need to remove this feature:

### Step 1: Remove Components
```bash
rm components/mentor/RegisteredMentorsTab.tsx
rm components/mentor/MentorPortfolioModal.tsx
rm components/mentor/MentorHistoryModal.tsx
rm components/mentor/AssignToStartupForm.tsx
```

### Step 2: Remove API Routes
```bash
rm api/mentor-stats.ts
rm api/mentor-history.ts
rm api/mentor-status.ts
```

### Step 3: Revert Page
Replace RegisteredMentorsTab with your old component

### Step 4: Remove Database Tables (Optional)
```sql
-- In Supabase SQL Editor
DROP TABLE IF EXISTS mentor_meeting_history CASCADE;
DROP TABLE IF EXISTS mentor_startup_assignments CASCADE;
```

---

## Support & Resources

### If You Have Questions

1. **Check Documentation**
   - MENTOR_MANAGEMENT_SETUP.md
   - MENTOR_MANAGEMENT_QUICK_REFERENCE.md

2. **Review Code Comments**
   - Each component has inline comments

3. **Check Supabase Docs**
   - https://supabase.io/docs

4. **Review RLS Policies**
   - In Supabase dashboard → Tables → Security

---

## What's Next?

After successful integration:

1. **Test thoroughly** with real users
2. **Monitor performance** in production
3. **Gather feedback** from mentors and facilitators
4. **Plan Phase 2** features:
   - Rating system
   - Meeting reminders
   - Analytics dashboard
   - Performance tracking

---

## ✅ Integration Checklist

- [ ] Database script executed successfully
- [ ] Tables created in Supabase
- [ ] Component imported in page
- [ ] Environment variables verified
- [ ] Component renders without errors
- [ ] Mentor list displays correctly
- [ ] Portfolio modal opens
- [ ] History modal opens
- [ ] Assignment form works
- [ ] RLS prevents unauthorized access
- [ ] No console errors
- [ ] Tested in production

---

**Integration Complete!** 🎉

Your mentor management system is now live.
