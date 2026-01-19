import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://dlesebbmlrewsbmqvuza.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Key available:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 STEP 1: Checking subscription status for Om Desai...\n');
  
  const profileId = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06';
  const authUserId = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3';
  
  // Check subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (subError) {
    console.error('❌ Error fetching subscriptions:', subError);
  } else {
    console.log('📊 SUBSCRIPTIONS FOUND:', subscriptions?.length || 0);
    if (subscriptions && subscriptions.length > 0) {
      subscriptions.forEach((sub, i) => {
        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);
        const isExpired = periodEnd < now;
        
        console.log(`\n--- Subscription ${i + 1} ---`);
        console.log(`ID: ${sub.id}`);
        console.log(`Status: ${sub.status}`);
        console.log(`Plan Tier: ${sub.plan_tier}`);
        console.log(`Period End: ${sub.current_period_end}`);
        console.log(`Current Time: ${now.toISOString()}`);
        console.log(`Is Expired: ${isExpired ? '❌ YES' : '✅ NO'}`);
        console.log(`Autopay: ${sub.autopay_enabled}`);
        console.log(`Razorpay Sub ID: ${sub.razorpay_subscription_id || 'None'}`);
        console.log(`Amount: ${sub.amount} ${sub.currency}`);
        console.log(`Interval: ${sub.interval}`);
        console.log(`Created: ${sub.created_at}`);
        
        const diagnosis = sub.status === 'active' && !isExpired ? '✅ VALID' :
                         sub.status === 'active' && isExpired ? '❌ EXPIRED - Need to extend' :
                         sub.status === 'inactive' ? '❌ INACTIVE - Need to activate' :
                         '⚠️ UNKNOWN STATUS';
        console.log(`DIAGNOSIS: ${diagnosis}`);
      });
    } else {
      console.log('❌ NO SUBSCRIPTIONS FOUND\n');
    }
  }
  
  console.log('\n🔍 STEP 2: Checking payment transactions...\n');
  
  const { data: payments, error: payError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('user_id', authUserId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (payError) {
    console.error('❌ Error fetching payments:', payError);
  } else {
    console.log('📊 PAYMENTS FOUND:', payments?.length || 0);
    if (payments && payments.length > 0) {
      payments.forEach((pay, i) => {
        console.log(`\n--- Payment ${i + 1} ---`);
        console.log(`ID: ${pay.id}`);
        console.log(`Amount: ${pay.amount} ${pay.currency}`);
        console.log(`Status: ${pay.status}`);
        console.log(`Plan Tier: ${pay.plan_tier || 'Not set'}`);
        console.log(`Subscription ID: ${pay.subscription_id || '❌ NOT LINKED'}`);
        console.log(`Razorpay Payment ID: ${pay.razorpay_payment_id || 'None'}`);
        console.log(`Razorpay Sub ID: ${pay.razorpay_subscription_id || 'None'}`);
        console.log(`Payment Type: ${pay.payment_type}`);
        console.log(`Is Autopay: ${pay.is_autopay}`);
        console.log(`Created: ${pay.created_at}`);
      });
    } else {
      console.log('❌ NO PAYMENTS FOUND\n');
    }
  }
  
  console.log('\n🎯 SUMMARY:\n');
  
  if (!subscriptions || subscriptions.length === 0) {
    console.log('❌ ISSUE: No subscription exists');
    if (payments && payments.length > 0 && payments[0].status === 'success') {
      console.log('💡 FIX: Payment exists but subscription was not created. Need to create subscription.');
      console.log('\n📋 Payment Details to use for creating subscription:');
      console.log('   Payment ID:', payments[0].id);
      console.log('   Amount:', payments[0].amount, payments[0].currency);
      console.log('   Plan Tier:', payments[0].plan_tier);
      console.log('   Payment Date:', payments[0].created_at);
      console.log('   Is Autopay:', payments[0].is_autopay);
      
      // Get plan details
      console.log('\n🔍 Fetching plan details...');
      const { data: plans, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_tier', payments[0].plan_tier);
      
      if (!planError && plans && plans.length > 0) {
        console.log('   Found', plans.length, 'plan(s) for tier:', payments[0].plan_tier);
        plans.forEach((p, i) => {
          console.log(`   Plan ${i+1}:`, p.name, '|', p.price, p.currency, '|', p.interval);
          console.log('     Plan ID:', p.id);
        });
      } else {
        console.log('   ❌ Could not find matching plan for tier:', payments[0].plan_tier);
        console.log('   Let me check all available plans...');
        
        const { data: allPlans } = await supabase
          .from('subscription_plans')
          .select('id, name, plan_tier, price, currency, interval')
          .limit(10);
        
        if (allPlans && allPlans.length > 0) {
          console.log('\n   Available plans:');
          allPlans.forEach(p => {
            console.log(`   - ${p.name} (${p.plan_tier}) | ${p.price} ${p.currency} | ${p.interval}`);
          });
        }
      }
    } else {
      console.log('💡 FIX: No payment found. User may not have completed payment.');
    }
  } else {
    const sub = subscriptions[0];
    const now = new Date();
    const periodEnd = new Date(sub.current_period_end);
    
    if (sub.status !== 'active') {
      console.log(`❌ ISSUE: Subscription status is '${sub.status}'`);
      console.log('💡 FIX: Need to activate subscription');
    } else if (periodEnd < now) {
      console.log('❌ ISSUE: Subscription period has expired');
      console.log(`   Period ended: ${sub.current_period_end}`);
      console.log(`   Current time: ${now.toISOString()}`);
      console.log('💡 FIX: Need to extend current_period_end to future date');
    } else {
      console.log('✅ Subscription appears valid!');
      console.log('   This might be a frontend cache issue or RLS policy issue.');
    }
  }
}

diagnose().catch(console.error);
