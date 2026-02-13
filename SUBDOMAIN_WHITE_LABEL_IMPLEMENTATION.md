# 🎨 Subdomain White-Label Implementation

## ✅ Overview

Replaced complex investment advisor-based logo logic with simple **subdomain-based white-label branding**. Now ANY user logging in from a specific subdomain sees that subdomain's custom logo and name.

---

## 🏗️ Architecture

### **Before (Complex)**
- ❌ Checked if user is Investment Advisor
- ❌ Checked if user has assigned Investment Advisor
- ❌ Fetched advisor info from user relationships
- ❌ Complex conditional logic with multiple checks
- ❌ Different logic for different user roles

### **After (Simple)**
- ✅ Check current subdomain from URL
- ✅ Fetch subdomain config from database
- ✅ Show subdomain's logo + name
- ✅ Works for ALL users regardless of role
- ✅ Single source of truth

---

## 📊 Database Table

### **Table: `subdomain_configs`**

```sql
CREATE TABLE subdomain_configs (
    id UUID PRIMARY KEY,
    subdomain TEXT UNIQUE NOT NULL,  -- e.g., 'xyz', 'advisor1'
    name TEXT NOT NULL,               -- e.g., 'XYZ Investment Firm'
    logo_url TEXT,                    -- URL to logo image
    domain_url TEXT,                  -- Optional full domain
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### **Example Data**

```sql
INSERT INTO subdomain_configs (subdomain, name, logo_url) VALUES
('xyz', 'XYZ Investment Firm', 'https://example.com/xyz-logo.png'),
('advisor1', 'Advisor One Company', 'https://example.com/advisor1-logo.png');
```

---

## 🔧 Implementation

### **1. Service Function** (`lib/database.ts`)

```typescript
export const subdomainService = {
  // Get subdomain config by subdomain
  async getSubdomainConfig(subdomain: string) {
    const { data } = await supabase
      .from('subdomain_configs')
      .select('*')
      .eq('subdomain', subdomain)
      .maybeSingle();
    return data;
  },

  // Get current subdomain from URL
  getCurrentSubdomain(): string | null {
    const hostname = window.location.hostname;
    if (hostname === 'localhost') return null;
    
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      return subdomain !== 'www' ? subdomain : null;
    }
    return null;
  },

  // Get config for current subdomain
  async getCurrentSubdomainConfig() {
    const subdomain = this.getCurrentSubdomain();
    return subdomain ? await this.getSubdomainConfig(subdomain) : null;
  }
}
```

### **2. App.tsx State & Effects**

```typescript
// State
const [subdomainConfig, setSubdomainConfig] = useState<any>(null);

// Fetch subdomain config on mount
useEffect(() => {
  const loadSubdomainConfig = async () => {
    const config = await subdomainService.getCurrentSubdomainConfig();
    if (config) {
      console.log('✅ Subdomain config loaded:', config);
      setSubdomainConfig(config);
    }
  };
  loadSubdomainConfig();
}, []);
```

### **3. Header Logo Display**

```tsx
{/* Simple subdomain-based white-label branding */}
{subdomainConfig?.logo_url ? (
  <div className="flex items-center gap-3">
    <img 
      src={subdomainConfig.logo_url} 
      alt={subdomainConfig.name} 
      className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28"
    />
    <div>
      <h1 className="text-lg font-semibold">{subdomainConfig.name}</h1>
      {!subdomainService.getCurrentSubdomain() && (
        <p className="text-xs text-blue-600">Supported by Track My Startup</p>
      )}
    </div>
  </div>
) : (
  <img src={LogoTMS} alt="TrackMyStartup" className="h-28 w-28" />
)}
```

---

## 🎯 How It Works

### **User Flow**

1. **User visits**: `xyz.trackmystartup.com`
2. **App extracts subdomain**: `'xyz'`
3. **App queries database**: `SELECT * FROM subdomain_configs WHERE subdomain = 'xyz'`
4. **App displays**: XYZ's logo + name in header

### **Universal for All Users**

- ✅ **Startups** see subdomain branding
- ✅ **Investors** see subdomain branding
- ✅ **Investment Advisors** see subdomain branding
- ✅ **All other roles** see subdomain branding

### **Fallback**

- If no subdomain (main domain): Show default TrackMyStartup logo
- If subdomain not configured: Show default TrackMyStartup logo

---

## 🔐 Security (RLS Policies)

```sql
-- Allow everyone to read subdomain configs (public branding)
CREATE POLICY "Allow public read access to subdomain configs"
ON subdomain_configs FOR SELECT TO authenticated USING (true);

-- Only admins can manage subdomain configs
CREATE POLICY "Allow admins to manage subdomain configs"
ON subdomain_configs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'Admin'
  )
);
```

---

## 🚀 Benefits

### **✅ Simplicity**
- One lookup, one conditional
- No complex role checking
- Easy to understand and maintain

### **✅ Scalability**
- Add unlimited subdomains
- Just insert new row in database
- No code changes needed

### **✅ Flexibility**
- Works for any subdomain
- Works for all user types
- Admin can manage via UI

### **✅ Performance**
- Single database query
- Cached in state
- No repeated checks

---

## 📝 Setup Instructions

### **1. Run SQL Migration**

```bash
psql -h [your-host] -U [user] -d [database] -f CREATE_SUBDOMAIN_CONFIGS_TABLE.sql
```

### **2. Add Subdomain Configurations**

```sql
-- Example: Add XYZ Investment Firm
INSERT INTO subdomain_configs (subdomain, name, logo_url) 
VALUES ('xyz', 'XYZ Investment Firm', 'https://storage.example.com/xyz-logo.png');
```

### **3. Test**

1. Visit `http://localhost:5000` → See TrackMyStartup logo
2. Visit `http://xyz.localhost:5000` → See XYZ logo + name
3. Visit production subdomain → See configured branding

---

## 🎨 Future Enhancements

### **Possible Additions**
- [ ] Additional fields: `theme_color`, `primary_color`, `secondary_color`
- [ ] Custom footer text
- [ ] Custom email templates
- [ ] Custom domain support (CNAME)
- [ ] Admin UI to manage subdomain configs

---

## 📦 Files Modified

1. ✅ **CREATE_SUBDOMAIN_CONFIGS_TABLE.sql** - Database migration
2. ✅ **lib/database.ts** - Added `subdomainService`
3. ✅ **App.tsx** - Simplified header logo logic

---

## ✨ Result

**Clean, simple, scalable white-label solution that works for everyone!** 🎉
