import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://dlesebbmlrewsbmqvuza.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllUsers() {
  console.log('🔍 Checking ALL users with payment issues...\n');
  
  // Find all successful payments without subscriptions
  const { data: orphanedPayments, error: payError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('status', 'success')
    .is('subscription_id', null)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (payError) {
    console.error('❌ Error:', payError);
    return;
  }
  
  console.log('📊 ORPHANED PAYMENTS (paid but no subscription created):\n');
  console.log(`Found ${orphanedPayments?.length || 0} payments without subscriptions\n`);
  
  if (orphanedPayments && orphanedPayments.length > 0) {
    console.log('Affected payments:\n');
    
    for (const payment of orphanedPayments) {
      // Get user details
      const { data: user } = await supabase
        .from('user_profiles')
        .select('email, name, role')
        .eq('auth_user_id', payment.user_id)
        .single();
      
      console.log('-------------------------------------------');
      console.log(`User: ${user?.name || 'Unknown'} (${user?.email || 'No email'})`);
      console.log(`Role: ${user?.role || 'Unknown'}`);
      console.log(`Payment ID: ${payment.id}`);
      console.log(`Amount: ${payment.amount} ${payment.currency}`);
      console.log(`Plan Tier: ${payment.plan_tier || 'Not set'}`);
      console.log(`Payment Date: ${new Date(payment.created_at).toLocaleString()}`);
      console.log(`Is Autopay: ${payment.is_autopay}`);
      console.log(`Razorpay Payment ID: ${payment.razorpay_payment_id || 'None'}`);
      console.log(`Status: ❌ NO SUBSCRIPTION CREATED`);
    }
    
    console.log('\n\n🎯 SUMMARY:\n');
    console.log(`Total affected users: ${orphanedPayments.length}`);
    console.log(`Total revenue not converted to subscriptions: ${orphanedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)} INR`);
    console.log('\n❌ CRITICAL BUG: Payment verification endpoint is NOT creating subscriptions!');
    console.log('\n💡 This needs immediate fix in the backend code.');
  } else {
    console.log('✅ No orphaned payments found - all payments have subscriptions');
  }
  
  // Also check: Subscriptions without payments
  console.log('\n\n🔍 Checking for subscriptions without payment records...\n');
  
  const { data: allSubs } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan_tier, amount, created_at, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (allSubs) {
    let subsWithoutPayment = 0;
    for (const sub of allSubs) {
      const { data: payment } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('subscription_id', sub.id)
        .single();
      
      if (!payment) {
        subsWithoutPayment++;
      }
    }
    
    console.log(`Checked ${allSubs.length} recent subscriptions`);
    console.log(`Found ${subsWithoutPayment} subscriptions without payment records`);
  }
}

checkAllUsers().catch(console.error);
