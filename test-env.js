#!/usr/bin/env node

// Test script to check environment variables
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing Environment Variables...\n');

// Load .env.local file
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  console.log('📄 Loaded .env.local file');
  console.log('Environment variables:');
  console.log('VITE_RAZORPAY_KEY_ID:', process.env.VITE_RAZORPAY_KEY_ID);
  console.log('VITE_RAZORPAY_KEY_SECRET:', process.env.VITE_RAZORPAY_KEY_SECRET);
  console.log('VITE_RAZORPAY_ENVIRONMENT:', process.env.VITE_RAZORPAY_ENVIRONMENT);
} else {
  console.log('❌ .env.local file not found');
}


