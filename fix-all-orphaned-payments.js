import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://dlesebbmlrewsbmqvuza.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllOrphanedPayments() {
  console.log('🔧 Starting bulk fix for all orphaned payments...\n');
  
  // Get all orphaned payments
  const { data: payments, error: fetchError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('status', 'success')
    .is('subscription_id', null)
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Error fetching payments:', fetchError);
    return;
  }
  
  console.log(`📊 Found ${payments?.length || 0} orphaned payments to fix\n`);
  
  if (!payments || payments.length === 0) {
    console.log('✅ No orphaned payments found - all good!');
    return;
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (const payment of payments) {
    try {
      console.log(`\n--- Processing Payment ${payment.id} ---`);
      console.log(`Amount: ${payment.amount} ${payment.currency}`);
      console.log(`Plan Tier: ${payment.plan_tier}`);
      console.log(`User ID: ${payment.user_id}`);
      
      // Get user email for logging
      const { data: user } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('auth_user_id', payment.user_id)
        .single();
      
      if (user) {
        console.log(`User: ${user.name} (${user.email})`);
      }
      
      // Get plan details based on plan_tier
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_tier', payment.plan_tier)
        .limit(10);
      
      if (!plans || plans.length === 0) {
        console.log(`❌ No plan found for tier: ${payment.plan_tier}`);
        failCount++;
        continue;
      }
      
      // Find best matching plan (prefer same currency)
      let plan = plans.find(p => p.currency === payment.currency);
      if (!plan) {
        plan = plans[0]; // Fallback to first plan
      }
      
      console.log(`Using plan: ${plan.name} (${plan.id})`);
      
      // Calculate period dates from payment date
      const paymentDate = new Date(payment.created_at);
      const periodEnd = new Date(paymentDate);
      periodEnd.setDate(periodEnd.getDate() + 30); // 30 days validity
      
      console.log(`Period: ${paymentDate.toISOString()} to ${periodEnd.toISOString()}`);
      
      // Create subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: payment.user_id,
          plan_id: plan.id,
          plan_tier: payment.plan_tier,
          status: 'active',
          current_period_start: paymentDate.toISOString(),
          current_period_end: periodEnd.toISOString(),
          amount: payment.amount,
          currency: payment.currency,
          interval: 'monthly',
          payment_gateway: 'razorpay',
          autopay_enabled: payment.is_autopay || false,
          billing_cycle_count: 1,
          total_paid: payment.amount,
          last_billing_date: paymentDate.toISOString(),
          next_billing_date: periodEnd.toISOString(),
        })
        .select()
        .single();
      
      if (subError) {
        console.log(`❌ Error creating subscription:`, subError.message);
        failCount++;
        continue;
      }
      
      console.log(`✅ Created subscription: ${subscription.id}`);
      
      // Link payment to subscription
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({ subscription_id: subscription.id })
        .eq('id', payment.id);
      
      if (updateError) {
        console.log(`⚠️ Warning: Could not link payment:`, updateError.message);
      } else {
        console.log(`✅ Linked payment to subscription`);
      }
      
      // Create billing cycle record
      const { error: billingError } = await supabase
        .from('billing_cycles')
        .insert({
          subscription_id: subscription.id,
          cycle_number: 1,
          period_start: paymentDate.toISOString(),
          period_end: periodEnd.toISOString(),
          payment_transaction_id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: 'paid',
          plan_tier: payment.plan_tier,
          is_autopay: payment.is_autopay || false,
        });
      
      if (billingError) {
        console.log(`⚠️ Warning: Could not create billing cycle:`, billingError.message);
      } else {
        console.log(`✅ Created billing cycle record`);
      }
      
      successCount++;
      console.log(`✅ Successfully fixed payment ${payment.id}`);
      
    } catch (error) {
      console.error(`❌ Error processing payment ${payment.id}:`, error instanceof Error ? error.message : error);
      failCount++;
    }
  }
  
  console.log('\n\n' + '='.repeat(60));
  console.log('🎯 BULK FIX COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully fixed: ${successCount} payments`);
  console.log(`❌ Failed: ${failCount} payments`);
  console.log(`📊 Total processed: ${payments.length} payments`);
  
  if (successCount > 0) {
    console.log('\n💡 Action Required:');
    console.log('   1. Deploy the backend fix to prevent future issues');
    console.log('   2. Notify affected users that their subscriptions are now active');
    console.log('   3. Ask users to clear browser cache and refresh');
  }
}

fixAllOrphanedPayments().catch(console.error);
