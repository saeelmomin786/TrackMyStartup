#!/usr/bin/env node

// Simple script to start the payment server with proper environment setup
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Payment Server...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env.local file not found. Creating template...\n');
  
  const envTemplate = `# Razorpay Configuration
# Get these from https://dashboard.razorpay.com/
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
VITE_RAZORPAY_KEY_SECRET=your_key_secret_here
VITE_RAZORPAY_ENVIRONMENT=test

# Supabase Configuration (if needed)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local template');
  console.log('📝 Please edit .env.local with your actual Razorpay keys\n');
}

// Start the server
const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  console.log('\n💡 Make sure you have installed dependencies:');
  console.log('   npm install express cors dotenv node-fetch\n');
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(`\n⚠️  Server exited with code ${code}`);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

console.log('🌐 Payment server starting on http://localhost:3001');
console.log('📋 Available endpoints:');
console.log('   POST /api/razorpay/create-order');
console.log('   POST /api/razorpay/create-subscription');
console.log('   GET  /health');
console.log('\n💡 To stop the server, press Ctrl+C\n');


