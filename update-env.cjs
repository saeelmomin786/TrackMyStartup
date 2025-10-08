const fs = require('fs');
const path = require('path');

const envContent = `VITE_SUPABASE_URL=https://csmiydbirfadnrebjuka.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzbWl5ZGJpcmZhZG5yZWJqdWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDI4NDMsImV4cCI6MjA3MDExODg0M30.9J6LH7QtoQWwjp4bxk2dEB6SPUzmD3oEFsxoVd_8cEc
VITE_API_BASE_URL=http://localhost:3001
VITE_RAZORPAY_KEY_ID=rzp_live_RMzc3DoDdGLh9u
VITE_RAZORPAY_KEY_SECRET=IsYa9bHZOFX4f2vp44LNlDzJ
VITE_RAZORPAY_ENVIRONMENT=live`;

fs.writeFileSync('.env.local', envContent);
console.log('✅ Updated .env.local with VITE_ prefixed Razorpay keys');
