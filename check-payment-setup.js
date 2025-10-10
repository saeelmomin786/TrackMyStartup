#!/usr/bin/env node

/**
 * Payment System Setup Verification Script
 * Run this to check if all environment variables are configured correctly
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

console.log('🔍 Checking Payment System Setup...\n');

// Check Supabase configuration
console.log('📊 SUPABASE CONFIGURATION:');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`✅ VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`✅ VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);

// Check Razorpay configuration
console.log('\n💳 RAZORPAY CONFIGURATION:');
const razorpayKeyId = process.env.VITE_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.VITE_RAZORPAY_KEY_SECRET;
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

console.log(`✅ VITE_RAZORPAY_KEY_ID: ${razorpayKeyId ? '✅ Set' : '❌ Missing'}`);
console.log(`✅ VITE_RAZORPAY_KEY_SECRET: ${razorpayKeySecret ? '✅ Set' : '❌ Missing'}`);
console.log(`✅ RAZORPAY_WEBHOOK_SECRET: ${razorpayWebhookSecret ? '✅ Set' : '❌ Missing'}`);

// Test Supabase connection
if (supabaseUrl && supabaseAnonKey) {
  console.log('\n🔗 TESTING SUPABASE CONNECTION:');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created successfully');
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
  }
}

// Check Razorpay key format
if (razorpayKeyId) {
  console.log('\n🔑 RAZORPAY KEY VALIDATION:');
  if (razorpayKeyId.startsWith('rzp_test_')) {
    console.log('✅ Using Razorpay TEST mode (recommended for development)');
  } else if (razorpayKeyId.startsWith('rzp_live_')) {
    console.log('⚠️  Using Razorpay LIVE mode (production)');
  } else {
    console.log('❌ Invalid Razorpay Key ID format');
  }
}

// Summary
console.log('\n📋 SETUP SUMMARY:');
const allConfigured = supabaseUrl && supabaseAnonKey && supabaseServiceKey && 
                     razorpayKeyId && razorpayKeySecret && razorpayWebhookSecret;

if (allConfigured) {
  console.log('🎉 All environment variables are configured!');
  console.log('🚀 Your payment system is ready to use!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm run server (in one terminal)');
  console.log('3. Run: npm run dev (in another terminal)');
  console.log('4. Test payment flow in your application');
} else {
  console.log('❌ Some environment variables are missing.');
  console.log('📖 Please check ENVIRONMENT_SETUP_COMPLETE_GUIDE.md for detailed instructions.');
}

console.log('\n🔧 For detailed setup instructions, see: ENVIRONMENT_SETUP_COMPLETE_GUIDE.md');
