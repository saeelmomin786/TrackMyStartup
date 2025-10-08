# 🔧 Environment Setup for Razorpay

## Step 1: Create Environment File

Create a `.env.local` file in your project root with the following content:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_id_here
VITE_RAZORPAY_KEY_SECRET=your_actual_key_secret_here
VITE_RAZORPAY_ENVIRONMENT=test

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 2: Get Your Razorpay Keys

1. **Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)**
2. **Go to Account & Settings → API Keys**
3. **Generate your Key ID and Key Secret**
4. **Replace the placeholder values in .env.local**

## Step 3: Test Mode vs Live Mode

### Test Mode (Development)
- Use keys starting with `rzp_test_`
- No real money charged
- Use test card: `4111 1111 1111 1111`

### Live Mode (Production)
- Use keys starting with `rzp_live_`
- Real payments processed
- Requires business verification

## Step 4: Restart Your Development Server

After updating environment variables:
```bash
npm run dev
# or
yarn dev
```

## Step 5: Verify Configuration

Check if your keys are loaded correctly by adding this to any component:
```javascript
console.log('Razorpay Key ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);
```

## Security Notes

- ✅ Never commit `.env.local` to version control
- ✅ Keep your Key Secret secure
- ✅ Use test keys for development
- ✅ Switch to live keys only for production












