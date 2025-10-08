#!/usr/bin/env node

// Script to restart the React app and clear cache
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Restarting React App with Environment Variables...\n');

// Check if .env.local exists and has the right content
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📄 .env.local content:');
  console.log(envContent);
  console.log('\n');
} else {
  console.log('❌ .env.local file not found');
  process.exit(1);
}

// Clear Vite cache
const cacheDir = path.join(__dirname, 'node_modules', '.vite');
if (fs.existsSync(cacheDir)) {
  console.log('🧹 Clearing Vite cache...');
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✅ Vite cache cleared');
}

console.log('🚀 Starting React app with fresh environment...');
console.log('💡 Make sure to restart your payment server too: npm run server');

// Start the React app
const reactProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

reactProcess.on('error', (error) => {
  console.error('❌ Failed to start React app:', error.message);
});

reactProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(`⚠️  React app exited with code ${code}`);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down React app...');
  reactProcess.kill('SIGINT');
  process.exit(0);
});

console.log('\n💡 To test the payment:');
console.log('1. Make sure payment server is running: npm run server');
console.log('2. Open the subscription modal');
console.log('3. Check browser console for environment variables');
console.log('4. Click Pay button to test');


