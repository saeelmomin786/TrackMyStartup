#!/usr/bin/env node

// Script to fix the .env.local file with correct variable names
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing .env.local file...\n');

const envPath = path.join(__dirname, '.env.local');

// Read current .env.local file
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📄 Current .env.local content:');
  console.log(envContent);
  console.log('\n');
}

// Create the corrected content
const correctedContent = `VITE_SUPABASE_URL=https://csmiydbirfadnrebjuka.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzbWl5ZGJpcmZhZG5yZWJqdWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDI4NDMsImV4cCI6MjA3MDExODg0M30.9J6LH7QtoQWwjp4bxk2dEB6SPUzmD3oEFsxoVd_8cEc
VITE_API_BASE_URL=http://localhost:3001
VITE_RAZORPAY_KEY_ID=rzp_live_RMzc3DoDdGLh9u
VITE_RAZORPAY_KEY_SECRET=your_actual_secret_here
VITE_RAZORPAY_ENVIRONMENT=live
VITE_RAZORPAY_SUBSCRIPTION_BUTTON_ID=pl_RMvYPEir7kvx3Eimage.png`;

// Write the corrected content
fs.writeFileSync(envPath, correctedContent);

console.log('✅ .env.local file updated!');
console.log('📝 Please update VITE_RAZORPAY_KEY_SECRET with your actual secret');
console.log('🔍 You can get it from: https://dashboard.razorpay.com/');
console.log('\n💡 Next steps:');
console.log('1. Update VITE_RAZORPAY_KEY_SECRET with your real secret');
console.log('2. Run: npm run check-razorpay');
console.log('3. Start server: npm run server');
console.log('4. Start React app: npm run dev');


