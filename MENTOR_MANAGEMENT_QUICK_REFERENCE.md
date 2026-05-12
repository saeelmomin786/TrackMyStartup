# Mentor Management - Quick Reference Card

## 🎯 Files Location

### Database
- `CREATE_MENTOR_STARTUP_ASSIGNMENTS.sql` - Run in Supabase

### Components (in `components/mentor/`)
- `RegisteredMentorsTab.tsx` - Main container
- `MentorPortfolioModal.tsx` - Portfolio display
- `MentorHistoryModal.tsx` - Meeting history
- `AssignToStartupForm.tsx` - Assignment form

### Services
- `lib/mentorService.ts` - Updated with new methods

### API (in `api/`)
- `mentor-stats.ts` - GET /api/mentor-stats
- `mentor-history.ts` - GET /api/mentor-history
- `mentor-status.ts` - PUT /api/mentor-status

---

## 🔧 Quick Integration

```typescript
// Step 1: Import in your page
import RegisteredMentorsTab from './components/mentor/RegisteredMentorsTab';

// Step 2: Use in JSX
<RegisteredMentorsTab />

// Done! The component handles everything.
```

---

## 📊 Database Tables

### mentor_startup_assignments
- Links mentors to startups
- Tracks status (active/inactive/completed)
- Stores assignment date and notes

### mentor_meeting_history
- Stores all meetings
- Includes Google Meet links
- Stores AI notes
- Tracks attendance and status

---

## 🎨 UI Components

### RegisteredMentorsTab
| Component | Shows |
|-----------|-------|
| Tabs | Approved / Pending |
| Table | Name, Email, Expertise, View Portfolio |
| Modal | Opens on "View Portfolio" |

### MentorPortfolioModal
| Section | Content |
|---------|---------|
| Header | Photo, Name, Email, Tags |
| Stats | 4 cards: Sessions, Completed, Rating, Startups |
| Buttons | Deactivate/Activate, View History, + Assign |

### MentorHistoryModal
| Section | Content |
|---------|---------|
| List | All meetings chronologically |
| Meeting Card | Date, Duration, Status, Badges |
| Details | Meet link, AI notes, Action items |

### AssignToStartupForm
| Field | Type |
|-------|------|
| Startup | Dropdown selector |
| Notes | Optional text area |
| Status | Pre-selected mentor info |

---

## 🚀 Deployment

### 1. Database Setup (2 min)
```sql
-- Copy CREATE_MENTOR_STARTUP_ASSIGNMENTS.sql
-- Paste in Supabase SQL Editor
-- Click "Run"
```

### 2. Code Integration (5 min)
```typescript
// Import component
import RegisteredMentorsTab from './components/mentor/RegisteredMentorsTab';

// Add to page
<RegisteredMentorsTab />
```

### 3. Test (5 min)
- Click on mentors
- View portfolios
- Check history
- Try assignment

---

## 📱 User Flows

### View Mentor Profile
```
Click Mentor Row
    ↓
Portfolio Modal Opens
    ↓
See Stats
    ↓
Click Action Button
```

### View Meeting History
```
Click "View History"
    ↓
History Modal Opens
    ↓
See All Meetings
    ↓
Click Meet Link
```

### Assign to Startup
```
Click "+ Assign"
    ↓
Form Opens
    ↓
Select Startup
    ↓
Add Notes (Optional)
    ↓
Click "Assign Mentor"
```

---

## 🔐 Security

All data is protected by RLS:
- ✅ Mentors see only their data
- ✅ Startups see assigned mentors
- ✅ Facilitators see all data
- ✅ Public cannot access anything

---

## 📈 Key Stats

| Metric | Value |
|--------|-------|
| Components Created | 4 |
| API Endpoints | 3 |
| Database Tables | 2 |
| RLS Policies | 8 |
| Indexes | 7 |
| Documentation Files | 5 |

---

## ✅ Checklist Before Go-Live

- [ ] Run SQL script in Supabase
- [ ] Verify tables created
- [ ] Import RegisteredMentorsTab
- [ ] Test mentor list displays
- [ ] Test portfolio modal
- [ ] Test history modal
- [ ] Test assignment form
- [ ] Test RLS security
- [ ] Check browser console for errors
- [ ] Deploy to production

---

## 🐛 Troubleshooting

### Mentors not showing
→ Check if table has data
→ Verify RLS allows access
→ Check Supabase logs

### History empty
→ Verify meeting_history table has records
→ Check startup_id matches
→ Confirm RLS policy

### Assignment fails
→ Check startup exists
→ Verify no duplicate assignment
→ Check form validation

### Google Meet link not working
→ Verify link is valid URL
→ Check link is stored correctly
→ Test link directly

---

## 📝 API Examples

### Get Mentor Stats
```
GET /api/mentor-stats?mentorId=uuid-here

Response:
{
  "totalSessions": 15,
  "completedSessions": 12,
  "avgRating": 4.5,
  "totalStartups": 3
}
```

### Get Meeting History
```
GET /api/mentor-history?mentorId=uuid-here

Response:
[
  {
    "id": 1,
    "meeting_date": "2024-12-15T10:00:00Z",
    "google_meet_link": "https://meet.google.com/xxx",
    "ai_notes": "Discussed roadmap",
    "startup_name": "TechStartup Inc",
    ...
  },
  ...
]
```

### Update Mentor Status
```
PUT /api/mentor-status

Body:
{
  "mentorId": "uuid-here",
  "isActive": false
}

Response:
{
  "success": true,
  "message": "Mentor status updated to inactive"
}
```

---

## 🎓 Key Concepts

### Profile vs Portfolio
- **Profile**: User registration data (user_profiles table)
- **Portfolio**: Mentor's work history & statistics (this feature)

### Assignment vs Request
- **Request**: Mentor request from startup (existing feature)
- **Assignment**: Facilitator assigns mentor to startup (new feature)

### Meeting vs Session
- **Meeting**: Historical record in mentor_meeting_history (new)
- **Session**: Booking in scheduling system (existing)

---

## 📞 Contact Support

For questions:
1. Check documentation files
2. Review troubleshooting section
3. Check Supabase dashboard
4. Review browser console

---

## 🎉 You're All Set!

Everything is ready. Just:
1. Run the SQL script
2. Import the component
3. Use in your page
4. Test and deploy

**That's it!** 🚀
