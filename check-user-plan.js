// Quick check: What plan tier does the user actually have?
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserPlan() {
  // Get the latest test user from logs (auth_user_id)
  const testUserId = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3'; // From your latest test
  
  console.log('🔍 Checking plan for user:', testUserId);
  console.log('');
  
  // 1. Check user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name, role')
    .eq('auth_user_id', testUserId)
    .single();
  
  console.log('👤 User Profile:', profile);
  console.log('');
  
  if (!profile) {
    console.log('❌ Profile not found!');
    return;
  }
  
  // 2. Check user_subscriptions
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('id, plan_id, plan_tier, status, created_at, current_period_end, razorpay_subscription_id')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });
  
  console.log('📋 Subscriptions for profile_id:', profile.id);
  console.log(JSON.stringify(subscriptions, null, 2));
  console.log('');
  
  // 3. Check subscription plan details
  if (subscriptions && subscriptions.length > 0) {
    const latestSub = subscriptions[0];
    
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id, name, plan_tier, price, currency')
      .eq('id', latestSub.plan_id)
      .single();
    
    console.log('📦 Plan Details:');
    console.log(JSON.stringify(plan, null, 2));
    console.log('');
    
    console.log('=== SUMMARY ===');
    console.log(`Subscription plan_tier: ${latestSub.plan_tier || 'NULL'}`);
    console.log(`Subscription status: ${latestSub.status}`);
    console.log(`Plan table plan_tier: ${plan?.plan_tier || 'NULL'}`);
    console.log(`Razorpay subscription ID: ${latestSub.razorpay_subscription_id || 'NULL'}`);
    
    if (latestSub.plan_tier === 'premium' && plan?.plan_tier === 'premium') {
      console.log('✅ Everything looks correct! User should see premium plan.');
    } else if (!latestSub.plan_tier) {
      console.log('⚠️ plan_tier is NULL in subscription record!');
    } else {
      console.log('⚠️ Mismatch detected!');
    }
  } else {
    console.log('❌ No subscriptions found!');
  }
}

checkUserPlan().catch(console.error);
