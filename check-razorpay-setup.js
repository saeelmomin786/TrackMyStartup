#!/usr/bin/env node

// Script to check Razorpay setup and environment variables
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking Razorpay Setup...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  console.log('📝 Create .env.local file with your Razorpay keys\n');
  process.exit(1);
}

// Read .env.local file
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

// Check for required variables
const requiredVars = [
  'VITE_RAZORPAY_KEY_ID',
  'VITE_RAZORPAY_KEY_SECRET',
  'VITE_RAZORPAY_ENVIRONMENT'
];

let allVarsPresent = true;
const foundVars = {};

lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    foundVars[key.trim()] = value.trim();
  }
});

console.log('📋 Environment Variables Check:');
requiredVars.forEach(varName => {
  if (foundVars[varName]) {
    const value = foundVars[varName];
    if (value.includes('your_actual') || value.includes('placeholder')) {
      console.log(`❌ ${varName}: ${value} (placeholder value)`);
      allVarsPresent = false;
    } else {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    }
  } else {
    console.log(`❌ ${varName}: Not found`);
    allVarsPresent = false;
  }
});

console.log('\n🔧 Server Setup Check:');

// Check if server.js exists
if (fs.existsSync(path.join(__dirname, 'server.js'))) {
  console.log('✅ server.js found');
} else {
  console.log('❌ server.js not found');
  allVarsPresent = false;
}

// Check if required dependencies are installed
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = ['express', 'cors', 'dotenv', 'node-fetch'];
  
  console.log('\n📦 Dependencies Check:');
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: Not installed`);
      allVarsPresent = false;
    }
  });
}

console.log('\n🎯 Summary:');
if (allVarsPresent) {
  console.log('✅ Razorpay setup looks good!');
  console.log('🚀 You can now start the server with: npm run server');
} else {
  console.log('❌ Setup incomplete. Please fix the issues above.');
  console.log('📖 See GET_RAZORPAY_KEYS.md for detailed instructions.');
}

console.log('\n💡 Next Steps:');
console.log('1. Get your Razorpay keys from dashboard.razorpay.com');
console.log('2. Update .env.local with real keys');
console.log('3. Start server: npm run server');
console.log('4. Start React app: npm run dev');
console.log('5. Test payment flow');
