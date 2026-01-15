# India (INR) + International (EUR) Pricing Setup

## 📋 Overview

This setup configures the pricing structure where:
- **India**: Admin sets prices in INR (displayed as EUR base: €5, €20)
- **International**: Fixed EUR prices (€5 Basic, €20 Premium - cannot be changed)

---

## 🚀 How to Run

### Step 1: Run the SQL Script

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `database/19_setup_india_inr_international_eur_pricing.sql`
4. Click **Run**

### Step 2: Verify Setup

After running, you should see:
- ✅ India pricing with admin-configurable INR
- ✅ International pricing with fixed EUR
- ✅ Helper functions created

---

## 📊 Database Structure

### `country_plan_prices` Table

| Column | Type | Description |
|--------|------|-------------|
| `base_price_eur` | DECIMAL(10,2) | Fixed EUR base price (€5, €20) |
| `price_inr` | DECIMAL(10,2) | INR price (India only, admin sets) |
| `currency` | VARCHAR(3) | 'INR' for India, 'EUR' for International |
| `is_admin_configurable` | BOOLEAN | `true` for India, `false` for International |
| `payment_gateway` | VARCHAR(20) | 'razorpay' for India, 'stripe' for International |

---

## 💰 Pricing Structure

### India (Admin-Configurable)

| Plan | Base EUR | Default INR | Admin Can Change? |
|------|----------|-------------|-------------------|
| Free | €0 | ₹0 | No |
| Basic | €5 | ₹450 | ✅ Yes |
| Premium | €20 | ₹1800 | ✅ Yes |

**How it works:**
- User sees: "Basic Plan: €5/month"
- Admin sets: "€5 = ₹450" (or any amount)
- Payment: Razorpay charges ₹450 (admin-set amount)
- Stored: `base_price_eur = 5.00`, `locked_amount_inr = 450.00`

### International (Fixed EUR)

| Plan | Price | Admin Can Change? |
|------|-------|-------------------|
| Free | €0 | No |
| Basic | €5 | ❌ No (Fixed) |
| Premium | €20 | ❌ No (Fixed) |

**How it works:**
- User sees: "Basic Plan: €5/month"
- Payment: Stripe/PayPal charges €5 (fixed)
- Stored: `base_price_eur = 5.00`, `currency = 'EUR'`

---

## 🔧 Helper Functions

### `get_country_plan_price(country, plan_tier)`

Returns pricing information for a country and plan tier.

**Usage:**
```sql
-- Get India Basic plan price
SELECT * FROM get_country_plan_price('India', 'basic');

-- Returns:
-- base_price_eur: 5.00
-- price_inr: 450.00
-- price_eur: 5.00 (for display)
-- currency: 'INR'
-- payment_gateway: 'razorpay'
-- is_admin_configurable: true
```

**For countries not in database:**
- Automatically returns International pricing
- Example: `get_country_plan_price('United States', 'basic')` → Returns International €5

### `update_india_price(plan_tier, price_inr)`

Admin function to update India INR prices.

**Usage:**
```sql
-- Update India Basic plan to ₹500
SELECT update_india_price('basic', 500.00);

-- Update India Premium plan to ₹2000
SELECT update_india_price('premium', 2000.00);
```

**Note:** Only works for India, only for admin-configurable plans.

---

## 🎯 Frontend Display Logic

### Always Show EUR

```typescript
// Frontend always displays EUR
const displayPrice = (planTier: string) => {
  if (planTier === 'basic') return '€5/month';
  if (planTier === 'premium') return '€20/month';
  return '€0/month';
};

// User sees: "Basic Plan: €5/month" (same for all countries)
```

### Payment Processing

```typescript
// When user subscribes
async function handleSubscribe(planTier: string, userCountry: string) {
  const { data: priceInfo } = await supabase
    .rpc('get_country_plan_price', {
      p_country: userCountry === 'India' ? 'India' : 'International',
      p_plan_tier: planTier
    });
  
  if (userCountry === 'India') {
    // Charge INR amount (admin-set)
    await createRazorpayOrder(priceInfo.price_inr, 'INR');
  } else {
    // Charge EUR amount (fixed)
    await createInternationalOrder(priceInfo.base_price_eur, 'EUR');
  }
}
```

---

## 📝 Admin Dashboard Usage

### View Current Prices

```typescript
// Get India prices (admin-configurable)
const { data: indiaPrices } = await supabase
  .from('country_plan_prices')
  .select('*')
  .eq('country', 'India')
  .eq('is_admin_configurable', true);

// Display:
// Basic: €5 = ₹[450] ← Admin can edit
// Premium: €20 = ₹[1800] ← Admin can edit
```

### Update India Prices

```typescript
// Update India Basic plan price
await supabase.rpc('update_india_price', {
  p_plan_tier: 'basic',
  p_price_inr: 500.00  // Admin sets this
});

// Or direct update (if admin has permission)
await supabase
  .from('country_plan_prices')
  .update({ price_inr: 500.00 })
  .eq('country', 'India')
  .eq('plan_tier', 'basic');
```

### View International Prices (Read-Only)

```typescript
// Get International prices (fixed, cannot change)
const { data: intlPrices } = await supabase
  .from('country_plan_prices')
  .select('*')
  .eq('country', 'International')
  .eq('is_admin_configurable', false);

// Display (read-only):
// Basic: €5 (Fixed)
// Premium: €20 (Fixed)
```

---

## 🔄 Payment Flow

### India User Flow

```
1. User visits subscription page
   ↓
2. Sees: "Basic Plan: €5/month" (EUR display)
   ↓
3. Clicks "Subscribe"
   ↓
4. System detects: Country = India
   ↓
5. Fetches: price_inr = ₹450 (admin-set)
   ↓
6. Opens Razorpay: Shows ₹450 (INR)
   ↓
7. User pays: ₹450
   ↓
8. Stored:
   - base_price_eur = 5.00
   - locked_amount_inr = 450.00
   - currency = 'INR'
   ↓
9. Autopay: Charges ₹450 every month
```

### International User Flow

```
1. User visits subscription page
   ↓
2. Sees: "Basic Plan: €5/month" (EUR display)
   ↓
3. Clicks "Subscribe"
   ↓
4. System detects: Country ≠ India
   ↓
5. Fetches: base_price_eur = €5 (fixed)
   ↓
6. Opens Stripe/PayPal: Shows €5 (EUR)
   ↓
7. User pays: €5
   ↓
8. Stored:
   - base_price_eur = 5.00
   - currency = 'EUR'
   ↓
9. Autopay: Charges €5 every month
```

---

## ✅ Verification Checklist

After running the script, verify:

- [ ] India prices exist with `is_admin_configurable = true`
- [ ] International prices exist with `is_admin_configurable = false`
- [ ] `get_country_plan_price()` function works
- [ ] `update_india_price()` function works
- [ ] India prices have both `base_price_eur` and `price_inr`
- [ ] International prices have `base_price_eur` but `price_inr = NULL`

---

## 🚨 Important Notes

1. **India Prices**: Admin can change INR amounts, but EUR base (€5, €20) is fixed
2. **International Prices**: Fixed EUR prices, cannot be changed by admin
3. **Display**: Frontend always shows EUR to users
4. **Payment**: India charges INR (admin-set), International charges EUR (fixed)
5. **Locked Amount**: India stores `locked_amount_inr` for autopay consistency

---

## 📚 Next Steps

1. ✅ Run the SQL script (done)
2. ⏳ Build admin dashboard to update India prices
3. ⏳ Update frontend to always display EUR
4. ⏳ Update payment service to use correct currency
5. ⏳ Test India payment flow
6. ⏳ Test International payment flow (Phase 2)

---

## 🔍 Troubleshooting

### Issue: India prices not showing
**Solution:** Check if `country = 'India'` and `is_active = true`

### Issue: Cannot update India prices
**Solution:** Ensure you're using `update_india_price()` function or have UPDATE permission

### Issue: International prices showing as NULL
**Solution:** Check if `country = 'International'` exists in database

### Issue: Function not found
**Solution:** Re-run the SQL script to create functions

---

**Setup Complete!** 🎉

You can now:
- Admin can set India INR prices
- International uses fixed EUR prices
- Frontend displays EUR for all users
- Payment uses correct currency based on country
