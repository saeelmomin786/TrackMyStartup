# General Data Management System

## Overview
A centralized system for managing dropdown/select options that can be managed by admins. This includes:
- **Countries** - Country codes and names
- **Sectors** - Industry sectors
- **Mentor Types** - Types of mentors
- **Round Types** - Investment round types (Pre-Seed, Seed, Series A, etc.)
- **Stages** - Startup stages (Ideation, MVP, PMF, etc.)
- **Domains** - Startup domains (AI, SaaS, Healthcare, etc.)

## Files Created

### 1. Database Table
**File:** `CREATE_GENERAL_DATA_TABLE.sql`

Creates the `general_data` table with:
- Category-based organization
- Display ordering
- Active/Inactive status
- Row Level Security (RLS) policies
- Initial data for all categories

**To execute:**
```sql
-- Run this SQL file in your Supabase SQL editor
\i CREATE_GENERAL_DATA_TABLE.sql
```

### 2. Service Layer
**File:** `lib/generalDataService.ts`

Service methods:
- `getItemsByCategory()` - Get items for a specific category
- `getAllActiveItems()` - Get all active items (public use)
- `getAllItems()` - Get all items including inactive (admin)
- `getItemsGroupedByCategory()` - Get items grouped by category
- `createItem()` - Create a new item
- `updateItem()` - Update an existing item
- `deleteItem()` - Soft delete (set is_active = false)
- `hardDeleteItem()` - Permanent delete
- `reorderItems()` - Update display order
- `bulkImportItems()` - Bulk import items

### 3. Admin Component
**File:** `components/admin/GeneralDataManager.tsx`

Features:
- Category tabs for easy navigation
- Search functionality
- Add/Edit/Delete items
- Reorder items (move up/down)
- Show/Hide inactive items
- Form validation

### 4. Integration
**File:** `components/AdminView.tsx`

Added General Data Manager to the System tab with sub-tabs:
- **General Data** - Manage dropdown options
- **Data Management** - Existing data management features

## How to Use

### For Admins

1. **Access General Data Management:**
   - Go to Admin Dashboard
   - Click on "System" tab
   - Click on "General Data" sub-tab

2. **Add a New Item:**
   - Select the category (Country, Sector, etc.)
   - Click "Add New" button
   - Fill in the form:
     - **Name** (required) - Display name
     - **Code** (optional) - For countries, use country codes (IN, US, etc.)
     - **Description** (optional) - Additional information
     - **Display Order** - Order in dropdown (lower numbers appear first)
     - **Active** - Whether to show in dropdowns
   - Click "Create"

3. **Edit an Item:**
   - Find the item in the list
   - Click the Edit icon
   - Modify the fields
   - Click "Update"

4. **Reorder Items:**
   - Use the up/down arrows to change display order
   - Items are automatically saved

5. **Deactivate/Delete:**
   - Click the trash icon to deactivate (soft delete)
   - Deactivated items won't show in dropdowns
   - To permanently delete, check "Show Inactive" and delete again

### For Developers

**Using the Service in Components:**

```typescript
import { generalDataService } from '../lib/generalDataService';

// Get all countries
const countries = await generalDataService.getItemsByCategory('country');

// Get all sectors
const sectors = await generalDataService.getItemsByCategory('sector');

// Get all active items for a dropdown
const roundTypes = await generalDataService.getItemsByCategory('round_type');
```

**Example: Update InvestorProfileForm to use centralized countries:**

```typescript
// Before (hardcoded):
const countries = ['India', 'USA', 'UK', ...];

// After (from database):
const [countries, setCountries] = useState<string[]>([]);

useEffect(() => {
  const loadCountries = async () => {
    const data = await generalDataService.getItemsByCategory('country');
    setCountries(data.map(c => c.name));
  };
  loadCountries();
}, []);
```

## Database Schema

```sql
CREATE TABLE general_data (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,  -- 'country', 'sector', etc.
    code VARCHAR(100),              -- Optional code (e.g., 'IN' for India)
    name VARCHAR(255) NOT NULL,      -- Display name
    description TEXT,               -- Optional description
    display_order INTEGER DEFAULT 0, -- Order in dropdowns
    is_active BOOLEAN DEFAULT true, -- Active status
    metadata JSONB,                 -- Additional data
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE(category, name)
);
```

## Security

- **Row Level Security (RLS)** enabled
- **Read Access:** All authenticated users can read active items
- **Admin Access:** Only admins can read inactive items, create, update, and delete

## Next Steps

1. **Execute SQL:** Run `CREATE_GENERAL_DATA_TABLE.sql` in Supabase
2. **Test Admin Interface:** Access System > General Data tab
3. **Update Components:** Gradually replace hardcoded arrays with service calls
4. **Add More Categories:** Extend the system for other dropdown types

## Benefits

✅ **Centralized Management** - Single source of truth for all dropdown data
✅ **Admin Control** - Admins can add/edit/delete without code changes
✅ **Consistency** - Same data across all components
✅ **Flexibility** - Easy to add new categories
✅ **Ordering** - Control display order of items
✅ **Soft Delete** - Deactivate instead of permanent deletion

## Migration Notes

Existing hardcoded arrays in components can be gradually migrated:
- `InvestorProfileForm.tsx` - Countries
- `MentorProfileForm.tsx` - Sectors, Mentor Types
- `types.ts` - StartupDomain enum (can be replaced with database lookup)
- Other components with hardcoded lists

The system is backward compatible - existing hardcoded arrays will continue to work until components are updated.




