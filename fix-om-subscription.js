import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://dlesebbmlrewsbmqvuza.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const profileId = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06';
const authUserId = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3';
const paymentId = 'e21d6afb-6fe3-4244-97cb-cf976c5d7ae5';
const planId = 'a686fabd-b9b4-45b9-a122-4d522c712096'; // Premium plan

async function fixSubscription() {
  console.log('🔧 Creating subscription for Om Desai...\n');
  
  // Calculate period dates
  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30); // 30 days from now
  
  console.log('Creating subscription with:');
  console.log('  User ID (profile):', profileId);
  console.log('  Plan ID:', planId);
  console.log('  Plan Tier: premium');
  console.log('  Start Date:', now.toISOString());
  console.log('  End Date:', periodEnd.toISOString());
  console.log('  Amount: 3 INR');
  console.log('  Autopay: true\n');
  
  // Create subscription
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: profileId,
      plan_id: planId,
      plan_tier: 'premium',
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      amount: 3,
      currency: 'INR',
      interval: 'monthly',
      payment_gateway: 'razorpay',
      autopay_enabled: true,
      billing_cycle_count: 1,
      total_paid: 3,
      last_billing_date: now.toISOString(),
      next_billing_date: periodEnd.toISOString(),
    })
    .select()
    .single();
  
  if (subError) {
    console.error('❌ Error creating subscription:', subError);
    return;
  }
  
  console.log('✅ Subscription created successfully!');
  console.log('   Subscription ID:', subscription.id);
  console.log('   Status:', subscription.status);
  console.log('   Plan Tier:', subscription.plan_tier);
  console.log('   Valid until:', subscription.current_period_end);
  
  // Link payment to subscription
  console.log('\n🔗 Linking payment to subscription...');
  
  const { error: updateError } = await supabase
    .from('payment_transactions')
    .update({ subscription_id: subscription.id })
    .eq('id', paymentId);
  
  if (updateError) {
    console.error('❌ Error linking payment:', updateError);
  } else {
    console.log('✅ Payment linked successfully!');
  }
  
  // Verify
  console.log('\n✅ VERIFICATION:\n');
  
  const { data: verifyData } = await supabase
    .from('user_subscriptions')
    .select(`
      id,
      status,
      plan_tier,
      current_period_end,
      autopay_enabled
    `)
    .eq('user_id', profileId)
    .single();
  
  if (verifyData) {
    const isValid = new Date(verifyData.current_period_end) > new Date();
    console.log('Subscription ID:', verifyData.id);
    console.log('Status:', verifyData.status);
    console.log('Plan Tier:', verifyData.plan_tier);
    console.log('Expires:', verifyData.current_period_end);
    console.log('Is Valid:', isValid ? '✅ YES' : '❌ NO');
    console.log('Autopay:', verifyData.autopay_enabled ? '✅ Enabled' : '❌ Disabled');
    
    if (verifyData.status === 'active' && isValid) {
      console.log('\n🎉 SUCCESS! User can now access dashboard!');
      console.log('\n📝 Next steps:');
      console.log('   1. Ask user to clear browser cache');
      console.log('   2. Ask user to refresh the page');
      console.log('   3. Click "Go to Dashboard" - should work now!');
    }
  }
}

fixSubscription().catch(console.error);
